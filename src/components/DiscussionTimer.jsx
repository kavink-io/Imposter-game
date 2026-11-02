import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Clock, Volume2, UserCheck, ChevronRight } from 'lucide-react';
import { sounds } from '../lib/audio';

export default function DiscussionTimer({ 
  players = [], 
  isHost = false, 
  initialSeconds = 180 
}) {
  const [seconds, setSeconds] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const [activeSpeakerIdx, setActiveSpeakerIdx] = useState(0);
  const timerRef = useRef(null);

  // Filter to active alive participants only (host does not speak or play)
  const speakers = players.filter(p => !p.is_host && !p.is_eliminated);

  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            setIsRunning(false);
            sounds.playAlarm();
            return 0;
          }
          if (prev <= 10 && prev > 1) {
            sounds.playTick();
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isRunning]);

  const toggleTimer = () => {
    sounds.playClick();
    setIsRunning(!isRunning);
  };

  const resetTimer = (newSecs = initialSeconds) => {
    sounds.playClick();
    setIsRunning(false);
    setSeconds(newSecs);
  };

  const nextSpeaker = () => {
    sounds.playClick();
    if (speakers.length > 0) {
      setActiveSpeakerIdx((prev) => (prev + 1) % speakers.length);
    }
  };

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
  };

  const currentSpeaker = speakers[activeSpeakerIdx] || speakers[0];

  return (
    <div className="w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-bold text-white text-sm flex items-center gap-2">
          <Clock className="w-4 h-4 text-purple-400" />
          Discussion & Clue Phase
        </h4>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
          isRunning ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse' : 'bg-slate-800 text-slate-400'
        }`}>
          {isRunning ? 'Timer Running' : seconds === 0 ? 'Time Up!' : 'Paused'}
        </span>
      </div>

      {/* Big Digital Clock */}
      <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800/80 text-center">
        <div className={`font-mono text-4xl sm:text-5xl font-black tracking-widest ${
          seconds <= 10 && seconds > 0 
            ? 'text-rose-400 animate-pulse' 
            : seconds === 0 
            ? 'text-rose-500' 
            : 'text-white'
        }`}>
          {formatTime(seconds)}
        </div>
        <p className="text-[11px] text-slate-400 mt-1">
          Each alive participant gives one short verbal clue. Imposters bluff; Joker tricks!
        </p>
      </div>

      {/* Host Timer Controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={toggleTimer}
          className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-md transition active:scale-95 ${
            isRunning
              ? 'bg-amber-600 hover:bg-amber-500 text-white'
              : 'bg-purple-600 hover:bg-purple-500 text-white'
          }`}
        >
          {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          <span>{isRunning ? 'Pause' : 'Start Timer'}</span>
        </button>

        <button
          onClick={() => resetTimer(initialSeconds)}
          className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
          title="Reset timer"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        <button
          onClick={() => setSeconds(s => s + 30)}
          className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition"
        >
          +30s
        </button>
      </div>

      {/* Preset time buttons */}
      <div className="flex items-center justify-between gap-1 text-xs">
        {[60, 120, 180, 300].map((s) => (
          <button
            key={s}
            onClick={() => resetTimer(s)}
            className="flex-1 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 font-mono text-[11px] transition"
          >
            {s / 60}m
          </button>
        ))}
      </div>

      {/* Verbal Clue Turn Assistant */}
      {speakers.length > 0 && (
        <div className="pt-2 border-t border-slate-800/80">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
              <UserCheck className="w-3.5 h-3.5 text-purple-400" />
              Speaking Turn:
            </span>
            <button
              onClick={nextSpeaker}
              className="text-[10px] text-purple-400 hover:text-purple-300 font-bold flex items-center gap-0.5"
            >
              Next Speaker <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800">
            <div className="w-7 h-7 rounded-lg bg-purple-600 text-white font-bold text-xs flex items-center justify-center">
              {activeSpeakerIdx + 1}
            </div>
            <div className="text-xs">
              <span className="font-bold text-white">
                {currentSpeaker?.player_name || `Participant ${activeSpeakerIdx + 1}`}
              </span>
              <span className="text-slate-400 text-[10px] ml-1.5">giving verbal clue</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
