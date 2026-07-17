"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Sparkles, ArrowRight, AlertTriangle } from "lucide-react";
import { signIn } from "next-auth/react";
import { VerticalStripes } from "@/components/ui/textures/VerticalStripes";
import wakeupDashboard from "@/../public/wakeup-dashbaord.png";

export function MarketingHero() {
  const [isMobile, setIsMobile] = useState(false);
  const [email, setEmail] = useState("");
  const [emailSent, setEmailSent] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const isSmallViewport = window.innerWidth < 1024;
      setIsMobile(isMobileUA || isSmallViewport);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setEmailSent(true);
    }
  };

  return (
    <section className="relative min-h-[95vh] pt-32 pb-16 flex flex-col items-center justify-center px-6 overflow-hidden bg-background bg-dot-grid">
      {/* Light Cloud Background Asset covering the Hero */}
      <div className="absolute top-0 left-0 right-0 h-[115vh] pointer-events-none select-none z-0 overflow-hidden">
        <img
          src="https://i.ibb.co/fVj7Nrcx/88130983-f36a-4f49-93a4-94313b8ff460.png"
          alt="Light clouds background"
          className="w-full h-full object-cover opacity-80"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#FAF9F6]/50 to-[#FAF9F6]" />
      </div>

      {/* Vertical Stripe Slats Texture (Over the clouds) */}
      <VerticalStripes />

      {/* Main Content Pane */}
      <div className="relative z-10 max-w-4xl mx-auto text-center space-y-6 select-none flex flex-col items-center">
        
        {/* Tagline Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-none border border-zinc-200 bg-white/95 text-[9px] font-bold tracking-widest text-zinc-700 uppercase font-poppins shadow-sm">
          <svg className="w-3.5 h-4.5 shrink-0" viewBox="0 0 64 80" fill="none">
            <path d="M12 25c0-12 10-15 20-15s20 3 20 15v10H12V25z" fill="#EA580C" />
            <rect x="18" y="22" width="28" height="26" rx="14" fill="#FED7AA" />
            <circle cx="27" cy="33" r="3" fill="#2563EB" />
            <circle cx="37" cy="33" r="3" fill="#2563EB" />
            <path d="M28 40q4 3 8 0" stroke="#78350F" strokeWidth="2" strokeLinecap="round" />
            <path d="M14 23c4-4 12-5 18-2s14 1 18 4v-4c0-10-8-13-20-13S14 13 14 21v2z" fill="#C2410C" />
          </svg>
          The Agentic Command Center
        </div>

        {/* Headline */}
        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-medium tracking-tighter font-poppins leading-[1.08] text-[#1F1F1F] max-w-3xl mx-auto">
            Your Local Machine. <br />
            <span className="bg-gradient-to-r from-[#2b41c6] via-[#3b53e9] to-[#5b73ff] bg-clip-text text-transparent">
              Right Inside Your Browser.
            </span>
          </h1>
        </div>

        {/* Subheadline */}
        <p className="text-xs sm:text-sm text-zinc-800 font-poppins max-w-2xl mx-auto leading-relaxed">
          Develop against your real files, processes, Git repositories, ports, and terminals—without containers, virtual environments, or remote sandboxes.
        </p>

        {/* CTAs / Mobile Onboarding form */}
        <div className="pt-1 flex flex-col sm:flex-row items-center gap-4">
          {isMobile ? (
            /* Mobile Onboarding checking */
            <div className="w-full max-w-sm p-4 rounded-none border border-zinc-200 bg-white/95 backdrop-blur-sm space-y-3 shadow-md">
              <p className="text-[11px] text-amber-700 font-bold tracking-wide flex items-center justify-center gap-1.5 font-poppins">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Desktop Required for Setup
              </p>
              {emailSent ? (
                <p className="text-[11px] text-emerald-600 font-medium font-mono pt-1">
                  Link sent! Open this on your desktop to get started.
                </p>
              ) : (
                <form onSubmit={handleEmailSubmit} className="flex gap-1.5 p-1 rounded-none border border-zinc-200 bg-[#FAF9F6]">
                  <input
                    type="email"
                    placeholder="Email me the setup link"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="flex-1 bg-transparent px-3 py-2 text-[11px] text-zinc-900 focus:outline-none placeholder-zinc-400 font-poppins"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#1f1f1f] hover:bg-black text-white text-[11px] font-semibold transition-all cursor-pointer font-poppins"
                  >
                    Send
                  </button>
                </form>
              )}
            </div>
          ) : (
            /* Desktop CTAs (Trigger OAuth via direct Form POST to resolve client library issues) */
            <div className="flex items-center gap-4">
              <button
                onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
                className="px-5 py-2.5 bg-[#bfdbfe] hover:bg-[#93c5fd] text-[#1e3a8a] text-[11px] font-bold tracking-wide uppercase font-poppins transition-all duration-300 flex items-center gap-2 group cursor-pointer shadow-sm shadow-[#bfdbfe]/20"
              >
                Connect your machine 
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </button>
              
              <a
                href="#features"
                className="px-5 py-2.5 border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 text-[11px] font-semibold tracking-wide uppercase font-poppins transition-all duration-300 flex items-center gap-2 cursor-pointer shadow-sm"
              >
                Understand Features
              </a>
            </div>
          )}
        </div>

        {/* Small mini text line about login-free & 100% features free */}
        <div className="text-[10px] text-zinc-450 font-mono tracking-wide pt-2 select-none">
          Wakeup is sexy because: <span className="text-[#3b53e9] font-bold">Login is required</span>, but <span className="text-[#3b53e9] font-bold">every feature is 100% FREE.</span>
        </div>

        {/* Browser Mockup view of the Workstation Console with motion animations */}
        <motion.div 
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          whileHover={{ y: -6, scale: 1.002 }}
          className="pt-8 max-w-3xl w-full cursor-pointer"
        >
          <div className="relative border border-zinc-250 bg-white p-1.5 shadow-md hover:shadow-2xl transition-all duration-500">
            <div className="relative border border-zinc-200 bg-[#070709] overflow-hidden">
              
              {/* Header bar mock */}
              <div className="flex items-center justify-between px-3 py-2 bg-[#0F0F13] border-b border-zinc-850">
                <div className="flex gap-1.5 items-center">
                  <div className="w-2 h-2 rounded-full bg-[#EF4444]/80" />
                  <div className="w-2 h-2 rounded-full bg-[#F59E0B]/80" />
                  <div className="w-2 h-2 rounded-full bg-emerald-500/80" />
                </div>
                <div className="px-4 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-[8px] font-medium text-white/30 font-mono select-none">
                  wakeup.sh/dashboard
                </div>
                <div className="w-10 h-3" />
              </div>

              {/* Workstation Screenshot Image Mockup */}
              <div className="relative aspect-[16/10] w-full bg-black">
                <img
                  src={wakeupDashboard.src}
                  alt="Wakeup OS Dashboard — Projects, GitHub Monitor, Machine Control, Focus Panel"
                  className="w-full h-full object-cover opacity-95 select-none pointer-events-none transition-transform duration-700"
                  loading="eager"
                />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_50%,rgba(0,0,0,0.15)_100%)] pointer-events-none" />
              </div>
            </div>
          </div>
        </motion.div>

      </div>
    </section>
  );
}
