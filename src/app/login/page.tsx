"use client";

import React, { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Loader2, Lock, Mail, User, Shield, Compass, Cpu, CheckCircle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [hasOwner, setHasOwner] = useState<boolean | null>(null);
  const [isSetup, setIsSetup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Agent connection status
  const [agentConnected, setAgentConnected] = useState<boolean | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Check if owner exists
  useEffect(() => {
    fetch("/api/auth/register")
      .then((res) => res.json())
      .then((data) => {
        setHasOwner(data.hasOwner);
        setIsSetup(!data.hasOwner);
      })
      .catch(() => {
        setHasOwner(true); // default to login if check fails
      });
  }, []);

  // Ping local agent to check if active
  useEffect(() => {
    const checkAgent = () => {
      fetch("http://localhost:3131/stats")
        .then((res) => {
          if (res.ok) setAgentConnected(true);
          else setAgentConnected(false);
        })
        .catch(() => {
          setAgentConnected(false);
        });
    };
    checkAgent();
    const interval = setInterval(checkAgent, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (isSetup) {
      // Create first user setup
      try {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to create account");
        }
        
        // Auto sign-in after registration
        const loginRes = await signIn("credentials", {
          email,
          password,
          redirect: false,
        });

        if (loginRes?.error) {
          setError("Account created, but failed to log in automatically. Please sign in manually.");
          setIsSetup(false);
        } else {
          router.push("/");
          router.refresh();
        }
      } catch (err: any) {
        setError(err.message || "Something went wrong during setup");
      } finally {
        setLoading(false);
      }
    } else {
      // Normal login
      try {
        const result = await signIn("credentials", {
          email,
          password,
          redirect: false,
        });

        if (result?.error) {
          setError("Invalid email or password");
        } else {
          router.push("/");
          router.refresh();
        }
      } catch (err) {
        setError("Sign in failed. Check your network connection.");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleGoogleLogin = () => {
    signIn("google", { callbackUrl: "/" });
  };

  if (hasOwner === null) {
    return (
      <div className="min-h-screen bg-[#0f0f11] flex items-center justify-center relative overflow-hidden">
        {/* Animated Background Orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] animate-pulse" />
        <Loader2 className="w-10 h-10 text-purple-400 animate-spin relative z-10" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f11] text-[#E8E9EB] flex items-center justify-center p-6 relative overflow-hidden">
      
      {/* Starry Grid Background Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
      
      {/* Large Neon Blurred Background Lights */}
      <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[150px] pointer-events-none animate-pulse duration-[8000ms]" />
      <div className="absolute -bottom-40 -right-40 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[150px] pointer-events-none animate-pulse duration-[6000ms]" />

      <div className="w-full max-w-[480px] z-10">
        {/* Glassmorphic Container Card */}
        <div className="bg-[#161619]/75 backdrop-blur-xl border border-white/[0.06] rounded-3xl p-8 md:p-10 shadow-[0_0_80px_-20px_rgba(168,85,247,0.15)] hover:shadow-[0_0_80px_-10px_rgba(168,85,247,0.25)] transition-all duration-500 flex flex-col gap-8 relative overflow-hidden group">
          
          {/* Subtle top border reflection */}
          <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-white/15 to-transparent pointer-events-none" />

          {/* Logo and Header */}
          <div className="text-center flex flex-col gap-3">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600/20 to-blue-600/20 border border-white/10 flex items-center justify-center font-bold text-white text-2xl mx-auto shadow-[0_4px_20px_rgba(0,0,0,0.3)] select-none transition-transform duration-500 group-hover:scale-105">
              <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">D</span>
            </div>
            
            <h1 className="text-2xl font-bold tracking-tight text-white mt-2 select-none">
              {isSetup ? "Configure DevOS" : "Access Developer Cockpit"}
            </h1>
            
            <p className="text-xs text-white/50 px-6">
              {isSetup 
                ? "Setup your master identity to initialize your personal developer workbench." 
                : "Manage, deploy, and control your apps from a single, unified agent workspace."}
            </p>
          </div>

          {error && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl font-medium flex items-center gap-2 animate-shake">
              <Shield className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {isSetup && (
              <div className="flex flex-col gap-2">
                <label className="text-[10px] uppercase font-bold text-white/40 tracking-wider pl-1">Full Name</label>
                <div className="relative flex items-center">
                  <User className="w-4 h-4 text-white/40 absolute left-3.5" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Kavya"
                    className="w-full h-11 bg-black/40 border border-white/5 focus:border-purple-500/50 hover:border-white/10 rounded-xl pl-10 pr-4 text-sm text-white focus:outline-none transition-all duration-300 placeholder:text-white/20 shadow-inner"
                  />
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <label className="text-[10px] uppercase font-bold text-white/40 tracking-wider pl-1">Email Address</label>
              <div className="relative flex items-center">
                <Mail className="w-4 h-4 text-white/40 absolute left-3.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="developer@devos.local"
                  className="w-full h-11 bg-black/40 border border-white/5 focus:border-purple-500/50 hover:border-white/10 rounded-xl pl-10 pr-4 text-sm text-white focus:outline-none transition-all duration-300 placeholder:text-white/20 shadow-inner"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[10px] uppercase font-bold text-white/40 tracking-wider pl-1">Password</label>
              <div className="relative flex items-center">
                <Lock className="w-4 h-4 text-white/40 absolute left-3.5" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-11 bg-black/40 border border-white/5 focus:border-purple-500/50 hover:border-white/10 rounded-xl pl-10 pr-4 text-sm text-white focus:outline-none transition-all duration-300 placeholder:text-white/20 shadow-inner"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-semibold text-sm transition-all duration-300 shadow-md shadow-purple-900/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-[0.98] mt-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isSetup ? (
                "Initialize System"
              ) : (
                "Access Cockpit"
              )}
            </button>
          </form>

          {/* Separation Divider */}
          <div className="flex items-center text-center my-1">
            <div className="flex-1 border-t border-white/[0.06]"></div>
            <span className="text-[9px] uppercase font-bold text-white/20 px-3 tracking-widest">Or authenticate via</span>
            <div className="flex-1 border-t border-white/[0.06]"></div>
          </div>

          {/* Social Google & OAuth Providers */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            className="w-full h-11 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/10 text-white font-medium text-sm transition-all duration-300 flex items-center justify-center gap-2.5 cursor-pointer active:scale-[0.98]"
          >
            <svg className="w-4.5 h-4.5" viewBox="0 0 24 24">
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
            <span>Google Account</span>
          </button>

          {!isSetup && !hasOwner && (
            <button
              onClick={() => setIsSetup(true)}
              className="text-xs text-purple-400 hover:text-purple-300 hover:underline text-center cursor-pointer transition-colors"
            >
              First time? Setup master owner account
            </button>
          )}

          {isSetup && (
            <button
              onClick={() => setIsSetup(false)}
              className="text-xs text-purple-400 hover:text-purple-300 hover:underline text-center cursor-pointer transition-colors"
            >
              Back to system login
            </button>
          )}
        </div>

        {/* Local Agent Status Indicator (Premium Visual Aid) */}
        {agentConnected !== null && (
          <div className={`mt-5 p-3 rounded-2xl border flex items-center justify-between transition-all duration-500 animate-slide-up ${
            agentConnected 
              ? "bg-[#22C55E]/5 border-[#22C55E]/10 text-[#22C55E]/80" 
              : "bg-white/[0.02] border-white/[0.04] text-white/40"
          }`}>
            <div className="flex items-center gap-2">
              {agentConnected ? (
                <>
                  <div className="w-2 h-2 rounded-full bg-[#22C55E] animate-ping" />
                  <Cpu className="w-4 h-4" />
                  <span className="text-[11px] font-semibold tracking-wide uppercase">Local agent connected</span>
                </>
              ) : (
                <>
                  <div className="w-2 h-2 rounded-full bg-white/20" />
                  <Cpu className="w-4 h-4" />
                  <span className="text-[11px] font-semibold tracking-wide uppercase">Local agent offline</span>
                </>
              )}
            </div>
            
            {agentConnected && (
              <span className="text-[10px] bg-[#22C55E]/10 text-[#22C55E] px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                Live: 3131
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
