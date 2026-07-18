"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Key, Brain, ArrowRight, Lock, ShieldAlert, Cpu, Loader2 } from "lucide-react";
import { useBootstrapStore } from "@/store/useBootstrapStore";
import { signOut } from "next-auth/react";

export function OnboardingKeysModal() {
  const [groqKey, setGroqKey] = useState("");
  const [openrouterKey, setOpenrouterKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const bootstrap = useBootstrapStore((s) => s.bootstrap);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groqKey.trim() && !openrouterKey.trim()) {
      setError("Please configure at least one API key (Groq or OpenRouter) to activate the core.");
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          groqApiKey: groqKey.trim() || undefined,
          openrouterApiKey: openrouterKey.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save API keys");
      }

      setSuccess(true);
      // Brief pause to display the success state, then boot the system
      setTimeout(async () => {
        await bootstrap(true);
      }, 1200);
    } catch (err: any) {
      setError(err.message || "Activation failed. Please check your network and try again.");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f0f11] overflow-hidden select-none">
      {/* Background glowing decorations */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(245,158,11,0.08),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(245,158,11,0.04),transparent_40%)]" />

      {/* Grid Pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_at_center,black_60%,transparent_100%)] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
        className="w-full max-w-lg mx-4 z-10"
      >
        <div className="relative backdrop-blur-xl bg-white/[0.02] border border-white/10 rounded-2xl p-8 shadow-2xl shadow-amber-500/5 overflow-hidden">
          {/* Subtle neon accent border top */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />

          {success ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-12 text-center"
            >
              <motion.div
                initial={{ rotate: -90, scale: 0.5 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ type: "spring", duration: 0.8 }}
                className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-6 shadow-lg shadow-amber-500/10"
              >
                <Cpu className="w-8 h-8 animate-pulse" />
              </motion.div>
              <h2 className="text-xl font-bold tracking-tight text-white mb-2">
                COGNITIVE CORE ACTIVATED
              </h2>
              <p className="text-sm text-white/50 max-w-xs leading-relaxed">
                Vault secure. Decryption layers enabled. Redirecting to workspace...
              </p>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Header */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-amber-400 text-xs font-bold tracking-widest uppercase font-mono mb-1">
                  <Brain className="w-4 h-4 text-amber-400 animate-pulse" />
                  <span>Cognitive Core Setup</span>
                </div>
                <h2 className="text-2xl font-semibold tracking-tight text-white">
                  Initialize Wakeup AI Settings
                </h2>
                <p className="text-sm text-white/60 leading-relaxed">
                  Provide your own API credentials below. Plaintext keys are encrypted using AES-256-GCM and stored in Neon PostgreSQL. They are never sent back in client API calls.
                </p>
              </div>

              {/* Error Box */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-2.5 p-3.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-xs"
                >
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="leading-normal">{error}</span>
                </motion.div>
              )}

              {/* Input Fields */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <label className="font-semibold text-white/80 flex items-center gap-1.5 font-mono uppercase tracking-wider">
                      <Key className="w-3.5 h-3.5 text-white/40" />
                      Groq API Key
                    </label>
                    <a
                      href="https://console.groq.com/keys"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-amber-400 hover:text-amber-300 transition-colors text-[10px] uppercase font-bold tracking-wider hover:underline"
                    >
                      Get Key
                    </a>
                  </div>
                  <div className="relative">
                    <input
                      type="password"
                      value={groqKey}
                      onChange={(e) => setGroqKey(e.target.value)}
                      placeholder="gsk_..."
                      className="w-full bg-[#121214] border border-white/5 rounded-lg py-2.5 px-3.5 text-sm font-mono text-white placeholder-white/20 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-all"
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <label className="font-semibold text-white/80 flex items-center gap-1.5 font-mono uppercase tracking-wider">
                      <Key className="w-3.5 h-3.5 text-white/40" />
                      OpenRouter API Key
                    </label>
                    <a
                      href="https://openrouter.ai/keys"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-amber-400 hover:text-amber-300 transition-colors text-[10px] uppercase font-bold tracking-wider hover:underline"
                    >
                      Get Key
                    </a>
                  </div>
                  <div className="relative">
                    <input
                      type="password"
                      value={openrouterKey}
                      onChange={(e) => setOpenrouterKey(e.target.value)}
                      placeholder="sk-or-v1-..."
                      className="w-full bg-[#121214] border border-white/5 rounded-lg py-2.5 px-3.5 text-sm font-mono text-white placeholder-white/20 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-all"
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>

              {/* Info Disclaimer */}
              <div className="flex items-start gap-2 text-[10px] text-white/40 leading-relaxed font-mono mt-1">
                <Lock className="w-3.5 h-3.5 shrink-0 mt-0.5 text-white/30" />
                <span>
                  CRYPTO LAYER: AES-256-GCM symmetric database-level sealing. Wakeup respects your privacy.
                </span>
              </div>

              {/* Buttons */}
              <div className="pt-2 flex flex-col gap-2.5">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-10 bg-amber-600 hover:bg-amber-500 disabled:bg-amber-600/40 text-white rounded-lg flex items-center justify-center font-semibold text-sm tracking-wide transition-all shadow-lg hover:shadow-amber-500/20 active:scale-[0.99] cursor-pointer"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-white/70" />
                  ) : (
                    <span className="flex items-center gap-1.5 font-bold tracking-wider uppercase text-xs">
                      Unlock & Activate Core
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  )}
                </button>

                {error?.toLowerCase().includes("stale") && (
                  <button
                    type="button"
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    className="w-full h-10 bg-white/5 hover:bg-white/10 text-white/90 border border-white/10 rounded-lg flex items-center justify-center font-semibold text-xs tracking-wider uppercase transition-all active:scale-[0.99] cursor-pointer"
                  >
                    Sign Out & Re-Authenticate
                  </button>
                )}
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
