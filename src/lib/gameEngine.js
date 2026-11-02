import { supabase, isSupabaseConfigured } from './supabase';
import { getRandomTopic } from './topics';

// BroadcastChannel for cross-tab local multiplayer simulation
const localChannel = typeof window !== 'undefined' && window.BroadcastChannel 
  ? new BroadcastChannel('imposter_party_local_bus') 
  : null;

/**
 * Storage helpers for local simulation
 */
function getLocalState(roomCode) {
  try {
    const raw = localStorage.getItem(`imposter_party_${roomCode.toUpperCase()}`);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function saveLocalState(roomCode, state) {
  try {
    localStorage.setItem(`imposter_party_${roomCode.toUpperCase()}`, JSON.stringify(state));
    if (localChannel) {
      localChannel.postMessage({ type: 'ROOM_UPDATE', roomCode: roomCode.toUpperCase(), state });
    }
  } catch (e) {}
}

/**
 * Cryptographic random shuffle (Fisher-Yates)
 */
function cryptoShuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    let j;
    if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
      const rand = new Uint32Array(1);
      window.crypto.getRandomValues(rand);
      j = rand[0] % (i + 1);
    } else {
      j = Math.floor(Math.random() * (i + 1));
    }
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function generateRandomToken() {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    const bytes = new Uint8Array(24);
    window.crypto.getRandomValues(bytes);
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  }
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export const gameEngine = {
  isLiveSupabase: isSupabaseConfigured,

  /**
   * Create a new room
   */
  async createRoom(hostName, settings = {}) {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.rpc('rpc_create_room', {
        p_host_name: hostName,
        p_settings: settings
      });
      if (error) throw new Error(error.message);
      return data;
    }

    // Local / Offline Simulation
    const roomCode = generateCode();
    const hostToken = generateRandomToken();
    const hostId = `player-1-${Date.now()}`;

    const initialRoom = {
      room_id: `room-${Date.now()}`,
      room_code: roomCode,
      status: 'LOBBY',
      current_phase: 'WAITING',
      current_round_number: 1,
      settings: {
        topicMode: settings.topicMode || 'random',
        category: settings.category || 'all',
        discussionTime: settings.discussionTime || 180,
        ...settings
      },
      host_player_id: hostId,
      players: [
        {
          id: hostId,
          player_number: 1,
          player_name: hostName.trim(),
          avatar_index: 0,
          is_host: true,
          is_connected: true,
          player_token: hostToken,
          has_voted: false
        }
      ],
      rounds: [],
      votes: {},
      createdAt: new Date().toISOString()
    };

    saveLocalState(roomCode, initialRoom);

    return {
      success: true,
      room_id: initialRoom.room_id,
      room_code: roomCode,
      player_id: hostId,
      player_token: hostToken,
      player_number: 1,
      player_name: hostName.trim(),
      is_host: true
    };
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

    // Local simulation
    const room = getLocalState(cleanCode);
    if (!room) {
      throw new Error(`Room code ${cleanCode} not found.`);
    }

    if (room.status !== 'LOBBY') {
      throw new Error('Game has already started in this room.');
    }

    if (room.players.length >= 8) {
      throw new Error('Room is full! Exactly 8 players maximum.');
    }

    if (room.players.some(p => p.player_name.toLowerCase() === cleanName.toLowerCase())) {
      throw new Error(`The name "${cleanName}" is already taken in this room.`);
    }

    const playerToken = generateRandomToken();
    const playerNumber = room.players.length + 1;
    const playerId = `player-${playerNumber}-${Date.now()}`;

    const newPlayer = {
      id: playerId,
      player_number: playerNumber,
      player_name: cleanName,
      avatar_index: playerNumber - 1,
      is_host: false,
      is_connected: true,
      player_token: playerToken,
      has_voted: false
    };

    room.players.push(newPlayer);
    saveLocalState(cleanCode, room);

    return {
      success: true,
      room_id: room.room_id,
      room_code: room.room_code,
      player_id: playerId,
      player_token: playerToken,
      player_number: playerNumber,
      player_name: cleanName,
      is_host: false
    };
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

      if (roomErr || !room) throw new Error('Room not found');

      const { data: players, error: playersErr } = await supabase
        .from('room_players')
        .select('id, player_number, player_name, avatar_index, is_host, is_connected, has_voted')
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

    // Local
    const room = getLocalState(cleanCode);
    if (!room) throw new Error('Room not found');
    return {
      ...room,
      // Strip tokens from public players view for security parity
      players: room.players.map(({ player_token, ...rest }) => rest)
    };
  },

  /**
   * Start a new round with exactly 8 players & 5 Civilians, 2 Imposters, 1 Joker
   */
  async startRound(roomCode, hostToken, topicMode = 'random', manualTopic = '', manualClue = '') {
    const cleanCode = roomCode.toUpperCase().trim();

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.rpc('rpc_start_round', {
        p_room_code: cleanCode,
        p_host_token: hostToken,
        p_topic_mode: topicMode,
        p_manual_topic: manualTopic,
        p_manual_clue: manualClue
      });
      if (error) throw new Error(error.message);
      return data;
    }

    // Local simulation
    const room = getLocalState(cleanCode);
    if (!room) throw new Error('Room not found.');

    const host = room.players.find(p => p.player_token === hostToken && p.is_host);
    if (!host) throw new Error('Unauthorized: Only host can start the game.');

    if (room.players.length !== 8) {
      throw new Error(`Exactly 8 players are required to start the game (currently ${room.players.length}).`);
    }

    // Select topic & clue
    let selectedTopic, selectedClue, selectedCategory;
    if (topicMode === 'manual' && manualTopic.trim()) {
      selectedTopic = manualTopic.trim().toUpperCase();
      selectedClue = manualClue.trim().toUpperCase() || 'HOST CLUE';
      selectedCategory = 'Custom Topic';
    } else {
      const picked = getRandomTopic(room.settings?.category || 'all');
      selectedTopic = picked.topic;
      selectedClue = picked.clue;
      selectedCategory = picked.category;
    }

    // Assign roles: exactly 5 Civilians, 2 Imposters, 1 Joker
    const rolePool = ['IMPOSTER', 'IMPOSTER', 'JOKER', 'CIVILIAN', 'CIVILIAN', 'CIVILIAN', 'CIVILIAN', 'CIVILIAN'];
    const shuffledRoles = cryptoShuffle(rolePool);

    const privateRoles = {};
    room.players.forEach((player, idx) => {
      const role = shuffledRoles[idx];
      privateRoles[player.id] = {
        role,
        secret_word: role === 'IMPOSTER' ? null : selectedTopic,
        clue: role === 'IMPOSTER' ? selectedClue : null,
        category: selectedCategory,
        instruction: role === 'CIVILIAN'
          ? 'You are a Civilian! You know the secret word. Give subtle clues to prove you know it, and work with other civilians to identify the 2 Imposters and avoid voting for the Joker!'
          : role === 'IMPOSTER'
          ? 'You are an Imposter! You DO NOT know the secret word, but you have received a related clue. Listen carefully to other players, pretend you know the word, and blend in without getting caught!'
          : 'You are the Joker! You know the secret word, BUT your goal is to act suspicious and pretend you are an imposter! If the group votes you out, YOU WIN!'
      };
    });

    const roundId = `round-${room.current_round_number}-${Date.now()}`;
    room.current_round = {
      id: roundId,
      round_number: room.current_round_number,
      topic: selectedTopic,
      category: selectedCategory,
      clue: selectedClue,
      status: 'ACTIVE',
      privateRoles
    };
    room.status = 'IN_GAME';
    room.current_phase = 'ROLE_REVEAL';
    room.votes = {};
    room.players.forEach(p => p.has_voted = false);

    saveLocalState(cleanCode, room);

    return {
      success: true,
      round_id: roundId,
      round_number: room.current_round_number,
      phase: 'ROLE_REVEAL'
    };
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

    // Local simulation
    const room = getLocalState(cleanCode);
    if (!room) throw new Error('Room not found.');

    const player = room.players.find(p => p.player_token === playerToken);
    if (!player) throw new Error('Unauthorized: Invalid player token.');

    if (!room.current_round || !room.current_round.privateRoles) {
      return { has_role: false, message: 'Round not started yet.' };
    }

    const roleData = room.current_round.privateRoles[player.id];
    if (!roleData) return { has_role: false, message: 'Role not assigned.' };

    return {
      has_role: true,
      round_id: room.current_round.id,
      round_number: room.current_round.round_number,
      player_id: player.id,
      player_name: player.player_name,
      player_number: player.player_number,
      role: roleData.role,
      secret_word: roleData.secret_word,
      clue: roleData.clue,
      category: roleData.category,
      instruction: roleData.instruction
    };
  },

  /**
   * Set game phase (Host only)
   */
  async setGamePhase(roomCode, hostToken, newPhase) {
    const cleanCode = roomCode.toUpperCase().trim();

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.rpc('rpc_set_game_phase', {
        p_room_code: cleanCode,
        p_host_token: hostToken,
        p_new_phase: newPhase
      });
      if (error) throw new Error(error.message);
      return data;
    }

    // Local simulation
    const room = getLocalState(cleanCode);
    if (!room) throw new Error('Room not found.');

    const host = room.players.find(p => p.player_token === hostToken && p.is_host);
    if (!host) throw new Error('Unauthorized: Host only.');

    room.current_phase = newPhase;
    saveLocalState(cleanCode, room);

    return { success: true, phase: newPhase };
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

    // Local simulation
    const room = getLocalState(cleanCode);
    if (!room) throw new Error('Room not found.');
    if (room.current_phase !== 'VOTING') throw new Error('Voting is not currently open.');

    const voter = room.players.find(p => p.player_token === playerToken);
    if (!voter) throw new Error('Unauthorized voter token.');

    if (voter.id === targetPlayerId) {
      throw new Error('You cannot vote for yourself!');
    }

    if (!room.votes) room.votes = {};
    room.votes[voter.id] = targetPlayerId;
    voter.has_voted = true;

    saveLocalState(cleanCode, room);

    const totalVotes = Object.keys(room.votes).length;
    return {
      success: true,
      votes_cast: totalVotes,
      all_voted: totalVotes === 8
    };
  },

  /**
   * End voting, tally results, determine winner & reveal all roles
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

    // Local simulation
    const room = getLocalState(cleanCode);
    if (!room) throw new Error('Room not found.');

    const host = room.players.find(p => p.player_token === hostToken && p.is_host);
    if (!host) throw new Error('Unauthorized host.');

    const votes = room.votes || {};
    const tally = {};
    let maxVotes = 0;
    let eliminatedIds = [];

    // Count votes
    Object.values(votes).forEach(targetId => {
      tally[targetId] = (tally[targetId] || 0) + 1;
    });

    Object.entries(tally).forEach(([targetId, count]) => {
      if (count > maxVotes) {
        maxVotes = count;
        eliminatedIds = [targetId];
      } else if (count === maxVotes) {
        eliminatedIds.push(targetId);
      }
    });

    // Determine victory
    let jokerEliminated = false;
    let impostersEliminatedCount = 0;
    const eliminatedRoles = [];

    eliminatedIds.forEach(id => {
      const role = room.current_round.privateRoles[id]?.role;
      eliminatedRoles.push(role);
      if (role === 'JOKER') jokerEliminated = true;
      if (role === 'IMPOSTER') impostersEliminatedCount++;
    });

    let winner;
    if (jokerEliminated) {
      winner = 'JOKER';
    } else if (impostersEliminatedCount >= 2 || (impostersEliminatedCount === 1 && eliminatedIds.length === 1)) {
      winner = 'CIVILIANS';
    } else {
      winner = 'IMPOSTERS';
    }

    const allRoles = room.players.map(p => {
      const roleData = room.current_round.privateRoles[p.id];
      return {
        player_id: p.id,
        player_name: p.player_name,
        player_number: p.player_number,
        avatar_index: p.avatar_index,
        role: roleData.role,
        secret_word: roleData.secret_word,
        clue: roleData.clue,
        is_eliminated: eliminatedIds.includes(p.id),
        votes_received: tally[p.id] || 0
      };
    });

    room.current_phase = 'RESULTS';
    room.current_round.results = {
      winner,
      topic: room.current_round.topic,
      clue: room.current_round.clue,
      category: room.current_round.category,
      eliminated_player_ids: eliminatedIds,
      eliminated_roles: eliminatedRoles,
      vote_summary: tally,
      all_roles: allRoles
    };

    saveLocalState(cleanCode, room);

    return {
      success: true,
      ...room.current_round.results
    };
  },

  /**
   * Start next round (Round 2, 3...) with the same 8 players
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

    // Local simulation
    const room = getLocalState(cleanCode);
    if (!room) throw new Error('Room not found.');

    const host = room.players.find(p => p.player_token === hostToken && p.is_host);
    if (!host) throw new Error('Unauthorized.');

    room.current_round_number += 1;
    room.current_phase = 'WAITING';
    room.status = 'LOBBY';
    room.votes = {};
    room.players.forEach(p => p.has_voted = false);

    saveLocalState(cleanCode, room);

    return {
      success: true,
      next_round_number: room.current_round_number
    };
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
          () => {
            gameEngine.getRoomState(cleanCode).then(onUpdate).catch(console.error);
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'room_players' },
          () => {
            gameEngine.getRoomState(cleanCode).then(onUpdate).catch(console.error);
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'rounds' },
          () => {
            gameEngine.getRoomState(cleanCode).then(onUpdate).catch(console.error);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }

    // Local cross-tab listener using BroadcastChannel and storage events
    const handleMessage = (evt) => {
      if (evt.data && evt.data.roomCode === cleanCode) {
        gameEngine.getRoomState(cleanCode).then(onUpdate).catch(console.error);
      }
    };

    const handleStorage = (evt) => {
      if (evt.key === `imposter_party_${cleanCode}`) {
        gameEngine.getRoomState(cleanCode).then(onUpdate).catch(console.error);
      }
    };

    if (localChannel) {
      localChannel.addEventListener('message', handleMessage);
    }
    window.addEventListener('storage', handleStorage);

    return () => {
      if (localChannel) localChannel.removeEventListener('message', handleMessage);
      window.removeEventListener('storage', handleStorage);
    };
  }
};
