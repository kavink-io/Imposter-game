import React, { useState, useEffect } from 'react';
import { LogIn, ArrowLeft, User, KeyRound, AlertCircle } from 'lucide-react';
import { sounds } from '../lib/audio';

export default function JoinRoomView({ initialCode = '', onBack, onJoinRoom, isLoading }) {
  const [roomCode, setRoomCode] = useState(initialCode.toUpperCase());
  const [playerName, setPlayerName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (initialCode) {
      setRoomCode(initialCode.toUpperCase());
    }
  }, [initialCode]);

  const handleSubmit = (e) => {
    e.preventDefault();
    sounds.playClick();
    setErrorMsg('');

    if (!roomCode.trim() || roomCode.trim().length < 4) {
      setErrorMsg('Please enter a valid room code.');
      return;
    }

    if (!playerName.trim() || playerName.trim().length < 2) {
      setErrorMsg('Please enter a display name (at least 2 characters).');
      return;
    }

    onJoinRoom({
      roomCode: roomCode.trim().toUpperCase(),
      playerName: playerName.trim()
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
          <h2 className="text-2xl font-black text-white">Join a Game Room</h2>
          <p className="text-xs text-slate-400 mt-1">
            Enter the 6-character room code from your host.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-purple-400" />
              Room Code:
            </label>
            <input
              type="text"
              placeholder="e.g. PARTY8"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-base font-mono uppercase tracking-widest text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition"
              maxLength={8}
              autoFocus={!initialCode}
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-purple-400" />
              Your Display Name:
            </label>
            <input
              type="text"
              placeholder="e.g. Sarah, Priya, Marcus..."
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-sm text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition"
              autoFocus={Boolean(initialCode)}
            />
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
                <LogIn className="w-4 h-4" />
                <span>Join Game Room</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
