import React, { useState } from 'react';
import { PlusCircle, ArrowLeft, User, Clock, AlertCircle, Crown } from 'lucide-react';
import { sounds } from '../lib/audio';

export default function CreateRoomView({ onBack, onCreateRoom, isLoading }) {
  const [hostName, setHostName] = useState('');
  const [discussionTime, setDiscussionTime] = useState(180);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    sounds.playClick();
    setErrorMsg('');

    if (!hostName.trim() || hostName.trim().length < 2) {
      setErrorMsg('Please enter a display name (at least 2 characters).');
      return;
    }

    onCreateRoom({
      hostName: hostName.trim(),
      settings: {
        discussionTime: Number(discussionTime)
      }
    });
  };

  return (
    <div className="max-w-md mx-auto px-4 py-8 space-y-6 animate-fadeIn">
      <button
        type="button"
        onClick={() => { sounds.playClick(); onBack(); }}
        className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Home
      </button>

      <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl space-y-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold mb-2">
            <Crown className="w-3.5 h-3.5 fill-amber-400" /> Game Master Role
          </div>
          <h2 className="text-2xl font-black text-white">Create a Game Room</h2>
          <p className="text-xs text-slate-400 mt-1">
            You will become the Room Host (Game Master). You will coordinate rounds, timers, and voting without playing a role or voting.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-purple-400" />
              Your Game Master Name:
            </label>
            <input
              type="text"
              placeholder="e.g. Alex, Jordan, Sarah..."
              value={hostName}
              onChange={(e) => setHostName(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-sm text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition"
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-purple-400" />
              Default Discussion Timer:
            </label>
            <select
              value={discussionTime}
              onChange={(e) => setDiscussionTime(Number(e.target.value))}
              className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-sm text-white focus:border-purple-500 outline-none transition"
            >
              <option value={60}>1 Minute</option>
              <option value={120}>2 Minutes</option>
              <option value={180}>3 Minutes (Recommended)</option>
              <option value={300}>5 Minutes</option>
            </select>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-sm tracking-wide shadow-xl shadow-purple-950/60 disabled:opacity-50 transition active:scale-95 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <PlusCircle className="w-4 h-4" />
                <span>Create Room & Enter Lobby</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
