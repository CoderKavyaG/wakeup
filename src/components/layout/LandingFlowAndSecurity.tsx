"use client";

import React, { useState } from "react";
import { signIn } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Shield, Lock, KeyRound, Check, User, Key, Grid, Send, AlertTriangle 
} from "lucide-react";

type StepId = 0 | 1 | 2 | 3 | 4;

interface StepData {
  number: string;
  label: string;
  cmd: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
}

export function LandingFlowAndSecurity() {
  const [activeStep, setActiveStep] = useState<StepId>(0);
  
  // Interactive Simulation States
  const [simAuthDone, setSimAuthDone] = useState(false);
  const [simKeysSaved, setSimKeysSaved] = useState(false);
  const [simWidgets, setSimWidgets] = useState<string[]>(["CPU/RAM", "GitHub"]);
  const [simTgMsg, setSimTgMsg] = useState("");
  const [simTgLog, setSimTgLog] = useState<string[]>(["Bot status: Ready"]);

  const steps: StepData[] = [
    {
      number: "01",
      label: "Auth Google ID",
      cmd: "GET /api/auth/session",
      desc: "Authorize and bind your workspace credentials securely using your Google identity.",
      icon: User
    },
    {
      number: "02",
      label: "Fill API Keys",
      cmd: "POST /api/bootstrap/keys",
      desc: "Register your Groq AI model and local settings keys. Encrypted instantly on your host.",
      icon: Key
    },
    {
      number: "03",
      label: "Add Dashboard Widgets",
      cmd: "PUT /api/grid/configure",
      desc: "Tailor your cockpit layout. Pick the modules, stats, and feeds you need close by.",
      icon: Grid
    },
    {
      number: "04",
      label: "Connect Telegram",
      cmd: "POST /api/telegram/sync",
      desc: "Bridge your phone. Send ideas and logs to our Bot; it routes them straight to dashboard.",
      icon: Send
    },
    {
      number: "05",
      label: "Dashboard Ready",
      cmd: "systemctl start wakeup",
      desc: "Boom! Your personalized developer dashboard cockpit is up and ready for system control.",
      icon: User // Swapped for mascot later
    }
  ];

  const securityPoints = [
    {
      icon: Shield,
      title: "Workspace-Owner-Scoped Auth",
      desc: "System commands and local shell access are strictly restricted to your authenticated Google session. Nobody else can connect to your daemon."
    },
    {
      icon: Lock,
      title: "AES-256-GCM Encrypted Storage",
      desc: "Groq AI tokens, database secrets, and passwords are encrypted locally. Keys stay on your physical device and are never sent to external servers."
    },
    {
      icon: KeyRound,
      title: "Session-Scoped Isolation",
      desc: "Telemetry outputs, active ports, and terminal processes are loaded into temporary secure memory. Zero persistent tracking, zero cloud telemetry."
    }
  ];

  const handleToggleWidget = (w: string) => {
    if (simWidgets.includes(w)) {
      setSimWidgets(simWidgets.filter(item => item !== w));
    } else {
      setSimWidgets([...simWidgets, w]);
    }
  };

  const handleSendTgSim = (e: React.FormEvent) => {
    e.preventDefault();
    if (!simTgMsg.trim()) return;
    setSimTgLog([...simTgLog, `You: ${simTgMsg}`, `Bot: Syncing "${simTgMsg}" into notes...`, `Success: Parsed`]);
    setSimTgMsg("");
  };

  const handleLaunch = () => {
    signIn("google", { callbackUrl: "/dashboard" });
  };

  return (
    <div id="flow" className="relative bg-background bg-dot-grid w-full text-[#1F1F1F] z-10 select-none border-t border-dashed border-zinc-200 overflow-hidden">
      
      {/* Clouds Background for Onboarding Section */}
      <div className="absolute inset-0 pointer-events-none select-none z-0 overflow-hidden">
        <img
          src="https://i.ibb.co/fVj7Nrcx/88130983-f36a-4f49-93a4-94313b8ff460.png"
          alt="Clouds background"
          className="w-full h-full object-cover opacity-50"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#FAF9F6] via-transparent to-[#FAF9F6]" />
      </div>

      {/* 1. Interactive How It Works Section */}
      <section className="relative z-10 py-16 px-6 max-w-5xl mx-auto space-y-12">
        
        {/* Section Header with Mascot Peeking */}
        <div className="flex flex-col items-center justify-center text-center space-y-3">
          <div className="flex items-center gap-3">
            {/* Mascot Head */}
            <svg className="w-8 h-9 shrink-0" viewBox="0 0 64 80" fill="none">
              <path d="M12 25c0-12 10-15 20-15s20 3 20 15v10H12V25z" fill="#EA580C" />
              <rect x="18" y="22" width="28" height="26" rx="14" fill="#FED7AA" />
              <circle cx="27" cy="33" r="3" fill="#2563EB" />
              <circle cx="37" cy="33" r="3" fill="#2563EB" />
              <path d="M28 40q4 3 8 0" stroke="#78350F" strokeWidth="2" strokeLinecap="round" />
              <path d="M14 23c4-4 12-5 18-2s14 1 18 4v-4c0-10-8-13-20-13S14 13 14 21v2z" fill="#C2410C" />
            </svg>
            <span className="text-[9px] font-bold tracking-widest text-[#3b53e9] uppercase font-poppins">
              ONBOARDING
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#1F1F1F] font-poppins">
            How it works
          </h2>
          <p className="text-xs text-zinc-500 font-poppins max-w-xl mx-auto">
            Bootstrapping your dev environment takes under a minute. Interact with the live simulator below to experience it.
          </p>
        </div>

        {/* 5-Step Horizontal Flow Indicator */}
        <div className="relative border border-dashed border-zinc-200 p-4 bg-white/70 backdrop-blur-sm shadow-xs flex flex-col lg:flex-row items-stretch justify-between gap-4">
          {steps.map((step, idx) => {
            const StepIcon = step.icon;
            const isActive = activeStep === idx;
            const isCompleted = activeStep > idx;

            return (
              <React.Fragment key={idx}>
                {/* Step Item */}
                <button
                  onClick={() => setActiveStep(idx as StepId)}
                  className={`flex-1 flex flex-col justify-between p-4 border border-dashed text-left transition-all relative cursor-pointer ${
                    isActive 
                      ? "border-[#3b53e9] bg-white shadow-xs" 
                      : isCompleted
                      ? "border-zinc-200 bg-white/20"
                      : "border-zinc-100 hover:border-zinc-200 hover:bg-zinc-50"
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className={`text-base font-bold font-satoshi ${isActive ? "text-[#3b53e9]" : "text-zinc-300"}`}>
                        {step.number}
                      </span>
                      {isCompleted ? (
                        <Check className="w-3.5 h-3.5 text-[#3b53e9]" />
                      ) : (
                        <StepIcon className={`w-3.5 h-3.5 ${isActive ? "text-[#3b53e9]" : "text-zinc-400"}`} />
                      )}
                    </div>

                    {/* Step Label (Satoshi) */}
                    <h3 className="text-[10px] font-bold text-zinc-800 tracking-wide uppercase font-satoshi">
                      {step.label}
                    </h3>

                    {/* Monospace Caption (Terminal Stack) */}
                    <div className="py-0.5 px-2 bg-zinc-100 border border-zinc-200 inline-block rounded-none">
                      <span className="font-mono text-[9px] text-zinc-700">
                        {step.cmd}
                      </span>
                    </div>

                    {/* Description */}
                    <p className="text-[10px] text-zinc-500 leading-relaxed font-poppins">
                      {step.desc}
                    </p>
                  </div>

                  {isActive && (
                    <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#3b53e9]" />
                  )}
                </button>

                {/* Animated Connecting Line between steps (Desktop only) */}
                {idx < steps.length - 1 && (
                  <div className="hidden lg:flex items-center justify-center w-6 shrink-0">
                    <div className="w-full h-[1px] bg-zinc-200 relative overflow-hidden">
                      <motion.div
                        className="absolute left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#3b53e9] to-transparent w-1/2"
                        animate={{
                          x: ["-100%", "200%"],
                        }}
                        transition={{
                          duration: 2.5,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                      />
                    </div>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Live Setup Interactive Simulator Console */}
        <div className="border border-dashed border-zinc-200 bg-white/80 backdrop-blur-md p-6 rounded-none shadow-xs relative">
          <div className="absolute top-3 left-4 flex items-center gap-1.5 text-[9px] text-zinc-400 font-mono">
            <span className="w-2 h-2 rounded-full bg-[#3b53e9] animate-ping" />
            ONBOARDING_SIMULATOR // STEP_{activeStep + 1}
          </div>

          <div className="mt-4 min-h-[200px] flex flex-col justify-between">
            <AnimatePresence mode="wait">
              {activeStep === 0 && (
                <motion.div
                  key="step0"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="space-y-4 max-w-sm mx-auto text-center py-4"
                >
                  <h4 className="text-xs font-bold text-zinc-800 font-poppins">Authorize Workspace Session</h4>
                  <p className="text-[11px] text-zinc-500 font-poppins">Bridge your local server credentials via secure single sign-on.</p>
                  
                  {simAuthDone ? (
                    <div className="p-3 bg-[#3b53e9]/5 border border-[#3b53e9]/25 text-[#3b53e9] text-[11px] font-mono rounded flex items-center justify-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-[#3b53e9]" /> Session authenticated (Kavya Goel - locked)
                    </div>
                  ) : (
                    <button
                      onClick={() => setSimAuthDone(true)}
                      className="px-5 py-2 bg-[#bfdbfe] hover:bg-[#93c5fd] text-[#1e3a8a] text-[11px] font-bold font-poppins rounded transition-all cursor-pointer shadow-xs shadow-[#bfdbfe]/10"
                    >
                      Authenticate Session
                    </button>
                  )}
                  
                  {simAuthDone && (
                    <button
                      onClick={() => setActiveStep(1)}
                      className="text-[11px] text-[#3b53e9] font-semibold underline block mx-auto font-poppins pt-2"
                    >
                      Proceed to Step 2 →
                    </button>
                  )}
                </motion.div>
              )}

              {activeStep === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="space-y-4 max-w-md mx-auto py-2"
                >
                  <h4 className="text-xs font-bold text-zinc-800 text-center font-poppins">Enter API Configuration</h4>
                  <div className="space-y-3 font-mono text-[11px]">
                    <div>
                      <label className="block text-[9px] text-zinc-400 mb-1">GROQ_API_KEY</label>
                      <input
                        type="text"
                        readOnly
                        value={simKeysSaved ? "gsk_v4_p3A9kLw89BnsDls82oKd..." : "gsk_v4_••••••••••••••••••••••••"}
                        className="w-full bg-zinc-50 border border-zinc-200 px-3 py-2 rounded text-zinc-650 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] text-zinc-400 mb-1">LOCAL_DAEMON_PORT</label>
                      <input
                        type="text"
                        readOnly
                        value="3131 (Secure Host Mode)"
                        className="w-full bg-zinc-50 border border-zinc-200 px-3 py-2 rounded text-zinc-650 focus:outline-none"
                      />
                    </div>
                  </div>

                  {simKeysSaved ? (
                    <div className="p-2.5 bg-[#3b53e9]/5 border border-[#3b53e9]/25 text-[#3b53e9] text-[11px] font-mono text-center rounded flex items-center justify-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-[#3b53e9]" /> Keys encrypted with AES-256-GCM locally
                    </div>
                  ) : (
                    <button
                      onClick={() => setSimKeysSaved(true)}
                      className="w-full py-2 bg-[#3b53e9] hover:bg-[#2b41c6] text-white text-[11px] font-bold font-poppins rounded transition-all cursor-pointer"
                    >
                      Encrypt & Save Keys
                    </button>
                  )}

                  {simKeysSaved && (
                    <button
                      onClick={() => setActiveStep(2)}
                      className="text-[11px] text-[#3b53e9] font-semibold underline block mx-auto font-poppins pt-1"
                    >
                      Proceed to Step 3 →
                    </button>
                  )}
                </motion.div>
              )}

              {activeStep === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="space-y-4 max-w-lg mx-auto py-1"
                >
                  <h4 className="text-xs font-bold text-zinc-800 text-center font-poppins">Assemble Grid Widgets</h4>
                  <p className="text-[11px] text-zinc-400 text-center font-poppins">Toggle widgets to preview how they occupy your workspace grid.</p>
                  
                  <div className="flex justify-center gap-3">
                    {["CPU/RAM", "GitHub", "Focus Panel", "Project OS"].map(w => {
                      const selected = simWidgets.includes(w);
                      return (
                        <button
                          key={w}
                          onClick={() => handleToggleWidget(w)}
                          className={`px-3 py-1.5 border text-[11px] font-poppins transition-all cursor-pointer ${
                            selected 
                              ? "border-[#3b53e9] bg-[#3b53e9]/5 text-[#3b53e9] font-bold" 
                              : "border-zinc-200 text-zinc-500 hover:border-zinc-300"
                          }`}
                        >
                          {selected ? `Selected: ${w}` : `Add: ${w}`}
                        </button>
                      );
                    })}
                  </div>

                  <div className="border border-dashed border-zinc-200 bg-zinc-50 p-4 min-h-[60px] rounded flex flex-wrap gap-2 items-center justify-center">
                    {simWidgets.length === 0 ? (
                      <span className="text-[9px] text-zinc-300 font-mono">Workspace Canvas Empty</span>
                    ) : (
                      simWidgets.map(w => (
                        <div key={w} className="px-3 py-2 bg-[#1F1F1F] border border-zinc-880 text-[9px] font-mono text-white">
                          [WIDGET: {w.toUpperCase()}]
                        </div>
                      ))
                    )}
                  </div>

                  <button
                    onClick={() => setActiveStep(3)}
                    className="px-5 py-2 bg-[#1F1F1F] hover:bg-black text-white text-[11px] font-bold font-poppins rounded block mx-auto transition-all cursor-pointer shadow-sm"
                  >
                    Confirm Layout
                  </button>
                </motion.div>
              )}

              {activeStep === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="space-y-4 max-w-md mx-auto"
                >
                  <h4 className="text-xs font-bold text-zinc-800 text-center font-poppins">Link Telegram Ingestion Bot</h4>
                  
                  <div className="border border-zinc-200 bg-zinc-50 p-3 rounded font-mono text-[9px] space-y-1 max-h-[100px] overflow-y-auto shadow-inner">
                    {simTgLog.map((log, lIdx) => (
                      <div key={lIdx} className={log.startsWith("You:") ? "text-zinc-800" : log.startsWith("Bot:") ? "text-[#3b53e9]" : "text-[#3b53e9] font-bold"}>
                        {log}
                      </div>
                    ))}
                  </div>

                  <form onSubmit={handleSendTgSim} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Type sync write code snippet..."
                      value={simTgMsg}
                      onChange={(e) => setSimTgMsg(e.target.value)}
                      className="flex-1 bg-zinc-50 border border-zinc-200 px-3 py-2 rounded text-[11px] text-zinc-800 focus:outline-none placeholder-zinc-400 font-poppins"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 bg-[#3b53e9] text-white text-[11px] font-bold font-poppins rounded transition-all cursor-pointer hover:bg-[#2b41c6]"
                    >
                      Send Msg
                    </button>
                  </form>

                  <button
                    onClick={() => setActiveStep(4)}
                    className="text-[11px] text-zinc-555 hover:text-zinc-800 font-semibold underline block mx-auto font-poppins pt-1"
                  >
                    Done, Go to Final Step →
                  </button>
                </motion.div>
              )}

              {activeStep === 4 && (
                <motion.div
                  key="step4"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="space-y-4 max-w-sm mx-auto text-center py-4 flex flex-col items-center"
                >
                  {/* Mascot Devy Celebrating */}
                  <div className="flex items-center gap-3">
                    <div className="shrink-0 relative animate-bounce">
                      <svg className="w-16 h-18" viewBox="0 0 64 80" fill="none">
                        <path d="M12 25c0-12 10-15 20-15s20 3 20 15v10H12V25z" fill="#EA580C" />
                        <rect x="18" y="22" width="28" height="26" rx="14" fill="#FED7AA" />
                        <circle cx="27" cy="33" r="3" fill="#2563EB" />
                        <circle cx="37" cy="33" r="3" fill="#2563EB" />
                        <circle cx="28.5" cy="31.5" r="1.2" fill="#FFFFFF" />
                        <circle cx="38.5" cy="31.5" r="1.2" fill="#FFFFFF" />
                        <circle cx="23" cy="38" r="2.5" fill="#F43F5E" opacity="0.4" />
                        <circle cx="41" cy="38" r="2.5" fill="#F43F5E" opacity="0.4" />
                        <path d="M28 40q4 3 8 0" stroke="#78350F" strokeWidth="2" strokeLinecap="round" />
                        <path d="M14 23c4-4 12-5 18-2s14 1 18 4v-4c0-10-8-13-20-13S14 13 14 21v2z" fill="#C2410C" />
                        <path d="M16 48c0 0 4 6 16 6s16-6 16-6v20H16V48z" fill="#0D9488" />
                        <rect x="22" y="48" width="4" height="15" fill="#1E3A8A" />
                        <rect x="38" y="48" width="4" height="15" fill="#1E3A8A" />
                        <circle cx="24" cy="54" r="1.5" fill="#F59E0B" />
                        <circle cx="40" cy="54" r="1.5" fill="#F59E0B" />
                        <path d="M44 52c4 1 8-2 10-6s1-4-1-5-6 2-7 6l-2 5z" fill="#FED7AA" />
                      </svg>
                    </div>
                    {/* Retro cartoon bubble */}
                    <div className="bg-white text-zinc-900 text-[10px] leading-relaxed p-2.5 rounded-xl border-2 border-zinc-900 shadow-[2px_2px_0px_rgba(0,0,0,0.95)] text-left">
                      <p className="font-sans font-semibold">
                        <span className="font-extrabold text-[#B45309]">Welcome Chief!</span> Workspace is fully compiled. Let's launch!
                      </p>
                    </div>
                  </div>

                  <h4 className="text-sm font-extrabold text-zinc-800 font-poppins font-sans pt-2">Wakeup Ready to Launch!</h4>
                  <p className="text-[11px] text-zinc-500 font-poppins max-w-xs">Your local desktop workstation is connected and synced. Start commanding.</p>
                  
                  <button
                    onClick={handleLaunch}
                    className="px-6 py-2.5 bg-[#bfdbfe] hover:bg-[#93c5fd] text-[#1e3a8a] text-[11px] font-bold tracking-wide uppercase font-poppins rounded transition-all cursor-pointer shadow-sm shadow-[#bfdbfe]/20"
                  >
                    Launch Workstation Cockpit
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* 2. Security Section */}
      <section id="security" className="relative z-10 py-16 px-6 max-w-5xl mx-auto border-t border-dashed border-zinc-200 bg-white/40 shadow-inner">
        <div className="space-y-8">
          
          {/* Top Row: Title Left, 2 Cards Right */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            
            {/* Header Left (1 Col) */}
            <div className="space-y-3 lg:col-span-1">
              <span className="inline-flex items-center gap-1.5 text-[8px] font-bold tracking-widest text-[#3b53e9] uppercase font-poppins">
                <span className="w-1.5 h-1.5 rounded-full bg-[#3b53e9]" /> SECURE BY DESIGN
              </span>
              <h2 className="text-2xl font-extrabold tracking-tight text-[#1F1F1F] font-poppins leading-tight">
                Wakeup controls physical machines. Security is absolute.
              </h2>
              <p className="text-xs text-[#6B7280] font-poppins leading-relaxed">
                Wakeup establishes zero cloud storage buffers, meaning credentials and commands bypass external platforms entirely, running directly inside local scopes.
              </p>
            </div>

            {/* 2 Security Statements (2 Cols) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:col-span-2">
              {securityPoints.slice(0, 2).map((point, idx) => {
                const PointIcon = point.icon;
                return (
                  <div
                    key={idx}
                    className="p-5 border border-dashed border-zinc-200 bg-white/80 hover:border-zinc-300 transition-all flex flex-col justify-between shadow-xs"
                  >
                    <div className="space-y-2">
                      <div className="p-1.5 w-fit bg-blue-50 border border-blue-100 text-[#3b53e9]">
                        <PointIcon className="w-4 h-4" />
                      </div>
                      <h3 className="text-[11px] font-bold text-zinc-800 tracking-wide uppercase font-satoshi">
                        {point.title}
                      </h3>
                      <p className="text-[10px] text-zinc-500 leading-relaxed font-poppins">
                        {point.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>

          {/* Bottom Row: Mascot, Telegram card, Session-Scoped card side by side (Full Width Row) */}
          <div className="pt-6 border-t border-dashed border-zinc-200 w-full">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch w-full">
              
              {/* Mascot container - 1st card */}
              <div className="border border-dashed border-zinc-200 bg-white/80 p-4 flex flex-col justify-center items-center relative min-h-[160px] shadow-xs">
                {/* Speech bubble */}
                <div className="relative mb-2 w-full max-w-[200px]">
                  <div className="bg-white border-2 border-zinc-800 rounded-xl px-2.5 py-1.5 shadow-[2px_2px_0px_rgba(0,0,0,0.85)] text-[9px] font-bold text-zinc-800 leading-snug text-center">
                    Chill — Telegram got you. Just type, I forward it.
                  </div>
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-l-transparent border-r-4 border-r-transparent border-t-8 border-t-zinc-800" />
                  <div className="absolute -bottom-[5px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-t-[6px] border-t-white" />
                </div>
                {/* Mascot SVG */}
                <svg viewBox="0 0 130 72" fill="none" className="w-36 h-auto drop-shadow-sm">
                  {/* Ground shadow */}
                  <ellipse cx="65" cy="68" rx="55" ry="4" fill="#a1a1aa" opacity="0.25"/>

                  {/* === BODY (teal, lying horizontal) === */}
                  <ellipse cx="60" cy="56" rx="48" ry="12" fill="#0D9488"/>

                  {/* Navy overalls over body */}
                  <rect x="24" y="46" width="56" height="14" rx="5" fill="#1E3A8A"/>
                  {/* Overall bib / pocket */}
                  <rect x="44" y="40" width="20" height="12" rx="3" fill="#1E3A8A"/>
                  <rect x="48" y="43" width="12" height="7" rx="2" fill="#2563EB" opacity="0.6"/>
                  <rect x="46" y="36" width="5" height="8" rx="2" fill="#1E3A8A"/>
                  <rect x="57" y="36" width="5" height="8" rx="2" fill="#1E3A8A"/>

                  {/* Arm reaching left to hold pizza */}
                  <path d="M24 48 Q14 38 8 28" stroke="#FED7AA" strokeWidth="5" strokeLinecap="round" fill="none"/>

                  {/* Pizza slice he's holding */}
                  <path d="M2 14 l8 20 l-16 0 z" fill="#F59E0B" stroke="#D97706" strokeWidth="0.8"/>
                  <path d="M-6 34 q8 4 16 0" stroke="#D97706" strokeWidth="2" strokeLinecap="round"/>
                  <circle cx="3" cy="20" r="1.8" fill="#EF4444"/>
                  <circle cx="6" cy="27" r="1.5" fill="#EF4444"/>
                  <circle cx="-1" cy="27" r="1.5" fill="#EF4444"/>
                  <circle cx="2" cy="31" r="1.2" fill="#10B981"/>
                  <circle cx="7" cy="31" r="1.2" fill="#10B981"/>

                  {/* === HEAD (round, on right side) === */}
                  <circle cx="100" cy="36" r="26" fill="#FED7AA"/>
                  <path d="M76 32 C76 14 88 8 100 8 C112 8 124 14 124 32 L124 38 C120 32 112 28 100 28 C88 28 80 32 76 38 Z" fill="#EA580C"/>
                  <path d="M78 30 C82 22 90 20 96 24" stroke="#F97316" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
                  <path d="M76 34 C74 40 74 46 76 50" stroke="#EA580C" strokeWidth="4" strokeLinecap="round" fill="none"/>
                  <path d="M124 34 C126 40 126 46 124 50" stroke="#EA580C" strokeWidth="4" strokeLinecap="round" fill="none"/>

                  {/* === EYES === */}
                  <circle cx="91" cy="35" r="6" fill="white"/>
                  <circle cx="91" cy="35" r="4" fill="#2563EB"/>
                  <circle cx="92.5" cy="33.5" r="1.5" fill="white"/>
                  <circle cx="109" cy="35" r="6" fill="white"/>
                  <circle cx="109" cy="35" r="4" fill="#2563EB"/>
                  <circle cx="110.5" cy="33.5" r="1.5" fill="white"/>

                  <path d="M85 32 Q91 29 97 32" fill="#FED7AA" stroke="none"/>
                  <path d="M103 32 Q109 29 115 32" fill="#FED7AA" stroke="none"/>

                  <path d="M86 28 Q91 25 97 28" stroke="#78350F" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
                  <path d="M103 28 Q109 25 115 28" stroke="#78350F" strokeWidth="1.8" strokeLinecap="round" fill="none"/>

                  <ellipse cx="100" cy="42" rx="2.5" ry="1.5" fill="#F4A261" opacity="0.7"/>
                  <path d="M88 48 Q100 58 112 48" stroke="#78350F" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
                  <ellipse cx="83" cy="46" rx="6" ry="4" fill="#F43F5E" opacity="0.2"/>
                  <ellipse cx="117" cy="46" rx="6" ry="4" fill="#F43F5E" opacity="0.2"/>

                  {/* Legs + shoes on left */}
                  <path d="M18 54 Q8 50 2 58" stroke="#0D9488" strokeWidth="7" strokeLinecap="round"/>
                  <path d="M16 60 Q6 58 1 66" stroke="#0D9488" strokeWidth="7" strokeLinecap="round"/>
                  <ellipse cx="2" cy="61" rx="5" ry="3" fill="#1E3A8A"/>
                  <ellipse cx="1" cy="68" rx="5" ry="3" fill="#1E3A8A"/>

                  {/* z z z */}
                  <text x="116" y="60" fontSize="6" fill="#94a3b8" fontWeight="bold" fontFamily="monospace">z</text>
                  <text x="120" y="53" fontSize="8" fill="#cbd5e1" fontWeight="bold" fontFamily="monospace">z</text>
                  <text x="125" y="45" fontSize="10" fill="#e2e8f0" fontWeight="bold" fontFamily="monospace">z</text>
                </svg>
              </div>

              {/* Telegram Integration Card - 2nd card */}
              <div className="border border-dashed border-zinc-200 bg-white/80 p-5 flex flex-col justify-between shadow-xs">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-[#2AABEE] flex items-center justify-center shrink-0 shadow-sm">
                      <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8l-1.7 8c-.12.54-.44.67-.89.42l-2.46-1.81-1.19 1.14c-.13.13-.24.24-.49.24l.18-2.5 4.55-4.11c.2-.18-.04-.27-.3-.1l-5.62 3.54-2.42-.75c-.53-.17-.54-.53.11-.78l9.44-3.64c.44-.16.83.11.69.75z"/>
                      </svg>
                    </div>
                    <span className="text-[10px] font-black tracking-wider text-[#0369a1] uppercase font-poppins">
                      Telegram Integration
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-500 leading-relaxed font-poppins">
                    Forward notes, tasks and ideas straight from your Telegram chat. Wakeup captures and auto-classifies them into your sprint board.
                  </p>
                </div>
                <div className="flex items-center gap-1.5 pt-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0"/>
                  <span className="text-[9px] font-mono font-bold text-emerald-700">LIVE — /capture ready</span>
                </div>
              </div>

              {/* Session-Scoped Isolation Card - 3rd card */}
              <div className="border border-dashed border-zinc-200 bg-white/80 hover:border-zinc-300 transition-all p-5 flex flex-col justify-between shadow-xs">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-[#3b53e9]/10 border border-[#3b53e9]/20 text-[#3b53e9] flex items-center justify-center shrink-0 shadow-sm">
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-black tracking-wider text-zinc-800 uppercase font-poppins">
                      Session-Scoped Isolation
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-500 leading-relaxed font-poppins">
                    Telemetry outputs, active ports, and terminal processes are loaded into temporary secure memory. Zero persistent tracking, zero cloud telemetry.
                  </p>
                </div>
                <div className="flex items-center gap-1.5 pt-2">
                  <div className="p-0.5 bg-blue-50 border border-blue-100 text-[#3b53e9]">
                    <KeyRound className="w-2.5 h-2.5" />
                  </div>
                  <span className="text-[8px] font-mono text-zinc-400 uppercase tracking-wide">Zero cloud telemetry</span>
                </div>
              </div>

            </div>
          </div>

        </div>
      </section>

    </div>
  );
}
