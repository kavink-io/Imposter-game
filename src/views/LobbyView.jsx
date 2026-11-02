import React, { useState } from 'react';
import { 
  Users, 
  Copy, 
  Check, 
  Share2, 
  Dice5, 
  PenTool, 
  Sparkles, 
  Play, 
  Lock, 
  Clock, 
  ShieldAlert 
} from 'lucide-react';
import PlayerAvatar from '../components/PlayerAvatar';
import { TOPIC_CATEGORIES } from '../lib/topics';
import { sounds } from '../lib/audio';

export default function LobbyView({
  room,
  currentPlayer,
  isHost,
  onStartRound,
  isLoading
}) {
  const [copied, setCopied] = useState(false);
  const [topicMode, setTopicMode] = useState('random');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [manualTopic, setManualTopic] = useState('');
  const [manualClue, setManualClue] = useState('');
  const [validationErr, setValidationErr] = useState('');

  const players = room?.players || [];
  const roomCode = room?.room_code || '';
  const playerCount = players.length;
  const isFull = playerCount === 8;

  const copyInvite = () => {
    sounds.playClick();
    const url = `${window.location.origin}/?room=${roomCode}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStart = () => {
    sounds.playClick();
    setValidationErr('');

    if (playerCount !== 8) {
      setValidationErr(`Exactly 8 players are required to start (currently ${playerCount}/8).`);
      return;
    }

    if (topicMode === 'manual' && !manualTopic.trim()) {
      setValidationErr('Please type a secret topic or switch to Random Topic mode.');
      return;
    }

    onStartRound({
      topicMode,
      selectedCategory,
      manualTopic: manualTopic.trim(),
      manualClue: manualClue.trim()
    });
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6 space-y-6 animate-fadeIn">
      {/* Lobby Header & Share Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-purple-950/60 via-slate-900 to-slate-900 border border-purple-500/30 shadow-2xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-semibold mb-2">
            <Users className="w-3.5 h-3.5" /> 8-Player Waiting Lobby
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Room Code: <span className="text-purple-400 font-mono tracking-wider">{roomCode}</span>
          </h2>
          <p className="text-xs text-slate-300 mt-1">
            Share this code or link with 7 friends to fill all 8 slots!
          </p>
        </div>

        {/* Copy Invite Link Button */}
        <button
          type="button"
          onClick={copyInvite}
          className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-purple-950/50 transition active:scale-95"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
          <span>{copied ? 'Link Copied to Clipboard!' : 'Copy Invite Link'}</span>
        </button>
      </div>

      {/* 8 Player Slots Roster */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-purple-400" />
            Player Slots (Exactly 8 Required)
          </h3>
          <span className={`text-xs font-bold px-3 py-1 rounded-full ${
            isFull 
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse' 
              : 'bg-slate-800 text-slate-300'
          }`}>
            {playerCount} of 8 Players Joined
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, index) => {
            const player = players[index];
            const isMe = player && player.id === currentPlayer?.id;

            return (
              <div
                key={index}
                className={`p-4 rounded-2xl border transition-all flex items-center gap-3 ${
                  player
                    ? 'bg-slate-900/90 border-slate-700/80 shadow-md'
                    : 'bg-slate-950/40 border-dashed border-slate-800 text-slate-600'
                } ${isMe ? 'ring-1 ring-purple-500/50 bg-purple-950/20' : ''}`}
              >
                {player ? (
                  <>
                    <PlayerAvatar 
                      playerNumber={player.player_number} 
                      avatarIndex={player.avatar_index} 
                      isHost={player.is_host} 
                      size="md" 
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-white truncate">
                          {player.player_name}
                        </span>
                        {isMe && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-500/30 text-purple-300">
                            YOU
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        Slot #{player.player_number} {player.is_host ? '• Host' : '• Ready'}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-11 h-11 rounded-2xl border border-dashed border-slate-800 flex items-center justify-center text-slate-600 font-bold text-xs">
                      #{index + 1}
                    </div>
                    <div className="text-xs text-slate-500 italic">
                      Waiting for Player #{index + 1}...
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Host Topic Settings */}
      {isHost ? (
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-white text-base">Host Round Settings</h3>
              <p className="text-xs text-slate-400">
                Choose how the secret topic and clues will be selected.
              </p>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex p-1 bg-slate-950 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => { sounds.playClick(); setTopicMode('random'); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  topicMode === 'random'
                    ? 'bg-purple-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Dice5 className="w-3.5 h-3.5" /> Random Topic
              </button>
              <button
                type="button"
                onClick={() => { sounds.playClick(); setTopicMode('manual'); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  topicMode === 'manual'
                    ? 'bg-purple-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <PenTool className="w-3.5 h-3.5" /> Manual Custom Topic
              </button>
            </div>
          </div>

          {topicMode === 'random' ? (
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <label className="text-xs font-bold text-slate-300 block">
                Category:
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:border-purple-500 outline-none transition"
              >
                <option value="all">🎲 All Categories (Mixed / Surprise Me)</option>
                {TOPIC_CATEGORIES.map((cat) => (
                  <option key={cat.category} value={cat.category}>
                    {cat.category} ({cat.topics.length} topics)
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-400">
                The server will randomly pick a topic and a related clue for the 2 Imposters.
              </p>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Secret Word: <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. PIZZA"
                  value={manualTopic}
                  onChange={(e) => setManualTopic(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:border-purple-500 outline-none uppercase font-bold tracking-wider"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Imposter Clue: (Related without revealing the word)
                </label>
                <input
                  type="text"
                  placeholder="e.g. ITALIAN"
                  value={manualClue}
                  onChange={(e) => setManualClue(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:border-purple-500 outline-none uppercase font-bold tracking-wider"
                />
              </div>
            </div>
          )}

          {/* Role Breakdown pill */}
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-300 flex flex-wrap items-center justify-between gap-2">
            <span>🎭 <strong>Server-side Role Assignment:</strong></span>
            <div className="flex items-center gap-3 font-semibold">
              <span className="text-emerald-400">5 Civilians</span>
              <span className="text-rose-400">2 Imposters</span>
              <span className="text-purple-400">1 Joker</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 text-center text-xs text-slate-400">
          Only the room host can configure game settings and start the round.
        </div>
      )}

      {validationErr && (
        <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-300 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{validationErr}</span>
        </div>
      )}

      {/* Start Game Action */}
      <div className="flex flex-col items-center justify-center pt-2">
        {isHost ? (
          <button
            type="button"
            onClick={handleStart}
            disabled={!isFull || isLoading}
            className="w-full max-w-md py-4 px-8 rounded-2xl bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-base sm:text-lg tracking-wide shadow-xl shadow-purple-950/60 disabled:opacity-40 disabled:pointer-events-none transition transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-3"
          >
            {isLoading ? (
              <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Play className="w-5 h-5 fill-white" />
                <span>{isFull ? 'Start Game & Assign Roles' : `Need ${8 - playerCount} More Player${8 - playerCount > 1 ? 's' : ''}`}</span>
              </>
            )}
          </button>
        ) : (
          <div className="text-center text-xs text-purple-300/80 font-medium">
            Waiting for host to launch the round once all 8 players join...
          </div>
        )}
      </div>
    </div>
  );
}
