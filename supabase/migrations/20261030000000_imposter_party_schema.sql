-- ====================================================================
-- Imposter Party 🎭 - Supabase PostgreSQL Schema & Security Definer RPCs
-- ====================================================================

-- 1. Enable pgcrypto for cryptographically secure UUID and token generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Create Rooms Table
CREATE TABLE IF NOT EXISTS public.rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_code VARCHAR(8) UNIQUE NOT NULL,
    host_player_id UUID,
    status VARCHAR(20) NOT NULL DEFAULT 'LOBBY' CHECK (status IN ('LOBBY', 'IN_GAME', 'FINISHED', 'ABANDONED')),
    current_round_number INT NOT NULL DEFAULT 1,
    current_phase VARCHAR(30) NOT NULL DEFAULT 'WAITING' 
        CHECK (current_phase IN ('WAITING', 'ROLE_ASSIGNMENT', 'ROLE_REVEAL', 'DISCUSSION', 'VOTING', 'RESULTS')),
    settings JSONB NOT NULL DEFAULT '{"topicMode":"random","category":"all","discussionTime":180,"imposterCount":"auto","includeJoker":true}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Create Room Players Table (Unlimited players supported, host is player_number 0)
CREATE TABLE IF NOT EXISTS public.room_players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
    player_number INT NOT NULL CHECK (player_number >= 0),
    player_name VARCHAR(50) NOT NULL,
    avatar_index INT NOT NULL DEFAULT 0,
    is_host BOOLEAN NOT NULL DEFAULT false,
    is_connected BOOLEAN NOT NULL DEFAULT true,
    is_eliminated BOOLEAN NOT NULL DEFAULT false,
    player_token VARCHAR(64) NOT NULL,
    has_voted BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (room_id, player_number),
    UNIQUE (room_id, player_name)
);

-- Add foreign key back to rooms for host
ALTER TABLE public.rooms 
    DROP CONSTRAINT IF EXISTS fk_rooms_host;
ALTER TABLE public.rooms 
    ADD CONSTRAINT fk_rooms_host FOREIGN KEY (host_player_id) 
    REFERENCES public.room_players(id) ON DELETE SET NULL;

-- 4. Create Rounds Table
CREATE TABLE IF NOT EXISTS public.rounds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
    round_number INT NOT NULL,
    topic VARCHAR(100) NOT NULL,
    category VARCHAR(100) NOT NULL DEFAULT 'General',
    clue VARCHAR(100) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'VOTING', 'COMPLETED')),
    round_result VARCHAR(40) DEFAULT 'ACTIVE',
    winner VARCHAR(30) CHECK (winner IN ('CIVILIANS', 'IMPOSTERS', 'JOKER', 'NONE', 'DRAW')),
    eliminated_player_ids JSONB DEFAULT '[]'::jsonb,
    vote_summary JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (room_id, round_number)
);

-- 5. Create Private Player Roles Table
CREATE TABLE IF NOT EXISTS public.private_player_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    round_id UUID NOT NULL REFERENCES public.rounds(id) ON DELETE CASCADE,
    room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES public.room_players(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('CIVILIAN', 'IMPOSTER', 'JOKER', 'HOST')),
    secret_word VARCHAR(100),
    clue VARCHAR(100),
    instruction TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (round_id, player_id)
);

-- 6. Create Votes Table
CREATE TABLE IF NOT EXISTS public.votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    round_id UUID NOT NULL REFERENCES public.rounds(id) ON DELETE CASCADE,
    room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
    voter_player_id UUID NOT NULL REFERENCES public.room_players(id) ON DELETE CASCADE,
    target_player_id UUID NOT NULL REFERENCES public.room_players(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (round_id, voter_player_id)
);

-- 7. Create Topics & Clues Catalog Table
CREATE TABLE IF NOT EXISTS public.topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category VARCHAR(100) NOT NULL,
    topic VARCHAR(100) NOT NULL,
    clue VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.private_player_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public select rooms" ON public.rooms FOR SELECT USING (true);
CREATE POLICY "Allow public select room_players" ON public.room_players FOR SELECT USING (true);
CREATE POLICY "Allow public select rounds" ON public.rounds FOR SELECT USING (true);
CREATE POLICY "Allow public select topics" ON public.topics FOR SELECT USING (true);

CREATE POLICY "Allow select roles when round completed" ON public.private_player_roles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.rounds 
            WHERE rounds.id = private_player_roles.round_id 
            AND rounds.status = 'COMPLETED'
        )
    );

CREATE POLICY "Allow select votes when round completed" ON public.votes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.rounds 
            WHERE rounds.id = votes.round_id 
            AND rounds.status = 'COMPLETED'
        )
    );

ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_players;
ALTER PUBLICATION supabase_realtime ADD TABLE public.rounds;

-- ====================================================================
-- SECURE SERVER-SIDE RPC FUNCTIONS
-- ====================================================================

-- Generate Room Code
CREATE OR REPLACE FUNCTION public.generate_room_code()
RETURNS TEXT AS $$
DECLARE
    chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    result TEXT := '';
    i INT;
BEGIN
    FOR i IN 1..6 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 1. Create Room (Host is player_number 0 - Moderator, does not play or vote)
CREATE OR REPLACE FUNCTION public.rpc_create_room(
    p_host_name TEXT,
    p_settings JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_room_code TEXT;
    v_room_id UUID;
    v_host_id UUID;
    v_host_token TEXT;
    v_clean_name TEXT;
BEGIN
    v_clean_name := trim(p_host_name);
    IF length(v_clean_name) < 2 THEN
        RAISE EXCEPTION 'Host name must be at least 2 characters.';
    END IF;

    LOOP
        v_room_code := generate_room_code();
        EXIT WHEN NOT EXISTS (SELECT 1 FROM public.rooms WHERE room_code = v_room_code);
    END LOOP;

    INSERT INTO public.rooms (room_code, settings, status, current_phase)
    VALUES (v_room_code, p_settings, 'LOBBY', 'WAITING')
    RETURNING id INTO v_room_id;

    v_host_token := encode(gen_random_bytes(32), 'hex');

    -- Insert Host as slot 0 (Game Master)
    INSERT INTO public.room_players (
        room_id, player_number, player_name, avatar_index, is_host, player_token
    ) VALUES (
        v_room_id, 0, v_clean_name, 0, true, v_host_token
    ) RETURNING id INTO v_host_id;

    UPDATE public.rooms SET host_player_id = v_host_id WHERE id = v_room_id;

    RETURN jsonb_build_object(
        'success', true,
        'room_id', v_room_id,
        'room_code', v_room_code,
        'player_id', v_host_id,
        'player_token', v_host_token,
        'player_number', 0,
        'player_name', v_clean_name,
        'is_host', true
    );
END;
$$ LANGUAGE plpgsql;

-- 2. Join Room (Unlimited players)
CREATE OR REPLACE FUNCTION public.rpc_join_room(
    p_room_code TEXT,
    p_player_name TEXT
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_room RECORD;
    v_non_host_count INT;
    v_clean_name TEXT;
    v_player_token TEXT;
    v_player_id UUID;
    v_player_number INT;
    v_avatar_index INT;
BEGIN
    v_clean_name := trim(p_player_name);
    IF length(v_clean_name) < 2 THEN
        RAISE EXCEPTION 'Player name must be at least 2 characters.';
    END IF;

    SELECT * INTO v_room 
    FROM public.rooms 
    WHERE room_code = upper(trim(p_room_code)) 
    FOR UPDATE;

    IF v_room IS NULL THEN
        RAISE EXCEPTION 'Room code % not found.', p_room_code;
    END IF;

    IF v_room.status != 'LOBBY' THEN
        RAISE EXCEPTION 'Game has already started in this room.';
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.room_players 
        WHERE room_id = v_room.id AND lower(player_name) = lower(v_clean_name)
    ) THEN
        RAISE EXCEPTION 'The name "%" is already taken in this room.', v_clean_name;
    END IF;

    -- Count non-host participants
    SELECT count(*) INTO v_non_host_count 
    FROM public.room_players 
    WHERE room_id = v_room.id AND is_host = false;

    v_player_number := v_non_host_count + 1;
    v_avatar_index := (v_player_number - 1) % 8;
    v_player_token := encode(gen_random_bytes(32), 'hex');

    INSERT INTO public.room_players (
        room_id, player_number, player_name, avatar_index, is_host, player_token
    ) VALUES (
        v_room.id, v_player_number, v_clean_name, v_avatar_index, false, v_player_token
    ) RETURNING id INTO v_player_id;

    RETURN jsonb_build_object(
        'success', true,
        'room_id', v_room.id,
        'room_code', v_room.room_code,
        'player_id', v_player_id,
        'player_token', v_player_token,
        'player_number', v_player_number,
        'player_name', v_clean_name,
        'is_host', false
    );
END;
$$ LANGUAGE plpgsql;

-- 3. Start Round (Assign roles dynamically to participants only; host does NOT receive playing role)
CREATE OR REPLACE FUNCTION public.rpc_start_round(
    p_room_code TEXT,
    p_host_token TEXT,
    p_topic_mode TEXT DEFAULT 'random',
    p_manual_topic TEXT DEFAULT '',
    p_manual_clue TEXT DEFAULT '',
    p_imposter_count INT DEFAULT 0,
    p_include_joker BOOLEAN DEFAULT true
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_room RECORD;
    v_host RECORD;
    v_player_count INT;
    v_round_id UUID;
    v_topic TEXT;
    v_category TEXT := 'General';
    v_clue TEXT;
    v_topic_record RECORD;
    v_players UUID[];
    v_num_imposters INT;
    v_num_jokers INT := 0;
    v_num_civilians INT;
    v_roles TEXT[] := ARRAY[]::TEXT[];
    v_shuffled_roles TEXT[];
    v_curr_role TEXT;
    v_secret_word TEXT;
    v_curr_clue TEXT;
    v_instruction TEXT;
    v_player_id UUID;
    i INT;
    j INT;
    temp TEXT;
BEGIN
    SELECT * INTO v_room FROM public.rooms WHERE room_code = upper(trim(p_room_code)) FOR UPDATE;
    IF v_room IS NULL THEN
        RAISE EXCEPTION 'Room not found.';
    END IF;

    SELECT * INTO v_host FROM public.room_players 
    WHERE room_id = v_room.id AND player_token = p_host_token AND is_host = true;
    IF v_host IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Only the room host can start the game.';
    END IF;

    -- Count participants (excluding host)
    SELECT count(*) INTO v_player_count 
    FROM public.room_players 
    WHERE room_id = v_room.id AND is_host = false;

    IF v_player_count < 3 THEN
        RAISE EXCEPTION 'At least 3 players are required to start the game (currently %).', v_player_count;
    END IF;

    -- Select Topic and Clue
    IF p_topic_mode = 'manual' AND length(trim(p_manual_topic)) > 0 THEN
        v_topic := upper(trim(p_manual_topic));
        v_clue := CASE 
            WHEN length(trim(p_manual_clue)) > 0 THEN upper(trim(p_manual_clue))
            ELSE 'SECRET TOPIC RELATED'
        END;
        v_category := 'Custom Host Choice';
    ELSE
        SELECT * INTO v_topic_record FROM public.topics ORDER BY gen_random_uuid() LIMIT 1;
        IF v_topic_record IS NOT NULL THEN
            v_topic := upper(v_topic_record.topic);
            v_category := v_topic_record.category;
            v_clue := upper(v_topic_record.clue);
        ELSE
            v_topic := 'PIZZA';
            v_category := 'Food & Treats';
            v_clue := 'ITALIAN';
        END IF;
    END IF;

    -- Dynamic role distribution
    IF p_imposter_count > 0 THEN
        v_num_imposters := least(p_imposter_count, floor(v_player_count / 2)::int);
    ELSE
        -- Auto: 1 for <=5 players, 2 for <=10 players, 3 for 11+
        IF v_player_count <= 5 THEN
            v_num_imposters := 1;
        ELSIF v_player_count <= 10 THEN
            v_num_imposters := 2;
        ELSE
            v_num_imposters := 3;
        END IF;
    END IF;

    IF p_include_joker AND v_player_count >= 4 THEN
        v_num_jokers := 1;
    ELSE
        v_num_jokers := 0;
    END IF;

    v_num_civilians := v_player_count - v_num_imposters - v_num_jokers;
    IF v_num_civilians < 1 THEN
        v_num_jokers := 0;
        v_num_civilians := v_player_count - v_num_imposters;
    END IF;

    FOR i IN 1..v_num_imposters LOOP
        v_roles := array_append(v_roles, 'IMPOSTER');
    END LOOP;
    FOR i IN 1..v_num_jokers LOOP
        v_roles := array_append(v_roles, 'JOKER');
    END LOOP;
    FOR i IN 1..v_num_civilians LOOP
        v_roles := array_append(v_roles, 'CIVILIAN');
    END LOOP;

    -- Cryptographic Fisher-Yates shuffle
    v_shuffled_roles := v_roles;
    FOR i REVERSE v_player_count..2 LOOP
        j := 1 + (abs(('x' || encode(gen_random_bytes(4), 'hex'))::bit(32)::int) % i);
        temp := v_shuffled_roles[i];
        v_shuffled_roles[i] := v_shuffled_roles[j];
        v_shuffled_roles[j] := temp;
    END LOOP;

    -- Fetch participants
    SELECT array_agg(id ORDER BY player_number) INTO v_players 
    FROM public.room_players 
    WHERE room_id = v_room.id AND is_host = false;

    -- Create Round
    INSERT INTO public.rounds (
        room_id, round_number, topic, category, clue, status, round_result
    ) VALUES (
        v_room.id, 1, v_topic, v_category, v_clue, 'ACTIVE', 'ACTIVE'
    ) RETURNING id INTO v_round_id;

    -- Insert Host Role Record as HOST
    INSERT INTO public.private_player_roles (
        round_id, room_id, player_id, role, secret_word, clue, instruction
    ) VALUES (
        v_round_id, v_room.id, v_host.id, 'HOST', v_topic, v_clue,
        'You are the Game Master (Host)! You do not participate in voting or play a secret role. Guide players through discussion and voting.'
    );

    -- Insert roles for participants
    FOR i IN 1..v_player_count LOOP
        v_player_id := v_players[i];
        v_curr_role := v_shuffled_roles[i];

        IF v_curr_role = 'CIVILIAN' THEN
            v_secret_word := v_topic;
            v_curr_clue := NULL;
            v_instruction := 'You are a Civilian! You know the secret word. Give subtle clues to prove you know it, and work with other civilians to identify the Imposters without voting for the Joker!';
        ELSIF v_curr_role = 'IMPOSTER' THEN
            v_secret_word := NULL;
            v_curr_clue := v_clue;
            v_instruction := 'You are an Imposter! You DO NOT know the secret word, but you have received a related clue. Listen carefully to other players, pretend you know the word, and blend in without getting caught!';
        ELSE
            v_secret_word := v_topic;
            v_curr_clue := NULL;
            v_instruction := 'You are the Joker! You know the secret word, BUT your goal is to act suspicious and pretend you are an imposter! If the group votes you out, YOU WIN!';
        END IF;

        INSERT INTO public.private_player_roles (
            round_id, room_id, player_id, role, secret_word, clue, instruction
        ) VALUES (
            v_round_id, v_room.id, v_player_id, v_curr_role, v_secret_word, v_curr_clue, v_instruction
        );
    END LOOP;

    -- Reset player vote and eliminated statuses
    UPDATE public.room_players 
    SET has_voted = false, is_eliminated = false 
    WHERE room_id = v_room.id;

    UPDATE public.rooms 
    SET status = 'IN_GAME', 
        current_phase = 'ROLE_REVEAL',
        current_round_number = 1,
        updated_at = now()
    WHERE id = v_room.id;

    RETURN jsonb_build_object(
        'success', true,
        'round_id', v_round_id,
        'round_number', 1,
        'phase', 'ROLE_REVEAL'
    );
END;
$$ LANGUAGE plpgsql;

-- 4. Get My Private Role
CREATE OR REPLACE FUNCTION public.rpc_get_my_private_role(
    p_room_code TEXT,
    p_player_token TEXT
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_room RECORD;
    v_player RECORD;
    v_round RECORD;
    v_role RECORD;
BEGIN
    SELECT * INTO v_room FROM public.rooms WHERE room_code = upper(trim(p_room_code));
    IF v_room IS NULL THEN
        RAISE EXCEPTION 'Room not found.';
    END IF;

    SELECT * INTO v_player FROM public.room_players 
    WHERE room_id = v_room.id AND player_token = p_player_token;
    IF v_player IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Invalid player token.';
    END IF;

    SELECT * INTO v_round FROM public.rounds 
    WHERE room_id = v_room.id AND round_number = v_room.current_round_number;
    IF v_round IS NULL THEN
        RETURN jsonb_build_object('has_role', false, 'message', 'Round has not started yet.');
    END IF;

    SELECT * INTO v_role FROM public.private_player_roles 
    WHERE round_id = v_round.id AND player_id = v_player.id;
    IF v_role IS NULL THEN
        RETURN jsonb_build_object('has_role', false, 'message', 'Role not found.');
    END IF;

    RETURN jsonb_build_object(
        'has_role', true,
        'round_id', v_round.id,
        'round_number', v_round.round_number,
        'player_id', v_player.id,
        'player_name', v_player.player_name,
        'player_number', v_player.player_number,
        'is_host', v_player.is_host,
        'is_eliminated', v_player.is_eliminated,
        'role', v_role.role,
        'secret_word', v_role.secret_word,
        'clue', v_role.clue,
        'category', v_round.category,
        'instruction', v_role.instruction
    );
END;
$$ LANGUAGE plpgsql;

-- 5. Set Game Phase
CREATE OR REPLACE FUNCTION public.rpc_set_game_phase(
    p_room_code TEXT,
    p_host_token TEXT,
    p_new_phase TEXT
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_room RECORD;
    v_host RECORD;
BEGIN
    SELECT * INTO v_room FROM public.rooms WHERE room_code = upper(trim(p_room_code)) FOR UPDATE;
    IF v_room IS NULL THEN
        RAISE EXCEPTION 'Room not found.';
    END IF;

    SELECT * INTO v_host FROM public.room_players 
    WHERE room_id = v_room.id AND player_token = p_host_token AND is_host = true;
    IF v_host IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Only host can advance phases.';
    END IF;

    UPDATE public.rooms 
    SET current_phase = p_new_phase, updated_at = now() 
    WHERE id = v_room.id;

    RETURN jsonb_build_object('success', true, 'phase', p_new_phase);
END;
$$ LANGUAGE plpgsql;

-- 6. Submit Vote
CREATE OR REPLACE FUNCTION public.rpc_submit_vote(
    p_room_code TEXT,
    p_player_token TEXT,
    p_target_player_id UUID
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_room RECORD;
    v_voter RECORD;
    v_target RECORD;
    v_round RECORD;
    v_alive_count INT;
    v_total_votes INT;
BEGIN
    SELECT * INTO v_room FROM public.rooms WHERE room_code = upper(trim(p_room_code));
    IF v_room IS NULL OR v_room.current_phase != 'VOTING' THEN
        RAISE EXCEPTION 'Voting is not currently open.';
    END IF;

    SELECT * INTO v_voter FROM public.room_players 
    WHERE room_id = v_room.id AND player_token = p_player_token;
    IF v_voter IS NULL THEN
        RAISE EXCEPTION 'Unauthorized voter token.';
    END IF;

    IF v_voter.is_host THEN
        RAISE EXCEPTION 'Host is the moderator and cannot vote.';
    END IF;

    IF v_voter.is_eliminated THEN
        RAISE EXCEPTION 'Eliminated players cannot vote.';
    END IF;

    SELECT * INTO v_target FROM public.room_players 
    WHERE room_id = v_room.id AND id = p_target_player_id;
    IF v_target IS NULL THEN
        RAISE EXCEPTION 'Target player not found in this room.';
    END IF;

    IF v_target.is_host THEN
        RAISE EXCEPTION 'Cannot vote for the host.';
    END IF;

    IF v_target.is_eliminated THEN
        RAISE EXCEPTION 'Cannot vote for an already eliminated player.';
    END IF;

    IF v_voter.id = v_target.id THEN
        RAISE EXCEPTION 'You cannot vote for yourself!';
    END IF;

    SELECT * INTO v_round FROM public.rounds 
    WHERE room_id = v_room.id AND round_number = v_room.current_round_number;

    INSERT INTO public.votes (round_id, room_id, voter_player_id, target_player_id)
    VALUES (v_round.id, v_room.id, v_voter.id, v_target.id)
    ON CONFLICT (round_id, voter_player_id)
    DO UPDATE SET target_player_id = p_target_player_id;

    UPDATE public.room_players SET has_voted = true WHERE id = v_voter.id;

    SELECT count(*) INTO v_alive_count 
    FROM public.room_players 
    WHERE room_id = v_room.id AND is_host = false AND is_eliminated = false;

    SELECT count(*) INTO v_total_votes FROM public.votes WHERE round_id = v_round.id;

    RETURN jsonb_build_object(
        'success', true,
        'votes_cast', v_total_votes,
        'all_voted', (v_total_votes = v_alive_count)
    );
END;
$$ LANGUAGE plpgsql;

-- 7. End Voting, Tally Votes & Check if Imposter is Exposed
CREATE OR REPLACE FUNCTION public.rpc_end_voting_and_tally(
    p_room_code TEXT,
    p_host_token TEXT
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_room RECORD;
    v_host RECORD;
    v_round RECORD;
    v_vote RECORD;
    v_tally JSONB := '{}'::jsonb;
    v_max_votes INT := 0;
    v_highest_targets UUID[] := ARRAY[]::UUID[];
    v_eliminated_id UUID := NULL;
    v_eliminated_role TEXT := NULL;
    v_role_record RECORD;
    v_winner TEXT := 'NONE';
    v_game_over BOOLEAN := false;
    v_round_result TEXT := 'CIVILIAN_ELIMINATED';
    v_message TEXT := '';
    v_alive_civilians INT;
    v_alive_imposters INT;
    v_all_roles JSONB := '[]'::jsonb;
BEGIN
    SELECT * INTO v_room FROM public.rooms WHERE room_code = upper(trim(p_room_code)) FOR UPDATE;
    IF v_room IS NULL THEN
        RAISE EXCEPTION 'Room not found.';
    END IF;

    SELECT * INTO v_host FROM public.room_players 
    WHERE room_id = v_room.id AND player_token = p_host_token AND is_host = true;
    IF v_host IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Only host can close voting.';
    END IF;

    SELECT * INTO v_round FROM public.rounds 
    WHERE room_id = v_room.id AND round_number = v_room.current_round_number;

    -- Tally votes
    FOR v_vote IN 
        SELECT target_player_id, count(*)::int as count 
        FROM public.votes 
        WHERE round_id = v_round.id 
        GROUP BY target_player_id 
        ORDER BY count DESC 
    LOOP
        v_tally := v_tally || jsonb_build_object(v_vote.target_player_id::text, v_vote.count);
        IF v_vote.count > v_max_votes THEN
            v_max_votes := v_vote.count;
            v_highest_targets := ARRAY[v_vote.target_player_id];
        ELSIF v_vote.count = v_max_votes THEN
            v_highest_targets := array_append(v_highest_targets, v_vote.target_player_id);
        END IF;
    END LOOP;

    -- Determine single eliminated player (if no tie)
    IF array_length(v_highest_targets, 1) = 1 AND v_max_votes > 0 THEN
        v_eliminated_id := v_highest_targets[1];
        UPDATE public.room_players SET is_eliminated = true WHERE id = v_eliminated_id;

        SELECT * INTO v_role_record 
        FROM public.private_player_roles 
        WHERE round_id = v_round.id AND player_id = v_eliminated_id;
        v_eliminated_role := v_role_record.role;
    END IF;

    -- Outcome Evaluation
    IF v_eliminated_role = 'JOKER' THEN
        v_winner := 'JOKER';
        v_game_over := true;
        v_round_result := 'JOKER_ELIMINATED';
        v_message := '🃏 The Joker was voted out and wins the game through trickery!';
    ELSIF v_eliminated_role = 'IMPOSTER' THEN
        -- Check if any other imposters remain alive
        SELECT count(*) INTO v_alive_imposters
        FROM public.room_players p
        JOIN public.private_player_roles r ON r.player_id = p.id AND r.round_id = v_round.id
        WHERE p.room_id = v_room.id AND p.is_host = false AND p.is_eliminated = false AND r.role = 'IMPOSTER';

        v_round_result := 'IMPOSTER_EXPOSED';

        IF v_alive_imposters = 0 THEN
            v_winner := 'CIVILIANS';
            v_game_over := true;
            v_message := '🚨 IMPOSTER EXPOSED! Civilians have caught the imposter and won!';
        ELSE
            v_winner := 'NONE';
            v_game_over := false;
            v_message := '🚨 An Imposter was exposed! The remaining imposter is still at large!';
        END IF;
    ELSIF v_eliminated_role = 'CIVILIAN' THEN
        v_round_result := 'CIVILIAN_ELIMINATED';

        SELECT count(*) INTO v_alive_civilians
        FROM public.room_players p
        JOIN public.private_player_roles r ON r.player_id = p.id AND r.round_id = v_round.id
        WHERE p.room_id = v_room.id AND p.is_host = false AND p.is_eliminated = false AND r.role = 'CIVILIAN';

        SELECT count(*) INTO v_alive_imposters
        FROM public.room_players p
        JOIN public.private_player_roles r ON r.player_id = p.id AND r.round_id = v_round.id
        WHERE p.room_id = v_room.id AND p.is_host = false AND p.is_eliminated = false AND r.role = 'IMPOSTER';

        IF v_alive_civilians <= v_alive_imposters THEN
            v_winner := 'IMPOSTERS';
            v_game_over := true;
            v_message := '🚨 Imposters have reached parity with Civilians! Imposters Win!';
        ELSE
            v_winner := 'NONE';
            v_game_over := false;
            v_message := '🚨 An Innocent Civilian was voted out! The Imposter is still at large! Round continues!';
        END IF;
    ELSE
        -- Tie
        v_round_result := 'TIE_SURVIVED';
        v_winner := 'NONE';
        v_game_over := false;
        v_message := '⚖️ Voting tied! Nobody was eliminated this round. The Imposter is still at large!';
    END IF;

    -- Compile roles summary
    SELECT jsonb_agg(
        jsonb_build_object(
            'player_id', p.id,
            'player_name', p.player_name,
            'player_number', p.player_number,
            'avatar_index', p.avatar_index,
            'is_host', p.is_host,
            'role', coalesce(r.role, CASE WHEN p.is_host THEN 'HOST' ELSE 'CIVILIAN' END),
            'secret_word', r.secret_word,
            'clue', r.clue,
            'is_eliminated', p.is_eliminated,
            'is_just_eliminated', (p.id = v_eliminated_id),
            'votes_received', coalesce((v_tally->>(p.id::text))::int, 0)
        ) ORDER BY p.player_number
    ) INTO v_all_roles
    FROM public.room_players p
    LEFT JOIN public.private_player_roles r ON r.player_id = p.id AND r.round_id = v_round.id
    WHERE p.room_id = v_room.id;

    UPDATE public.rounds 
    SET status = CASE WHEN v_game_over THEN 'COMPLETED' ELSE 'ACTIVE' END,
        winner = v_winner,
        round_result = v_round_result,
        vote_summary = v_tally
    WHERE id = v_round.id;

    UPDATE public.rooms 
    SET current_phase = 'RESULTS',
        status = CASE WHEN v_game_over THEN 'FINISHED' ELSE 'IN_GAME' END,
        updated_at = now()
    WHERE id = v_room.id;

    RETURN jsonb_build_object(
        'success', true,
        'winner', v_winner,
        'game_over', v_game_over,
        'round_number', v_round.round_number,
        'round_result', v_round_result,
        'message', v_message,
        'topic', v_round.topic,
        'clue', v_round.clue,
        'category', v_round.category,
        'eliminated_player_id', v_eliminated_id,
        'eliminated_role', v_eliminated_role,
        'vote_summary', v_tally,
        'all_roles', v_all_roles
    );
END;
$$ LANGUAGE plpgsql;

-- 8. Proceed to Next Investigation Round (Round 2, 3... same topic until imposter exposed)
CREATE OR REPLACE FUNCTION public.rpc_proceed_to_next_round(
    p_room_code TEXT,
    p_host_token TEXT
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_room RECORD;
    v_host RECORD;
    v_next_round INT;
BEGIN
    SELECT * INTO v_room FROM public.rooms WHERE room_code = upper(trim(p_room_code)) FOR UPDATE;
    IF v_room IS NULL THEN
        RAISE EXCEPTION 'Room not found.';
    END IF;

    SELECT * INTO v_host FROM public.room_players 
    WHERE room_id = v_room.id AND player_token = p_host_token AND is_host = true;
    IF v_host IS NULL THEN
        RAISE EXCEPTION 'Unauthorized.';
    END IF;

    v_next_round := v_room.current_round_number + 1;

    UPDATE public.rooms 
    SET current_round_number = v_next_round,
        current_phase = 'DISCUSSION',
        updated_at = now()
    WHERE id = v_room.id;

    -- Reset votes for next round
    UPDATE public.room_players SET has_voted = false WHERE room_id = v_room.id;

    RETURN jsonb_build_object(
        'success', true,
        'round_number', v_next_round,
        'phase', 'DISCUSSION'
    );
END;
$$ LANGUAGE plpgsql;

-- 9. Start Brand New Match (Resets lobby for new topic)
CREATE OR REPLACE FUNCTION public.rpc_start_next_round(
    p_room_code TEXT,
    p_host_token TEXT
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_room RECORD;
    v_host RECORD;
BEGIN
    SELECT * INTO v_room FROM public.rooms WHERE room_code = upper(trim(p_room_code)) FOR UPDATE;
    IF v_room IS NULL THEN
        RAISE EXCEPTION 'Room not found.';
    END IF;

    SELECT * INTO v_host FROM public.room_players 
    WHERE room_id = v_room.id AND player_token = p_host_token AND is_host = true;
    IF v_host IS NULL THEN
        RAISE EXCEPTION 'Unauthorized.';
    END IF;

    UPDATE public.rooms 
    SET current_round_number = 1,
        current_phase = 'WAITING',
        status = 'LOBBY',
        updated_at = now()
    WHERE id = v_room.id;

    UPDATE public.room_players 
    SET has_voted = false, is_eliminated = false 
    WHERE room_id = v_room.id;

    RETURN jsonb_build_object(
        'success', true,
        'next_round_number', 1
    );
END;
$$ LANGUAGE plpgsql;
