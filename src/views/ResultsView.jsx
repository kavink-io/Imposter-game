import React, { useEffect } from 'react';
import { 
  Trophy, 
  RotateCcw, 
  Sparkles, 
  ShieldCheck, 
  Skull, 
  Flame, 
  Vote, 
  Users, 
  Crown 
} from 'lucide-react';
import confetti from 'canvas-confetti';
import PlayerAvatar from '../components/PlayerAvatar';
import { sounds } from '../lib/audio';

export default function ResultsView({
  results,
  room,
  isHost,
  onStartNextRound,
  isLoading
}) {
  useEffect(() => {
    sounds.playVictory();
    // Confetti explosion
    try {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 }
      });
      setTimeout(() => {
        confetti({
          particleCount: 70,
          angle: 60,
          spread: 55,
          origin: { x: 0 }
        });
        confetti({
          particleCount: 70,
          angle: 120,
          spread: 55,
          origin: { x: 1 }
        });
      }, 300);
    } catch (e) {}
  }, []);

  const winner = results?.winner || 'CIVILIANS';
  const isJokerWin = winner === 'JOKER';
  const isImposterWin = winner === 'IMPOSTERS';
  const isCivilianWin = winner === 'CIVILIANS';

  const allRoles = results?.all_roles || [];
  const topic = results?.topic || '';
  const clue = results?.clue || '';
  const category = results?.category || 'General';

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6 space-y-6 animate-fadeIn">
      {/* Victory Header Banner */}
      <div className={`p-6 sm:p-8 rounded-3xl border text-center shadow-2xl relative overflow-hidden ${
        isJokerWin
          ? 'bg-gradient-to-b from-purple-950 via-slate-900 to-slate-950 border-purple-500/50 glow-joker'
          : isImposterWin
          ? 'bg-gradient-to-b from-rose-950 via-slate-900 to-slate-950 border-rose-500/50 glow-imposter'
          : 'bg-gradient-to-b from-emerald-950 via-slate-900 to-slate-950 border-emerald-500/50 glow-civilian'
      }`}>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-xs font-bold uppercase tracking-wider mb-3">
          <Trophy className="w-3.5 h-3.5 text-amber-400" /> Round Results
        </div>

        <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight">
          {isJokerWin && '🃏 JOKER SPECIAL WIN!'}
          {isImposterWin && '🚨 IMPOSTERS WIN!'}
          {isCivilianWin && '👥 CIVILIANS WIN!'}
        </h2>

        <p className="mt-2 text-sm sm:text-base text-slate-300 max-w-xl mx-auto">
          {isJokerWin && 'The Joker successfully tricked everyone into voting them out! Masterful deception!'}
          {isImposterWin && 'The Imposters blended in, deceived the crew, and survived the vote!'}
          {isCivilianWin && 'The Civilians successfully saw through the lies and eliminated the Imposters!'}
        </p>

        {/* Secret Word & Clue Reveal Cards */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg mx-auto">
          <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-emerald-500/30 text-center">
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
              Secret Word
            </span>
            <span className="text-xl font-black text-white">
              "{topic}"
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              Category: {category}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-rose-500/30 text-center">
            <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider block">
              Imposter Clue
            </span>
            <span className="text-xl font-black text-white">
              "{clue}"
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              Shared by both Imposters
            </span>
          </div>
        </div>
      </div>

      {/* 8 Players Roles Reveal Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-purple-400" />
            All 8 Players Role Reveal & Vote Breakdown
          </h3>
          <span className="text-xs text-slate-400">
            Exactly 5 Civilians • 2 Imposters • 1 Joker
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {allRoles.map((player) => {
            const role = player.role;
            const isImp = role === 'IMPOSTER';
            const isCiv = role === 'CIVILIAN';
            const isJok = role === 'JOKER';

            return (
              <div
                key={player.player_id}
                className={`p-4 rounded-2xl border transition-all relative overflow-hidden ${
                  player.is_eliminated
                    ? 'bg-rose-950/20 border-rose-500/50 ring-1 ring-rose-500/30'
                    : 'bg-slate-900/80 border-slate-800'
                }`}
              >
                {/* Eliminated ribbon */}
                {player.is_eliminated && (
                  <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[9px] font-bold uppercase tracking-wider">
                    Voted Out
                  </div>
                )}

                <div className="flex items-center gap-2.5 mb-3">
                  <PlayerAvatar 
                    playerNumber={player.player_number} 
                    avatarIndex={player.avatar_index} 
                    size="md" 
                  />
                  <div className="min-w-0">
                    <h4 className="font-bold text-sm text-white truncate">
                      {player.player_name}
                    </h4>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Player #{player.player_number}
                    </span>
                  </div>
                </div>

                {/* Role Pill */}
                <div className={`p-2 rounded-xl text-center text-xs font-black tracking-wide border mb-2 ${
                  isImp
                    ? 'bg-rose-950/60 border-rose-500/40 text-rose-300'
                    : isCiv
                    ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                    : 'bg-purple-950/60 border-purple-500/40 text-purple-300'
                }`}>
                  {isImp && '🚨 IMPOSTER'}
                  {isCiv && '👥 CIVILIAN'}
                  {isJok && '🃏 JOKER'}
                </div>

                {/* Votes Received */}
                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
                  <span>Votes Received:</span>
                  <span className="font-bold text-white font-mono">
                    {player.votes_received} vote{player.votes_received !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Host Action: Start Next Round */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <h4 className="font-bold text-white text-base">Ready for Another Round?</h4>
          <p className="text-xs text-slate-400">
            Keep the exact same 8 players in this room! Roles will be randomly re-assigned and a fresh topic selected.
          </p>
        </div>

        {isHost ? (
          <button
            type="button"
            onClick={onStartNextRound}
            disabled={isLoading}
            className="py-3.5 px-6 rounded-2xl bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-sm tracking-wide shadow-lg shadow-purple-950/60 transition active:scale-95 flex items-center gap-2"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <RotateCcw className="w-4 h-4" />
                <span>Start Next Round</span>
              </>
            )}
          </button>
        ) : (
          <div className="text-xs text-purple-400 font-semibold px-4 py-2 rounded-xl bg-purple-950/40 border border-purple-500/20">
            Waiting for Host to start next round...
          </div>
        )}
      </div>
    </div>
  );
}
