import React, { useState } from 'react';
import { Vote, CheckCircle2, Lock, AlertCircle, Users } from 'lucide-react';
import PlayerAvatar from './PlayerAvatar';
import { sounds } from '../lib/audio';

export default function VotingPanel({
  players = [],
  currentPlayer,
  roomCode,
  onVote,
  onEndVoting,
  isHost = false,
  allVoted = false
}) {
  const [selectedTargetId, setSelectedTargetId] = useState(null);
  const [votedTargetId, setVotedTargetId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Eligible targets: all other 7 players (cannot vote for self!)
  const eligibleTargets = players.filter(p => p.id !== currentPlayer?.id);
  const totalVotesCast = players.filter(p => p.has_voted).length;

  const handleSelect = (playerId) => {
    sounds.playClick();
    setSelectedTargetId(playerId);
    setErrorMsg('');
  };

  const handleCastVote = async () => {
    if (!selectedTargetId) {
      setErrorMsg('Please tap a player to cast your vote.');
      return;
    }

    sounds.playVote();
    setIsSubmitting(true);
    setErrorMsg('');

    try {
      await onVote(selectedTargetId);
      setVotedTargetId(selectedTargetId);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to submit vote.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-5 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-4">
        <div>
          <h3 className="text-lg font-black text-white flex items-center gap-2">
            <Vote className="w-5 h-5 text-purple-400" />
            Private Voting Ballot
          </h3>
          <p className="text-xs text-slate-400">
            Vote for who you suspect is an Imposter (or suspect of being the Joker!).
          </p>
        </div>

        {/* Live Vote Progress */}
        <div className="text-right">
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Ballots Cast</div>
          <div className="text-sm font-black text-purple-300 font-mono">
            {totalVotesCast} / 8 Voted
          </div>
        </div>
      </div>

      {/* Warning Notice */}
      <div className="px-3.5 py-2.5 rounded-xl bg-purple-950/40 border border-purple-500/20 text-xs text-purple-200 flex items-center gap-2">
        <Lock className="w-4 h-4 text-purple-400 shrink-0" />
        <span>Your vote is 100% confidential. Votes are revealed together when the host closes voting.</span>
      </div>

      {/* Target Player Cards Grid */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-slate-300 block">
          Select One Player to Accuse:
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {eligibleTargets.map((player) => {
            const isSelected = selectedTargetId === player.id;
            const isConfirmed = votedTargetId === player.id;

            return (
              <button
                key={player.id}
                type="button"
                onClick={() => handleSelect(player.id)}
                className={`p-3 rounded-2xl border text-left transition-all flex items-center justify-between group active:scale-95 ${
                  isSelected
                    ? 'bg-purple-600/25 border-purple-500 ring-2 ring-purple-500/50 shadow-lg shadow-purple-950/40'
                    : 'bg-slate-950/80 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <PlayerAvatar 
                    playerNumber={player.player_number} 
                    avatarIndex={player.avatar_index} 
                    size="sm" 
                  />
                  <div className="truncate">
                    <div className="text-xs font-bold text-white truncate">
                      {player.player_name}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      Player #{player.player_number}
                    </div>
                  </div>
                </div>

                <div className="shrink-0 ml-2">
                  {isConfirmed ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Cast
                    </span>
                  ) : isSelected ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500 text-white shadow">
                      Selected
                    </span>
                  ) : (
                    <span className="w-4 h-4 rounded-full border border-slate-700 group-hover:border-slate-500 inline-block" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Submit / Change Vote Button */}
      <div className="pt-2">
        <button
          type="button"
          onClick={handleCastVote}
          disabled={!selectedTargetId || isSubmitting}
          className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-sm tracking-wide shadow-lg shadow-purple-950/60 disabled:opacity-50 disabled:pointer-events-none transition active:scale-95 flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <Vote className="w-4 h-4" />
              <span>{votedTargetId ? 'Update My Vote' : 'Confirm Secret Vote'}</span>
            </>
          )}
        </button>
      </div>

      {/* Host Controls: Close Voting */}
      {isHost && (
        <div className="pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-slate-400">
            {allVoted ? 'All 8 players have voted!' : `${totalVotesCast} of 8 votes received.`}
          </span>
          <button
            type="button"
            onClick={onEndVoting}
            className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md shadow-emerald-950/40 transition active:scale-95"
          >
            Tally Votes & Reveal Results 🏆
          </button>
        </div>
      )}
    </div>
  );
}
