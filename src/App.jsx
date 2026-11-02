import React, { useState, useEffect, useRef } from 'react';
import Navbar from './components/Navbar';
import HowToPlayModal from './components/HowToPlayModal';
import MultiPlayerSimulator from './components/MultiPlayerSimulator';
import HomeView from './views/HomeView';
import CreateRoomView from './views/CreateRoomView';
import JoinRoomView from './views/JoinRoomView';
import LobbyView from './views/LobbyView';
import GameView from './views/GameView';
import ResultsView from './views/ResultsView';
import { gameEngine } from './lib/gameEngine';
import { sounds } from './lib/audio';

const DEMO_FILL_NAMES = [
  'Sarah C.',
  'Marcus V.',
  'Priya S.',
  'Liam O.',
  'Elena R.',
  'Jordan T.',
  'Maya L.',
  'David K.',
  'Chloe W.',
  'Kai N.',
  'Zoe B.',
  'Ethan M.'
];

export default function App() {
  // Navigation / View State
  const [view, setView] = useState('home'); // 'home' | 'create' | 'join' | 'lobby' | 'game' | 'results'
  const [initialJoinCode, setInitialJoinCode] = useState('');

  // Game Room & Player State
  const [room, setRoom] = useState(null);
  const [currentPlayer, setCurrentPlayer] = useState(() => {
    try {
      const saved = sessionStorage.getItem('imposter_party_current_player');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  // Private Role Data (delivered securely to caller only)
  const [roleData, setRoleData] = useState(null);
  const [roundResults, setRoundResults] = useState(null);

  // UI state
  const [howToPlayOpen, setHowToPlayOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const unsubscribeRef = useRef(null);

  // Check URL query parameters for ?room=CODE
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      setInitialJoinCode(roomParam.toUpperCase());
      setView('join');
    }
  }, []);

  // Save current player to session
  useEffect(() => {
    if (currentPlayer) {
      sessionStorage.setItem('imposter_party_current_player', JSON.stringify(currentPlayer));
    } else {
      sessionStorage.removeItem('imposter_party_current_player');
    }
  }, [currentPlayer]);

  // Real-time synchronization
  useEffect(() => {
    if (!room?.room_code) return;

    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }

    const unsub = gameEngine.subscribeToRoom(room.room_code, (updatedRoom) => {
      setRoom(updatedRoom);

      // Handle phase changes automatically
      if (updatedRoom.status === 'LOBBY' && updatedRoom.current_phase === 'WAITING') {
        setView('lobby');
      } else if (updatedRoom.current_phase === 'RESULTS') {
        setView('results');
        if (updatedRoom.current_round?.results) {
          setRoundResults(updatedRoom.current_round.results);
        }
      } else if (['ROLE_REVEAL', 'DISCUSSION', 'VOTING'].includes(updatedRoom.current_phase)) {
        setView('game');
      }
    });

    unsubscribeRef.current = unsub;

    return () => {
      if (unsubscribeRef.current) unsubscribeRef.current();
    };
  }, [room?.room_code]);

  // Fetch private role card whenever phase is ROLE_REVEAL, DISCUSSION, or VOTING
  useEffect(() => {
    if (!room?.room_code || !currentPlayer?.player_token) return;

    if (['ROLE_REVEAL', 'DISCUSSION', 'VOTING'].includes(room.current_phase)) {
      gameEngine.getMyPrivateRole(room.room_code, currentPlayer.player_token)
        .then((data) => {
          setRoleData(data);
        })
        .catch(console.error);
    }
  }, [room?.current_phase, room?.current_round_number, currentPlayer?.player_token]);

  // 1. Create Room (Host creates room as Moderator)
  const handleCreateRoom = async ({ hostName, settings }) => {
    setIsLoading(true);
    try {
      const data = await gameEngine.createRoom(hostName, settings);
      const playerObj = {
        id: data.player_id,
        player_name: data.player_name,
        player_number: data.player_number, // 0 for host
        player_token: data.player_token,
        is_host: true
      };
      setCurrentPlayer(playerObj);

      const roomState = await gameEngine.getRoomState(data.room_code);
      setRoom(roomState);
      setView('lobby');
      sounds.playVictory();
    } catch (err) {
      alert(err.message || 'Error creating room.');
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Join Room (Participant joining)
  const handleJoinRoom = async ({ roomCode, playerName }) => {
    setIsLoading(true);
    try {
      const data = await gameEngine.joinRoom(roomCode, playerName);
      const playerObj = {
        id: data.player_id,
        player_name: data.player_name,
        player_number: data.player_number,
        player_token: data.player_token,
        is_host: false
      };
      setCurrentPlayer(playerObj);

      const roomState = await gameEngine.getRoomState(data.room_code);
      setRoom(roomState);
      setView(roomState.current_phase === 'WAITING' ? 'lobby' : 'game');
      sounds.playVictory();
    } catch (err) {
      alert(err.message || 'Error joining room.');
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Start Round (Host only, minimum 3 participants, no max limit!)
  const handleStartRound = async (options) => {
    if (!room || !currentPlayer?.player_token) return;
    setIsLoading(true);
    try {
      await gameEngine.startRound(
        room.room_code,
        currentPlayer.player_token,
        options
      );
      const roomState = await gameEngine.getRoomState(room.room_code);
      setRoom(roomState);
      setView('game');

      const myRole = await gameEngine.getMyPrivateRole(room.room_code, currentPlayer.player_token);
      setRoleData(myRole);
    } catch (err) {
      alert(err.message || 'Error starting round.');
    } finally {
      setIsLoading(false);
    }
  };

  // 4. Advance Game Phase (Host only)
  const handleAdvancePhase = async (newPhase) => {
    if (!room || !currentPlayer?.player_token) return;
    setIsLoading(true);
    try {
      await gameEngine.setGamePhase(room.room_code, currentPlayer.player_token, newPhase);
      const roomState = await gameEngine.getRoomState(room.room_code);
      setRoom(roomState);
    } catch (err) {
      alert(err.message || 'Error advancing phase.');
    } finally {
      setIsLoading(false);
    }
  };

  // 5. Submit Private Vote
  const handleVote = async (targetPlayerId) => {
    if (!room || !currentPlayer?.player_token) return;
    await gameEngine.submitVote(room.room_code, currentPlayer.player_token, targetPlayerId);
    const roomState = await gameEngine.getRoomState(room.room_code);
    setRoom(roomState);
  };

  // 6. End Voting & Tally Results
  const handleEndVoting = async () => {
    if (!room || !currentPlayer?.player_token) return;
    setIsLoading(true);
    try {
      const tally = await gameEngine.endVotingAndTally(room.room_code, currentPlayer.player_token);
      setRoundResults(tally);
      const roomState = await gameEngine.getRoomState(room.room_code);
      setRoom(roomState);
      setView('results');
    } catch (err) {
      alert(err.message || 'Error tallying votes.');
    } finally {
      setIsLoading(false);
    }
  };

  // 7. Proceed to Next Investigation Round (Round 2, 3... until imposter exposed!)
  const handleProceedToNextRound = async () => {
    if (!room || !currentPlayer?.player_token) return;
    setIsLoading(true);
    try {
      await gameEngine.proceedToNextInvestigationRound(room.room_code, currentPlayer.player_token);
      const roomState = await gameEngine.getRoomState(room.room_code);
      setRoom(roomState);
      setRoundResults(null);
      setView('game');

      // Refresh role data
      const myRole = await gameEngine.getMyPrivateRole(room.room_code, currentPlayer.player_token);
      setRoleData(myRole);
    } catch (err) {
      alert(err.message || 'Error proceeding to next round.');
    } finally {
      setIsLoading(false);
    }
  };

  // 8. Start Brand New Match (Fresh game with new topic)
  const handleStartNextRound = async () => {
    if (!room || !currentPlayer?.player_token) return;
    setIsLoading(true);
    try {
      await gameEngine.startNextRound(room.room_code, currentPlayer.player_token);
      const roomState = await gameEngine.getRoomState(room.room_code);
      setRoom(roomState);
      setRoleData(null);
      setRoundResults(null);
      setView('lobby');
    } catch (err) {
      alert(err.message || 'Error starting new match.');
    } finally {
      setIsLoading(false);
    }
  };

  // 9. Quick Add Players in Testing Dock
  const handleAddPlayers = async (count = 1) => {
    if (!room) return;
    setIsLoading(true);
    try {
      const nonHostCount = room.players?.filter(p => !p.is_host).length || 0;
      for (let i = 0; i < count; i++) {
        const nameIdx = (nonHostCount + i) % DEMO_FILL_NAMES.length;
        const name = `${DEMO_FILL_NAMES[nameIdx]} (${nonHostCount + i + 1})`;
        await gameEngine.joinRoom(room.room_code, name);
      }

      const roomState = await gameEngine.getRoomState(room.room_code);
      setRoom(roomState);
      sounds.playVictory();
    } catch (err) {
      alert(err.message || 'Error adding player.');
    } finally {
      setIsLoading(false);
    }
  };

  // 10. Switch player perspective in testing dock
  const handleSwitchPlayer = async (targetPlayer) => {
    let token = targetPlayer.player_token;
    if (!token && room?.room_code) {
      try {
        const local = JSON.parse(localStorage.getItem(`imposter_party_${room.room_code}`) || '{}');
        const found = local.players?.find(p => p.id === targetPlayer.id);
        if (found) token = found.player_token;
      } catch (e) {}
    }

    const updated = {
      ...targetPlayer,
      player_token: token || currentPlayer?.player_token
    };
    setCurrentPlayer(updated);

    if (['ROLE_REVEAL', 'DISCUSSION', 'VOTING'].includes(room?.current_phase)) {
      if (token) {
        const myRole = await gameEngine.getMyPrivateRole(room.room_code, token);
        setRoleData(myRole);
      }
    }
  };

  // 11. Leave Room
  const handleLeaveRoom = () => {
    if (window.confirm('Are you sure you want to leave the room?')) {
      sounds.playClick();
      setRoom(null);
      setCurrentPlayer(null);
      setRoleData(null);
      setRoundResults(null);
      setView('home');
      window.history.replaceState({}, '', '/');
    }
  };

  const isHost = Boolean(currentPlayer?.is_host);

  return (
    <div className="min-h-screen bg-[#070a13] text-slate-100 flex flex-col font-sans selection:bg-purple-500 selection:text-white pb-14">
      {/* Top Navbar */}
      <Navbar
        roomCode={room?.room_code}
        player={currentPlayer}
        onOpenHelp={() => setHowToPlayOpen(true)}
        onLeaveRoom={handleLeaveRoom}
        soundEnabled={soundEnabled}
        setSoundEnabled={setSoundEnabled}
      />

      {/* Main View Router */}
      <main className="flex-1 flex flex-col justify-center">
        {view === 'home' && (
          <HomeView
            onGoCreate={() => setView('create')}
            onGoJoin={() => setView('join')}
            onOpenHelp={() => setHowToPlayOpen(true)}
          />
        )}

        {view === 'create' && (
          <CreateRoomView
            onBack={() => setView('home')}
            onCreateRoom={handleCreateRoom}
            isLoading={isLoading}
          />
        )}

        {view === 'join' && (
          <JoinRoomView
            initialCode={initialJoinCode}
            onBack={() => setView('home')}
            onJoinRoom={handleJoinRoom}
            isLoading={isLoading}
          />
        )}

        {view === 'lobby' && (
          <LobbyView
            room={room}
            currentPlayer={currentPlayer}
            isHost={isHost}
            onStartRound={handleStartRound}
            onAddPlayers={handleAddPlayers}
            isLoading={isLoading}
          />
        )}

        {view === 'game' && (
          <GameView
            room={room}
            currentPlayer={currentPlayer}
            roleData={roleData}
            isHost={isHost}
            onAdvancePhase={handleAdvancePhase}
            onVote={handleVote}
            onEndVoting={handleEndVoting}
            isLoading={isLoading}
          />
        )}

        {view === 'results' && (
          <ResultsView
            results={roundResults}
            room={room}
            isHost={isHost}
            currentPlayer={currentPlayer}
            onProceedToNextRound={handleProceedToNextRound}
            onStartNextRound={handleStartNextRound}
            isLoading={isLoading}
          />
        )}
      </main>

      {/* Testing Dock for multi-player simulation */}
      {room && (
        <MultiPlayerSimulator
          room={room}
          currentPlayer={currentPlayer}
          onSwitchPlayer={handleSwitchPlayer}
          onAddPlayer={() => handleAddPlayers(1)}
          onAddFourPlayers={() => handleAddPlayers(4)}
          isLoading={isLoading}
        />
      )}

      {/* How to Play Rules Modal */}
      <HowToPlayModal
        isOpen={howToPlayOpen}
        onClose={() => setHowToPlayOpen(false)}
      />

      {/* Footer */}
      <footer className="border-t border-slate-900 py-4 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-4 flex flex-wrap items-center justify-between gap-2">
          <span>Imposter Party 🎭 • Real-Time Social Deduction Game</span>
          <span>Host is Game Master • Multiple Rounds Until Imposter Exposed • Unlimited Players</span>
        </div>
      </footer>
    </div>
  );
}
