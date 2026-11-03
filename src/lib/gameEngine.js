import { supabase, isSupabaseConfigured } from './supabase.js';
import { cloudEngine } from './cloudEngine.js';

/**
 * Universal Game Engine Interface
 * - If Supabase credentials are configured: Uses Supabase PostgreSQL & Realtime
 * - Otherwise: Uses Cloud Real-Time Engine (free, zero-config real-time MQTT over WebSockets)
 * This ensures cross-device multiplayer works immediately out-of-the-box on Vercel and separate phones!
 */
export const gameEngine = {
  isLiveSupabase: isSupabaseConfigured,
  engineType: isSupabaseConfigured ? 'supabase' : 'cloud',

  /**
   * Create a new room
   * Host is Game Master / Moderator (does not play a role or vote)
   */
  async createRoom(hostName, settings = {}) {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.rpc('rpc_create_room', {
        p_host_name: hostName.trim(),
        p_settings: settings
      });
      if (error) throw new Error(error.message);
      return data;
    }
    return cloudEngine.createRoom(hostName, settings);
  },

  /**
   * Join an existing room
   */
  async joinRoom(roomCode, playerName) {
    const cleanCode = roomCode.toUpperCase().trim();
    const cleanName = playerName.trim();

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.rpc('rpc_join_room', {
        p_room_code: cleanCode,
        p_player_name: cleanName
      });
      if (error) throw new Error(error.message);
      return data;
    }
    return cloudEngine.joinRoom(cleanCode, cleanName);
  },

  /**
   * Fetch current room state
   */
  async getRoomState(roomCode) {
    const cleanCode = roomCode.toUpperCase().trim();

    if (isSupabaseConfigured && supabase) {
      const { data: room, error: roomErr } = await supabase
        .from('rooms')
        .select('*')
        .eq('room_code', cleanCode)
        .single();

      if (roomErr || !room) throw new Error(`Room code "${cleanCode}" not found.`);

      const { data: players, error: playersErr } = await supabase
        .from('room_players')
        .select('id, player_number, player_name, avatar_index, is_host, is_connected, is_eliminated, has_voted')
        .eq('room_id', room.id)
        .order('player_number', { ascending: true });

      if (playersErr) throw new Error(playersErr.message);

      return {
        room_id: room.id,
        room_code: room.room_code,
        status: room.status,
        current_phase: room.current_phase,
        current_round_number: room.current_round_number,
        settings: room.settings,
        host_player_id: room.host_player_id,
        players: players || []
      };
    }
    return cloudEngine.getRoomState(cleanCode);
  },

  /**
   * Start a new round / match
   * Host does not receive a role; secret roles are distributed to players
   */
  async startRound(roomCode, hostToken, options = {}) {
    const cleanCode = roomCode.toUpperCase().trim();

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.rpc('rpc_start_round', {
        p_room_code: cleanCode,
        p_host_token: hostToken,
        p_options: options
      });
      if (error) throw new Error(error.message);
      return data;
    }
    return cloudEngine.startRound(cleanCode, hostToken, options);
  },

  /**
   * Securely retrieve the caller's private role card
   */
  async getMyPrivateRole(roomCode, playerToken) {
    const cleanCode = roomCode.toUpperCase().trim();

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.rpc('rpc_get_my_private_role', {
        p_room_code: cleanCode,
        p_player_token: playerToken
      });
      if (error) throw new Error(error.message);
      return data;
    }
    return cloudEngine.getMyPrivateRole(cleanCode, playerToken);
  },

  /**
   * Advance game phase (Host only)
   */
  async setGamePhase(roomCode, hostToken, newPhase) {
    const cleanCode = roomCode.toUpperCase().trim();

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.rpc('rpc_advance_phase', {
        p_room_code: cleanCode,
        p_host_token: hostToken,
        p_new_phase: newPhase
      });
      if (error) throw new Error(error.message);
      return data;
    }
    return cloudEngine.setGamePhase(cleanCode, hostToken, newPhase);
  },

  /**
   * Submit private vote
   */
  async submitVote(roomCode, playerToken, targetPlayerId) {
    const cleanCode = roomCode.toUpperCase().trim();

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.rpc('rpc_submit_vote', {
        p_room_code: cleanCode,
        p_player_token: playerToken,
        p_target_player_id: targetPlayerId
      });
      if (error) throw new Error(error.message);
      return data;
    }
    return cloudEngine.submitVote(cleanCode, playerToken, targetPlayerId);
  },

  /**
   * End voting & tally results (Host only)
   */
  async endVotingAndTally(roomCode, hostToken) {
    const cleanCode = roomCode.toUpperCase().trim();

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.rpc('rpc_end_voting_and_tally', {
        p_room_code: cleanCode,
        p_host_token: hostToken
      });
      if (error) throw new Error(error.message);
      return data;
    }
    return cloudEngine.endVotingAndTally(cleanCode, hostToken);
  },

  /**
   * Proceed to next investigation round (Round 2, 3... same topic)
   */
  async proceedToNextInvestigationRound(roomCode, hostToken) {
    const cleanCode = roomCode.toUpperCase().trim();

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.rpc('rpc_proceed_to_next_round', {
        p_room_code: cleanCode,
        p_host_token: hostToken
      });
      if (error) throw new Error(error.message);
      return data;
    }
    return cloudEngine.proceedToNextInvestigationRound(cleanCode, hostToken);
  },

  /**
   * Reset / Restart game back to lobby with fresh topic
   */
  async startNextRound(roomCode, hostToken) {
    const cleanCode = roomCode.toUpperCase().trim();

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.rpc('rpc_start_next_round', {
        p_room_code: cleanCode,
        p_host_token: hostToken
      });
      if (error) throw new Error(error.message);
      return data;
    }
    return cloudEngine.startNextRound(cleanCode, hostToken);
  },

  /**
   * Subscribe to real-time room updates
   */
  subscribeToRoom(roomCode, onUpdate) {
    const cleanCode = roomCode.toUpperCase().trim();

    if (isSupabaseConfigured && supabase) {
      const channel = supabase
        .channel(`room_${cleanCode}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'rooms', filter: `room_code=eq.${cleanCode}` },
          async () => {
            try {
              const updated = await this.getRoomState(cleanCode);
              onUpdate(updated);
            } catch (e) {}
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'room_players' },
          async () => {
            try {
              const updated = await this.getRoomState(cleanCode);
              onUpdate(updated);
            } catch (e) {}
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }

    return cloudEngine.subscribeToRoom(cleanCode, onUpdate);
  }
};
