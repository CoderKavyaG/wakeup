"use client";

import React, { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Loader2, Lock, Mail, User } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [hasOwner, setHasOwner] = useState<boolean | null>(null);
  const [isSetup, setIsSetup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  if (hasOwner === null) {
    return (
      <div className="min-h-screen bg-[#0f0f11] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f11] text-[#E8E9EB] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#161619] border border-white/5 rounded-2xl p-8 shadow-2xl flex flex-col gap-6">
        <div className="text-center flex flex-col gap-2">
          <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-primary text-xl mx-auto shadow-sm">
            D
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white mt-2">
            {isSetup ? "Configure DevOS" : "Sign in to DevOS"}
          </h1>
          <p className="text-xs text-muted-foreground">
            {isSetup 
              ? "Create the master developer identity to initialize DevOS." 
              : "Enter your credentials to access your developer cockpit."}
          </p>
        </div>

        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-lg font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {isSetup && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Full Name</label>
              <div className="relative flex items-center">
                <User className="w-4 h-4 text-muted-foreground/60 absolute left-3" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Kavya"
                  className="w-full h-10 bg-[#0f0f11] border border-white/10 rounded-lg pl-9 pr-3 text-sm text-foreground focus:outline-none focus:border-primary/50 transition-colors placeholder:text-muted-foreground/40"
                />
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Email Address</label>
            <div className="relative flex items-center">
              <Mail className="w-4 h-4 text-muted-foreground/60 absolute left-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="developer@devos.local"
                className="w-full h-10 bg-[#0f0f11] border border-white/10 rounded-lg pl-9 pr-3 text-sm text-foreground focus:outline-none focus:border-primary/50 transition-colors placeholder:text-muted-foreground/40"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Password</label>
            <div className="relative flex items-center">
              <Lock className="w-4 h-4 text-muted-foreground/60 absolute left-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-10 bg-[#0f0f11] border border-white/10 rounded-lg pl-9 pr-3 text-sm text-foreground focus:outline-none focus:border-primary/50 transition-colors placeholder:text-muted-foreground/40"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-10 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/95 transition-all shadow-md shadow-primary/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isSetup ? (
              "Initialize Cockpit"
            ) : (
              "Access Cockpit"
            )}
          </button>
        </form>

        {!isSetup && !hasOwner && (
          <button
            onClick={() => setIsSetup(true)}
            className="text-xs text-primary hover:underline text-center cursor-pointer"
          >
            First time? Setup master owner account
          </button>
        )}
      </div>
    </div>
  );
}
