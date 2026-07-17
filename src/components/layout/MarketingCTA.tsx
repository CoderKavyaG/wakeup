"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, ArrowRight, ShieldCheck } from "lucide-react";
import { signIn } from "next-auth/react";
import { BackgroundBeams } from "@/components/ui/background-beams";
import { HoverBorderButton } from "@/components/ui/moving-border";

export function MarketingCTA() {
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
    <section className="relative py-28 px-6 bg-[#070709] border-t border-white/[0.04] overflow-hidden flex flex-col items-center justify-center">
      {/* Background Beams for Visual Bookend */}
      <div className="absolute inset-0 z-0 opacity-30">
        <BackgroundBeams />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto text-center space-y-6 select-none flex flex-col items-center">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-[#97C2EC]/20 bg-[#97C2EC]/5 text-[10px] font-bold tracking-widest text-[#97C2EC] uppercase font-poppins">
          <Sparkles className="w-3 h-3 text-[#97C2EC]" /> Cockpit Launchpad
        </div>
        
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white font-poppins max-w-2xl mx-auto leading-tight">
          Ready to bridge the browser to your local environment?
        </h2>
        
        <p className="text-sm md:text-base text-white/50 font-poppins max-w-md mx-auto leading-relaxed">
          Run our lightweight daemon locally and connect your browser workspace to your physical host instantly.
        </p>

        {/* Mobile/Desktop Gate */}
        <div className="pt-4 flex justify-center">
          {isMobile ? (
            <div className="w-full max-w-sm p-5 rounded border border-white/10 bg-[#1F1F1F]/90 backdrop-blur-md space-y-3">
              <p className="text-xs text-brand-beige font-semibold tracking-wide flex items-center justify-center gap-1.5 font-poppins">
                <span>⚠️</span> Desktop Required for Setup
              </p>
              {emailSent ? (
                <p className="text-xs text-emerald-400 font-medium font-mono pt-1">
                  ✓ Link sent! Access the setup checklist on your desktop.
                </p>
              ) : (
                <form onSubmit={handleEmailSubmit} className="flex gap-1.5 p-1 rounded border border-white/10 bg-[#070709]">
                  <input
                    type="email"
                    placeholder="Email me the desktop link"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="flex-1 bg-transparent px-3 py-2 text-xs text-white focus:outline-none placeholder-white/30 font-poppins"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded bg-white text-black text-xs font-semibold hover:bg-white/95 transition-all cursor-pointer font-poppins"
                  >
                    Send link
                  </button>
                </form>
              )}
            </div>
          ) : (
            <button
              onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
              className="px-8 py-3 bg-[#97C2EC] hover:bg-[#97C2EC]/90 text-black text-xs font-bold tracking-wide uppercase font-poppins rounded transition-all cursor-pointer shadow-lg shadow-[#97C2EC]/20 hover:scale-[1.03] flex items-center gap-2 group"
            >
              Connect your machine 
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          )}
        </div>

        <div className="flex items-center justify-center gap-2 text-[10px] text-white/40 font-mono pt-2">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Encrypted AES-256 process handshakes
        </div>
      </div>
    </section>
  );
}
