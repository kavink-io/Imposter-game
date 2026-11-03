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
  ShieldAlert,
  Crown,
  UserPlus,
  ShieldCheck,
  Skull,
  AlertTriangle,
  Database
} from 'lucide-react';
import PlayerAvatar from '../components/PlayerAvatar';
import { TOPIC_CATEGORIES } from '../lib/topics';
import { sounds } from '../lib/audio';
import { isSupabaseConfigured } from '../lib/supabase';

export default function LobbyView({
  room,
  currentPlayer,
  isHost,
  onStartRound,
  onAddPlayers,
  onOpenSupabaseSetup,
  isLoading
}) {
  const [copied, setCopied] = useState(false);
  const [topicMode, setTopicMode] = useState('random');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [manualTopic, setManualTopic] = useState('');
  const [manualClue, setManualClue] = useState('');
  const [imposterCount, setImposterCount] = useState('auto');
  const [includeJoker, setIncludeJoker] = useState(true);
  const [validationErr, setValidationErr] = useState('');

  const allPlayers = room?.players || [];
  const hostPlayer = allPlayers.find(p => p.is_host);
  const participants = allPlayers.filter(p => !p.is_host);
  const roomCode = room?.room_code || '';
  const participantCount = participants.length;
  const canStart = participantCount >= 3;

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

    if (participantCount < 3) {
      setValidationErr(`At least 3 players are required to start the game (currently ${participantCount}).`);
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
      manualClue: manualClue.trim(),
      imposterCount,
      includeJoker
    });
  };

  // Calculate dynamic preview of roles
  const calcImposters = imposterCount === 'auto' 
    ? (participantCount <= 5 ? 1 : participantCount <= 10 ? 2 : 3)
    : Math.min(Number(imposterCount), Math.max(1, Math.floor(participantCount / 2)));
  const calcJoker = (includeJoker && participantCount >= 4) ? 1 : 0;
  const calcCivilians = Math.max(1, participantCount - calcImposters - calcJoker);

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6 space-y-6 animate-fadeIn">
      {/* Lobby Header & Share Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-purple-950/60 via-slate-900 to-slate-900 border border-purple-500/30 shadow-2xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-semibold mb-2">
            <Users className="w-3.5 h-3.5" /> Game Room Waiting Lobby
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Room Code: <span className="text-purple-400 font-mono tracking-wider">{roomCode}</span>
          </h2>
          <p className="text-xs text-slate-300 mt-1">
            Share this room code or link with friends. No player limit (minimum 3 players)!
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

      {/* Local Mode Notice for Multi-Device */}
      {!isSupabaseConfigured && (
        <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-200 shadow-lg">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-300">
                Playing across separate phones or computers?
              </p>
              <p className="text-amber-200/80 text-[11px] mt-0.5">
                This room is currently stored only in this browser's memory. To allow friends to join from other devices across the internet, connect your free Supabase database in Vercel.
              </p>
            </div>
          </div>
          {onOpenSupabaseSetup && (
            <button
              type="button"
              onClick={onOpenSupabaseSetup}
              className="px-3.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold border border-amber-500/40 text-xs transition shrink-0 flex items-center gap-1.5"
            >
              <Database className="w-3.5 h-3.5" />
              <span>Setup Guide</span>
            </button>
          )}
        </div>
      )}

      {/* Host Moderator Banner */}
      {hostPlayer && (
        <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/30 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center font-bold">
              <Crown className="w-5 h-5 fill-amber-400" />
            </div>
            <div>
              <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <span>Room Host & Game Master:</span>
                <strong className="text-white text-sm">{hostPlayer.player_name}</strong>
              </div>
              <p className="text-[11px] text-slate-400">
                The Host coordinates rounds, timers, and voting — the host does <strong>NOT</strong> play a secret role or vote.
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 hidden sm:inline">
            MODERATOR
          </span>
        </div>
      )}

      {/* Participating Players Roster */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-purple-400" />
            Joined Participants ({participantCount} Player{participantCount !== 1 ? 's' : ''})
          </h3>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${
              canStart 
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
            }`}>
              {canStart ? '✓ Ready to Launch' : `Need ${3 - participantCount} more player(s)`}
            </span>

            {/* Quick Add Player button for fast testing */}
            {isHost && onAddPlayers && (
              <button
                type="button"
                onClick={() => onAddPlayers(1)}
                className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-purple-300 text-xs font-semibold border border-slate-700 flex items-center gap-1 transition active:scale-95"
                title="Add a test player"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+1 Player</span>
              </button>
            )}
          </div>
        </div>

        {participants.length === 0 ? (
          <div className="p-8 rounded-3xl bg-slate-900/60 border border-dashed border-slate-800 text-center space-y-2">
            <Users className="w-8 h-8 text-slate-500 mx-auto" />
            <h4 className="text-sm font-bold text-white">Waiting for Players to Join...</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Share room code <strong className="text-purple-400 font-mono">{roomCode}</strong> or copy the invite link above!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {participants.map((player) => {
              const isMe = player.id === currentPlayer?.id;

              return (
                <div
                  key={player.id}
                  className={`p-3.5 rounded-2xl border transition-all flex items-center gap-3 bg-slate-900/90 border-slate-700/80 shadow-md ${
                    isMe ? 'ring-2 ring-purple-500/60 bg-purple-950/20' : ''
                  }`}
                >
                  <PlayerAvatar 
                    playerNumber={player.player_number} 
                    avatarIndex={player.avatar_index} 
                    isHost={false} 
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
                      Participant #{player.player_number} • Ready
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Host Match Settings */}
      {isHost ? (
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-white text-base">Game Master Settings</h3>
              <p className="text-xs text-slate-400">
                Configure topic mode, imposter count, and joker role.
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
                The server will randomly pick a topic and a related clue for the Imposter(s).
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
                  Imposter Clue: (Related hint to help imposter bluff)
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

          {/* Role Config Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
              <label className="text-xs font-bold text-slate-300 block">
                Number of Imposters:
              </label>
              <select
                value={imposterCount}
                onChange={(e) => setImposterCount(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:border-purple-500 outline-none"
              >
                <option value="auto">Auto (Balanced based on player count)</option>
                <option value="1">1 Imposter</option>
                <option value="2">2 Imposters</option>
                <option value="3">3 Imposters</option>
              </select>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-300">Include Joker Role:</div>
                <div className="text-[10px] text-slate-400">Wins alone if voted out (4+ players)</div>
              </div>
              <input
                type="checkbox"
                checked={includeJoker}
                onChange={(e) => setIncludeJoker(e.target.checked)}
                className="w-4 h-4 accent-purple-600 rounded cursor-pointer"
              />
            </div>
          </div>

          {/* Dynamic Role Breakdown Pill */}
          {participantCount >= 3 && (
            <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-500/20 text-xs text-slate-300 flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold text-purple-300">Expected Role Distribution:</span>
              <div className="flex items-center gap-3 font-mono font-bold text-[11px]">
                <span className="text-emerald-400">{calcCivilians} Civilians</span>
                <span className="text-rose-400">{calcImposters} Imposter{calcImposters > 1 ? 's' : ''}</span>
                {calcJoker > 0 && <span className="text-amber-400">1 Joker</span>}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 text-center text-xs text-slate-400">
          Only the room host can configure settings and launch the game.
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
            disabled={!canStart || isLoading}
            className="w-full max-w-md py-4 px-8 rounded-2xl bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-base sm:text-lg tracking-wide shadow-xl shadow-purple-950/60 disabled:opacity-40 disabled:pointer-events-none transition transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-3"
          >
            {isLoading ? (
              <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Play className="w-5 h-5 fill-white" />
                <span>
                  {canStart 
                    ? `Start Game with ${participantCount} Players` 
                    : `Need ${3 - participantCount} More Player(s) to Start`}
                </span>
              </>
            )}
          </button>
        ) : (
          <div className="text-center text-xs text-purple-300/80 font-medium">
            Waiting for the Game Master to launch the round...
          </div>
        )}
      </div>
    </div>
  );
}
