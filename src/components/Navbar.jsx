import React from 'react';
import { HelpCircle, Volume2, VolumeX, Sparkles, LogOut, Copy, Check, Radio } from 'lucide-react';
import { sounds } from '../lib/audio';
import { isSupabaseConfigured } from '../lib/supabase';

export default function Navbar({ 
  roomCode, 
  player, 
  onOpenHelp, 
  onLeaveRoom,
  soundEnabled, 
  setSoundEnabled 
}) {
  const [copied, setCopied] = React.useState(false);

  const toggleSound = () => {
    const next = sounds.toggleSound();
    setSoundEnabled(next);
  };

  const copyRoomLink = () => {
    if (!roomCode) return;
    sounds.playClick();
    const url = `${window.location.origin}/?room=${roomCode}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/85 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 via-violet-600 to-indigo-600 flex items-center justify-center text-xl shadow-lg shadow-purple-500/20 border border-purple-400/30">
            🎭
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg text-white tracking-tight flex items-center gap-1">
                Imposter <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Party</span>
              </span>
              {/* Backend status badge */}
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono flex items-center gap-1 ${
                isSupabaseConfigured 
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' 
                  : 'bg-violet-500/10 text-violet-400 border border-violet-500/30'
              }`}>
                <Radio className="w-2.5 h-2.5 animate-pulse" />
                {isSupabaseConfigured ? 'Supabase Realtime' : 'Local / Multi-Tab Engine'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              8 Players • 5 Civilians • 2 Imposters • 1 Joker
            </p>
          </div>
        </div>

        {/* Room Code & Actions */}
        <div className="flex items-center gap-2">
          {roomCode && (
            <button
              onClick={copyRoomLink}
              title="Click to copy invite link"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-mono font-bold text-purple-300 border border-purple-500/30 transition shadow-sm active:scale-95"
            >
              <span>ROOM:</span>
              <span className="text-white tracking-wider">{roomCode}</span>
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-purple-400" />}
            </button>
          )}

          {/* Sound Toggle */}
          <button
            onClick={toggleSound}
            title={soundEnabled ? 'Mute Sounds' : 'Unmute Sounds'}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-purple-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>

          {/* How to Play */}
          <button
            onClick={onOpenHelp}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md shadow-purple-950/40 transition active:scale-95"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Rules</span>
          </button>

          {/* Leave Room Button */}
          {player && onLeaveRoom && (
            <button
              onClick={onLeaveRoom}
              title="Leave Room"
              className="p-2 rounded-xl bg-slate-900 hover:bg-rose-950/50 text-slate-400 hover:text-rose-400 border border-slate-800 hover:border-rose-900/40 transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
