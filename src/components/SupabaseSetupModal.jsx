import React, { useState } from 'react';
import { X, Database, Check, Copy, ExternalLink, AlertTriangle, ShieldCheck, Zap } from 'lucide-react';
import { sounds } from '../lib/audio';

export default function SupabaseSetupModal({ isOpen, onClose }) {
  const [copiedKey, setCopiedKey] = useState(null);

  if (!isOpen) return null;

  const copyText = (text, key) => {
    sounds.playClick();
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-800/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base">Enable Real-Time Multiplayer</h3>
              <p className="text-[11px] text-slate-400">Connect Supabase to play across different phones and PCs</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-slate-300 text-xs sm:text-sm leading-relaxed">
          {/* Why notice */}
          <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/30 text-amber-200 text-xs space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-amber-300">
              <AlertTriangle className="w-4 h-4" />
              <span>Why am I seeing "Room code not found"?</span>
            </div>
            <p>
              Your website is currently in <strong>Local Mode</strong>. Rooms created in Local Mode only exist inside that specific browser’s memory. Friends on separate phones or computers cannot join until <strong>Supabase</strong> is connected to your Vercel deployment!
            </p>
          </div>

          <div className="space-y-4">
            <h4 className="font-bold text-white text-xs uppercase tracking-wider">
              Quick 4-Step Setup Guide (Takes ~3 minutes)
            </h4>

            {/* Step 1 */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-purple-400 text-xs">Step 1: Create a Free Supabase Project</span>
                <a
                  href="https://supabase.com"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-purple-400 hover:text-purple-300 inline-flex items-center gap-1 font-semibold"
                >
                  supabase.com <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <p className="text-xs text-slate-400">
                Sign in to Supabase and click <strong>"New Project"</strong>. Choose a name and database password.
              </p>
            </div>

            {/* Step 2 */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <span className="font-bold text-purple-400 text-xs block">Step 2: Run Database Migrations in SQL Editor</span>
              <p className="text-xs text-slate-400">
                In your Supabase dashboard, click <strong>SQL Editor</strong> on the left menu:
              </p>
              <ol className="list-decimal list-inside space-y-1 text-xs text-slate-300 pl-1">
                <li>
                  Copy the entire contents of <code className="bg-slate-900 px-1 py-0.5 rounded text-purple-300">supabase/migrations/20261030000000_imposter_party_schema.sql</code>, paste into SQL Editor, and click <strong>Run</strong>.
                </li>
                <li>
                  Copy the contents of <code className="bg-slate-900 px-1 py-0.5 rounded text-purple-300">supabase/seed.sql</code>, paste into SQL Editor, and click <strong>Run</strong> to populate 50+ topics and clues.
                </li>
              </ol>
            </div>

            {/* Step 3 */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <span className="font-bold text-purple-400 text-xs block">Step 3: Copy Your API Keys</span>
              <p className="text-xs text-slate-400">
                In Supabase, go to <strong>Project Settings</strong> (gear icon) → <strong>API</strong>:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-mono">Variable 1:</span>
                    <span className="font-mono font-bold text-xs text-emerald-400">VITE_SUPABASE_URL</span>
                  </div>
                  <button
                    onClick={() => copyText('VITE_SUPABASE_URL', 'v1')}
                    className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                    title="Copy Name"
                  >
                    {copiedKey === 'v1' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-mono">Variable 2:</span>
                    <span className="font-mono font-bold text-xs text-emerald-400">VITE_SUPABASE_ANON_KEY</span>
                  </div>
                  <button
                    onClick={() => copyText('VITE_SUPABASE_ANON_KEY', 'v2')}
                    className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                    title="Copy Name"
                  >
                    {copiedKey === 'v2' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Step 4 */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <span className="font-bold text-purple-400 text-xs block">Step 4: Add to Vercel & Redeploy</span>
              <ol className="list-decimal list-inside space-y-1 text-xs text-slate-300 pl-1">
                <li>Go to your project at <a href="https://vercel.com" target="_blank" rel="noreferrer" className="text-purple-400 hover:underline">vercel.com</a></li>
                <li>Go to <strong>Settings</strong> → <strong>Environment Variables</strong>.</li>
                <li>Add both <code className="text-emerald-400 font-mono">VITE_SUPABASE_URL</code> and <code className="text-emerald-400 font-mono">VITE_SUPABASE_ANON_KEY</code> with your Supabase values.</li>
                <li>Go to the <strong>Deployments</strong> tab, click the <strong>three dots (...)</strong> on your latest deployment, and click <strong>Redeploy</strong>!</li>
              </ol>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <Zap className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Once redeployed, the top navbar badge will turn green (<strong>Supabase Realtime</strong>) and anyone with the link can join instantly!</span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 flex justify-end bg-slate-800/20">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition"
          >
            Got It!
          </button>
        </div>
      </div>
    </div>
  );
}
