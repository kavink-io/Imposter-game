import React from 'react';
import { Crown, CheckCircle2, ShieldAlert } from 'lucide-react';

export const AVATAR_GRADIENTS = [
  'from-pink-500 to-rose-600',
  'from-purple-500 to-indigo-600',
  'from-blue-500 to-cyan-600',
  'from-teal-500 to-emerald-600',
  'from-amber-500 to-orange-600',
  'from-red-500 to-pink-600',
  'from-violet-500 to-fuchsia-600',
  'from-emerald-500 to-lime-600'
];

export const AVATAR_EMOJIS = ['🦊', '🦉', '🐯', '🐼', '🦁', '🐨', '🐺', '🦄'];

export default function PlayerAvatar({ 
  playerNumber = 1, 
  avatarIndex = 0, 
  size = 'md', 
  isHost = false,
  hasVoted = false,
  showStatus = false,
  className = '' 
}) {
  const gradient = AVATAR_GRADIENTS[(avatarIndex ?? playerNumber - 1) % AVATAR_GRADIENTS.length];
  const emoji = AVATAR_EMOJIS[(avatarIndex ?? playerNumber - 1) % AVATAR_EMOJIS.length];

  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-11 h-11 text-lg',
    lg: 'w-16 h-16 text-2xl',
    xl: 'w-24 h-24 text-4xl'
  }[size] || 'w-11 h-11 text-lg';

  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 ${className}`}>
      <div className={`${sizeClasses} rounded-2xl bg-gradient-to-tr ${gradient} flex items-center justify-center shadow-lg text-white font-black select-none border border-white/20 transition-transform`}>
        <span>{emoji}</span>
      </div>

      {/* Host Crown Badge */}
      {isHost && (
        <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shadow-md border border-slate-900" title="Room Host">
          <Crown className="w-3 h-3 fill-slate-950" />
        </div>
      )}

      {/* Voted check indicator */}
      {showStatus && hasVoted && (
        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center shadow-md border border-slate-900" title="Voted">
          <CheckCircle2 className="w-3.5 h-3.5 text-white" />
        </div>
      )}
    </div>
  );
}
