import React from 'react';
import { PlusCircle, LogIn, Users, ShieldCheck, Skull, Sparkles, HelpCircle } from 'lucide-react';
import { sounds } from '../lib/audio';

export default function HomeView({ onGoCreate, onGoJoin, onOpenHelp }) {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12 space-y-10 animate-fadeIn">
      {/* Hero Section */}
      <div className="text-center space-y-4 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5 text-purple-400" />
          <span>Real-Time 8-Player Social Deduction Game</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-none">
          Imposter <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400 bg-clip-text text-transparent">Party</span> 🎭
        </h1>

        <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
          8 Players. 5 Civilians. 2 Imposters. 1 Joker.
          <br className="hidden sm:inline" />
          Private roles and secret clues delivered right inside your browser in real-time.
        </p>
      </div>

      {/* Main Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl mx-auto">
        {/* Create Room Card */}
        <button
          type="button"
          onClick={() => { sounds.playClick(); onGoCreate(); }}
          className="p-6 rounded-3xl bg-gradient-to-br from-purple-900/60 via-slate-900 to-indigo-950/60 border border-purple-500/40 hover:border-purple-400 text-left transition transform hover:-translate-y-1 active:translate-y-0 shadow-xl shadow-purple-950/50 group"
        >
          <div className="w-12 h-12 rounded-2xl bg-purple-600/30 border border-purple-400/40 flex items-center justify-center text-purple-300 mb-4 group-hover:scale-110 transition-transform">
            <PlusCircle className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-white mb-1">Create a Room</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Start a new game as host, get an invite code, and invite 7 friends to join!
          </p>
        </button>

        {/* Join Room Card */}
        <button
          type="button"
          onClick={() => { sounds.playClick(); onGoJoin(); }}
          className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 hover:border-slate-700 text-left transition transform hover:-translate-y-1 active:translate-y-0 shadow-xl group"
        >
          <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 mb-4 group-hover:scale-110 transition-transform">
            <LogIn className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-white mb-1">Join Room</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Have a 6-character room code? Enter the code and your name to join the game!
          </p>
        </button>
      </div>

      {/* Roles Breakdown Preview */}
      <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 max-w-2xl mx-auto space-y-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 text-center">
          Exact 8-Player Role Distribution
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
          <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/30">
            <div className="flex items-center justify-center gap-1.5 text-emerald-400 font-bold text-sm mb-1">
              <ShieldCheck className="w-4 h-4" /> 5 Civilians
            </div>
            <p className="text-[11px] text-slate-300">
              Know the secret word. Give subtle clues and vote out the 2 imposters!
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-500/30">
            <div className="flex items-center justify-center gap-1.5 text-rose-400 font-bold text-sm mb-1">
              <Skull className="w-4 h-4" /> 2 Imposters
            </div>
            <p className="text-[11px] text-slate-300">
              Receive a related clue. Bluff, pretend you know the word, and blend in!
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-purple-950/40 border border-purple-500/30">
            <div className="flex items-center justify-center gap-1.5 text-purple-400 font-bold text-sm mb-1">
              <Sparkles className="w-4 h-4" /> 1 Joker
            </div>
            <p className="text-[11px] text-slate-300">
              Knows the word! Must act suspicious and try to get voted out to win!
            </p>
          </div>
        </div>

        <div className="text-center pt-1">
          <button
            onClick={onOpenHelp}
            className="text-xs text-purple-400 hover:text-purple-300 font-semibold inline-flex items-center gap-1"
          >
            <HelpCircle className="w-3.5 h-3.5" /> Read Complete Rules & Strategy Guide
          </button>
        </div>
      </div>
    </div>
  );
}
