"use client";

import React from "react";
import Link from "next/link";
import { Command, ChevronDown } from "lucide-react";

// Inline Custom SVGs for Social Icons
const XIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const InstagramIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

const FacebookIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);

const YoutubeIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M2.5 12a9 9 0 0 1 9-9h1a9 9 0 0 1 9 9v0a9 9 0 0 1-9 9h-1a9 9 0 0 1-9-9z" />
    <path d="m10 15 5-3-5-3z" />
  </svg>
);

const TiktokIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
  </svg>
);

export function MarketingFooter() {
  return (
    <footer className="bg-[#3b53e9] text-white pt-20 pb-10 relative z-10 select-none overflow-hidden font-poppins">
      
      {/* 4-Columns Grid Footer Main Content */}
      <div className="max-w-5xl mx-auto px-6 grid grid-cols-1 md:grid-cols-12 gap-10 border-b border-white/10 pb-12">
        
        {/* Left column: Brand & Socials (4 Cols) */}
        <div className="md:col-span-4 space-y-6">
          <div className="flex flex-col gap-2">
            <Link href="/" className="flex items-center gap-2 group w-fit">
              <div className="w-7 h-7 rounded-none bg-white flex items-center justify-center">
                <Command className="w-4 h-4 text-[#3b53e9]" />
              </div>
              <span className="text-base font-extrabold tracking-widest text-white uppercase">
                Wakeup
              </span>
            </Link>
            <p className="text-[11px] text-white/70 max-w-xs leading-relaxed mt-1">
              Your personal developer operating cockpit. Linking actual system command scopes straight to your browser.
            </p>
          </div>

          {/* Language Dropdown Selector & Social Row */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-fit">
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-black/10 hover:bg-black/25 text-[10px] font-bold text-white transition-all">
                English (US) <ChevronDown className="w-3.5 h-3.5 text-white/50" />
              </button>
            </div>

            {/* Follow on X CTA */}
            <a
              href="https://x.com/goelsahhab"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-black/25 hover:bg-black/40 text-[10px] font-extrabold text-white transition-all rounded shadow-sm"
            >
              <XIcon className="w-3 h-3 fill-current text-white shrink-0" />
              Follow @goelsahhab
            </a>

            <div className="flex items-center gap-3.5 text-white/70 ml-2">
              <a href="https://x.com" target="_blank" rel="noopener" className="hover:text-white transition-colors">
                <XIcon className="w-4.5 h-4.5" />
              </a>
              <a href="https://instagram.com" target="_blank" rel="noopener" className="hover:text-white transition-colors">
                <InstagramIcon className="w-4.5 h-4.5" />
              </a>
              <a href="https://facebook.com" target="_blank" rel="noopener" className="hover:text-white transition-colors">
                <FacebookIcon className="w-4.5 h-4.5" />
              </a>
              <a href="https://youtube.com" target="_blank" rel="noopener" className="hover:text-white transition-colors">
                <YoutubeIcon className="w-4.5 h-4.5" />
              </a>
              <a href="https://tiktok.com" target="_blank" rel="noopener" className="hover:text-white transition-colors">
                <TiktokIcon className="w-4.5 h-4.5" />
              </a>
            </div>
          </div>

          {/* Mascot Section inside Footer Left */}
          <div className="flex items-center gap-3 pt-4 select-none">
            {/* Devy Cartoon Mascot SVG */}
            <div className="shrink-0 relative">
              <svg className="w-12 h-14" viewBox="0 0 64 80" fill="none">
                {/* Hair back */}
                <path d="M12 25c0-12 10-15 20-15s20 3 20 15v10H12V25z" fill="#EA580C" />
                {/* Face */}
                <rect x="18" y="22" width="28" height="26" rx="14" fill="#FED7AA" />
                {/* Eyes */}
                <circle cx="27" cy="33" r="3" fill="#2563EB" />
                <circle cx="37" cy="33" r="3" fill="#2563EB" />
                <circle cx="28.5" cy="31.5" r="1.2" fill="#FFFFFF" />
                <circle cx="38.5" cy="31.5" r="1.2" fill="#FFFFFF" />
                {/* Cheeks */}
                <circle cx="23" cy="38" r="2.5" fill="#F43F5E" opacity="0.4" />
                <circle cx="41" cy="38" r="2.5" fill="#F43F5E" opacity="0.4" />
                {/* Smile */}
                <path d="M28 40q4 3 8 0" stroke="#78350F" strokeWidth="2" strokeLinecap="round" />
                {/* Hair front bangs */}
                <path d="M14 23c4-4 12-5 18-2s14 1 18 4v-4c0-10-8-13-20-13S14 13 14 21v2z" fill="#C2410C" />
                <path d="M16 22c5-5 12-6 16-3" stroke="#F97316" strokeWidth="2" strokeLinecap="round" />
                {/* Body/Shirt */}
                <path d="M16 48c0 0 4 6 16 6s16-6 16-6v20H16V48z" fill="#0D9488" />
                {/* Overalls straps */}
                <rect x="22" y="48" width="4" height="15" fill="#1E3A8A" />
                <rect x="38" y="48" width="4" height="15" fill="#1E3A8A" />
                <circle cx="24" cy="54" r="1.5" fill="#F59E0B" />
                <circle cx="40" cy="54" r="1.5" fill="#F59E0B" />
                {/* Arm pointing */}
                <path d="M44 52c4 1 8-2 10-6s1-4-1-5-6 2-7 6l-2 5z" fill="#FED7AA" />
              </svg>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-500 border border-[#3b53e9] animate-pulse" />
            </div>

            {/* Cartoon Speech Bubble next to Devy */}
            <div className="flex-1 min-w-0 relative">
              <div className="bg-white text-zinc-900 text-[10px] leading-relaxed p-2.5 rounded-xl border-2 border-zinc-900 shadow-[2px_2px_0px_rgba(0,0,0,0.95)] relative">
                {/* Tail pointing to Devy */}
                <div className="absolute top-4 -left-[6px] w-2.5 h-2.5 bg-white border-l-2 border-b-2 border-zinc-900 rotate-45 transform" />
                <p className="font-sans font-semibold text-zinc-700">
                  <span className="font-extrabold text-[#B45309]">Welcome Chief!</span> Setup Google Auth, then run agent loopback.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right columns: Grid of links (8 Cols) */}
        <div className="md:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-8">
          
          {/* Col 1: Product */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-bold tracking-wider text-white/40 uppercase font-sans">Product</h4>
            <ul className="space-y-2 text-[11px] font-semibold text-white/80">
              <li><Link href="#features" className="hover:underline hover:text-white transition-all">Cockpit</Link></li>
              <li><Link href="#features" className="hover:underline hover:text-white transition-all">Features</Link></li>
              <li><Link href="#flow" className="hover:underline hover:text-white transition-all">Local Agent</Link></li>
              <li><Link href="#flow" className="hover:underline hover:text-white transition-all">Releases</Link></li>
            </ul>
          </div>

          {/* Col 2: Company */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-bold tracking-wider text-white/40 uppercase font-sans">Company</h4>
            <ul className="space-y-2 text-[11px] font-semibold text-white/80">
              <li><a href="https://github.com/CoderKavyaG" target="_blank" rel="noopener" className="hover:underline hover:text-white transition-all">About</a></li>
              <li><span className="text-white/30 cursor-not-allowed">Jobs</span></li>
              <li><span className="text-white/30 cursor-not-allowed">Brand</span></li>
              <li><span className="text-white/30 cursor-not-allowed">Newsroom</span></li>
            </ul>
          </div>

          {/* Col 3: Resources */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-bold tracking-wider text-white/40 uppercase font-sans">Resources</h4>
            <ul className="space-y-2 text-[11px] font-semibold text-white/80">
              <li><a href="https://github.com/CoderKavyaG/wakeup" target="_blank" rel="noopener" className="hover:underline hover:text-white transition-all">Support</a></li>
              <li><a href="https://github.com/CoderKavyaG/wakeup" target="_blank" rel="noopener" className="hover:underline hover:text-white transition-all">Documentation</a></li>
              <li><Link href="#flow" className="hover:underline hover:text-white transition-all">Setup Guide</Link></li>
              <li><Link href="#faq" className="hover:underline hover:text-white transition-all">Feedback</Link></li>
            </ul>
          </div>

          {/* Col 4: Policies */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-bold tracking-wider text-white/40 uppercase font-sans">Policies</h4>
            <ul className="space-y-2 text-[11px] font-semibold text-white/80">
              <li><span className="text-white/30 cursor-not-allowed">Terms</span></li>
              <li><span className="text-white/30 cursor-not-allowed">Privacy</span></li>
              <li><span className="text-white/30 cursor-not-allowed">Guidelines</span></li>
              <li><span className="text-white/30 cursor-not-allowed">Licenses</span></li>
            </ul>
          </div>

        </div>

      </div>

      {/* Massive bottom brand name watermark inspired by Discord logo */}
      <div className="max-w-5xl mx-auto px-6 pt-10 flex flex-col items-center gap-6">
        <h2 className="text-[10vw] font-black text-[#2b41c6] select-none tracking-tighter leading-none text-center w-full uppercase font-sans">
          WAKEUP
        </h2>
        <div className="w-full flex flex-col sm:flex-row items-center justify-between text-[9px] text-white/40 font-mono mt-2">
          <span>v0.1.0 // DEVELOPER COCKPIT PRIVATE ACCESS</span>
          <span className="mt-1 sm:mt-0">&copy; {new Date().getFullYear()} Wakeup Studio India. Secure Loopback Enabled.</span>
        </div>
      </div>

    </footer>
  );
}
