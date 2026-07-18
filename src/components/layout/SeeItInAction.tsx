"use client";

import React, { useState, useEffect } from "react";
import { Eye, Info, GitBranch, Cpu, Wifi, FolderOpen, Clock } from "lucide-react";

interface SmallCard {
  id: number;
  title: string;
  imageSrc: string;
  badge: string;
  explanation: string;
}

const smallCards: SmallCard[] = [
  {
    id: 2,
    title: "Projects Widget",
    imageSrc: "/widget-project.png",
    badge: "GitHub + Local",
    explanation:
      "See all your GitHub repos and local project folders side by side. Quick-launch shortcuts when you open the widget.",
  },
  {
    id: 3,
    title: "GitHub Activity Monitor",
    imageSrc: "/widget-github.png",
    badge: "Git Telemetry",
    explanation:
      "Streak stats, contribution counts, language breakdowns, and live commit feed pulled directly from GitHub.",
  },
  {
    id: 4,
    title: "Machine Control",
    imageSrc: "/widget-machine.png",
    badge: "Agent Connected",
    explanation:
      "Monitor CPU/RAM, active workspace files, port listeners, preferences, and saved app shortcuts through the local daemon.",
  },
  {
    id: 5,
    title: "Focus Panel",
    imageSrc: "/widget-focus.png",
    badge: "Brain Dump",
    explanation:
      "Type any task or thought. The AI pipeline classifies and slots it into your sprint automatically.",
  },
];

// Mascot SVG
function DevyMascot({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 80" fill="none">
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
    </svg>
  );
}

// Dark horizontal widget strip — simulates live machine status
function LiveWidgetStrip() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((p) => p + 1), 2000);
    return () => clearInterval(t);
  }, []);

  const cpu = (12 + ((tick * 7) % 31)).toFixed(0);
  const ram = (38 + ((tick * 5) % 22)).toFixed(0);

  const ports = [
    { port: 3000, label: "NEXT.JS", color: "bg-emerald-500" },
    { port: 3001, label: "API SRV", color: "bg-blue-400" },
    { port: 5432, label: "POSTGRES", color: "bg-violet-400" },
  ];

  const commits = [
    { repo: "wakeup", hash: "25abef", msg: "feat: ui-ux onboarding", ago: "18h" },
    { repo: "self-attention", hash: "56d28e", msg: "attention matters", ago: "1d" },
    { repo: "port-2-folio", hash: "9ea783", msg: "fix: visitor count", ago: "2d" },
  ];

  return (
    <div className="w-full rounded-lg bg-[#0a0a0d] border border-white/[0.07] overflow-hidden shadow-2xl">
      {/* Titlebar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06] bg-[#0d0d11]">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-500/70" />
          <div className="w-2 h-2 rounded-full bg-amber-400/70" />
          <div className="w-2 h-2 rounded-full bg-emerald-500/70" />
          <span className="ml-3 text-[9px] font-mono text-white/25 uppercase tracking-[0.15em]">
            WAKEUP WORKBENCH — LIVE DASHBOARD
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[8px] font-mono text-emerald-400/70 uppercase tracking-widest">
            AGENT CONNECTED
          </span>
        </div>
      </div>

      {/* Widget grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-white/[0.05]">

        {/* Widget 1 — Machine vitals */}
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-1.5 mb-3">
            <Cpu className="w-3 h-3 text-[#3b53e9]" />
            <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest font-mono">
              MACHINE CONTROL
            </span>
          </div>
          <div className="space-y-2">
            {/* CPU bar */}
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-[9px] text-white/40 font-mono">CPU</span>
                <span className="text-[9px] text-white/70 font-mono font-bold">{cpu}%</span>
              </div>
              <div className="h-1 bg-white/[0.05] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#3b53e9] rounded-full transition-all duration-1000"
                  style={{ width: `${cpu}%` }}
                />
              </div>
            </div>
            {/* RAM bar */}
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-[9px] text-white/40 font-mono">RAM</span>
                <span className="text-[9px] text-white/70 font-mono font-bold">{ram}%</span>
              </div>
              <div className="h-1 bg-white/[0.05] rounded-full overflow-hidden">
                <div
                  className="h-full bg-violet-500 rounded-full transition-all duration-1000"
                  style={{ width: `${ram}%` }}
                />
              </div>
            </div>
          </div>
          {/* Ports */}
          <div className="pt-1 space-y-1.5">
            {ports.map((p) => (
              <div key={p.port} className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${p.color}`} />
                  <span className="text-[8px] font-mono text-white/50">{p.label}</span>
                </div>
                <span className="text-[8px] font-mono text-white/30">:{p.port}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Widget 2 — GitHub commits */}
        <div className="p-4">
          <div className="flex items-center gap-1.5 mb-3">
            <GitBranch className="w-3 h-3 text-amber-400" />
            <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest font-mono">
              GITHUB MONITOR
            </span>
          </div>
          {/* Streak stat */}
          <div className="flex gap-3 mb-3">
            <div className="flex-1 bg-white/[0.03] border border-white/[0.05] rounded p-2 text-center">
              <div className="text-base font-black text-amber-400 font-mono">7d</div>
              <div className="text-[7px] text-white/30 font-mono uppercase">STREAK</div>
            </div>
            <div className="flex-1 bg-white/[0.03] border border-white/[0.05] rounded p-2 text-center">
              <div className="text-base font-black text-white font-mono">1992</div>
              <div className="text-[7px] text-white/30 font-mono uppercase">CONTRIBS</div>
            </div>
          </div>
          {/* Commits list */}
          <div className="space-y-2">
            {commits.map((c) => (
              <div key={c.hash} className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[#3b53e9] mt-1.5 shrink-0" />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[8px] font-bold text-white/70 truncate font-mono">{c.repo}</span>
                    <span className="text-[7px] text-[#3b53e9] font-mono">{c.hash}</span>
                  </div>
                  <span className="text-[8px] text-white/30 truncate font-mono block">{c.msg}</span>
                </div>
                <span className="text-[7px] text-white/20 font-mono shrink-0 ml-auto">{c.ago}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Widget 3 — Active projects */}
        <div className="p-4">
          <div className="flex items-center gap-1.5 mb-3">
            <FolderOpen className="w-3 h-3 text-emerald-400" />
            <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest font-mono">
              ACTIVE PROJECTS
            </span>
          </div>
          <div className="space-y-2">
            {[
              { name: "wakeup", status: "ACTIVE", lang: "TypeScript" },
              { name: "Ignite", status: "ACTIVE", lang: "Python" },
              { name: "self-attention", status: "ACTIVE", lang: "Python" },
              { name: "port-2-folio", status: "IDLE", lang: "JavaScript" },
            ].map((proj) => (
              <div key={proj.name} className="flex items-center justify-between py-1.5 border-b border-white/[0.04] last:border-0">
                <div className="flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${proj.status === "ACTIVE" ? "bg-emerald-400" : "bg-white/20"}`} />
                  <span className="text-[9px] font-semibold text-white/70 font-mono">{proj.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[7px] text-white/25 font-mono">{proj.lang}</span>
                  <span className={`text-[6px] font-bold px-1 py-0.5 rounded font-mono ${proj.status === "ACTIVE" ? "bg-emerald-500/10 text-emerald-400" : "bg-white/5 text-white/20"}`}>
                    {proj.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[8px] text-white/20 font-mono">
            <Clock className="w-2.5 h-2.5" />
            <span>Last sync: just now</span>
            <span className="ml-auto flex items-center gap-1">
              <Wifi className="w-2.5 h-2.5 text-emerald-400" />
              <span className="text-emerald-400">live</span>
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}

export function SeeItInAction() {
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <section
      id="action"
      className="relative bg-background bg-dot-grid py-20 px-6 border-t border-dashed border-zinc-200 select-none"
    >
      <div className="max-w-5xl mx-auto space-y-14">

        {/* Section Header */}
        <div className="text-center space-y-3">
          <span className="text-[9px] font-bold tracking-widest text-[#3b53e9] uppercase font-poppins">
            WORKBENCH GALLERY
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#1F1F1F] font-poppins">
            Explore the Cockpit
          </h2>
          <p className="text-xs text-zinc-500 font-poppins max-w-xl mx-auto">
            Real screenshots from inside the Wakeup workstation. Hover any screen to reveal details.
          </p>
        </div>

        {/* ── Large featured dashboard screenshot ── */}
        <div className="w-full relative">
          {/* Devy mascot (client-only) */}
          {mounted && (
            <div className="absolute -top-16 right-6 z-40 pointer-events-none hidden md:flex flex-col items-end">
              <div className="relative">
                <div className="absolute -top-8 -left-44 bg-white text-zinc-900 text-[8px] font-extrabold tracking-wide px-3 py-1.5 rounded-xl border-2 border-zinc-900 shadow-[2px_2px_0px_rgba(0,0,0,0.9)] whitespace-nowrap">
                  Explore the cockpit, <span className="text-[#b45309]">Chief!</span>
                </div>
                <DevyMascot className="w-[72px] h-20 drop-shadow-lg" />
              </div>
            </div>
          )}

          <div
            onMouseEnter={() => setHoveredId(1)}
            onMouseLeave={() => setHoveredId(null)}
            className="relative border border-dashed border-zinc-300 bg-white/40 p-4 shadow-sm cursor-pointer transition-all duration-300 hover:shadow-md"
          >
            {/* Corner brackets */}
            {[
              "top-2 left-2 border-t border-l",
              "top-2 right-2 border-t border-r",
              "bottom-2 left-2 border-b border-l",
              "bottom-2 right-2 border-b border-r",
            ].map((cls, i) => (
              <div key={i} className={`absolute ${cls} w-3.5 h-3.5 border-zinc-400 z-20 pointer-events-none`} />
            ))}

            {/* Browser chrome */}
            <div className="relative border border-zinc-300 bg-[#070709] overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 bg-[#0f0f13] border-b border-white/[0.06]">
                <div className="flex gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-red-500/80" />
                  <div className="w-2 h-2 rounded-full bg-amber-400/80" />
                  <div className="w-2 h-2 rounded-full bg-emerald-500/80" />
                </div>
                <span className="text-[8px] font-mono text-white/25 tracking-widest">wakeup.sh/dashboard</span>
                <div className="w-8" />
              </div>

              {/* Dashboard image — contain so nothing crops */}
              <div className="relative w-full bg-[#080810]" style={{ aspectRatio: "16/9" }}>
                <img
                  src="/wakeup-dashbaord.png"
                  alt="Wakeup Dashboard — full workstation view"
                  className={`w-full h-full object-contain transition-all duration-500 ${
                    hoveredId === 1 ? "opacity-20 scale-[1.01]" : "opacity-95"
                  }`}
                />
                {/* Hover badge */}
                <div className="absolute bottom-3 left-3 z-20 px-2 py-1 bg-white border border-zinc-200 flex items-center gap-1.5 text-[8px] font-bold font-poppins text-zinc-800 shadow-sm">
                  <Eye className="w-3 h-3 text-[#3b53e9]" />
                  HOVER TO EXPLORE
                </div>
                {/* Hover overlay */}
                <div className={`absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/50 to-transparent p-6 flex flex-col justify-end gap-2 transition-all duration-300 z-30 ${
                  hoveredId === 1 ? "opacity-100" : "opacity-0 pointer-events-none"
                }`}>
                  <span className="text-[8px] font-bold tracking-widest text-[#5b73ff] uppercase font-poppins border border-[#5b73ff]/30 bg-[#5b73ff]/10 px-2 py-0.5 w-fit">
                    FULL DASHBOARD
                  </span>
                  <h3 className="text-lg font-extrabold text-white font-poppins flex items-center gap-2">
                    <Info className="w-4 h-4 text-[#5b73ff]" /> Wakeup Cockpit
                  </h3>
                  <p className="text-[11px] text-zinc-300 max-w-xl leading-relaxed font-poppins">
                    The full workbench — Projects widget, GitHub Monitor, Machine Control with live port telemetry, and the Focus Panel — all in a resizable drag-and-drop grid.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Live dark widget strip ── */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-zinc-200" />
            <span className="text-[9px] font-bold tracking-widest text-zinc-400 uppercase font-poppins">
              LIVE WIDGET PREVIEW
            </span>
            <div className="h-px flex-1 bg-zinc-200" />
          </div>
          <LiveWidgetStrip />
        </div>

        {/* ── 4 individual widget cards ── */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-zinc-200" />
            <span className="text-[9px] font-bold tracking-widest text-zinc-400 uppercase font-poppins">
              INDIVIDUAL WIDGETS
            </span>
            <div className="h-px flex-1 bg-zinc-200" />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {smallCards.map((card) => (
              <div
                key={card.id}
                onMouseEnter={() => setHoveredId(card.id)}
                onMouseLeave={() => setHoveredId(null)}
                className="relative border border-dashed border-zinc-250 bg-white/40 p-2.5 cursor-pointer transition-all duration-300 hover:shadow-md"
              >
                {[
                  "top-1.5 left-1.5 border-t border-l",
                  "top-1.5 right-1.5 border-t border-r",
                  "bottom-1.5 left-1.5 border-b border-l",
                  "bottom-1.5 right-1.5 border-b border-r",
                ].map((cls, i) => (
                  <div key={i} className={`absolute ${cls} w-3 h-3 border-zinc-400 z-20 pointer-events-none`} />
                ))}

                <div className="relative border border-zinc-200 bg-[#070709] overflow-hidden aspect-[4/3] w-full">
                  <div className="flex items-center px-2 py-1 bg-[#0f0f13] border-b border-white/[0.05] gap-1">
                    <div className="w-1 h-1 rounded-full bg-red-500/70" />
                    <div className="w-1 h-1 rounded-full bg-amber-400/70" />
                    <div className="w-1 h-1 rounded-full bg-emerald-500/70" />
                    <span className="ml-1 text-[6px] font-mono text-white/20 uppercase tracking-widest truncate">
                      {card.badge}
                    </span>
                  </div>
                  <img
                    src={card.imageSrc}
                    alt={card.title}
                    className={`w-full h-full object-cover bg-[#080810] transition-all duration-400 ${
                      hoveredId === card.id ? "opacity-15 scale-[1.02]" : "opacity-90"
                    }`}
                  />
                  <div className="absolute bottom-2 left-2 z-20 px-1.5 py-0.5 bg-white border border-zinc-200 flex items-center gap-1 text-[7px] font-bold font-poppins text-zinc-800 shadow-sm">
                    <Eye className="w-2.5 h-2.5 text-[#3b53e9]" /> PREVIEW
                  </div>
                  <div className={`absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent p-3 flex flex-col justify-end gap-1 transition-all duration-300 z-30 ${
                    hoveredId === card.id ? "opacity-100" : "opacity-0 pointer-events-none"
                  }`}>
                    <span className="text-[7px] font-bold tracking-widest text-[#5b73ff] uppercase font-poppins border border-[#5b73ff]/20 bg-[#5b73ff]/10 px-1.5 py-0.5 w-fit">
                      {card.badge}
                    </span>
                    <h3 className="text-[10px] font-bold text-white font-poppins">{card.title}</h3>
                    <p className="text-[8px] text-zinc-300 leading-relaxed font-poppins">{card.explanation}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer CTA */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-[#3b53e9]/20 shadow-xs">
            <DevyMascot className="w-6 h-7 shrink-0" />
            <span className="text-[9px] font-mono text-zinc-600">
              Devy says: Pretty neat cockpit, eh?
            </span>
          </div>
          <a
            href="https://github.com/CoderKavyaG/wakeup"
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-2 border border-dashed border-zinc-300 hover:border-zinc-400 font-mono text-[10px] text-zinc-500 hover:text-zinc-700 transition-all duration-200 bg-white/40"
          >
            [ Star @CoderKavyaG on github ]
          </a>
        </div>

      </div>
    </section>
  );
}
