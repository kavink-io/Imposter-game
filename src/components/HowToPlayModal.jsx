import React from 'react';
import { X, ShieldCheck, Skull, Sparkles, Vote, MessageSquare, CheckCircle2 } from 'lucide-react';

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
              <strong>Imposter Party</strong> is an 8-player social deduction word game. All private role deliveries, clues, and voting ballots happen directly inside your web browser in real-time!
            </p>
          </div>

          {/* 3 Secret Roles */}
          <div className="space-y-3">
            <h4 className="font-bold text-white text-sm uppercase tracking-wider">
              The 3 Secret Roles (Exactly 8 Players)
            </h4>

            <div className="space-y-2.5">
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-emerald-500/30">
                <div className="flex items-center gap-2 font-bold text-emerald-400 text-sm mb-1">
                  <ShieldCheck className="w-4 h-4" /> 5 Civilians
                </div>
                <p className="text-xs text-slate-300">
                  Civilians know the <strong>Secret Word</strong> (e.g. <em>"PIZZA"</em>). During discussion, give subtle verbal clues that prove you know the word without making it obvious to the Imposters. Work together to vote out both Imposters while avoiding the Joker!
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950 border border-rose-500/30">
                <div className="flex items-center gap-2 font-bold text-rose-400 text-sm mb-1">
                  <Skull className="w-4 h-4" /> 2 Imposters
                </div>
                <p className="text-xs text-slate-300">
                  Imposters <strong>DO NOT</strong> know the secret word! Instead, both Imposters receive a related <strong>Secret Clue</strong> (e.g. <em>"ITALIAN"</em>). Listen to other clues, bluff your way through, pretend you know the word, and survive the vote!
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950 border border-purple-500/30">
                <div className="flex items-center gap-2 font-bold text-purple-400 text-sm mb-1">
                  <Sparkles className="w-4 h-4" /> 1 Joker
                </div>
                <p className="text-xs text-slate-300">
                  The Joker <strong>knows the Secret Word</strong> (<em>"PIZZA"</em>), BUT their goal is inverted! The Joker must act suspicious, pretend they don't know the word, and trick everyone into voting them out. <strong>If the Joker is voted out, the Joker wins alone!</strong>
                </p>
              </div>
            </div>
          </div>

          {/* Game Flow */}
          <div className="space-y-2">
            <h4 className="font-bold text-white text-sm uppercase tracking-wider">
              Game Progression
            </h4>
            <div className="space-y-2 text-xs">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                <span><strong>1. Private Role Reveal:</strong> Each player taps their private in-app 3D card to view their role, word, or clue. Tap again to conceal.</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                <span><strong>2. Discussion Round:</strong> Take turns giving one verbal clue around the circle using the in-game discussion timer.</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                <span><strong>3. Private In-App Voting:</strong> Each player secretly casts their vote for one of the other 7 players (cannot vote for self).</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                <span><strong>4. Tally & Reveal:</strong> Votes are tallied. Check if the Joker was voted out, or if the Civilians or Imposters won. All roles are revealed!</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                <span><strong>5. Start Next Round:</strong> The host can start another round with the same 8 players without recreating the room!</span>
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
