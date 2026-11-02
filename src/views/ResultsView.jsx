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
  Crown,
  ChevronRight,
  AlertTriangle,
  Search,
  RefreshCw
} from 'lucide-react';
import confetti from 'canvas-confetti';
import PlayerAvatar from '../components/PlayerAvatar';
import { sounds } from '../lib/audio';

export default function ResultsView({
  results,
  room,
  isHost,
  currentPlayer,
  onProceedToNextRound,
  onStartNextRound,
  isLoading
}) {
  const gameOver = results?.game_over ?? (results?.winner && results?.winner !== 'NONE');
  const winner = results?.winner || 'NONE';
  const roundNumber = results?.round_number || room?.current_round_number || 1;
  const isJokerWin = winner === 'JOKER';
  const isImposterWin = winner === 'IMPOSTERS';
  const isCivilianWin = winner === 'CIVILIANS';

  const allRoles = results?.all_roles || [];
  const topic = results?.topic || '';
  const clue = results?.clue || '';
  const category = results?.category || 'General';
  const message = results?.message || '';

  const eliminatedPlayerId = results?.eliminated_player_id;
  const eliminatedPlayer = allRoles.find(p => p.player_id === eliminatedPlayerId);

  useEffect(() => {
    if (gameOver) {
      sounds.playVictory();
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
    } else {
      sounds.playAlarm();
    }
  }, [gameOver]);

  const handleConfirmReset = () => {
    sounds.playClick();
    if (window.confirm('Are you sure you want to reset and restart the game? All players will return to the lobby with fresh roles.')) {
      onStartNextRound();
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6 space-y-6 animate-fadeIn">
      {/* ================= CASE 1: MATCH CONTINUES (IMPOSTER STILL AT LARGE) ================= */}
      {!gameOver ? (
        <div className="p-6 sm:p-8 rounded-3xl border text-center shadow-2xl relative overflow-hidden bg-gradient-to-b from-amber-950/70 via-slate-900 to-slate-950 border-amber-500/50">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold uppercase tracking-wider mb-3">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            Round #{roundNumber} Voting Outcome
          </div>

          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            🚨 IMPOSTER STILL AT LARGE!
          </h2>

          {eliminatedPlayer ? (
            <div className="mt-3 p-4 rounded-2xl bg-slate-950/80 border border-slate-800 max-w-md mx-auto">
              <span className="text-xs text-slate-400 block mb-1">Accused and Eliminated this round:</span>
              <div className="text-lg font-bold text-white flex items-center justify-center gap-2">
                <span>{eliminatedPlayer.player_name}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  👥 Innocent Civilian
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-2">
                The group voted out an innocent civilian! The Imposter survived detection!
              </p>
            </div>
          ) : (
            <p className="mt-2 text-sm text-slate-300 max-w-lg mx-auto">
              {message || 'Voting resulted in a tie or no consensus. The Imposter remains undetected!'}
            </p>
          )}

          <div className="mt-5 p-3 rounded-xl bg-purple-950/40 border border-purple-500/30 text-xs text-purple-200 inline-flex items-center gap-2">
            <Search className="w-4 h-4 text-purple-400" />
            <span>Multiple rounds continue with the remaining alive players until an imposter is exposed!</span>
          </div>

          {/* Action buttons at end of round */}
          <div className="mt-6 pt-4 border-t border-amber-500/20 flex flex-col items-center">
            {isHost ? (
              <div className="w-full max-w-lg flex flex-col sm:flex-row items-center justify-center gap-3">
                {/* Proceed to Next Investigation Round */}
                <button
                  type="button"
                  onClick={onProceedToNextRound}
                  disabled={isLoading}
                  className="flex-1 w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-sm sm:text-base tracking-wide shadow-xl shadow-purple-950/60 transition active:scale-95 flex items-center justify-center gap-2"
                >
                  <span>Proceed to Round #{roundNumber + 1} (Hunt Continues!)</span>
                  <ChevronRight className="w-4 h-4" />
                </button>

                {/* Reset / Restart Button at End of Round */}
                <button
                  type="button"
                  onClick={handleConfirmReset}
                  disabled={isLoading}
                  className="w-full sm:w-auto py-4 px-5 rounded-2xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 hover:text-white border border-rose-500/40 text-sm font-bold transition active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-rose-950/40"
                  title="Reset and restart the game back to the lobby"
                >
                  <RotateCcw className="w-4 h-4 text-rose-400" />
                  <span>Restart Game</span>
                </button>
              </div>
            ) : (
              <div className="text-xs font-semibold text-purple-300 px-4 py-2 rounded-xl bg-purple-950/40 border border-purple-500/30">
                Waiting for the Game Master to proceed to Round #{roundNumber + 1} or restart...
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ================= CASE 2: GAME OVER (IMPOSTER EXPOSED / JOKER WON / PARITY) ================= */
        <div className={`p-6 sm:p-8 rounded-3xl border text-center shadow-2xl relative overflow-hidden ${
          isJokerWin
            ? 'bg-gradient-to-b from-purple-950 via-slate-900 to-slate-950 border-purple-500/50 glow-joker'
            : isImposterWin
            ? 'bg-gradient-to-b from-rose-950 via-slate-900 to-slate-950 border-rose-500/50 glow-imposter'
            : 'bg-gradient-to-b from-emerald-950 via-slate-900 to-slate-950 border-emerald-500/50 glow-civilian'
        }`}>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-xs font-bold uppercase tracking-wider mb-3">
            <Trophy className="w-3.5 h-3.5 text-amber-400" /> Match Concluded in Round #{roundNumber}
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight">
            {isJokerWin && '🃏 JOKER SPECIAL WIN!'}
            {isImposterWin && '🚨 IMPOSTERS WIN!'}
            {isCivilianWin && '👥 CIVILIANS WIN!'}
          </h2>

          <p className="mt-2 text-sm sm:text-base text-slate-300 max-w-xl mx-auto">
            {isJokerWin && 'The Joker was voted out and tricked everyone! Masterful deception!'}
            {isImposterWin && 'The Imposters blended in across rounds and reached parity with the Civilians!'}
            {isCivilianWin && `The Imposter was EXPOSED after ${roundNumber} round${roundNumber > 1 ? 's' : ''} of intense investigation! Civilians triumph!`}
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
                Shared by Imposter(s)
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Role Reveal & Vote Breakdown */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-purple-400" />
            Player Roles & Round #{roundNumber} Vote Breakdown
          </h3>
          <span className="text-xs text-slate-400">
            {allRoles.filter(p => !p.is_host).length} Participants
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {allRoles.map((player) => {
            const role = player.role;
            const isImp = role === 'IMPOSTER';
            const isCiv = role === 'CIVILIAN';
            const isJok = role === 'JOKER';
            const isHst = player.is_host || role === 'HOST';

            return (
              <div
                key={player.player_id}
                className={`p-4 rounded-2xl border transition-all relative overflow-hidden ${
                  player.is_just_eliminated
                    ? 'bg-rose-950/30 border-rose-500 ring-2 ring-rose-500/50'
                    : player.is_eliminated
                    ? 'bg-slate-950/60 border-slate-800 opacity-60'
                    : isHst
                    ? 'bg-amber-950/20 border-amber-500/30'
                    : 'bg-slate-900/80 border-slate-800'
                }`}
              >
                {/* Eliminated ribbon */}
                {player.is_just_eliminated ? (
                  <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-rose-500 text-white text-[9px] font-black uppercase tracking-wider">
                    Voted Out This Round
                  </div>
                ) : player.is_eliminated ? (
                  <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[9px] font-bold uppercase tracking-wider">
                    Eliminated
                  </div>
                ) : null}

                <div className="flex items-center gap-2.5 mb-3">
                  <PlayerAvatar 
                    playerNumber={player.player_number} 
                    avatarIndex={player.avatar_index} 
                    isHost={isHst}
                    size="md" 
                  />
                  <div className="min-w-0">
                    <h4 className="font-bold text-sm text-white truncate">
                      {player.player_name}
                    </h4>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {isHst ? 'Room Host • Moderator' : `Participant #${player.player_number}`}
                    </span>
                  </div>
                </div>

                {/* Role Pill */}
                <div className={`p-2 rounded-xl text-center text-xs font-black tracking-wide border mb-2 ${
                  isHst
                    ? 'bg-amber-950/60 border-amber-500/40 text-amber-300'
                    : isImp
                    ? 'bg-rose-950/60 border-rose-500/40 text-rose-300'
                    : isCiv
                    ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                    : 'bg-purple-950/60 border-purple-500/40 text-purple-300'
                }`}>
                  {isHst && '👑 GAME MASTER'}
                  {isImp && '🚨 IMPOSTER'}
                  {isCiv && '👥 CIVILIAN'}
                  {isJok && '🃏 JOKER'}
                </div>

                {/* Votes Received */}
                {!isHst && (
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
                    <span>Votes Received:</span>
                    <span className="font-bold text-white font-mono">
                      {player.votes_received} vote{player.votes_received !== 1 ? 's' : ''}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Host Action: Reset & Start New Match Panel */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <h4 className="font-bold text-white text-base">
            {gameOver ? 'Start a New Match?' : 'Reset & Restart Game?'}
          </h4>
          <p className="text-xs text-slate-400">
            {gameOver
              ? 'Return all players to the lobby, reset eliminations, and choose a new secret topic!'
              : 'Restart from the beginning: reset eliminations, restore all players, and return to lobby.'}
          </p>
        </div>

        {isHost ? (
          <button
            type="button"
            onClick={handleConfirmReset}
            disabled={isLoading}
            className="py-3.5 px-6 rounded-2xl bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-sm tracking-wide shadow-lg shadow-purple-950/60 transition active:scale-95 flex items-center gap-2"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <RotateCcw className="w-4 h-4" />
                <span>{gameOver ? 'Start New Match' : 'Reset / Restart Game'}</span>
              </>
            )}
          </button>
        ) : (
          <div className="text-xs text-purple-400 font-semibold px-4 py-2 rounded-xl bg-purple-950/40 border border-purple-500/20">
            Waiting for Game Master to restart...
          </div>
        )}
      </div>
    </div>
  );
}
