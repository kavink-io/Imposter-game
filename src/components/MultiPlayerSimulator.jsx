import React, { useState } from 'react';
import { Users, Sparkles, ChevronUp, ChevronDown, UserCheck, ExternalLink, UserPlus, Crown } from 'lucide-react';
import { sounds } from '../lib/audio';

export default function MultiPlayerSimulator({
  room,
  currentPlayer,
  onSwitchPlayer,
  onAddPlayer,
  onAddFourPlayers,
  isLoading
}) {
  const [isOpen, setIsOpen] = useState(false);

  if (!room) return null;

  const players = room.players || [];
  const roomCode = room.room_code;
  const nonHostPlayers = players.filter(p => !p.is_host);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 bg-slate-950/95 border-t border-purple-500/30 backdrop-blur-md transition-all shadow-2xl">
      <div className="max-w-6xl mx-auto px-4 py-2 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="p-1 rounded-lg bg-purple-500/20 text-purple-300 font-bold flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>Multiplayer Testing Dock</span>
          </span>
          <span className="text-slate-400 hidden sm:inline">
            Active: <strong>{currentPlayer?.player_name || 'None'}</strong> {currentPlayer?.is_host ? '(👑 Game Master)' : `(Participant #${currentPlayer?.player_number})`}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Add Player Buttons in lobby */}
          {room.status === 'LOBBY' && (
            <>
              {onAddPlayer && (
                <button
                  onClick={() => { sounds.playClick(); onAddPlayer(); }}
                  disabled={isLoading}
                  className="px-2.5 py-1 rounded-xl bg-purple-600/80 hover:bg-purple-500 text-white font-bold text-[11px] transition shadow flex items-center gap-1 active:scale-95"
                >
                  <UserPlus className="w-3 h-3" />
                  <span>+1 Player</span>
                </button>
              )}
              {onAddFourPlayers && (
                <button
                  onClick={() => { sounds.playClick(); onAddFourPlayers(); }}
                  disabled={isLoading}
                  className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-purple-300 font-bold text-[11px] border border-slate-700 transition flex items-center gap-1 active:scale-95 hidden sm:flex"
                >
                  <Users className="w-3 h-3" />
                  <span>+4 Players</span>
                </button>
              )}
            </>
          )}

          {/* Toggle Dock Accordion */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-1.5 rounded-lg bg-slate-900 text-slate-300 hover:text-white border border-slate-800 transition"
            title="Toggle simulator player switcher"
          >
            {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Switcher Content */}
      {isOpen && (
        <div className="max-w-6xl mx-auto px-4 pb-3 pt-1 border-t border-slate-900 animate-fadeIn space-y-2">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>Tap any role below to switch your view and test from their perspective:</span>
            <a
              href={`/?room=${roomCode}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-400 hover:text-purple-300 flex items-center gap-1"
            >
              <span>Open Invite in New Window</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 max-h-48 overflow-y-auto">
            {players.map((p) => {
              const isActive = p.id === currentPlayer?.id;

              return (
                <button
                  key={p.id}
                  onClick={() => { sounds.playClick(); onSwitchPlayer(p); }}
                  className={`p-2 rounded-xl border text-center transition-all ${
                    isActive
                      ? 'bg-purple-600/30 border-purple-400 text-white shadow-md ring-1 ring-purple-400'
                      : p.is_eliminated
                      ? 'bg-slate-950/40 border-slate-900 text-slate-600'
                      : p.is_host
                      ? 'bg-amber-950/30 border-amber-500/40 text-amber-300'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <div className="text-[10px] font-mono font-bold flex items-center justify-center gap-1">
                    {p.is_host ? (
                      <span className="text-amber-400 flex items-center gap-0.5">
                        <Crown className="w-2.5 h-2.5" /> HOST
                      </span>
                    ) : (
                      <span className="text-purple-300">
                        #{p.player_number}
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-bold truncate">
                    {p.player_name}
                  </div>
                  {p.is_eliminated ? (
                    <div className="text-[9px] text-rose-400 font-semibold mt-0.5">
                      ❌ Voted Out
                    </div>
                  ) : isActive ? (
                    <div className="text-[9px] text-emerald-400 font-semibold mt-0.5">
                      ✓ Selected
                    </div>
                  ) : (
                    <div className="text-[9px] text-slate-500 mt-0.5">
                      {p.is_host ? 'Moderator' : 'Active'}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
