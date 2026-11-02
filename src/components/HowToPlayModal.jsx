import React from 'react';
import { X, ShieldCheck, Skull, Sparkles, Vote, MessageSquare, CheckCircle2, Crown, Users, Search } from 'lucide-react';

export default function HowToPlayModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-800/40">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎭</span>
            <h3 className="font-extrabold text-white text-lg">How to Play Imposter Party</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-slate-300 text-sm leading-relaxed">
          {/* Summary */}
          <div className="p-4 rounded-2xl bg-purple-950/40 border border-purple-500/30 text-purple-200 text-xs sm:text-sm">
            <p>
              <strong>Imposter Party</strong> is a real-time social deduction word game for groups of any size (minimum 3 players, no player cap). All secret role deliveries, clues, timers, and voting ballots happen directly inside your web browser!
            </p>
          </div>

          {/* 3 Core Rules */}
          <div className="space-y-3">
            <h4 className="font-bold text-white text-sm uppercase tracking-wider">
              Core Game Rules
            </h4>

            <div className="space-y-2.5">
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-amber-500/30">
                <div className="flex items-center gap-2 font-bold text-amber-400 text-sm mb-1">
                  <Crown className="w-4 h-4 fill-amber-400" /> 1. The Host is the Game Master (Moderator)
                </div>
                <p className="text-xs text-slate-300">
                  The Room Host organizes the game room, sets the secret topic, manages the discussion timer, and opens/closes voting rounds. <strong>The Host does NOT receive a secret player role and does NOT vote.</strong>
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950 border border-purple-500/30">
                <div className="flex items-center gap-2 font-bold text-purple-400 text-sm mb-1">
                  <Users className="w-4 h-4" /> 2. Flexible Player Count (No 8-Player Limit)
                </div>
                <p className="text-xs text-slate-300">
                  Play with 3, 4, 6, 8, 12, or as many players as you like! The server automatically balances the number of Imposters and Civilians for your group size.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950 border border-rose-500/30">
                <div className="flex items-center gap-2 font-bold text-rose-400 text-sm mb-1">
                  <Search className="w-4 h-4" /> 3. Multiple Rounds Until the Imposter is Exposed
                </div>
                <p className="text-xs text-slate-300">
                  If the group votes out an innocent civilian in a round, the match does not end! The eliminated civilian sits out as a spectator, and the remaining alive players proceed to the <strong>Next Round</strong> with the same secret topic until the Imposter is finally exposed (or the Imposter reaches parity and wins)!
                </p>
              </div>
            </div>
          </div>

          {/* Secret Roles */}
          <div className="space-y-3">
            <h4 className="font-bold text-white text-sm uppercase tracking-wider">
              Participant Roles
            </h4>

            <div className="space-y-2.5">
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-emerald-500/30">
                <div className="flex items-center gap-2 font-bold text-emerald-400 text-sm mb-1">
                  <ShieldCheck className="w-4 h-4" /> Civilians
                </div>
                <p className="text-xs text-slate-300">
                  Civilians know the <strong>Secret Word</strong> (e.g. <em>"PIZZA"</em>). During discussion, give subtle verbal clues that prove you know the word without making it obvious to the Imposter. Work together to expose the Imposter!
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950 border border-rose-500/30">
                <div className="flex items-center gap-2 font-bold text-rose-400 text-sm mb-1">
                  <Skull className="w-4 h-4" /> Imposter(s)
                </div>
                <p className="text-xs text-slate-300">
                  Imposters <strong>DO NOT</strong> know the secret word! Instead, they receive a related <strong>Secret Clue</strong> (e.g. <em>"ITALIAN"</em>). Listen to other clues, bluff your way through, pretend you know the word, and survive each round!
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950 border border-purple-500/30">
                <div className="flex items-center gap-2 font-bold text-purple-400 text-sm mb-1">
                  <Sparkles className="w-4 h-4" /> Joker (Optional)
                </div>
                <p className="text-xs text-slate-300">
                  The Joker <strong>knows the Secret Word</strong>, BUT their goal is to act suspicious and trick the group into voting them out. <strong>If the Joker is voted out, the Joker wins alone immediately!</strong>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-800/40 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 font-bold text-white text-xs transition active:scale-95"
          >
            Got It, Let's Play!
          </button>
        </div>
      </div>
    </div>
  );
}
