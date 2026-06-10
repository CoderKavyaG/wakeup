"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Zap,
  Copy,
  Check,
  Loader2,
  Save,
  Trash2,
  RefreshCw,
  GitCommit,
} from "lucide-react";

const Twitter = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const Linkedin = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
);

type Platform = "twitter" | "linkedin";

const CHAR_LIMITS = { twitter: 240, linkedin: 3000 };
const PLATFORM_LABELS = { twitter: "X / Twitter", linkedin: "LinkedIn" };
const PLATFORM_COLORS = {
  twitter: "text-sky-400",
  linkedin: "text-blue-500",
};

interface SavedDraft {
  id: string;
  platform: string;
  content: string;
  createdAt: string;
}

// Shimmer
function Shimmer({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-white/[0.04] rounded-md ${className}`} />;
}

export function SocialWidget() {
  const [platform, setPlatform] = useState<Platform>("twitter");
  const [draft, setDraft] = useState("");
  const [commitSummary, setCommitSummary] = useState("");
  const [loadingCommits, setLoadingCommits] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [savedDrafts, setSavedDrafts] = useState<SavedDraft[]>([]);
  const [loadingDrafts, setLoadingDrafts] = useState(false);
  const [activeSection, setActiveSection] = useState<"compose" | "drafts">("compose");
  const abortRef = useRef<AbortController | null>(null);

  const charLimit = CHAR_LIMITS[platform];
  const charCount = draft.length;
  const charLeft = charLimit - charCount;
  const charPercent = Math.min((charCount / charLimit) * 100, 100);
  const overLimit = charLeft < 0;

  const fetchDrafts = async () => {
    setLoadingDrafts(true);
    try {
      const res = await fetch("/api/social/drafts");
      if (res.ok) setSavedDrafts(await res.json());
    } catch (e) {}
    finally { setLoadingDrafts(false); }
  };

  useEffect(() => {
    fetchDrafts();
  }, []);

  const fetchCommitSummary = async () => {
    setLoadingCommits(true);
    try {
      const res = await fetch("/api/social/commit-summary");
      if (res.ok) {
        const data = await res.json();
        setCommitSummary(data.summary || "");
      }
    } catch (e) {}
    finally { setLoadingCommits(false); }
  };

  const generatePost = async () => {
    setGenerating(true);
    setDraft("");
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    try {
      const res = await fetch("/api/social/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abortRef.current.signal,
        body: JSON.stringify({ platform, commitSummary }),
      });
      if (!res.ok) throw new Error("Generation failed");

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No stream");
      const decoder = new TextDecoder();
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setDraft(acc);
      }
    } catch (e: any) {
      if (e.name !== "AbortError") {
        setDraft("Failed to generate. Try again.");
      }
    } finally {
      setGenerating(false);
    }
  };

  const saveDraft = async () => {
    if (!draft.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/social/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, content: draft }),
      });
      if (res.ok) {
        await fetchDrafts();
        setActiveSection("drafts");
      }
    } catch (e) {}
    finally { setSaving(false); }
  };

  const deleteDraft = async (id: string) => {
    setSavedDrafts((prev) => prev.filter((d) => d.id !== id));
    await fetch(`/api/social/drafts?id=${id}`, { method: "DELETE" });
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(draft);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="h-full flex flex-col overflow-hidden text-foreground bg-[#0f0f11]">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400" />
          <h2 className="text-sm font-semibold tracking-tight">Social Drafts</h2>
        </div>

        {/* Section tabs */}
        <div className="flex items-center bg-black/40 p-0.5 rounded-full border border-white/5">
          {(["compose", "drafts"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setActiveSection(s)}
              className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase transition-all ${
                activeSection === s
                  ? "bg-white text-black shadow-sm"
                  : "text-white/40 hover:text-white"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {activeSection === "compose" && (
        <div className="flex-1 flex flex-col min-h-0 px-4 pb-4 gap-3">
          {/* Platform toggle */}
          <div className="flex gap-2">
            {(["twitter", "linkedin"] as Platform[]).map((p) => (
              <button
                key={p}
                onClick={() => setPlatform(p)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-all ${
                  platform === p
                    ? "bg-white text-black border-white"
                    : "bg-white/[0.04] border-white/[0.08] text-white/50 hover:text-white/80 hover:bg-white/[0.06]"
                }`}
              >
                {p === "twitter" ? (
                  <Twitter className="w-3 h-3" />
                ) : (
                  <Linkedin className="w-3 h-3" />
                )}
                {PLATFORM_LABELS[p]}
              </button>
            ))}
          </div>

          {/* Commit summary context */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-white/25 font-medium uppercase tracking-wider">
                From your commits
              </span>
              <button
                onClick={fetchCommitSummary}
                disabled={loadingCommits}
                className="flex items-center gap-1 text-[10px] text-purple-400/70 hover:text-purple-300 transition-colors font-medium disabled:opacity-40"
              >
                {loadingCommits ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <GitCommit className="w-3 h-3" />
                )}
                {commitSummary ? "Refresh" : "Load commits"}
              </button>
            </div>
            {commitSummary && (
              <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.06] text-[11px] text-white/40 font-mono leading-relaxed max-h-20 overflow-y-auto">
                {commitSummary}
              </div>
            )}
          </div>

          {/* Draft textarea */}
          <div className="flex-1 flex flex-col min-h-0 relative">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={
                platform === "twitter"
                  ? "What did you ship this week? (under 240 chars)"
                  : "Write a dev update for LinkedIn…"
              }
              className={`flex-1 w-full bg-white/[0.03] border rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none resize-none transition-all duration-150 leading-relaxed min-h-[120px] ${
                overLimit
                  ? "border-red-500/50 focus:border-red-500/70"
                  : "border-white/[0.08] focus:border-purple-500/50 focus:bg-white/[0.05]"
              }`}
            />

            {/* Character count ring */}
            <div className="absolute bottom-2.5 right-2.5 flex items-center gap-2">
              <span
                className={`text-[10px] font-mono ${
                  overLimit
                    ? "text-red-400"
                    : charLeft <= 20
                    ? "text-amber-400"
                    : "text-white/20"
                }`}
              >
                {charLeft}
              </span>
              <svg width="20" height="20" viewBox="0 0 20 20">
                <circle cx="10" cy="10" r="8" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2" />
                <circle
                  cx="10" cy="10" r="8"
                  fill="none"
                  stroke={overLimit ? "#f87171" : charLeft <= 20 ? "#fbbf24" : "#a855f7"}
                  strokeWidth="2"
                  strokeDasharray={`${2 * Math.PI * 8}`}
                  strokeDashoffset={`${2 * Math.PI * 8 * (1 - charPercent / 100)}`}
                  strokeLinecap="round"
                  style={{ transform: "rotate(-90deg)", transformOrigin: "center" }}
                />
              </svg>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between gap-2 shrink-0">
            <button
              onClick={generatePost}
              disabled={generating || !commitSummary}
              className="flex items-center gap-1.5 bg-white text-black text-xs font-medium px-3 py-1.5 rounded-md hover:bg-white/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {generating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Zap className="w-3.5 h-3.5" />
              )}
              {generating ? "Writing…" : `Generate ${PLATFORM_LABELS[platform]} post`}
            </button>

            <div className="flex items-center gap-1.5">
              {draft.trim() && (
                <>
                  <button
                    onClick={saveDraft}
                    disabled={saving}
                    className="flex items-center gap-1 bg-white/[0.06] border border-white/[0.08] text-white/70 text-xs px-2.5 py-1.5 rounded-md hover:bg-white/10 transition-colors disabled:opacity-40"
                  >
                    {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                    Save
                  </button>
                  <button
                    onClick={copyToClipboard}
                    className="flex items-center gap-1 bg-white/[0.06] border border-white/[0.08] text-white/70 text-xs px-2.5 py-1.5 rounded-md hover:bg-white/10 transition-colors"
                  >
                    {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {activeSection === "drafts" && (
        <div className="flex-1 flex flex-col min-h-0 px-4 pb-4">
          {loadingDrafts ? (
            <div className="space-y-2 mt-1">
              {[...Array(3)].map((_, i) => <Shimmer key={i} className="h-16" />)}
            </div>
          ) : savedDrafts.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white/[0.04] flex items-center justify-center">
                <Save className="w-4 h-4 text-white/20" />
              </div>
              <div className="text-xs text-white/30 text-center">No saved drafts yet</div>
              <button
                onClick={() => setActiveSection("compose")}
                className="bg-white/[0.06] border border-white/[0.08] text-white/70 text-xs px-3 py-1.5 rounded-md hover:bg-white/10 transition-colors"
              >
                Write something →
              </button>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-2 mt-1" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.06) transparent" }}>
              {savedDrafts.map((d) => (
                <div
                  key={d.id}
                  className="group p-3 rounded-lg bg-white/[0.02] border border-white/[0.06] hover:border-white/10 transition-colors cursor-pointer"
                  onClick={() => {
                    setDraft(d.content);
                    setPlatform(d.platform as Platform);
                    setActiveSection("compose");
                  }}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-[9px] font-bold uppercase ${d.platform === "twitter" ? "text-sky-400/70" : "text-blue-400/70"}`}>
                      {PLATFORM_LABELS[d.platform as Platform]}
                    </span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(d.content);
                        }}
                        className="text-white/30 hover:text-white/70 p-0.5 rounded transition-colors"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteDraft(d.id); }}
                        className="text-white/30 hover:text-red-400 p-0.5 rounded transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-white/60 line-clamp-3 leading-relaxed">
                    {d.content}
                  </p>
                  <p className="text-[9px] text-white/20 font-mono mt-1.5">
                    {new Date(d.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
