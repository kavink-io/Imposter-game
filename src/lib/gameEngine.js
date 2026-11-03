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
   * Host is the Game Master / Moderator and does NOT receive a playing role or vote
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
    const hostId = `host-${Date.now()}`;

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
        imposterCount: settings.imposterCount || 'auto',
        includeJoker: settings.includeJoker !== undefined ? settings.includeJoker : true,
        ...settings
      },
      host_player_id: hostId,
      players: [
        {
          id: hostId,
          player_number: 0, // Host is slot 0 (Game Master)
          player_name: hostName.trim(),
          avatar_index: 0,
          is_host: true,
          is_connected: true,
          is_eliminated: false,
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
      player_number: 0,
      player_name: hostName.trim(),
      is_host: true
    };
  },

  /**
   * Join an existing room
   * Unlimited players supported! (Minimum 3 to start)
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
      const isLiveDomain = typeof window !== 'undefined' && 
        window.location.hostname !== 'localhost' && 
        window.location.hostname !== '127.0.0.1';

      if (isLiveDomain) {
        throw new Error(
          `Room "${cleanCode}" not found in this browser. The site is currently running in offline Local Mode (Supabase environment variables are missing on Vercel). To play between different phones or computers, configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your Vercel project settings.`
        );
      }
      throw new Error(`Room code "${cleanCode}" not found. Please verify the code and try again.`);
    }

    if (room.status !== 'LOBBY') {
      throw new Error('Game has already started in this room.');
    }

    if (room.players.some(p => p.player_name.toLowerCase() === cleanName.toLowerCase())) {
      throw new Error(`The name "${cleanName}" is already taken in this room.`);
    }

    // Non-host players count
    const nonHostCount = room.players.filter(p => !p.is_host).length;
    const playerToken = generateRandomToken();
    const playerNumber = nonHostCount + 1;
    const playerId = `player-${playerNumber}-${Date.now()}`;

    const newPlayer = {
      id: playerId,
      player_number: playerNumber,
      player_name: cleanName,
      avatar_index: (playerNumber - 1) % 8,
      is_host: false,
      is_connected: true,
      is_eliminated: false,
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

    // Local
    const room = getLocalState(cleanCode);
    if (!room) {
      throw new Error(`Room "${cleanCode}" not found in this browser's local storage.`);
    }
    return {
      ...room,
      players: room.players.map(({ player_token, ...rest }) => rest)
    };
  },

  /**
   * Start a new match / round
   * Host does NOT receive any role! Only joined non-host players receive roles.
   * Dynamic roles based on number of players (minimum 3 players, no maximum limit!)
   */
  async startRound(roomCode, hostToken, options = {}) {
    const cleanCode = roomCode.toUpperCase().trim();
    const {
      topicMode = 'random',
      selectedCategory = 'all',
      manualTopic = '',
      manualClue = '',
      imposterCount = 'auto',
      includeJoker = true
    } = options;

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.rpc('rpc_start_round', {
        p_room_code: cleanCode,
        p_host_token: hostToken,
        p_topic_mode: topicMode,
        p_manual_topic: manualTopic,
        p_manual_clue: manualClue,
        p_imposter_count: imposterCount === 'auto' ? 0 : Number(imposterCount),
        p_include_joker: Boolean(includeJoker)
      });
      if (error) throw new Error(error.message);
      return data;
    }

    // Local simulation
    const room = getLocalState(cleanCode);
    if (!room) throw new Error('Room not found.');

    const host = room.players.find(p => p.player_token === hostToken && p.is_host);
    if (!host) throw new Error('Unauthorized: Only host can start the game.');

    const participants = room.players.filter(p => !p.is_host);
    if (participants.length < 3) {
      throw new Error(`At least 3 players are required to start the game (currently ${participants.length}).`);
    }

    // Select topic & clue
    let selectedTopic, selectedClue, catName;
    if (topicMode === 'manual' && manualTopic.trim()) {
      selectedTopic = manualTopic.trim().toUpperCase();
      selectedClue = manualClue.trim().toUpperCase() || 'HOST CLUE';
      catName = 'Custom Host Topic';
    } else {
      const picked = getRandomTopic(selectedCategory || room.settings?.category || 'all');
      selectedTopic = picked.topic;
      selectedClue = picked.clue;
      catName = picked.category;
    }

    // Dynamic role calculation for participants
    const totalPlayers = participants.length;
    let numImposters;
    if (imposterCount !== 'auto' && Number(imposterCount) >= 1) {
      numImposters = Math.min(Number(imposterCount), Math.floor(totalPlayers / 2));
    } else {
      // Auto: 1 imposter for 3-5 players, 2 for 6-10 players, 3 for 11+ players
      numImposters = totalPlayers <= 5 ? 1 : totalPlayers <= 10 ? 2 : 3;
    }

    let hasJoker = Boolean(includeJoker) && totalPlayers >= 4;
    let numJokers = hasJoker ? 1 : 0;
    let numCivilians = totalPlayers - numImposters - numJokers;

    // Safety fallback
    if (numCivilians < 1) {
      numJokers = 0;
      numCivilians = totalPlayers - numImposters;
    }

    const rolePool = [];
    for (let i = 0; i < numImposters; i++) rolePool.push('IMPOSTER');
    for (let i = 0; i < numJokers; i++) rolePool.push('JOKER');
    for (let i = 0; i < numCivilians; i++) rolePool.push('CIVILIAN');

    const shuffledRoles = cryptoShuffle(rolePool);

    const privateRoles = {};
    // Host role representation: Host is Game Master
    privateRoles[host.id] = {
      role: 'HOST',
      secret_word: selectedTopic,
      clue: selectedClue,
      category: catName,
      instruction: 'You are the Game Master (Host)! You do not participate in voting or play a secret role. Guide players through discussion and voting.'
    };

    // Assign roles to participants only
    participants.forEach((player, idx) => {
      const role = shuffledRoles[idx];
      privateRoles[player.id] = {
        role,
        secret_word: role === 'IMPOSTER' ? null : selectedTopic,
        clue: role === 'IMPOSTER' ? selectedClue : null,
        category: catName,
        instruction: role === 'CIVILIAN'
          ? 'You are a Civilian! You know the secret word. Give subtle clues to prove you know it, and work with other civilians to identify the Imposter without voting for the Joker!'
          : role === 'IMPOSTER'
          ? 'You are an Imposter! You DO NOT know the secret word, but you have received a related clue. Listen carefully to other players, pretend you know the word, and blend in without getting exposed!'
          : 'You are the Joker! You know the secret word, BUT your goal is to act suspicious and pretend you are an imposter! If the group votes you out, YOU WIN!'
      };
    });

    const roundId = `round-${room.current_round_number}-${Date.now()}`;
    room.current_round = {
      id: roundId,
      round_number: 1,
      topic: selectedTopic,
      category: catName,
      clue: selectedClue,
      num_imposters: numImposters,
      status: 'ACTIVE',
      all_eliminated_player_ids: [],
      privateRoles
    };
    room.current_round_number = 1;
    room.status = 'IN_GAME';
    room.current_phase = 'ROLE_REVEAL';
    room.votes = {};
    room.players.forEach(p => {
      p.is_eliminated = false;
      p.has_voted = false;
    });

    saveLocalState(cleanCode, room);

    return {
      success: true,
      round_id: roundId,
      round_number: 1,
      phase: 'ROLE_REVEAL'
    };
  },

  /**
   * Securely retrieve the caller's private role card
   * Host gets Game Master overview card; players get their secret role card.
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
      round_number: room.current_round_number,
      player_id: player.id,
      player_name: player.player_name,
      player_number: player.player_number,
      is_host: player.is_host,
      is_eliminated: player.is_eliminated,
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
   * Rules:
   * - Host cannot vote
   * - Eliminated players cannot vote
   * - Cannot vote for host
   * - Cannot vote for eliminated player
   * - Cannot vote for self
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

    if (voter.is_host) {
      throw new Error('Host is the moderator and does not vote.');
    }

    if (voter.is_eliminated) {
      throw new Error('Eliminated players cannot vote.');
    }

    const target = room.players.find(p => p.id === targetPlayerId);
    if (!target) throw new Error('Target player not found.');

    if (target.is_host) {
      throw new Error('Host cannot be voted for.');
    }

    if (target.is_eliminated) {
      throw new Error('Cannot vote for an already eliminated player.');
    }

    if (voter.id === targetPlayerId) {
      throw new Error('You cannot vote for yourself!');
    }

    if (!room.votes) room.votes = {};
    room.votes[voter.id] = targetPlayerId;
    voter.has_voted = true;

    saveLocalState(cleanCode, room);

    const aliveVoters = room.players.filter(p => !p.is_host && !p.is_eliminated);
    const totalVotes = Object.keys(room.votes).length;
    const allVoted = aliveVoters.every(p => room.votes[p.id]);

    return {
      success: true,
      votes_cast: totalVotes,
      all_voted: allVoted
    };
  },

  /**
   * End voting, tally results, and check if Imposter was exposed
   * KEY FEATURE: Multiple rounds are conducted until the imposter is exposed!
   * - If Joker voted out -> Joker wins! Game over.
   * - If Imposter voted out -> Imposter exposed! Civilians win! Game over.
   * - If Civilian voted out -> Imposter is NOT exposed! Civilian eliminated. Game continues to Next Round!
   * - If Parity reached (alive Civilians <= alive Imposters) -> Imposters win! Game over.
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
    let highestVotedTargets = [];

    // Count votes
    Object.values(votes).forEach(targetId => {
      tally[targetId] = (tally[targetId] || 0) + 1;
    });

    Object.entries(tally).forEach(([targetId, count]) => {
      if (count > maxVotes) {
        maxVotes = count;
        highestVotedTargets = [targetId];
      } else if (count === maxVotes) {
        highestVotedTargets.push(targetId);
      }
    });

    let eliminatedPlayerId = null;
    let eliminatedRole = null;
    let isTie = false;

    if (highestVotedTargets.length === 1 && maxVotes > 0) {
      eliminatedPlayerId = highestVotedTargets[0];
      const p = room.players.find(x => x.id === eliminatedPlayerId);
      if (p) {
        p.is_eliminated = true;
        if (!room.current_round.all_eliminated_player_ids) room.current_round.all_eliminated_player_ids = [];
        room.current_round.all_eliminated_player_ids.push(eliminatedPlayerId);
      }
      eliminatedRole = room.current_round.privateRoles[eliminatedPlayerId]?.role;
    } else {
      isTie = true;
    }

    // Evaluate Victory / Round Outcome:
    let winner = 'NONE';
    let gameOver = false;
    let roundResult = 'CIVILIAN_ELIMINATED';
    let message = '';

    if (eliminatedRole === 'JOKER') {
      winner = 'JOKER';
      gameOver = true;
      roundResult = 'JOKER_ELIMINATED';
      message = '🃏 The Joker was voted out and wins the game through masterful deception!';
    } else if (eliminatedRole === 'IMPOSTER') {
      // Imposter exposed!
      roundResult = 'IMPOSTER_EXPOSED';
      
      // Check if any other imposters are still alive
      const remainingAliveImposters = room.players.filter(p => 
        !p.is_host && !p.is_eliminated && room.current_round.privateRoles[p.id]?.role === 'IMPOSTER'
      );

      if (remainingAliveImposters.length === 0) {
        winner = 'CIVILIANS';
        gameOver = true;
        message = '🚨 IMPOSTER EXPOSED! Civilians have caught the imposter and won the game!';
      } else {
        // Multiple imposters game, 1 caught but more remain
        winner = 'NONE';
        gameOver = false;
        message = `🚨 An Imposter was exposed! However, ${remainingAliveImposters.length} imposter is still at large! The hunt continues!`;
      }
    } else if (eliminatedRole === 'CIVILIAN') {
      roundResult = 'CIVILIAN_ELIMINATED';
      // An innocent civilian was voted out! Check parity with imposters
      const aliveCivilians = room.players.filter(p => 
        !p.is_host && !p.is_eliminated && room.current_round.privateRoles[p.id]?.role === 'CIVILIAN'
      );
      const aliveImposters = room.players.filter(p => 
        !p.is_host && !p.is_eliminated && room.current_round.privateRoles[p.id]?.role === 'IMPOSTER'
      );

      if (aliveCivilians.length <= aliveImposters.length) {
        winner = 'IMPOSTERS';
        gameOver = true;
        message = '🚨 The Imposters have reached parity with Civilians! The Imposters Win!';
      } else {
        winner = 'NONE';
        gameOver = false;
        message = '🚨 An Innocent Civilian was voted out! The Imposter is still at large! Moving to the next round of investigation...';
      }
    } else {
      // Tie / No one eliminated
      roundResult = 'TIE_SURVIVED';
      winner = 'NONE';
      gameOver = false;
      message = '⚖️ Voting tied! Nobody was eliminated this round. The Imposter is still at large!';
    }

    const allRoles = room.players.map(p => {
      const roleData = room.current_round.privateRoles[p.id] || {};
      return {
        player_id: p.id,
        player_name: p.player_name,
        player_number: p.player_number,
        avatar_index: p.avatar_index,
        is_host: p.is_host,
        role: roleData.role || (p.is_host ? 'HOST' : 'CIVILIAN'),
        secret_word: roleData.secret_word,
        clue: roleData.clue,
        is_eliminated: Boolean(p.is_eliminated),
        is_just_eliminated: p.id === eliminatedPlayerId,
        votes_received: tally[p.id] || 0
      };
    });

    room.current_phase = gameOver ? 'RESULTS' : 'RESULTS'; // ResultsView will handle round recap vs final game over!
    room.current_round.results = {
      winner,
      game_over: gameOver,
      round_number: room.current_round_number,
      round_result: roundResult,
      message,
      topic: room.current_round.topic,
      clue: room.current_round.clue,
      category: room.current_round.category,
      eliminated_player_id: eliminatedPlayerId,
      eliminated_role: eliminatedRole,
      is_tie: isTie,
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
   * Proceed to the Next Investigation Round (Round 2, 3...)
   * Continues the match with the SAME secret topic & clue until an imposter is exposed!
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

    // Local simulation
    const room = getLocalState(cleanCode);
    if (!room) throw new Error('Room not found.');

    const host = room.players.find(p => p.player_token === hostToken && p.is_host);
    if (!host) throw new Error('Unauthorized.');

    room.current_round_number += 1;
    room.current_phase = 'DISCUSSION';
    room.votes = {};
    // Reset has_voted for alive players
    room.players.forEach(p => {
      p.has_voted = false;
    });

    saveLocalState(cleanCode, room);

    return {
      success: true,
      round_number: room.current_round_number,
      phase: 'DISCUSSION'
    };
  },

  /**
   * Start a brand new match / game (after a game finishes)
   * Resets eliminated players and returns to lobby for a new topic
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

    room.current_round_number = 1;
    room.current_phase = 'WAITING';
    room.status = 'LOBBY';
    room.votes = {};
    room.current_round = null;
    room.players.forEach(p => {
      p.is_eliminated = false;
      p.has_voted = false;
    });

    saveLocalState(cleanCode, room);

    return {
      success: true,
      next_round_number: 1
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
