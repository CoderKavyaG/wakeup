"use client";

import React, { useState } from "react";
import { signIn } from "next-auth/react";
import { 
  Cpu, GitBranch, Bot, Layers, Image, Folder,
  Activity, Lock, Terminal, Command, TrendingUp, Grid, Moon, CheckCircle2 
} from "lucide-react";

type TabId = "machine" | "github" | "focus" | "project-os" | "sandbox" | "project";

interface FeatureDetail {
  id: TabId;
  icon: React.ComponentType<{ className?: string }>;
  tabTitle: string;
  tabSubtitle: string;
  badge: string;
  title: string;
  desc: string;
  checklist: string[];
  ctaText: string;
  imageSrc: string;
  mascotTip: string;
}

export function LandingBento() {
  const [activeTab, setActiveTab] = useState<TabId>("machine");

  const features: FeatureDetail[] = [
    {
      id: "machine",
      icon: Cpu,
      tabTitle: "Machine Control",
      tabSubtitle: "Port & system stats",
      badge: "Daemon Active",
      title: "Monitor & control ports in real time",
      desc: "Track CPU, RAM, active port listings, and terminate rogue processes instantly. Powered by a local background agent running on localhost, meaning your metrics never pass through third-party servers.",
      checklist: [
        "Port monitoring & kill-port in one click",
        "Real-time CPU and RAM telemetry",
        "Runs entirely local on localhost"
      ],
      ctaText: "Explore Machine Control",
      imageSrc: "https://i.ibb.co/cSpPS9JD/Screenshot-2026-07-17-214812.png",
      mascotTip: "Chief: Loopback binds only to 127.0.0.1. No external exposure."
    },
    {
      id: "github",
      icon: GitBranch,
      tabTitle: "GitHub Monitor",
      tabSubtitle: "Commit & streak logs",
      badge: "Git Pipeline",
      title: "Track developer streaks & repo activity",
      desc: "Stay locked in your flow state. Display language breakdowns, repository metrics, commits, and activity logs straight inside your core cockpit dashboard.",
      checklist: [
        "Active commit streak tracking indicators",
        "Language metrics & breakdown graphics",
        "Live local and remote event feeds"
      ],
      ctaText: "Configure GitHub Feed",
      imageSrc: "https://i.ibb.co/PvJVjV9X/Screenshot-2026-07-17-214738.png",
      mascotTip: "Chief: Keep that green streak burning! Direct API hooks."
    },
    {
      id: "focus",
      icon: Bot,
      tabTitle: "Focus Panel",
      tabSubtitle: "AI brain dump input",
      badge: "AI Classifier",
      title: "Dump raw thoughts, let AI classify them",
      desc: "Decrease cognitive load. Jot down quick drafts or commands inside the focus panel. Our local pipeline automatically tags, processes, and classifies it into tasks, notes, or project items.",
      checklist: [
        "Hands-free task dump sorting",
        "Instant note and snippet categorization",
        "Cognitive load reduction"
      ],
      ctaText: "Try Focus Panel",
      imageSrc: "https://i.ibb.co/b8vY0tg/Screenshot-2026-07-17-214715.png",
      mascotTip: "Chief: Dump raw thoughts, my local classifier handles it."
    },
    {
      id: "project-os",
      icon: Layers,
      tabTitle: "Project OS",
      tabSubtitle: "Kanban task boards",
      badge: "Task Command",
      title: "Manage project columns & task states",
      desc: "Organize your workflow phases. Drag tasks, link local project directory files, and keep tabs on development sprints with interactive physical card grids.",
      checklist: [
        "Interactive task and feature lists",
        "Clean project-specific command folders",
        "Physics-based card layouts & animations"
      ],
      ctaText: "Launch Project OS",
      imageSrc: "https://i.ibb.co/rKyHYjPK/Screenshot-2026-07-17-215132.png",
      mascotTip: "Chief: Tap into localized Kanban lists to guide tasks."
    },
    {
      id: "sandbox",
      icon: Image,
      tabTitle: "Idea Sandbox",
      tabSubtitle: "Creative mind mapping",
      badge: "Ref Workspace",
      title: "Sketch project diagrams & concepts",
      desc: "Map your thoughts in a spatial note canvas. Draw nodes, connect concepts, and create mindmaps that bridge directly to project issues.",
      checklist: [
        "Infinite canvas node sketching",
        "Draggable concept boards",
        "Direct task list export"
      ],
      ctaText: "Open Sandbox Canvas",
      imageSrc: "https://i.ibb.co/nqLnDbDn/Screenshot-2026-07-17-215220.png",
      mascotTip: "Chief: Draw diagrams on the canvas, then export to tasks."
    },
    {
      id: "project",
      icon: Folder,
      tabTitle: "Project Widget",
      tabSubtitle: "Workspace directories",
      badge: "Command Grid",
      title: "Visual directory folder structures",
      desc: "Connect local code repositories directly. Review project folder structures, configure npm script run hooks, and check deployment configurations.",
      checklist: [
        "Local workspace folder tree logs",
        "Direct script execution triggers",
        "Local config validation rules"
      ],
      ctaText: "Configure Project Widget",
      imageSrc: "https://i.ibb.co/SD9fg9Bg/Screenshot-2026-07-17-214744.png",
      mascotTip: "Chief: Open directories directly in VS Code from this widget."
    }
  ];

  const secondaryFeatures = [
    { icon: Activity, title: "Local Daemon", desc: "Listens securely on localhost:3131" },
    { icon: Lock, title: "Encrypted Storage", desc: "Local AES-256-GCM credentials encryption" },
    { icon: Terminal, title: "System Logs", desc: "Track system logs & execution history" },
    { icon: Command, title: "Command Palette", desc: "Keyboard-driven fast search shortcuts" },
    { icon: TrendingUp, title: "System Metrics", desc: "Overview active CPU & RAM logs" },
    { icon: Grid, title: "Grid Workspace", desc: "Flexible widget grids with drag/resize" },
    { icon: Folder, title: "Workspace Scopes", desc: "Bind tasks to local directory paths" },
    { icon: Moon, title: "Ambient Themes", desc: "Visual comfort with adjustable dark/light panels" }
  ];

  const currentFeature = features.find(f => f.id === activeTab) || features[0];

  const handleCta = () => {
    signIn("google", { callbackUrl: "/dashboard" });
  };

  return (
    <section id="features" className="relative bg-background bg-dot-grid py-16 px-6 border-t border-dashed border-zinc-200 select-none">
      <div className="max-w-5xl mx-auto space-y-12">
        
        {/* Section Header */}
        <div className="text-center space-y-3">
          <span className="text-[9px] font-bold tracking-widest text-[#3b53e9] uppercase font-poppins">
            FEATURES
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#1F1F1F] font-poppins">
            What you can do in Wakeup
          </h2>
          <p className="text-xs text-zinc-500 font-poppins max-w-xl mx-auto">
            Main tools are on top. Click one to see what it does. More features are listed below.
          </p>
        </div>

        {/* Tab Switcher Grid - 6 columns */}
        <div className="grid grid-cols-2 md:grid-cols-6 border border-dashed border-zinc-200 rounded-none bg-white/40 shadow-xs">
          {features.map((feature) => {
            const IconComponent = feature.icon;
            const isActive = activeTab === feature.id;
            return (
              <button
                key={feature.id}
                onClick={() => setActiveTab(feature.id)}
                className={`flex flex-col items-start gap-2 p-4 text-left border-r border-b md:border-b-0 last:border-r-0 border-dashed border-zinc-200 transition-all cursor-pointer relative group ${
                  isActive ? "bg-white text-zinc-900" : "hover:bg-zinc-50 text-zinc-500"
                }`}
              >
                <IconComponent className={`w-4 h-4 ${isActive ? "text-[#3b53e9]" : "text-zinc-400 group-hover:text-zinc-600"}`} />
                <div>
                  <div className={`text-[10px] font-bold font-satoshi ${isActive ? "text-zinc-900" : "text-zinc-650"}`}>
                    {feature.tabTitle}
                  </div>
                  <div className="text-[8px] text-zinc-400 font-satoshi tracking-wide uppercase mt-0.5">
                    {feature.tabSubtitle}
                  </div>
                </div>
                {/* Active Indicator Line */}
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#3b53e9]" />
                )}
              </button>
            );
          })}
        </div>

        {/* Main Content Viewport */}
        <div className="border border-dashed border-zinc-200 rounded-none p-6 md:p-8 bg-white/80 backdrop-blur-sm grid grid-cols-1 lg:grid-cols-2 gap-8 items-center min-h-[360px] shadow-xs">
          
          {/* Left Details Pane */}
          <div className="space-y-4">
            <span className="inline-flex items-center px-2 py-0.5 rounded-none border border-[#3b53e9]/20 bg-[#3b53e9]/5 text-[8px] font-bold tracking-widest text-[#3b53e9] uppercase font-poppins">
              {currentFeature.badge}
            </span>
            
            <h3 className="text-xl md:text-2xl font-extrabold text-[#1F1F1F] font-poppins">
              {currentFeature.title}
            </h3>
            
            <p className="text-[11px] text-zinc-500 leading-relaxed font-poppins">
              {currentFeature.desc}
            </p>

            {/* Benefit Checkmarks */}
            <ul className="space-y-2 pt-1">
              {currentFeature.checklist.map((item, index) => (
                <li key={index} className="flex items-center gap-2 text-[11px] text-zinc-700 font-poppins">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#3b53e9] shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            {/* Mascot Tip Accent */}
            <div className="flex items-center gap-2.5 px-3 py-1.5 bg-[#3b53e9]/5 border border-[#3b53e9]/20 rounded-none w-fit">
              <svg className="w-5 h-6 shrink-0" viewBox="0 0 64 80" fill="none">
                <path d="M12 25c0-12 10-15 20-15s20 3 20 15v10H12V25z" fill="#EA580C" />
                <rect x="18" y="22" width="28" height="26" rx="14" fill="#FED7AA" />
                <circle cx="27" cy="33" r="3" fill="#2563EB" />
                <circle cx="37" cy="33" r="3" fill="#2563EB" />
                <path d="M28 40q4 3 8 0" stroke="#78350F" strokeWidth="2" strokeLinecap="round" />
                <path d="M14 23c4-4 12-5 18-2s14 1 18 4v-4c0-10-8-13-20-13S14 13 14 21v2z" fill="#C2410C" />
              </svg>
              <span className="text-[9px] font-mono text-[#3b53e9] font-medium leading-none">
                Devy: "{currentFeature.mascotTip}"
              </span>
            </div>

            <button
              onClick={handleCta}
              className="mt-2 px-4 py-2 bg-[#bfdbfe] hover:bg-[#93c5fd] text-[#1e3a8a] text-[10px] font-bold tracking-wide uppercase font-poppins rounded-none transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-sm"
            >
              {currentFeature.ctaText}
            </button>
          </div>

          {/* Right Visual Image Mockup */}
          <div className="relative aspect-[16/10] w-full border border-zinc-900 bg-white p-1.5 shadow-sm overflow-hidden flex items-center justify-center">
            <div className="relative w-full h-full overflow-hidden border border-zinc-200 bg-[#070709]">
              {/* Header bar mock */}
              <div className="flex items-center justify-between px-3 py-1.5 bg-[#0F0F13] border-b border-zinc-850">
                <div className="flex gap-1.5 items-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#EF4444]/80" />
                  <div className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]/80" />
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/80" />
                </div>
                <div className="text-[7px] font-mono text-white/30 uppercase tracking-widest select-none">
                  {currentFeature.tabTitle.toLowerCase()}.wakeup.sh
                </div>
                <div className="w-8 h-2" />
              </div>
              <img
                src={currentFeature.imageSrc}
                alt={currentFeature.tabTitle}
                className="w-full h-full object-contain bg-black opacity-95 object-center hover:scale-[1.01] transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none" />
            </div>
          </div>

        </div>

        {/* More Features Section */}
        <div className="pt-6 border-t border-dashed border-zinc-200">
          <div className="text-left mb-4 font-poppins text-[9px] font-bold text-zinc-400 tracking-widest uppercase">
            MORE FEATURES
          </div>

          {/* Small Feature Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {secondaryFeatures.map((feat, idx) => {
              const SmallIcon = feat.icon;
              return (
                <div 
                  key={idx}
                  className="flex items-start gap-3 p-3 border border-dashed border-zinc-200 bg-white/40 hover:border-[#3b53e9]/30 transition-all shadow-xs"
                >
                  <div className="p-1 rounded-none bg-zinc-100 text-[#3b53e9] mt-0.5">
                    <SmallIcon className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-[11px] font-bold text-zinc-800 font-satoshi">
                      {feat.title}
                    </h4>
                    <p className="text-[9px] text-zinc-400 font-satoshi mt-0.5">
                      {feat.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </section>
  );
}
