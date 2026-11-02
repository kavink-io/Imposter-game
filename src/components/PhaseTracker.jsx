import React from 'react';
import { Users, Eye, MessageSquare, Vote, Trophy } from 'lucide-react';

const PHASES = [
  { id: 'WAITING', label: 'Lobby', icon: Users },
  { id: 'ROLE_REVEAL', label: 'Role Reveal', icon: Eye },
  { id: 'DISCUSSION', label: 'Discussion', icon: MessageSquare },
  { id: 'VOTING', label: 'Voting', icon: Vote },
  { id: 'RESULTS', label: 'Results', icon: Trophy }
];

export default function PhaseTracker({ currentPhase = 'WAITING', roundNumber = 1 }) {
  const currentIdx = PHASES.findIndex(p => p.id === currentPhase);

  return (
    <div className="w-full bg-slate-900/60 border border-slate-800/80 rounded-2xl p-3 shadow-lg">
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="text-xs font-bold text-slate-300">
          Round <span className="text-purple-400 font-black">#{roundNumber}</span>
        </span>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30">
          Phase: {PHASES.find(p => p.id === currentPhase)?.label || currentPhase}
        </span>
      </div>

      {/* Stepper bar */}
      <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
        {PHASES.map((phase, idx) => {
          const Icon = phase.icon;
          const isDone = idx < currentIdx;
          const isCurrent = idx === currentIdx;

          return (
            <div
              key={phase.id}
              className={`flex flex-col items-center justify-center p-2 rounded-xl text-center transition-all ${
                isCurrent
                  ? 'bg-gradient-to-b from-purple-600/30 to-indigo-600/20 border border-purple-500/50 shadow-md shadow-purple-950/50 text-white'
                  : isDone
                  ? 'bg-slate-900/80 border border-slate-800 text-slate-400'
                  : 'bg-slate-950/40 border border-slate-900 text-slate-600'
              }`}
            >
              <Icon className={`w-4 h-4 mb-1 ${
                isCurrent ? 'text-purple-400 animate-pulse' : isDone ? 'text-emerald-400' : 'text-slate-600'
              }`} />
              <span className="text-[10px] font-bold tracking-tight truncate w-full">
                {phase.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
