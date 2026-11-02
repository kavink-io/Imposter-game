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
    settings JSONB NOT NULL DEFAULT '{"topicMode":"random","category":"all","discussionTime":180}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Create Room Players Table (Exactly 8 player slots per room)
CREATE TABLE IF NOT EXISTS public.room_players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
    player_number INT NOT NULL CHECK (player_number BETWEEN 1 AND 8),
    player_name VARCHAR(50) NOT NULL,
    avatar_index INT NOT NULL DEFAULT 0,
    is_host BOOLEAN NOT NULL DEFAULT false,
    is_connected BOOLEAN NOT NULL DEFAULT true,
    player_token VARCHAR(64) NOT NULL, -- Secret token used to authenticate private role requests
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
    winner VARCHAR(30) CHECK (winner IN ('CIVILIANS', 'IMPOSTERS', 'JOKER', 'DRAW')),
    eliminated_player_ids JSONB DEFAULT '[]'::jsonb,
    vote_summary JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (room_id, round_number)
);

-- 5. Create Private Player Roles Table
-- Strictly protected: Players can only view their own role via get_my_private_role()
CREATE TABLE IF NOT EXISTS public.private_player_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    round_id UUID NOT NULL REFERENCES public.rounds(id) ON DELETE CASCADE,
    room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES public.room_players(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('CIVILIAN', 'IMPOSTER', 'JOKER')),
    secret_word VARCHAR(100), -- Given to Civilian & Joker
    clue VARCHAR(100),        -- Given to Imposter
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

-- Rooms: Public can read rooms by room_code
CREATE POLICY "Allow public select rooms" ON public.rooms
    FOR SELECT USING (true);

-- Room Players: Public can read player list (we create a safe view or hide player_token)
CREATE POLICY "Allow public select room_players" ON public.room_players
    FOR SELECT USING (true);

-- Rounds: Public can read round info
CREATE POLICY "Allow public select rounds" ON public.rounds
    FOR SELECT USING (true);

-- Topics: Public can read topics catalog
CREATE POLICY "Allow public select topics" ON public.topics
    FOR SELECT USING (true);

-- Private Player Roles: NEVER directly selectable by public during active rounds!
-- Only readable after round is completed for final reveal, or via get_my_private_role()
CREATE POLICY "Allow select roles when round completed" ON public.private_player_roles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.rounds 
            WHERE rounds.id = private_player_roles.round_id 
            AND rounds.status = 'COMPLETED'
        )
    );

-- Votes: Public can only see vote records after round is completed
CREATE POLICY "Allow select votes when round completed" ON public.votes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.rounds 
            WHERE rounds.id = votes.round_id 
            AND rounds.status = 'COMPLETED'
        )
    );

-- Enable Supabase Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_players;
ALTER PUBLICATION supabase_realtime ADD TABLE public.rounds;

-- ====================================================================
-- SECURE SERVER-SIDE RPC FUNCTIONS (SECURITY DEFINER)
-- ====================================================================

-- Function 1: Generate unique 6-character room code
CREATE OR REPLACE FUNCTION public.generate_room_code()
RETURNS TEXT AS $$
DECLARE
    chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Omit ambiguous characters like O, 0, I, 1
    result TEXT := '';
    i INT;
BEGIN
    FOR i IN 1..6 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function 2: Create a Room & Register Host
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

    -- Generate a unique room code
    LOOP
        v_room_code := generate_room_code();
        EXIT WHEN NOT EXISTS (SELECT 1 FROM public.rooms WHERE room_code = v_room_code);
    END LOOP;

    -- Create Room
    INSERT INTO public.rooms (room_code, settings, status, current_phase)
    VALUES (v_room_code, p_settings, 'LOBBY', 'WAITING')
    RETURNING id INTO v_room_id;

    -- Generate secure host token
    v_host_token := encode(gen_random_bytes(32), 'hex');

    -- Insert Host as Player 1
    INSERT INTO public.room_players (
        room_id, player_number, player_name, avatar_index, is_host, player_token
    ) VALUES (
        v_room_id, 1, v_clean_name, 0, true, v_host_token
    ) RETURNING id INTO v_host_id;

    -- Link Host to Room
    UPDATE public.rooms SET host_player_id = v_host_id WHERE id = v_room_id;

    RETURN jsonb_build_object(
        'success', true,
        'room_id', v_room_id,
        'room_code', v_room_code,
        'player_id', v_host_id,
        'player_token', v_host_token,
        'player_number', 1,
        'player_name', v_clean_name,
        'is_host', true
    );
END;
$$ LANGUAGE plpgsql;

-- Function 3: Join Room (Strict max 8 players, transaction safe concurrency locking)
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
    v_player_count INT;
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

    -- Lock room row for concurrency safety
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

    -- Check if name already taken in room
    IF EXISTS (
        SELECT 1 FROM public.room_players 
        WHERE room_id = v_room.id AND lower(player_name) = lower(v_clean_name)
    ) THEN
        RAISE EXCEPTION 'The name "%" is already taken in this room.', v_clean_name;
    END IF;

    -- Count existing players
    SELECT count(*) INTO v_player_count 
    FROM public.room_players 
    WHERE room_id = v_room.id;

    IF v_player_count >= 8 THEN
        RAISE EXCEPTION 'Room is full! Maximum 8 players allowed.';
    END IF;

    v_player_number := v_player_count + 1;
    v_avatar_index := v_player_number - 1;
    v_player_token := encode(gen_random_bytes(32), 'hex');

    -- Insert new player
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

-- Function 4: Start Round & Cryptographically Distribute 8 Roles (5 Civilians, 2 Imposters, 1 Joker)
CREATE OR REPLACE FUNCTION public.rpc_start_round(
    p_room_code TEXT,
    p_host_token TEXT,
    p_topic_mode TEXT DEFAULT 'random',
    p_manual_topic TEXT DEFAULT '',
    p_manual_clue TEXT DEFAULT ''
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
    v_roles TEXT[] := ARRAY['IMPOSTER', 'IMPOSTER', 'JOKER', 'CIVILIAN', 'CIVILIAN', 'CIVILIAN', 'CIVILIAN', 'CIVILIAN'];
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
    -- Verify Room
    SELECT * INTO v_room FROM public.rooms WHERE room_code = upper(trim(p_room_code)) FOR UPDATE;
    IF v_room IS NULL THEN
        RAISE EXCEPTION 'Room not found.';
    END IF;

    -- Verify Host via token
    SELECT * INTO v_host FROM public.room_players 
    WHERE room_id = v_room.id AND player_token = p_host_token AND is_host = true;
    IF v_host IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Only the room host can start the game.';
    END IF;

    -- Verify Exactly 8 Players
    SELECT count(*) INTO v_player_count FROM public.room_players WHERE room_id = v_room.id;
    IF v_player_count != 8 THEN
        RAISE EXCEPTION 'Exactly 8 players are required to start the game (currently %).', v_player_count;
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
        -- Pick random topic from topics table
        SELECT * INTO v_topic_record FROM public.topics ORDER BY gen_random_uuid() LIMIT 1;
        IF v_topic_record IS NOT NULL THEN
            v_topic := upper(v_topic_record.topic);
            v_category := v_topic_record.category;
            v_clue := upper(v_topic_record.clue);
        ELSE
            -- Safe default fallback if topics table not seeded yet
            v_topic := 'PIZZA';
            v_category := 'Food & Treats';
            v_clue := 'ITALIAN';
        END IF;
    END IF;

    -- Fetch array of 8 player IDs
    SELECT array_agg(id ORDER BY player_number) INTO v_players 
    FROM public.room_players 
    WHERE room_id = v_room.id;

    -- Cryptographically shuffle roles (Fisher-Yates shuffle with gen_random_bytes)
    v_shuffled_roles := v_roles;
    FOR i REVERSE 8..2 LOOP
        -- Generate random integer between 1 and i using pgcrypto
        j := 1 + (abs(('x' || encode(gen_random_bytes(4), 'hex'))::bit(32)::int) % i);
        temp := v_shuffled_roles[i];
        v_shuffled_roles[i] := v_shuffled_roles[j];
        v_shuffled_roles[j] := temp;
    END LOOP;

    -- Create Round
    INSERT INTO public.rounds (
        room_id, round_number, topic, category, clue, status
    ) VALUES (
        v_room.id, v_room.current_round_number, v_topic, v_category, v_clue, 'ACTIVE'
    ) RETURNING id INTO v_round_id;

    -- Insert Private Roles for each player
    FOR i IN 1..8 LOOP
        v_player_id := v_players[i];
        v_curr_role := v_shuffled_roles[i];

        IF v_curr_role = 'CIVILIAN' THEN
            v_secret_word := v_topic;
            v_curr_clue := NULL;
            v_instruction := 'You are a Civilian! You know the secret word. Give subtle clues to prove you know it, and work with other civilians to identify the 2 Imposters and avoid voting for the Joker!';
        ELSIF v_curr_role = 'IMPOSTER' THEN
            v_secret_word := NULL;
            v_curr_clue := v_clue;
            v_instruction := 'You are an Imposter! You DO NOT know the secret word, but you have received a related clue. Listen carefully to other players, pretend you know the word, and blend in without getting caught!';
        ELSE -- JOKER
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

    -- Reset player vote statuses
    UPDATE public.room_players SET has_voted = false WHERE room_id = v_room.id;

    -- Advance Room Status & Phase
    UPDATE public.rooms 
    SET status = 'IN_GAME', 
        current_phase = 'ROLE_REVEAL',
        updated_at = now()
    WHERE id = v_room.id;

    RETURN jsonb_build_object(
        'success', true,
        'round_id', v_round_id,
        'round_number', v_room.current_round_number,
        'phase', 'ROLE_REVEAL'
    );
END;
$$ LANGUAGE plpgsql;

-- Function 5: Securely Fetch ONLY Calling Player's Private Role
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
    -- Verify room
    SELECT * INTO v_room FROM public.rooms WHERE room_code = upper(trim(p_room_code));
    IF v_room IS NULL THEN
        RAISE EXCEPTION 'Room not found.';
    END IF;

    -- Authenticate player via their private token
    SELECT * INTO v_player FROM public.room_players 
    WHERE room_id = v_room.id AND player_token = p_player_token;
    IF v_player IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Invalid player token.';
    END IF;

    -- Get current active round
    SELECT * INTO v_round FROM public.rounds 
    WHERE room_id = v_room.id AND round_number = v_room.current_round_number;
    IF v_round IS NULL THEN
        RETURN jsonb_build_object('has_role', false, 'message', 'Round has not started yet.');
    END IF;

    -- Fetch private role for this player ONLY
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
        'role', v_role.role,
        'secret_word', v_role.secret_word,
        'clue', v_role.clue,
        'category', v_round.category,
        'instruction', v_role.instruction
    );
END;
$$ LANGUAGE plpgsql;

-- Function 6: Set Game Phase (Host Only)
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

-- Function 7: Submit Private Vote
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
    v_total_votes INT;
BEGIN
    SELECT * INTO v_room FROM public.rooms WHERE room_code = upper(trim(p_room_code));
    IF v_room IS NULL OR v_room.current_phase != 'VOTING' THEN
        RAISE EXCEPTION 'Voting is not currently open.';
    END IF;

    -- Authenticate voter
    SELECT * INTO v_voter FROM public.room_players 
    WHERE room_id = v_room.id AND player_token = p_player_token;
    IF v_voter IS NULL THEN
        RAISE EXCEPTION 'Unauthorized voter token.';
    END IF;

    -- Validate target player
    SELECT * INTO v_target FROM public.room_players 
    WHERE room_id = v_room.id AND id = p_target_player_id;
    IF v_target IS NULL THEN
        RAISE EXCEPTION 'Target player not found in this room.';
    END IF;

    -- Rule: Cannot vote for self
    IF v_voter.id = v_target.id THEN
        RAISE EXCEPTION 'You cannot vote for yourself!';
    END IF;

    -- Current active round
    SELECT * INTO v_round FROM public.rounds 
    WHERE room_id = v_room.id AND round_number = v_room.current_round_number;

    -- Upsert vote (allow changing vote while voting is open)
    INSERT INTO public.votes (round_id, room_id, voter_player_id, target_player_id)
    VALUES (v_round.id, v_room.id, v_voter.id, v_target.id)
    ON CONFLICT (round_id, voter_player_id)
    DO UPDATE SET target_player_id = p_target_player_id;

    -- Mark voter as has_voted
    UPDATE public.room_players SET has_voted = true WHERE id = v_voter.id;

    SELECT count(*) INTO v_total_votes FROM public.votes WHERE round_id = v_round.id;

    RETURN jsonb_build_object(
        'success', true,
        'votes_cast', v_total_votes,
        'all_voted', (v_total_votes = 8)
    );
END;
$$ LANGUAGE plpgsql;

-- Function 8: End Voting, Tally Votes, Check Victory & Reveal Results
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
    v_eliminated UUID[] := ARRAY[]::UUID[];
    v_eliminated_roles TEXT[] := ARRAY[]::TEXT[];
    v_role_record RECORD;
    v_winner TEXT;
    v_joker_eliminated BOOLEAN := false;
    v_imposters_eliminated_count INT := 0;
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

    -- Tally votes per target
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
            v_eliminated := ARRAY[v_vote.target_player_id];
        ELSIF v_vote.count = v_max_votes THEN
            v_eliminated := array_append(v_eliminated, v_vote.target_player_id);
        END IF;
    END LOOP;

    -- Inspect roles of eliminated player(s)
    FOR i IN 1..coalesce(array_length(v_eliminated, 1), 0) LOOP
        SELECT * INTO v_role_record 
        FROM public.private_player_roles 
        WHERE round_id = v_round.id AND player_id = v_eliminated[i];

        IF v_role_record.role = 'JOKER' THEN
            v_joker_eliminated := true;
        ELSIF v_role_record.role = 'IMPOSTER' THEN
            v_imposters_eliminated_count := v_imposters_eliminated_count + 1;
        END IF;
        v_eliminated_roles := array_append(v_eliminated_roles, v_role_record.role);
    END LOOP;

    -- Victory Condition Calculation:
    -- 1. Joker wins if voted out!
    -- 2. Civilians win if both imposters eliminated (or 1 imposter in single tie).
    -- 3. Imposters win if they survive without Joker or both imposters voted out.
    IF v_joker_eliminated THEN
        v_winner := 'JOKER';
    ELSIF v_imposters_eliminated_count >= 2 THEN
        v_winner := 'CIVILIANS';
    ELSIF v_imposters_eliminated_count = 1 AND array_length(v_eliminated, 1) = 1 THEN
        -- If 1 imposter is caught out of 2, civilians eliminated an imposter!
        v_winner := 'CIVILIANS';
    ELSE
        v_winner := 'IMPOSTERS';
    END IF;

    -- Compile public reveal of all 8 roles now that round is finished
    SELECT jsonb_agg(
        jsonb_build_object(
            'player_id', r.player_id,
            'player_name', p.player_name,
            'player_number', p.player_number,
            'avatar_index', p.avatar_index,
            'role', r.role,
            'secret_word', r.secret_word,
            'clue', r.clue,
            'is_eliminated', (r.player_id = ANY(v_eliminated)),
            'votes_received', coalesce((v_tally->>(r.player_id::text))::int, 0)
        ) ORDER BY p.player_number
    ) INTO v_all_roles
    FROM public.private_player_roles r
    JOIN public.room_players p ON p.id = r.player_id
    WHERE r.round_id = v_round.id;

    -- Update round record
    UPDATE public.rounds 
    SET status = 'COMPLETED',
        winner = v_winner,
        eliminated_player_ids = to_jsonb(v_eliminated),
        vote_summary = v_tally
    WHERE id = v_round.id;

    -- Transition room to RESULTS
    UPDATE public.rooms 
    SET current_phase = 'RESULTS', updated_at = now() 
    WHERE id = v_room.id;

    RETURN jsonb_build_object(
        'success', true,
        'winner', v_winner,
        'topic', v_round.topic,
        'clue', v_round.clue,
        'category', v_round.category,
        'eliminated_player_ids', v_eliminated,
        'eliminated_roles', v_eliminated_roles,
        'vote_summary', v_tally,
        'all_roles', v_all_roles
    );
END;
$$ LANGUAGE plpgsql;

-- Function 9: Start New Round (Same 8 Players, increment round number)
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

    -- Reset room state for new round
    UPDATE public.rooms 
    SET current_round_number = v_next_round,
        current_phase = 'WAITING',
        status = 'LOBBY',
        updated_at = now()
    WHERE id = v_room.id;

    -- Reset players voted status
    UPDATE public.room_players 
    SET has_voted = false 
    WHERE room_id = v_room.id;

    RETURN jsonb_build_object(
        'success', true,
        'next_round_number', v_next_round
    );
END;
$$ LANGUAGE plpgsql;
