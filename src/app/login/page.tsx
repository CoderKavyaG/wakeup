"use client";

import React, { useState, useEffect, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Loader2, Shield, Brain, Sparkles, Terminal, Lock } from "lucide-react";
import { motion } from "framer-motion";

function TelemetryLog() {
  const [logs, setLogs] = useState<string[]>([]);
  useEffect(() => {
    const rawLogs = [
      "SYSTEM INITIATED v0.1.0",
      "SECURE VAULT: MOUNTED",
      "AES-256-GCM LAYER: ENGAGED",
      "NEON PG DATABASE: SECURE SYNCED",
      "COGNITIVE GRAPH: INITIALIZED",
      "LOCAL DAEMON STATS: PORT 3131",
      "AWAITING HANDSHAKE..."
    ];
    let idx = 0;
    const interval = setInterval(() => {
      if (idx < rawLogs.length) {
        const nextLog = rawLogs[idx];
        setLogs(prev => [...prev, nextLog]);
        idx++;
      } else {
        clearInterval(interval);
      }
    }, 450);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-black/30 border border-white/5 rounded-xl p-4 md:p-5 font-mono text-[10px] md:text-xs text-white/50 space-y-2.5 backdrop-blur-md shadow-2xl relative overflow-hidden h-48 lg:h-56 xl:h-64">
      <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-2">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500/60 animate-pulse"></span>
          <span className="w-1.5 h-1.5 rounded-full bg-yellow-500/60"></span>
          <span className="w-1.5 h-1.5 rounded-full bg-green-500/60"></span>
          <span className="text-[8px] md:text-[9px] uppercase tracking-widest text-white/30 font-bold ml-1">SYSTEM.TELEMETRY</span>
        </div>
        <span className="text-[7px] md:text-[8px] text-amber-400/60 tracking-wider uppercase font-bold bg-amber-500/5 border border-amber-500/10 px-1.5 py-0.5 rounded">READY</span>
      </div>
      <div className="space-y-1.5 overflow-y-auto h-[110px] lg:h-[140px] xl:h-[180px] pr-1 scrollbar-thin">
        {logs.map((log, i) => (
          <div key={i} className="flex gap-2 items-start leading-normal">
            <span className="text-amber-400 select-none font-bold">&gt;</span>
            <span className={log.includes("AWAITING") ? "text-amber-400 animate-pulse font-bold" : ""}>
              {log}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FloatingStatusCard() {
  return (
    <motion.div
      animate={{ y: [0, -6, 0] }}
      transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      className="p-3.5 md:p-4 rounded-xl border border-white/10 bg-[#121215]/40 backdrop-blur-lg flex items-center gap-3.5 shadow-xl shadow-amber-500/5 select-none w-56 lg:w-64"
    >
      <div className="w-9 h-9 md:w-10 md:h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
        <Brain className="w-4.5 h-4.5 md:w-5 md:h-5 animate-pulse" />
      </div>
      <div className="min-w-0">
        <div className="text-[9px] md:text-[10px] font-bold uppercase tracking-wider text-amber-400 font-mono">Cognitive Hub</div>
        <div className="text-[11px] md:text-xs text-white/70 truncate">Encrypted Memory Active</div>
      </div>
    </motion.div>
  );
}

function FloatingStatusCard2() {
  return (
    <motion.div
      animate={{ y: [0, 6, 0] }}
      transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      className="p-3.5 md:p-4 rounded-xl border border-white/10 bg-[#121215]/40 backdrop-blur-lg flex items-center gap-3.5 shadow-xl shadow-blue-500/5 select-none w-56 lg:w-64"
    >
      <div className="w-9 h-9 md:w-10 md:h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
        <Terminal className="w-4.5 h-4.5 md:w-5 md:h-5" />
      </div>
      <div className="min-w-0">
        <div className="text-[9px] md:text-[10px] font-bold uppercase tracking-wider text-blue-400 font-mono">Workspace OS</div>
        <div className="text-[11px] md:text-xs text-white/70 truncate">Grid Controller Loaded</div>
      </div>
    </motion.div>
  );
}

function LoginCard({ agentConnected }: { agentConnected: boolean | null }) {
  const searchParams = useSearchParams();
  const errorParam = searchParams.get("error");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (errorParam === "AccessDenied") {
      setError("DevOS is locked. Only the registered workspace owner can initialize sessions.");
    } else if (errorParam) {
      setError("Authentication failed. Please check your credentials.");
    }
  }, [errorParam]);

  const handleGoogleLogin = () => {
    signIn("google", { callbackUrl: "/" });
  };

  return (
    <div className="w-full max-w-sm md:max-w-md flex flex-col gap-6 lg:gap-8 relative">
      {/* Upper Logo / Brand Section */}
      <div className="text-center flex flex-col items-center gap-3 md:gap-4">
        <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-[#1a1a1d] border border-white/10 flex items-center justify-center shadow-2xl relative group">
          <div className="absolute inset-0 rounded-xl bg-amber-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent text-xl md:text-2xl font-bold font-mono">
            D
          </span>
        </div>
        
        <div>
          <h2 className="text-lg md:text-xl font-bold tracking-tight text-white font-mono uppercase">
            Initialize Cockpit
          </h2>
          <p className="text-[11px] md:text-xs text-white/40 mt-1 max-w-xs md:max-w-sm mx-auto leading-relaxed">
            Unlock the workspace. OAuth is restricted to the workspace owner account.
          </p>
        </div>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3.5 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-lg flex items-start gap-2.5 font-mono"
        >
          <Shield className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </motion.div>
      )}

      {/* Auth action */}
      <div className="space-y-4">
        <button
          type="button"
          onClick={handleGoogleLogin}
          className="w-full h-11 md:h-12 rounded-lg bg-white hover:bg-white/95 text-black font-semibold text-xs md:text-sm transition-all duration-200 flex items-center justify-center gap-2.5 cursor-pointer shadow-lg hover:shadow-white/5 active:scale-[0.99] font-mono uppercase tracking-wider"
        >
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Google Authentication</span>
        </button>

        <div className="flex items-center justify-center gap-1.5 text-[9px] md:text-[10px] text-white/30 font-mono tracking-wider">
          <Lock className="w-3 h-3" />
          <span>AES-256 VAULT ACCESS SYSTEM</span>
        </div>
      </div>

      {/* Daemon Connector Module */}
      {agentConnected !== null && (
        <div className="border border-white/5 bg-white/[0.01] rounded-xl p-3.5 md:p-4 flex flex-col gap-2 relative overflow-hidden select-none">
          <div className="flex items-center justify-between">
            <span className="text-[9px] md:text-[10px] font-bold tracking-widest text-white/30 font-mono uppercase">
              Daemon Connection
            </span>
            <span className={`text-[8px] md:text-[9px] font-mono px-2 py-0.5 rounded font-bold ${
              agentConnected 
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                : "bg-white/5 text-white/30 border border-white/5"
            }`}>
              {agentConnected ? "ONLINE" : "OFFLINE"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {agentConnected ? (
              <>
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-xs text-white/60 font-mono">Running local daemon core</span>
              </>
            ) : (
              <>
                <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                <span className="text-xs text-white/30 font-mono">Local daemon offline (Port 3131)</span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function LoginPage() {
  const [agentConnected, setAgentConnected] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAgent = () => {
      fetch("https://local.wakeup.com:3131/stats")
        .then((res) => {
          if (res.ok) setAgentConnected(true);
          else setAgentConnected(false);
        })
        .catch(() => {
          setAgentConnected(false);
        });
    };
    checkAgent();
    const interval = setInterval(checkAgent, 12000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#070709] text-[#E8E9EB] flex items-center justify-center p-4 md:p-8 lg:p-12 xl:p-16 relative overflow-hidden select-none">
      {/* Futuristic Background elements - amber gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(245,158,11,0.12),transparent_70%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(59,130,246,0.06),transparent_50%)]" />

      {/* Tiny mesh Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.005)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.005)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

      {/* Main Glassmorphic showcase layout container */}
      <div className="w-full max-w-6xl xl:max-w-7xl grid grid-cols-1 lg:grid-cols-12 bg-white/[0.01] border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative z-10 min-h-[580px] md:min-h-[660px] lg:min-h-[720px] xl:min-h-[780px] scale-[0.99] backdrop-blur-md transition-all duration-300">
        
        {/* Absolute glow highlights on container borders */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-amber-500/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-blue-500/10 to-transparent" />

        {/* LEFT SIDE: Technical Showcase */}
        <div className="lg:col-span-7 p-8 md:p-12 lg:p-16 xl:p-20 flex flex-col justify-between relative overflow-hidden bg-gradient-to-br from-[#121215]/45 to-transparent">
          {/* Subtle gradient shape on background */}
          <div className="absolute -top-12 -left-12 w-64 h-64 bg-amber-600/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="space-y-6 lg:space-y-8 relative z-10">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-amber-500/10 bg-amber-500/5 text-[9px] md:text-[10px] font-bold tracking-widest text-amber-400 uppercase font-mono">
              <Sparkles className="w-3 h-3 text-amber-400" /> Cockpit Gateway
            </div>
            
            <div className="space-y-3.5 lg:space-y-5">
              <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-extrabold tracking-tight text-white leading-none font-sans">
                DevOS
              </h1>
              <p className="text-sm lg:text-base text-white/50 max-w-md lg:max-w-lg leading-relaxed font-mono">
                An agentic personal workbench built for developer flow. Unified workspace grids, localized vector database links, and dynamic telemetry integration.
              </p>
            </div>

            {/* Visual Log terminal */}
            <div className="max-w-md lg:max-w-lg pt-2">
              <TelemetryLog />
            </div>
          </div>

          {/* Core Telemetry widgets float deck */}
          <div className="hidden md:flex items-center gap-4 lg:gap-6 relative z-10 mt-6 lg:mt-8 select-none">
            <FloatingStatusCard />
            <FloatingStatusCard2 />
          </div>

          {/* Footer details */}
          <div className="flex items-center justify-between text-[9px] md:text-[10px] text-white/20 font-mono mt-8 lg:mt-12 relative z-10 pt-4 border-t border-t-white/5">
            <span>v0.1.0 // PRIVATE ACCESS</span>
            <span>KAVYA STUDIOS INDIA</span>
          </div>
        </div>

        {/* RIGHT SIDE: Interactive authorization node */}
        <div className="lg:col-span-5 p-8 md:p-12 lg:p-16 flex flex-col justify-center items-center relative overflow-hidden bg-gradient-to-br from-black/20 to-black/40 border-t lg:border-t-0 lg:border-l border-white/10">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
          
          <Suspense fallback={
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-7 h-7 text-amber-400 animate-spin" />
              <span className="text-[10px] text-white/40 font-mono">Booting Auth configuration...</span>
            </div>
          }>
            <LoginCard agentConnected={agentConnected} />
          </Suspense>
        </div>

      </div>
    </div>
  );
}
