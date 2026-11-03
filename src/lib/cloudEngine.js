import mqtt from 'mqtt';
import { getRandomTopic } from './topics.js';

// Free, globally distributed public secure MQTT WebSocket brokers
const PRIMARY_BROKER = 'wss://broker.emqx.io:8084/mqtt';
const FALLBACK_BROKER = 'wss://broker.hivemq.com:8884/mqtt';

// Active MQTT connection singleton
let activeClient = null;
let activeBrokerUrl = PRIMARY_BROKER;
let activeSubscriptions = new Map(); // topic -> Set of callbacks
let roomStateCache = new Map(); // roomCode -> latest state
let privateRoleCache = new Map(); // token -> role
let isHostListening = false;
let currentHostRoomCode = null;

/**
 * Generate a random unique ID
 */
function generateId(prefix = 'id') {
  return `${prefix}_${Math.random().toString(36).substring(2, 9)}_${Date.now().toString(36)}`;
}

/**
 * Get or establish MQTT client connection
 */
function getMqttClient() {
  if (activeClient && activeClient.connected) {
    return Promise.resolve(activeClient);
  }

  return new Promise((resolve, reject) => {
    if (activeClient) {
      if (activeClient.connected) {
        return resolve(activeClient);
      }
    }

    const clientId = `imp_${Math.random().toString(36).substring(2, 10)}_${Date.now()}`;
    const client = mqtt.connect(activeBrokerUrl, {
      clientId,
      clean: true,
      keepalive: 45,
      reconnectPeriod: 2500,
      connectTimeout: 8000
    });

    const timeout = setTimeout(() => {
      if (!client.connected) {
        console.warn(`MQTT connection to ${activeBrokerUrl} timed out, trying fallback...`);
        try { client.end(true); } catch (e) {}
        activeBrokerUrl = activeBrokerUrl === PRIMARY_BROKER ? FALLBACK_BROKER : PRIMARY_BROKER;
        const fbClient = mqtt.connect(activeBrokerUrl, {
          clientId,
          clean: true,
          keepalive: 45,
          reconnectPeriod: 2500,
          connectTimeout: 8000
        });
        fbClient.on('connect', () => {
          activeClient = fbClient;
          setupClientListeners(fbClient);
          resolve(fbClient);
        });
        fbClient.on('error', (err) => {
          console.error('Fallback MQTT error:', err);
        });
      }
    }, 5000);

    client.on('connect', () => {
      clearTimeout(timeout);
      activeClient = client;
      setupClientListeners(client);
      resolve(client);
    });

    client.on('error', (err) => {
      console.warn('MQTT client error:', err.message);
    });
  });
}

function setupClientListeners(client) {
  client.on('message', (topic, payload) => {
    try {
      const text = payload.toString();
      if (!text) return;
      const data = JSON.parse(text);

      // Notify any subscribers for this topic or prefix
      activeSubscriptions.forEach((callbacks, subscribedTopic) => {
        if (topic === subscribedTopic || topic.startsWith(subscribedTopic.replace('/#', ''))) {
          callbacks.forEach(cb => {
            try { cb(data, topic); } catch (e) { console.error('Subscription callback error:', e); }
          });
        }
      });
    } catch (e) {
      // Non-JSON message or parse error
    }
  });
}

/**
 * Subscribe to an MQTT topic with a callback
 */
async function subscribeTopic(topic, callback) {
  const client = await getMqttClient();

  if (!activeSubscriptions.has(topic)) {
    activeSubscriptions.set(topic, new Set());
    client.subscribe(topic, { qos: 1 });
  }

  activeSubscriptions.get(topic).add(callback);

  return () => {
    const set = activeSubscriptions.get(topic);
    if (set) {
      set.delete(callback);
      if (set.size === 0) {
        activeSubscriptions.delete(topic);
        try { client.unsubscribe(topic); } catch (e) {}
      }
    }
  };
}

/**
 * Publish an MQTT message
 */
async function publishTopic(topic, payload, retain = false) {
  const client = await getMqttClient();
  const text = typeof payload === 'string' ? payload : JSON.stringify(payload);
  return new Promise((resolve) => {
    client.publish(topic, text, { qos: 1, retain }, () => {
      resolve();
    });
  });
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

// Local storage backup helpers
function getLocalBackup(cleanCode) {
  try {
    const raw = localStorage.getItem(`imposter_party_${cleanCode}`);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function saveLocalBackup(cleanCode, state) {
  try {
    localStorage.setItem(`imposter_party_${cleanCode}`, JSON.stringify(state));
  } catch (e) {}
}

/**
 * Register Host listeners for incoming participant actions (Join, Vote, etc.)
 */
function startHostDaemon(cleanCode) {
  if (isHostListening && currentHostRoomCode === cleanCode) return;
  isHostListening = true;
  currentHostRoomCode = cleanCode;

  const actionsTopic = `imposter-party/v2/room/${cleanCode}/actions`;
  const eventsTopic = `imposter-party/v2/room/${cleanCode}/events`;
  const stateTopic = `imposter-party/v2/room/${cleanCode}/state`;

  subscribeTopic(actionsTopic, async (action) => {
    let hostRoom = getLocalBackup(cleanCode) || roomStateCache.get(cleanCode);
    if (!hostRoom) return;

    // 1. Handle Join Requests from other phones/computers
    if (action.type === 'JOIN_REQUEST') {
      const cleanName = (action.playerName || '').trim();
      const requestId = action.requestId;

      if (!cleanName) {
        publishTopic(eventsTopic, { type: 'JOIN_REJECTED', requestId, reason: 'Invalid display name.' });
        return;
      }

      if (hostRoom.status !== 'LOBBY') {
        publishTopic(eventsTopic, { type: 'JOIN_REJECTED', requestId, reason: 'Game has already started in this room.' });
        return;
      }

      if (hostRoom.players.some(p => p.player_name.toLowerCase() === cleanName.toLowerCase())) {
        publishTopic(eventsTopic, { type: 'JOIN_REJECTED', requestId, reason: `The name "${cleanName}" is already taken.` });
        return;
      }

      const nonHostPlayers = hostRoom.players.filter(p => !p.is_host);
      const playerNumber = nonHostPlayers.length + 1;
      const playerId = `player-${playerNumber}-${Date.now()}`;
      const playerToken = generateRandomToken();

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

      hostRoom.players.push(newPlayer);
      saveLocalBackup(cleanCode, hostRoom);
      roomStateCache.set(cleanCode, hostRoom);

      // Broadcast public room state (strip secret tokens)
      const publicPlayers = hostRoom.players.map(({ player_token, ...p }) => p);
      const publicState = { ...hostRoom, players: publicPlayers };
      await publishTopic(stateTopic, publicState, true);

      // Reply directly to joining player with their credentials
      await publishTopic(eventsTopic, {
        type: 'JOIN_ACCEPTED',
        requestId,
        player: {
          id: playerId,
          player_name: cleanName,
          player_number: playerNumber,
          player_token: playerToken,
          is_host: false,
          room_id: hostRoom.room_id,
          room_code: hostRoom.room_code
        }
      });
    }

    // 2. Handle Votes submitted by participants
    else if (action.type === 'SUBMIT_VOTE') {
      const { playerToken, targetPlayerId } = action;
      const voter = hostRoom.players.find(p => p.player_token === playerToken && !p.is_host);
      if (!voter || voter.is_eliminated || hostRoom.current_phase !== 'VOTING') return;

      if (!hostRoom.votes) hostRoom.votes = {};
      hostRoom.votes[voter.id] = targetPlayerId;
      voter.has_voted = true;

      saveLocalBackup(cleanCode, hostRoom);
      roomStateCache.set(cleanCode, hostRoom);

      // Broadcast updated public state (shows voter has_voted = true without leaking target)
      const publicPlayers = hostRoom.players.map(({ player_token, ...p }) => p);
      const publicState = { ...hostRoom, players: publicPlayers };
      await publishTopic(stateTopic, publicState, true);
    }
  });
}

/**
 * Cloud Real-Time Engine (Zero-Config Global Multiplayer)
 */
export const cloudEngine = {
  isConfigured: true,

  /**
   * Create a new room as Host (Game Master)
   */
  async createRoom(hostName, settings = {}) {
    const cleanName = hostName.trim();
    const cleanCode = generateCode();
    const roomId = generateId('room');
    const hostToken = generateRandomToken();
    const hostId = `host-${Date.now()}`;

    const hostPlayer = {
      id: hostId,
      player_number: 0,
      player_name: cleanName,
      avatar_index: 0,
      is_host: true,
      is_connected: true,
      is_eliminated: false,
      player_token: hostToken,
      has_voted: false
    };

    const roomState = {
      room_id: roomId,
      room_code: cleanCode,
      status: 'LOBBY',
      current_phase: 'WAITING',
      current_round_number: 1,
      settings: {
        discussionTime: settings.discussionTime || 180,
        ...settings
      },
      host_player_id: hostId,
      players: [hostPlayer],
      votes: {},
      current_round: null
    };

    saveLocalBackup(cleanCode, roomState);
    roomStateCache.set(cleanCode, roomState);

    // Start host listener for actions from joining devices
    startHostDaemon(cleanCode);

    // Publish retained state to public MQTT topic
    const stateTopic = `imposter-party/v2/room/${cleanCode}/state`;
    const publicPlayers = [ { ...hostPlayer, player_token: undefined } ];
    await publishTopic(stateTopic, { ...roomState, players: publicPlayers }, true);

    return {
      success: true,
      room_id: roomId,
      room_code: cleanCode,
      player_id: hostId,
      player_token: hostToken,
      player_number: 0,
      player_name: cleanName,
      is_host: true
    };
  },

  /**
   * Fetch current room state from cloud
   */
  async getRoomState(roomCode) {
    const cleanCode = roomCode.toUpperCase().trim();

    // 1. Check local cache or host backup
    const cached = roomStateCache.get(cleanCode) || getLocalBackup(cleanCode);
    if (cached) {
      const publicPlayers = cached.players.map(({ player_token, ...p }) => p);
      return { ...cached, players: publicPlayers };
    }

    // 2. Query cloud topic for retained state
    const stateTopic = `imposter-party/v2/room/${cleanCode}/state`;
    return new Promise((resolve, reject) => {
      let resolved = false;

      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          unsub();
          reject(new Error(`Room "${cleanCode}" not found. Please verify the code or check that the host is online.`));
        }
      }, 4500);

      let unsub = () => {};
      subscribeTopic(stateTopic, (data) => {
        if (!resolved && data && data.room_code === cleanCode) {
          resolved = true;
          clearTimeout(timeout);
          roomStateCache.set(cleanCode, data);
          unsub();
          resolve(data);
        }
      }).then(u => { unsub = u; });
    });
  },

  /**
   * Join an existing room from any phone or computer
   */
  async joinRoom(roomCode, playerName) {
    const cleanCode = roomCode.toUpperCase().trim();
    const cleanName = playerName.trim();

    // 1. First verify the room exists in the cloud
    let initialRoom;
    try {
      initialRoom = await this.getRoomState(cleanCode);
    } catch (e) {
      throw new Error(`Room code "${cleanCode}" not found. Please verify the code and ensure the host has created the room.`);
    }

    if (initialRoom.status !== 'LOBBY') {
      throw new Error('Game has already started in this room.');
    }

    if (initialRoom.players?.some(p => p.player_name.toLowerCase() === cleanName.toLowerCase())) {
      throw new Error(`The name "${cleanName}" is already taken in this room.`);
    }

    // 2. Send join request to host
    const actionsTopic = `imposter-party/v2/room/${cleanCode}/actions`;
    const eventsTopic = `imposter-party/v2/room/${cleanCode}/events`;
    const requestId = generateId('req');

    return new Promise((resolve, reject) => {
      let resolved = false;
      let unsub = () => {};

      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          unsub();
          reject(new Error('Connection timed out waiting for the Host to accept. Please try again.'));
        }
      }, 7000);

      subscribeTopic(eventsTopic, (event) => {
        if (event && event.requestId === requestId) {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            unsub();

            if (event.type === 'JOIN_ACCEPTED') {
              resolve(event.player);
            } else {
              reject(new Error(event.reason || 'Could not join room.'));
            }
          }
        }
      }).then(u => {
        unsub = u;
        // Publish join request
        publishTopic(actionsTopic, {
          type: 'JOIN_REQUEST',
          playerName: cleanName,
          requestId
        });
      });
    });
  },

  /**
   * Start a round (Host only)
   */
  async startRound(roomCode, hostToken, options = {}) {
    const cleanCode = roomCode.toUpperCase().trim();
    const hostRoom = getLocalBackup(cleanCode) || roomStateCache.get(cleanCode);
    if (!hostRoom) throw new Error('Room not found.');

    const host = hostRoom.players.find(p => p.player_token === hostToken && p.is_host);
    if (!host) throw new Error('Unauthorized: Host only action.');

    const nonHostPlayers = hostRoom.players.filter(p => !p.is_host);
    if (nonHostPlayers.length < 3) {
      throw new Error(`At least 3 players are required to start the game (currently ${nonHostPlayers.length}).`);
    }

    // Determine topic
    const {
      topicMode = 'random',
      selectedCategory = 'all',
      manualTopic = '',
      manualClue = '',
      imposterCount = 'auto',
      includeJoker = true
    } = options;

    let secretWord = '';
    let imposterClue = '';
    let category = 'General';

    if (topicMode === 'manual' && manualTopic.trim()) {
      secretWord = manualTopic.trim().toUpperCase();
      imposterClue = (manualClue.trim() || 'Related Concept').toUpperCase();
      category = 'Custom Topic';
    } else {
      const topicObj = getRandomTopic(selectedCategory);
      secretWord = (topicObj.topic || topicObj.word || '').toUpperCase();
      imposterClue = (topicObj.clue || '').toUpperCase();
      category = topicObj.category || 'General';
    }

    // Dynamic role allocation
    const totalCount = nonHostPlayers.length;
    let numImposters;
    if (imposterCount === 'auto') {
      numImposters = totalCount <= 5 ? 1 : totalCount <= 10 ? 2 : 3;
    } else {
      numImposters = Math.min(Number(imposterCount), Math.max(1, Math.floor(totalCount / 2)));
    }

    const hasJoker = includeJoker && totalCount >= 4;
    const numJokers = hasJoker ? 1 : 0;
    const numCivilians = totalCount - numImposters - numJokers;

    const rolesPool = [];
    for (let i = 0; i < numCivilians; i++) rolesPool.push('CIVILIAN');
    for (let i = 0; i < numImposters; i++) rolesPool.push('IMPOSTER');
    for (let i = 0; i < numJokers; i++) rolesPool.push('JOKER');

    const shuffledRoles = cryptoShuffle(rolesPool);
    const shuffledPlayers = cryptoShuffle(nonHostPlayers);

    const privateRoles = {};
    const roundId = generateId('round');

    // Host private card (Game Master overview)
    privateRoles[host.id] = {
      role: 'HOST',
      secret_word: secretWord,
      clue: imposterClue,
      category,
      instruction: '👑 You are the Game Master! You do not play a role or vote. Coordinate rounds and discussion.'
    };

    // Assign and securely distribute each player's secret role
    shuffledPlayers.forEach((player, idx) => {
      const assignedRole = shuffledRoles[idx];
      let instruction = '';

      if (assignedRole === 'CIVILIAN') {
        instruction = 'You are a Civilian! You know the secret word. Give subtle clues and find the Imposters without giving the word away!';
      } else if (assignedRole === 'IMPOSTER') {
        instruction = 'You are an Imposter! You DO NOT know the secret word, but you have a related clue. Blend in, listen closely, and guess the word!';
      } else if (assignedRole === 'JOKER') {
        instruction = 'You are the Joker! You know the secret word, but your secret objective is to get voted out! Act suspiciously!';
      }

      const roleCard = {
        has_role: true,
        round_id: roundId,
        round_number: hostRoom.current_round_number || 1,
        player_id: player.id,
        player_name: player.player_name,
        player_number: player.player_number,
        is_host: false,
        is_eliminated: false,
        role: assignedRole,
        secret_word: assignedRole === 'IMPOSTER' ? null : secretWord,
        clue: assignedRole === 'CIVILIAN' ? null : imposterClue,
        category,
        instruction
      };

      privateRoles[player.id] = roleCard;

      // Publish securely to that player's private topic with retain: true
      const roleTopic = `imposter-party/v2/room/${cleanCode}/role/${player.player_token}`;
      publishTopic(roleTopic, roleCard, true);
    });

    // Update room state
    hostRoom.status = 'IN_PROGRESS';
    hostRoom.current_phase = 'ROLE_REVEAL';
    hostRoom.votes = {};
    hostRoom.players.forEach(p => {
      p.is_eliminated = false;
      p.has_voted = false;
    });

    hostRoom.current_round = {
      id: roundId,
      round_number: hostRoom.current_round_number || 1,
      secret_word: secretWord,
      clue: imposterClue,
      category,
      privateRoles,
      results: null
    };

    saveLocalBackup(cleanCode, hostRoom);
    roomStateCache.set(cleanCode, hostRoom);

    // Broadcast updated public room state
    const stateTopic = `imposter-party/v2/room/${cleanCode}/state`;
    const publicPlayers = hostRoom.players.map(({ player_token, ...p }) => p);
    await publishTopic(stateTopic, { ...hostRoom, players: publicPlayers }, true);

    return {
      success: true,
      round_id: roundId,
      phase: 'ROLE_REVEAL'
    };
  },

  /**
   * Securely retrieve caller's private role card
   */
  async getMyPrivateRole(roomCode, playerToken) {
    const cleanCode = roomCode.toUpperCase().trim();

    // 1. Check if caller is Host
    const hostRoom = getLocalBackup(cleanCode) || roomStateCache.get(cleanCode);
    if (hostRoom?.current_round?.privateRoles) {
      const host = hostRoom.players?.find(p => p.player_token === playerToken);
      if (host) {
        const card = hostRoom.current_round.privateRoles[host.id];
        if (card) return { has_role: true, ...card };
      }
    }

    // 2. Fetch from cloud private role topic
    if (privateRoleCache.has(playerToken)) {
      return privateRoleCache.get(playerToken);
    }

    const roleTopic = `imposter-party/v2/room/${cleanCode}/role/${playerToken}`;
    return new Promise((resolve) => {
      let resolved = false;

      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          unsub();
          resolve({ has_role: false, message: 'Role not assigned yet.' });
        }
      }, 3500);

      let unsub = () => {};
      subscribeTopic(roleTopic, (roleData) => {
        if (!resolved && roleData && roleData.has_role) {
          resolved = true;
          clearTimeout(timeout);
          privateRoleCache.set(playerToken, roleData);
          unsub();
          resolve(roleData);
        }
      }).then(u => { unsub = u; });
    });
  },

  /**
   * Advance game phase (Host only)
   */
  async setGamePhase(roomCode, hostToken, newPhase) {
    const cleanCode = roomCode.toUpperCase().trim();
    const hostRoom = getLocalBackup(cleanCode) || roomStateCache.get(cleanCode);
    if (!hostRoom) throw new Error('Room not found.');

    const host = hostRoom.players.find(p => p.player_token === hostToken && p.is_host);
    if (!host) throw new Error('Unauthorized.');

    hostRoom.current_phase = newPhase;
    saveLocalBackup(cleanCode, hostRoom);
    roomStateCache.set(cleanCode, hostRoom);

    const stateTopic = `imposter-party/v2/room/${cleanCode}/state`;
    const publicPlayers = hostRoom.players.map(({ player_token, ...p }) => p);
    await publishTopic(stateTopic, { ...hostRoom, players: publicPlayers }, true);

    return { success: true, phase: newPhase };
  },

  /**
   * Submit private vote
   */
  async submitVote(roomCode, playerToken, targetPlayerId) {
    const cleanCode = roomCode.toUpperCase().trim();
    const actionsTopic = `imposter-party/v2/room/${cleanCode}/actions`;

    await publishTopic(actionsTopic, {
      type: 'SUBMIT_VOTE',
      playerToken,
      targetPlayerId
    });

    return { success: true };
  },

  /**
   * End voting & tally results (Host only)
   */
  async endVotingAndTally(roomCode, hostToken) {
    const cleanCode = roomCode.toUpperCase().trim();
    const hostRoom = getLocalBackup(cleanCode) || roomStateCache.get(cleanCode);
    if (!hostRoom) throw new Error('Room not found.');

    const host = hostRoom.players.find(p => p.player_token === hostToken && p.is_host);
    if (!host) throw new Error('Unauthorized.');

    const votes = hostRoom.votes || {};
    const voteCounts = {};
    Object.values(votes).forEach(targetId => {
      voteCounts[targetId] = (voteCounts[targetId] || 0) + 1;
    });

    let maxVotes = 0;
    const highestTargets = [];
    Object.entries(voteCounts).forEach(([targetId, count]) => {
      if (count > maxVotes) {
        maxVotes = count;
        highestTargets.length = 0;
        highestTargets.push(targetId);
      } else if (count === maxVotes) {
        highestTargets.push(targetId);
      }
    });

    let eliminatedPlayerId = null;
    let eliminatedRole = null;
    let isTie = false;

    if (highestTargets.length === 1 && maxVotes > 0) {
      eliminatedPlayerId = highestTargets[0];
      const p = hostRoom.players.find(x => x.id === eliminatedPlayerId);
      if (p) p.is_eliminated = true;
      eliminatedRole = hostRoom.current_round?.privateRoles?.[eliminatedPlayerId]?.role;
    } else {
      isTie = true;
    }

    let winner = 'NONE';
    let gameOver = false;
    let message = '';

    if (eliminatedRole === 'JOKER') {
      winner = 'JOKER';
      gameOver = true;
      message = '🃏 The Joker was voted out and wins the game through masterful deception!';
    } else if (eliminatedRole === 'IMPOSTER') {
      const remainingAliveImposters = hostRoom.players.filter(p =>
        !p.is_host && !p.is_eliminated && hostRoom.current_round?.privateRoles?.[p.id]?.role === 'IMPOSTER'
      );
      if (remainingAliveImposters.length === 0) {
        winner = 'CIVILIANS';
        gameOver = true;
        message = '🚨 IMPOSTER EXPOSED! Civilians have caught the imposter and won the game!';
      } else {
        winner = 'NONE';
        gameOver = false;
        message = `🚨 An Imposter was exposed! However, ${remainingAliveImposters.length} imposter is still at large! Hunt continues!`;
      }
    } else if (eliminatedRole === 'CIVILIAN') {
      const aliveCivilians = hostRoom.players.filter(p =>
        !p.is_host && !p.is_eliminated && hostRoom.current_round?.privateRoles?.[p.id]?.role === 'CIVILIAN'
      );
      const aliveImposters = hostRoom.players.filter(p =>
        !p.is_host && !p.is_eliminated && hostRoom.current_round?.privateRoles?.[p.id]?.role === 'IMPOSTER'
      );
      if (aliveCivilians.length <= aliveImposters.length) {
        winner = 'IMPOSTERS';
        gameOver = true;
        message = '🚨 Imposters have reached parity with Civilians! Imposters Win!';
      } else {
        winner = 'NONE';
        gameOver = false;
        message = '🚨 An Innocent Civilian was voted out! The Imposter is still at large! Proceeding to next round...';
      }
    } else {
      winner = 'NONE';
      gameOver = false;
      message = 'Tie vote! No consensus reached. The Imposter remains undetected! Moving to next round...';
    }

    const allRoles = hostRoom.players.map(p => ({
      player_id: p.id,
      player_name: p.player_name,
      is_host: p.is_host,
      is_eliminated: Boolean(p.is_eliminated),
      role: hostRoom.current_round?.privateRoles?.[p.id]?.role || (p.is_host ? 'HOST' : 'CIVILIAN'),
      votes_received: voteCounts[p.id] || 0
    }));

    const tallyResults = {
      round_id: hostRoom.current_round?.id,
      round_number: hostRoom.current_round_number,
      total_votes: Object.keys(votes).length,
      eliminated_player_id: eliminatedPlayerId,
      eliminated_role: eliminatedRole,
      is_tie: isTie,
      winner,
      game_over: gameOver,
      message,
      topic: hostRoom.current_round?.secret_word,
      clue: hostRoom.current_round?.clue,
      category: hostRoom.current_round?.category,
      all_roles: allRoles
    };

    if (hostRoom.current_round) {
      hostRoom.current_round.results = tallyResults;
    }

    hostRoom.current_phase = 'RESULTS';
    if (gameOver) hostRoom.status = 'COMPLETED';

    saveLocalBackup(cleanCode, hostRoom);
    roomStateCache.set(cleanCode, hostRoom);

    // Publish results and updated state
    const resultsTopic = `imposter-party/v2/room/${cleanCode}/results`;
    await publishTopic(resultsTopic, tallyResults, true);

    const stateTopic = `imposter-party/v2/room/${cleanCode}/state`;
    const publicPlayers = hostRoom.players.map(({ player_token, ...p }) => p);
    await publishTopic(stateTopic, { ...hostRoom, players: publicPlayers, current_round: { results: tallyResults } }, true);

    return tallyResults;
  },

  /**
   * Proceed to next round (Round 2, 3... same topic)
   */
  async proceedToNextInvestigationRound(roomCode, hostToken) {
    const cleanCode = roomCode.toUpperCase().trim();
    const hostRoom = getLocalBackup(cleanCode) || roomStateCache.get(cleanCode);
    if (!hostRoom) throw new Error('Room not found.');

    const host = hostRoom.players.find(p => p.player_token === hostToken && p.is_host);
    if (!host) throw new Error('Unauthorized.');

    hostRoom.current_round_number = (hostRoom.current_round_number || 1) + 1;
    hostRoom.current_phase = 'DISCUSSION';
    hostRoom.votes = {};
    hostRoom.players.forEach(p => {
      p.has_voted = false;
    });

    saveLocalBackup(cleanCode, hostRoom);
    roomStateCache.set(cleanCode, hostRoom);

    const stateTopic = `imposter-party/v2/room/${cleanCode}/state`;
    const publicPlayers = hostRoom.players.map(({ player_token, ...p }) => p);
    await publishTopic(stateTopic, { ...hostRoom, players: publicPlayers }, true);

    return { success: true, round_number: hostRoom.current_round_number, phase: 'DISCUSSION' };
  },

  /**
   * Reset / Restart game back to lobby with fresh topic
   */
  async startNextRound(roomCode, hostToken) {
    const cleanCode = roomCode.toUpperCase().trim();
    const hostRoom = getLocalBackup(cleanCode) || roomStateCache.get(cleanCode);
    if (!hostRoom) throw new Error('Room not found.');

    const host = hostRoom.players.find(p => p.player_token === hostToken && p.is_host);
    if (!host) throw new Error('Unauthorized.');

    hostRoom.current_round_number = 1;
    hostRoom.current_phase = 'WAITING';
    hostRoom.status = 'LOBBY';
    hostRoom.votes = {};
    hostRoom.current_round = null;
    hostRoom.players.forEach(p => {
      p.is_eliminated = false;
      p.has_voted = false;
    });

    privateRoleCache.clear();
    saveLocalBackup(cleanCode, hostRoom);
    roomStateCache.set(cleanCode, hostRoom);

    // Clear old retained results
    const resultsTopic = `imposter-party/v2/room/${cleanCode}/results`;
    await publishTopic(resultsTopic, '', true);

    const stateTopic = `imposter-party/v2/room/${cleanCode}/state`;
    const publicPlayers = hostRoom.players.map(({ player_token, ...p }) => p);
    await publishTopic(stateTopic, { ...hostRoom, players: publicPlayers }, true);

    return { success: true, next_round_number: 1 };
  },

  /**
   * Subscribe to real-time room updates from cloud
   */
  subscribeToRoom(roomCode, onUpdate) {
    const cleanCode = roomCode.toUpperCase().trim();
    const stateTopic = `imposter-party/v2/room/${cleanCode}/state`;
    let unsub = () => {};

    subscribeTopic(stateTopic, (data) => {
      if (data && data.room_code === cleanCode) {
        roomStateCache.set(cleanCode, data);
        onUpdate(data);
      }
    }).then(u => { unsub = u; });

    return () => {
      unsub();
    };
  }
};
