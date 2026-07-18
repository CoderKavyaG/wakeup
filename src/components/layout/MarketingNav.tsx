"use client";

import React, { useState, useEffect } from "react";
import { Command } from "lucide-react";
import { signIn } from "next-auth/react";

export function MarketingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [activeLink, setActiveLink] = useState("");

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 40);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links = [
    { href: "#features", label: "Features" },
    { href: "#flow", label: "How It Works" },
    { href: "#action", label: "Gallery" },
    { href: "#faq", label: "FAQ" },
  ];

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none select-none">
      <nav
        className={`w-full transition-all duration-500 ease-out pointer-events-auto border border-white/[0.08] bg-[#0c0c0f]/95 backdrop-blur-xl shadow-2xl shadow-black/80 rounded-full flex items-center justify-between ${
          scrolled
            ? "max-w-3xl mt-3 py-1.5 px-5"
            : "max-w-5xl mt-6 py-3 px-8"
        }`}
      >
        {/* Left Side: Logo + Brand Name */}
        <div className="flex items-center gap-3">
          <a href="/" className="flex items-center gap-2 group pointer-events-auto">
            <Command
              className={`text-[#5b73ff] transition-all duration-500 ${
                scrolled ? "w-4 h-4" : "w-5 h-5"
              }`}
            />
            <span
              className={`font-black tracking-[0.18em] text-white font-poppins uppercase transition-all duration-500 ${
                scrolled ? "text-[10px]" : "text-xs"
              }`}
            >
              WAKEUP
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shrink-0" />
          </a>
          
          {/* Vertical divider separator */}
          <div className="h-4 w-px bg-white/10 hidden md:block" />
        </div>

        {/* Center: Navigation Links */}
        <div className="hidden md:flex items-center gap-1">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setActiveLink(link.href)}
              className={`rounded-full tracking-wide transition-all duration-200 font-poppins relative font-medium ${
                scrolled
                  ? "px-3 py-1 text-[9px]"
                  : "px-4 py-1.5 text-[11px]"
              } ${
                activeLink === link.href
                  ? "text-white bg-white/[0.06]"
                  : "text-white/45 hover:text-white/90 hover:bg-white/[0.04]"
              }`}
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Right Side: Sign In Button */}
        <div className="flex items-center">
          <button
            onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
            className={`flex items-center justify-center gap-2 rounded-full font-bold font-poppins transition-all duration-300 bg-[#3b53e9] hover:bg-[#2b41c6] text-white cursor-pointer shadow-lg shadow-[#3b53e9]/20 hover:shadow-[#3b53e9]/40 ${
              scrolled
                ? "px-4 py-1.5 text-[9px]"
                : "px-5 py-2 text-[11px]"
            }`}
          >
            <svg className="w-3.5 h-3.5 fill-current shrink-0" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            Sign In
          </button>
        </div>
      </nav>
    </div>
  );
}
