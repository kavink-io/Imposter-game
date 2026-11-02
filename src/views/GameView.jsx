import React from 'react';
import { 
  Eye, 
  MessageSquare, 
  Vote, 
  ChevronRight, 
  Clock, 
  ShieldCheck, 
  Sparkles,
  Crown
} from 'lucide-react';
import PhaseTracker from '../components/PhaseTracker';
import RoleCard from '../components/RoleCard';
import DiscussionTimer from '../components/DiscussionTimer';
import VotingPanel from '../components/VotingPanel';
import PlayerAvatar from '../components/PlayerAvatar';
import { sounds } from '../lib/audio';

export default function GameView({
  room,
  currentPlayer,
  roleData,
  isHost,
  onAdvancePhase,
  onVote,
  onEndVoting,
  isLoading
}) {
  const currentPhase = room?.current_phase || 'ROLE_REVEAL';
  const roundNumber = room?.current_round_number || 1;
  const players = room?.players || [];
  const aliveParticipants = players.filter(p => !p.is_host && !p.is_eliminated);

  const handleNextPhase = (nextPhase) => {
    sounds.playClick();
    onAdvancePhase(nextPhase);
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6 space-y-6 animate-fadeIn">
      {/* Phase Tracker Stepper */}
      <PhaseTracker currentPhase={currentPhase} roundNumber={roundNumber} />

      {/* PHASE 1: ROLE REVEAL */}
      {currentPhase === 'ROLE_REVEAL' && (
        <div className="space-y-6">
          <div className="text-center max-w-md mx-auto">
            {isHost ? (
              <>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold mb-2">
                  <Crown className="w-3.5 h-3.5 fill-amber-400" /> Game Master Dashboard
                </div>
                <h2 className="text-2xl font-black text-white">Round #{roundNumber} Launched!</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Players are viewing their secret role cards. You do not play or vote. When players are ready, begin discussion!
                </p>
              </>
            ) : (
              <>
                <h2 className="text-2xl font-black text-white">Check Your Secret Role</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Tap the card below to reveal your secret role, word, or clue. Tap again to conceal it!
                </p>
              </>
            )}
          </div>

          {/* Role Card / Game Master Card */}
          <RoleCard 
            roleData={roleData} 
            playerName={currentPlayer?.player_name} 
            isHost={isHost} 
          />

          {/* Host Advance to Discussion */}
          {isHost && (
            <div className="pt-4 border-t border-slate-800/80 flex flex-col items-center">
              <button
                type="button"
                onClick={() => handleNextPhase('DISCUSSION')}
                disabled={isLoading}
                className="w-full max-w-md py-4 px-6 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-sm tracking-wide shadow-lg shadow-purple-950/60 transition active:scale-95 flex items-center justify-center gap-2"
              >
                <span>Everyone Ready? Begin Discussion Round #{roundNumber}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
              <p className="text-[11px] text-slate-500 mt-2">
                All {aliveParticipants.length} active players will give verbal clues in turn.
              </p>
            </div>
          )}
        </div>
      )}

      {/* PHASE 2: DISCUSSION */}
      {currentPhase === 'DISCUSSION' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Timer & Speaking Assistant */}
            <DiscussionTimer 
              players={players} 
              isHost={isHost} 
              initialSeconds={room?.settings?.discussionTime || 180} 
            />

            {/* Quick peek at player's own role card or host card */}
            <div>
              <div className="text-xs font-bold text-slate-300 mb-2 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-purple-400" />
                <span>{isHost ? 'Game Master Info Card:' : 'Your Role Card (Tap to Peek):'}</span>
              </div>
              <RoleCard 
                roleData={roleData} 
                playerName={currentPlayer?.player_name} 
                isHost={isHost} 
              />
            </div>
          </div>

          {/* Host advance to voting */}
          {isHost && (
            <div className="pt-4 border-t border-slate-800/80 flex flex-col items-center">
              <button
                type="button"
                onClick={() => handleNextPhase('VOTING')}
                disabled={isLoading}
                className="w-full max-w-md py-4 px-6 rounded-2xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-black text-sm tracking-wide shadow-lg shadow-rose-950/60 transition active:scale-95 flex items-center justify-center gap-2"
              >
                <Vote className="w-4 h-4" />
                <span>Finish Discussion & Open Voting Round #{roundNumber}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* PHASE 3: VOTING */}
      {currentPhase === 'VOTING' && (
        <div className="space-y-6">
          <VotingPanel
            players={players}
            currentPlayer={currentPlayer}
            roomCode={room?.room_code}
            onVote={onVote}
            onEndVoting={onEndVoting}
            isHost={isHost}
            allVoted={aliveParticipants.every(p => p.has_voted)}
          />

          {/* Peek role card */}
          <div className="max-w-md mx-auto pt-2">
            <RoleCard 
              roleData={roleData} 
              playerName={currentPlayer?.player_name} 
              isHost={isHost} 
            />
          </div>
        </div>
      )}
    </div>
  );
}
