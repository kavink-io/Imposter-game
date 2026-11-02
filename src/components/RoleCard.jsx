import React, { useState } from 'react';
import { 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  Skull, 
  Sparkles, 
  HelpCircle, 
  Lock, 
  Flame, 
  AlertTriangle,
  Crown
} from 'lucide-react';
import { sounds } from '../lib/audio';

export default function RoleCard({ roleData, playerName, isHost = false }) {
  const [isRevealed, setIsRevealed] = useState(false);

  const toggleReveal = () => {
    sounds.playFlip();
    setIsRevealed(!isRevealed);
  };

  if (!roleData || !roleData.has_role) {
    return (
      <div className="w-full max-w-md mx-auto p-8 rounded-3xl bg-slate-900/90 border border-slate-800 text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
          <Lock className="w-6 h-6 animate-pulse" />
        </div>
        <h3 className="text-lg font-bold text-white">Awaiting Role Assignment...</h3>
        <p className="text-xs text-slate-400">
          The host will start the round once all players are ready.
        </p>
      </div>
    );
  }

  const { role, secret_word, clue, category, instruction, is_eliminated } = roleData;

  // Check if Host Game Master
  if (isHost || role === 'HOST') {
    return (
      <div className="w-full max-w-md mx-auto p-6 sm:p-7 rounded-3xl bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-950 border border-amber-500/40 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-amber-500/20 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
              <Crown className="w-4 h-4 fill-amber-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Game Master Card</h3>
              <p className="text-[10px] text-amber-300 font-mono">MODERATOR • NOT A PLAYER</p>
            </div>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
            Host View
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="p-3 rounded-2xl bg-slate-950 border border-emerald-500/30">
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
              Secret Word
            </span>
            <span className="text-lg font-black text-white">
              "{secret_word}"
            </span>
            <span className="text-[9px] text-slate-400 block mt-0.5">
              Category: {category}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950 border border-rose-500/30">
            <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider block">
              Imposter Clue
            </span>
            <span className="text-lg font-black text-white">
              "{clue}"
            </span>
            <span className="text-[9px] text-slate-400 block mt-0.5">
              Given to Imposter(s)
            </span>
          </div>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/50 p-3 rounded-xl border border-slate-800">
          You are the Moderator! You guide the players through clues and discussion, and conduct voting rounds until an imposter is exposed. You do not vote.
        </p>
      </div>
    );
  }

  // Spectator / Eliminated view
  if (is_eliminated) {
    return (
      <div className="w-full max-w-md mx-auto p-6 rounded-3xl bg-slate-900/80 border border-rose-500/30 text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto text-xl">
          👻
        </div>
        <h3 className="text-base font-bold text-white">Spectator Mode</h3>
        <p className="text-xs text-slate-300">
          You were voted out in a previous round! You cannot vote or give clues, but you can spectate the remaining alive players as they hunt the imposter.
        </p>
      </div>
    );
  }

  // Determine styling based on role
  const isImposter = role === 'IMPOSTER';
  const isCivilian = role === 'CIVILIAN';
  const isJoker = role === 'JOKER';

  return (
    <div className="w-full max-w-md mx-auto space-y-4">
      {/* Privacy Warning Banner */}
      <div className="px-4 py-2 rounded-2xl bg-slate-900/80 border border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
        <span className="flex items-center gap-1.5 font-medium">
          <Lock className="w-3.5 h-3.5 text-purple-400" />
          <span>Private to <strong>{playerName}</strong></span>
        </span>
        <span className="text-[11px] text-slate-500">Tap card or button to toggle</span>
      </div>

      {/* 3D Flipping Card Container */}
      <div 
        className="w-full min-h-[380px] perspective-1000 cursor-pointer select-none"
        onClick={toggleReveal}
      >
        <div className={`w-full min-h-[380px] rounded-3xl transition-transform duration-700 preserve-3d relative ${
          isRevealed ? 'rotate-y-180' : ''
        }`}>
          {/* ================= FRONT: HIDDEN / CONCEALED STATE ================= */}
          <div className="absolute inset-0 backface-hidden rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-slate-900 via-indigo-950/60 to-slate-950 border border-purple-500/30 shadow-2xl flex flex-col justify-between text-center overflow-hidden">
            {/* Ambient Background decoration */}
            <div className="absolute -top-16 -right-16 w-44 h-44 rounded-full bg-purple-600/10 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-16 -left-16 w-44 h-44 rounded-full bg-pink-600/10 blur-3xl pointer-events-none" />

            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-semibold mb-4">
                <Sparkles className="w-3 h-3" /> Confidential Role Card
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Your Secret Identity
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Make sure nobody is peeking at your screen before flipping!
              </p>
            </div>

            {/* Big Lock Icon with Pulse */}
            <div className="my-6 flex flex-col items-center justify-center">
              <div className="w-20 h-20 rounded-3xl bg-slate-900/90 border border-purple-500/40 flex items-center justify-center shadow-xl shadow-purple-950/60 group-hover:scale-105 transition-transform">
                <Lock className="w-10 h-10 text-purple-400" />
              </div>
              <span className="text-xs font-semibold text-slate-400 mt-3">
                Tap anywhere to reveal
              </span>
            </div>

            {/* Reveal Button */}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); toggleReveal(); }}
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-sm tracking-wide shadow-lg shadow-purple-950/60 flex items-center justify-center gap-2 transition active:scale-95"
            >
              <Eye className="w-4 h-4" />
              <span>Reveal My Role</span>
            </button>
          </div>

          {/* ================= BACK: REVEALED ROLE STATE ================= */}
          <div className={`absolute inset-0 backface-hidden rotate-y-180 rounded-3xl p-6 sm:p-8 flex flex-col justify-between text-center overflow-hidden border shadow-2xl ${
            isImposter
              ? 'bg-gradient-to-b from-slate-950 via-rose-950/70 to-slate-950 border-rose-500/50 glow-imposter'
              : isCivilian
              ? 'bg-gradient-to-b from-slate-950 via-emerald-950/70 to-slate-950 border-emerald-500/50 glow-civilian'
              : 'bg-gradient-to-b from-slate-950 via-purple-950/70 to-slate-950 border-purple-500/50 glow-joker'
          }`}>
            {/* Header info */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                  {category ? `Category: ${category}` : 'Secret Role'}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  isImposter
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    : isCivilian
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                }`}>
                  {isImposter ? 'Imposter' : isCivilian ? 'Civilian' : 'Joker'}
                </span>
              </div>

              {/* Role Badge & Icon */}
              <div className="my-2">
                <div className="inline-flex p-3 rounded-2xl bg-slate-900/80 border border-white/10 mb-2 shadow-inner">
                  {isImposter && <Skull className="w-9 h-9 text-rose-400 animate-bounce" />}
                  {isCivilian && <ShieldCheck className="w-9 h-9 text-emerald-400" />}
                  {isJoker && <Sparkles className="w-9 h-9 text-amber-400" />}
                </div>

                <h3 className={`text-2xl sm:text-3xl font-black tracking-wide ${
                  isImposter ? 'text-rose-400' : isCivilian ? 'text-emerald-400' : 'text-purple-300'
                }`}>
                  {role}
                </h3>
              </div>
            </div>

            {/* Secret Word OR Clue Box */}
            <div className={`p-4 rounded-2xl border my-2 ${
              isImposter 
                ? 'bg-rose-950/60 border-rose-500/40' 
                : isCivilian 
                ? 'bg-emerald-950/60 border-emerald-500/40' 
                : 'bg-purple-950/60 border-purple-500/40'
            }`}>
              {isImposter ? (
                <>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-rose-300 flex items-center justify-center gap-1">
                    <Flame className="w-3.5 h-3.5" /> Your Secret Clue (Use to bluff!)
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-white mt-1 tracking-wider">
                    "{clue}"
                  </div>
                  <div className="text-[11px] text-rose-200/80 mt-1">
                    You DO NOT know the word. Use this clue to blend in!
                  </div>
                </>
              ) : isCivilian ? (
                <>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 flex items-center justify-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> Secret Word
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-white mt-1 tracking-wider">
                    "{secret_word}"
                  </div>
                  <div className="text-[11px] text-emerald-200/80 mt-1">
                    Give subtle clues without giving away the exact word!
                  </div>
                </>
              ) : (
                <>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-amber-300 flex items-center justify-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" /> Secret Word (You Know It!)
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-white mt-1 tracking-wider">
                    "{secret_word}"
                  </div>
                  <div className="text-[11px] text-amber-200/80 mt-1">
                    Pretend you don't know it. Trick the group into voting you out!
                  </div>
                </>
              )}
            </div>

            {/* Role Instructions */}
            <p className="text-xs text-slate-300 leading-relaxed px-2">
              {instruction}
            </p>

            {/* Conceal / Hide Button */}
            <div className="mt-4 pt-2 border-t border-slate-800/80">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); toggleReveal(); }}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white font-bold text-xs flex items-center justify-center gap-2 border border-slate-800 transition active:scale-95"
              >
                <EyeOff className="w-4 h-4 text-slate-400" />
                <span>Conceal / Hide Role Card</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
