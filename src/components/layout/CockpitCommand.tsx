"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useProjectStore } from "@/store/useProjectStore";
import { useTaskStore } from "@/store/useTaskStore";
import { useNoteStore } from "@/store/useNoteStore";
import { useUrlStore } from "@/store/useUrlStore";
import { useLayoutStore } from "@/store/useLayoutStore";
import {
  Terminal,
  Search,
  Sparkles,
  CheckSquare,
  FileText,
  FolderOpen,
  Link as LinkIcon,
  Plus,
  ThumbsUp,
  ThumbsDown,
  ArrowRight,
  Loader2,
  X,
  CornerDownLeft,
  GitBranch,
  Crosshair,
  Clock,
} from "lucide-react";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
type Mode = "command" | "search" | "add";

const ADD_WIDGET_OPTIONS = [
  { type: "projects", name: "Projects", desc: "All your repos and local workspaces", icon: <FolderOpen className="w-4 h-4 text-primary" /> },
  { type: "github", name: "GitHub Monitor", desc: "Commits, streaks, and repo health", icon: <GitBranch className="w-4 h-4 text-primary" /> },
  { type: "focus", name: "Focus Panel", desc: "Tasks and brain dump", icon: <Crosshair className="w-4 h-4 text-primary" /> },
  { type: "machine", name: "Machine Control", desc: "Ports, launcher, workspace files", icon: <Terminal className="w-4 h-4 text-primary" /> },
  { type: "clock", name: "Clock & Time", desc: "IST + US time zones", icon: <Clock className="w-4 h-4 text-primary" /> },
];


interface SearchResult {
  id: string;
  type: "project" | "task" | "note" | "url";
  title: string;
  subtitle?: string;
  action?: () => void;
}

interface Suggestion {
  id: string;
  label: string;
  query: string;
  icon: React.ReactNode;
}

// ─────────────────────────────────────────────
// Smart Suggestions — built from real store data
// ─────────────────────────────────────────────
function buildSuggestions(
  projects: ReturnType<typeof useProjectStore.getState>["projects"],
  tasks: ReturnType<typeof useTaskStore.getState>["tasks"]
): Suggestion[] {
  const suggestions: Suggestion[] = [
    {
      id: "s1",
      label: "What should I work on today?",
      query: "What should I work on today?",
      icon: <Sparkles className="w-3.5 h-3.5 text-primary" />,
    },
    {
      id: "s2",
      label: "Which of my projects is most stale?",
      query: "Which of my projects is most stale?",
      icon: <FolderOpen className="w-3.5 h-3.5 text-orange-400" />,
    },
  ];

  // Dynamic: top active project
  const activeProject = projects.find((p) => p.status === "active");
  if (activeProject) {
    suggestions.push({
      id: "s3",
      label: `Summarize progress on ${activeProject.name}`,
      query: `Summarize my current progress on ${activeProject.name}`,
      icon: <FolderOpen className="w-3.5 h-3.5 text-green-400" />,
    });
  }

  // Dynamic: top overdue/high priority task
  const urgentTask = tasks.find((t) => !t.completed && t.priority === "high");
  if (urgentTask) {
    suggestions.push({
      id: "s4",
      label: `Help me break down: "${urgentTask.title.substring(0, 35)}${urgentTask.title.length > 35 ? "…" : ""}"`,
      query: `Help me break down this task into steps: ${urgentTask.title}`,
      icon: <CheckSquare className="w-3.5 h-3.5 text-yellow-400" />,
    });
  }

  suggestions.push({
    id: "s5",
    label: "Give me a weekly summary of what I've done",
    query: "Give me a weekly summary of what I have done",
    icon: <Sparkles className="w-3.5 h-3.5 text-purple-400" />,
  });

  return suggestions.slice(0, 5);
}

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────
export function CockpitCommand() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<Mode>("command");

  // AI state
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedAnswer, setStreamedAnswer] = useState("");
  const [answerDone, setAnswerDone] = useState(false);
  const [lastQuery, setLastQuery] = useState("");

  // Search state
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Inline action confirmations
  const [confirmation, setConfirmation] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const { projects } = useProjectStore();
  const { tasks, addTask } = useTaskStore();
  const { notes, addNote } = useNoteStore();
  const { urls } = useUrlStore();
  const { resetLayout, addWidget } = useLayoutStore();

  const suggestions = buildSuggestions(projects, tasks);

  // ── Open/close keyboard shortcut ──────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
        if (!isOpen) resetState();
      }
      if (e.key === "Escape") {
        closeOverlay();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // ── Autofocus ─────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // ── Mode detection ────────────────────────────
  useEffect(() => {
    const val = input.trim();
    if (!val) {
      setMode("command");
      setSearchResults([]);
      return;
    }

    if (val.toLowerCase() === "add") {
      setMode("add");
      setSearchResults([]);
      setSelectedIndex(0);
      return;
    }

    const isTaskCmd = val.toLowerCase().startsWith("task:");
    const isNoteCmd = val.toLowerCase().startsWith("note:");
    if (isTaskCmd || isNoteCmd) {
      setMode("command");
      setSearchResults([]);
      return;
    }

    // Switch to search after 3 chars if not a question
    if (val.length >= 3 && !isQuestion(val)) {
      setMode("search");
      runLocalSearch(val);
    } else {
      setMode("command");
      setSearchResults([]);
    }
  }, [input]);

  function isQuestion(val: string) {
    return (
      val.endsWith("?") ||
      /^(what|which|how|when|why|who|give|show|tell|list|summarize|help|explain)/i.test(val)
    );
  }

  // ── Local search across all stores ───────────
  const runLocalSearch = useCallback(
    (q: string) => {
      const lower = q.toLowerCase();
      const results: SearchResult[] = [];

      projects.forEach((p) => {
        if (p.name.toLowerCase().includes(lower) || p.description?.toLowerCase().includes(lower)) {
          results.push({
            id: `proj-${p.id}`,
            type: "project",
            title: p.name,
            subtitle: `${p.status}${p.tags.length ? " · " + p.tags.slice(0, 2).join(", ") : ""}`,
            action: () => p.githubUrl && window.open(p.githubUrl, "_blank"),
          });
        }
      });

      tasks.forEach((t) => {
        if (t.title.toLowerCase().includes(lower)) {
          results.push({
            id: `task-${t.id}`,
            type: "task",
            title: t.title,
            subtitle: t.completed ? "Completed" : `Priority: ${t.priority}`,
          });
        }
      });

      notes.forEach((n) => {
        if (n.content.toLowerCase().includes(lower)) {
          results.push({
            id: `note-${n.id}`,
            type: "note",
            title: n.content.substring(0, 60) + (n.content.length > 60 ? "…" : ""),
            subtitle: "Click to copy",
            action: () => navigator.clipboard.writeText(n.content),
          });
        }
      });

      urls.forEach((u) => {
        if (u.label.toLowerCase().includes(lower) || u.url.toLowerCase().includes(lower)) {
          results.push({
            id: `url-${u.id}`,
            type: "url",
            title: u.label,
            subtitle: u.url,
            action: () => window.open(u.url, "_blank"),
          });
        }
      });

      setSearchResults(results.slice(0, 10));
      setSelectedIndex(0);
    },
    [projects, tasks, notes, urls]
  );

  // ── AI streaming call ─────────────────────────
  const askCockpit = async (query: string) => {
    if (!query.trim()) return;
    setLastQuery(query);
    setStreamedAnswer("");
    setAnswerDone(false);
    setIsStreaming(true);
    setMode("command");

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    try {
      const res = await fetch("/api/cockpit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abortRef.current.signal,
        body: JSON.stringify({
          query,
          context: {
            projects: projects.map((p) => ({
              name: p.name,
              status: p.status,
              tags: p.tags,
              nextAction: p.nextAction,
            })),
            tasks: tasks.map((t) => ({
              title: t.title,
              priority: t.priority,
              completed: t.completed,
            })),
            notes: notes.slice(0, 5).map((n) => ({ content: n.content })),
          },
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Request failed" }));
        setStreamedAnswer(err.error || "Something went wrong.");
        setAnswerDone(true);
        setIsStreaming(false);
        return;
      }

      // Check if it's a fallback JSON response (no API key)
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const data = await res.json();
        setStreamedAnswer(data.result || data.error || "No response.");
        setAnswerDone(true);
        setIsStreaming(false);
        return;
      }

      // Stream text
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No stream body");
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        accumulated += chunk;
        setStreamedAnswer(accumulated);
      }

      setAnswerDone(true);
    } catch (err: any) {
      if (err.name === "AbortError") return;
      setStreamedAnswer("Failed to reach Cockpit AI. Check your connection.");
      setAnswerDone(true);
    } finally {
      setIsStreaming(false);
    }
  };

  // ── Handle inline commands ────────────────────
  const handleInlineCommand = (val: string): boolean => {
    const lower = val.toLowerCase();

    if (lower.startsWith("task:")) {
      const title = val.slice(5).trim();
      if (title) {
        addTask({ title, priority: "medium" });
        setConfirmation(`✓ Task created: "${title}"`);
        setInput("");
        setTimeout(() => setConfirmation(null), 3000);
        return true;
      }
    }

    if (lower.startsWith("note:")) {
      const content = val.slice(5).trim();
      if (content) {
        addNote(content);
        setConfirmation(`✓ Note saved: "${content.substring(0, 40)}${content.length > 40 ? "…" : ""}"`);
        setInput("");
        setTimeout(() => setConfirmation(null), 3000);
        return true;
      }
    }

    if (lower === "reset layout" || lower === "reset layout to default") {
      resetLayout();
      setConfirmation(`✓ Layout reset to default`);
      setInput("");
      setTimeout(() => setConfirmation(null), 3000);
      return true;
    }

    if (lower.startsWith("add ")) {
      const type = lower.replace("add ", "").trim();
      if (["projects", "github", "focus", "machine"].includes(type)) {
        addWidget(type as any);
        setConfirmation(`✓ Added ${type} widget`);
        setInput("");
        setTimeout(() => setConfirmation(null), 3000);
        return true;
      }
    }

    if (lower === "open quicklinks" || lower === "toggle quicklinks" || lower === "quicklinks") {
      useUrlStore.getState().toggleQuickLinks();
      setConfirmation(`✓ Toggled Quick Links`);
      setInput("");
      setTimeout(() => setConfirmation(null), 3000);
      return true;
    }

    return false;
  };

  // ── Submit handler ────────────────────────────
  const handleSubmit = (query?: string) => {
    const val = (query ?? input).trim();
    if (!val) return;

    if (handleInlineCommand(val)) return;

    // In search mode with a selected result
    if (mode === "search" && searchResults[selectedIndex]) {
      searchResults[selectedIndex].action?.();
      closeOverlay();
      return;
    }

    // In add mode with a selected widget
    if (mode === "add" && ADD_WIDGET_OPTIONS[selectedIndex]) {
      addWidget(ADD_WIDGET_OPTIONS[selectedIndex].type as any);
      closeOverlay();
      return;
    }

    // Ask AI
    setInput("");
    askCockpit(val);
  };

  // ── Create task from AI answer ────────────────
  const createTaskFromAnswer = () => {
    if (!streamedAnswer) return;
    const firstLine = streamedAnswer.split("\n")[0].replace(/^[-•*]\s*/, "").substring(0, 100);
    addTask({ title: firstLine, priority: "medium" });
    setConfirmation(`✓ Task created from answer`);
    setTimeout(() => setConfirmation(null), 3000);
  };

  // ── Keyboard navigation ───────────────────────
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (mode === "search")
        setSelectedIndex((i) => Math.min(i + 1, searchResults.length - 1));
      if (mode === "add")
        setSelectedIndex((i) => Math.min(i + 2, ADD_WIDGET_OPTIONS.length - 1));
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (mode === "search") setSelectedIndex((i) => Math.max(i - 1, 0));
      if (mode === "add") setSelectedIndex((i) => Math.max(i - 2, 0));
    }
    if (e.key === "ArrowRight") {
      if (mode === "add") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, ADD_WIDGET_OPTIONS.length - 1));
      }
    }
    if (e.key === "ArrowLeft") {
      if (mode === "add") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      }
    }
  };

  const resetState = () => {
    setInput("");
    setMode("command");
    setStreamedAnswer("");
    setAnswerDone(false);
    setIsStreaming(false);
    setSearchResults([]);
    setConfirmation(null);
    setLastQuery("");
  };

  const closeOverlay = () => {
    abortRef.current?.abort();
    setIsOpen(false);
    resetState();
  };

  // ── Icon helpers ──────────────────────────────
  const typeIcon = (type: SearchResult["type"]) => {
    switch (type) {
      case "project": return <FolderOpen className="w-3.5 h-3.5 text-green-400" />;
      case "task": return <CheckSquare className="w-3.5 h-3.5 text-yellow-400" />;
      case "note": return <FileText className="w-3.5 h-3.5 text-purple-400" />;
      case "url": return <LinkIcon className="w-3.5 h-3.5 text-blue-400" />;
    }
  };

  // ── Detect command prefix for inline hint ─────
  const inputVal = input.trim();
  const isTaskPrefix = inputVal.toLowerCase().startsWith("task:");
  const isNotePrefix = inputVal.toLowerCase().startsWith("note:");

  return (
    <>


      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="cockpit-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md flex items-start justify-center pt-[12vh]"
            onClick={(e) => {
              if (e.target === e.currentTarget) closeOverlay();
            }}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: -8 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: -8 }}
              transition={{ duration: 0.14, ease: "easeOut" }}
              className="w-full max-w-2xl bg-[#0f0f11] border border-border/60 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[72vh]"
            >
              {/* ── Input bar ── */}
              <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border/40 bg-[#0f0f11] shrink-0">
                <div className="text-muted-foreground shrink-0">
                  {isStreaming ? (
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  ) : mode === "search" ? (
                    <Search className="w-4 h-4" />
                  ) : (
                    <Terminal className="w-4 h-4" />
                  )}
                </div>
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask anything or run a command…"
                  className="flex-1 bg-transparent border-0 outline-none text-sm text-foreground placeholder:text-muted-foreground/50 font-mono"
                  disabled={isStreaming}
                  autoComplete="off"
                  spellCheck={false}
                />
                {input && (
                  <button
                    onClick={() => setInput("")}
                    className="text-muted-foreground/50 hover:text-muted-foreground transition-colors shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                <kbd className="text-[9px] text-muted-foreground/40 border border-border/40 px-1.5 py-0.5 rounded font-mono shrink-0">
                  ESC
                </kbd>
              </div>

              {/* ── Inline command hints ── */}
              {(isTaskPrefix || isNotePrefix) && (
                <div className="px-4 py-2 border-b border-border/30 bg-primary/5 shrink-0">
                  <p className="text-[11px] text-primary font-mono">
                    {isTaskPrefix
                      ? `Press ↵ to create task: "${inputVal.slice(5).trim() || "…"}"`
                      : `Press ↵ to save note: "${inputVal.slice(5).trim() || "…"}"`}
                  </p>
                </div>
              )}

              {/* ── Confirmation toast ── */}
              <AnimatePresence>
                {confirmation && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="px-4 py-2 bg-green-500/10 border-b border-green-500/20 shrink-0"
                  >
                    <p className="text-[11px] text-green-400 font-mono">{confirmation}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── Scrollable body ── */}
              <div className="flex-1 overflow-y-auto">

                {/* MODE: AI ANSWER */}
                {(isStreaming || streamedAnswer) && (
                  <div className="p-5 space-y-4">
                    {lastQuery && (
                      <p className="text-[10px] text-muted-foreground/50 font-mono uppercase tracking-wider">
                        → {lastQuery}
                      </p>
                    )}
                    <div className="text-sm text-foreground leading-relaxed font-sans whitespace-pre-wrap">
                      {streamedAnswer}
                      {isStreaming && (
                        <span className="inline-block w-1.5 h-3.5 bg-primary ml-0.5 animate-pulse align-middle" />
                      )}
                    </div>

                    {/* Post-answer actions */}
                    {answerDone && !isStreaming && (
                      <div className="flex items-center gap-2 pt-2 border-t border-border/30">
                        <span className="text-[10px] text-muted-foreground/50 font-mono">Helpful?</span>
                        <button className="p-1 rounded hover:bg-green-500/10 text-muted-foreground hover:text-green-400 transition-colors">
                          <ThumbsUp className="w-3.5 h-3.5" />
                        </button>
                        <button className="p-1 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors">
                          <ThumbsDown className="w-3.5 h-3.5" />
                        </button>
                        <div className="flex-1" />
                        <button
                          onClick={createTaskFromAnswer}
                          className="flex items-center gap-1.5 text-[10px] text-primary hover:text-primary/80 border border-primary/20 hover:border-primary/40 px-2 py-1 rounded-md font-mono transition-all bg-primary/5 hover:bg-primary/10"
                        >
                          <Plus className="w-3 h-3" />
                          Create task from this
                        </button>
                        <button
                          onClick={resetState}
                          className="text-[10px] text-muted-foreground/50 hover:text-muted-foreground font-mono transition-colors px-2 py-1"
                        >
                          Ask another
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* MODE: ADD WIDGET */}
                {!isStreaming && !streamedAnswer && mode === "add" && (
                  <div className="p-4 space-y-4">
                    <p className="text-[10px] font-bold uppercase text-muted-foreground/40 tracking-widest px-2 font-mono">
                      Select a widget to add
                    </p>
                    <div className="grid grid-cols-2 gap-2 px-2">
                      {ADD_WIDGET_OPTIONS.map((w, i) => (
                        <button
                          key={w.type}
                          onClick={() => {
                            addWidget(w.type as any);
                            closeOverlay();
                          }}
                          className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                            selectedIndex === i
                              ? "bg-primary/10 border-primary/30 ring-1 ring-primary/50"
                              : "bg-[#0f0f11]/50 border-white/5 hover:bg-white/5 hover:border-white/10"
                          }`}
                        >
                          <div className="mt-0.5 shrink-0">{w.icon}</div>
                          <div className="flex-1 min-w-0">
                            <h4 className={`text-sm font-bold truncate ${selectedIndex === i ? "text-primary" : "text-foreground"}`}>
                              {w.name}
                            </h4>
                            <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
                              {w.desc}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* MODE: COMMAND — local search */}
                {!isStreaming && !streamedAnswer && mode === "command" && (
                  <div className="p-3 space-y-1">
                    <p className="text-[9px] font-bold uppercase text-muted-foreground/40 tracking-widest px-2 pb-1 font-mono">
                      Suggestions
                    </p>
                    {suggestions.map((s, i) => (
                      <button
                        key={s.id}
                        onClick={() => handleSubmit(s.query)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left hover:bg-white/5 transition-colors group"
                      >
                        <span className="shrink-0">{s.icon}</span>
                        <span className="text-sm text-foreground/80 group-hover:text-foreground transition-colors flex-1 font-sans">
                          {s.label}
                        </span>
                        <ArrowRight className="w-3 h-3 text-muted-foreground/20 group-hover:text-muted-foreground/60 transition-colors shrink-0" />
                      </button>
                    ))}

                    {/* Command shortcuts legend */}
                    <div className="pt-3 px-2 border-t border-border/20 mt-2 grid grid-cols-1 gap-2">
                      {[
                        { prefix: "add <widget>", desc: "E.g., add projects, add focus" },
                        { prefix: "quicklinks", desc: "Toggle quick links panel" },
                        { prefix: "task:", desc: "Create a task instantly" },
                        { prefix: "note:", desc: "Save a quick note" },
                        { prefix: "reset layout", desc: "Reset workspace to defaults" },
                      ].map((c) => (
                        <div key={c.prefix} className="flex items-center gap-1.5 text-[10px] text-muted-foreground/40">
                          <code className="font-mono bg-white/5 px-1.5 py-0.5 rounded text-muted-foreground/60">
                            {c.prefix}
                          </code>
                          <span>{c.desc}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* MODE: SEARCH — results */}
                {mode === "search" && searchResults.length > 0 && (
                  <div className="p-2 space-y-0.5">
                    <p className="text-[9px] font-bold uppercase text-muted-foreground/40 tracking-widest px-3 py-1 font-mono">
                      Results ({searchResults.length})
                    </p>
                    {searchResults.map((r, i) => (
                      <button
                        key={r.id}
                        onClick={() => {
                          r.action?.();
                          closeOverlay();
                        }}
                        onMouseEnter={() => setSelectedIndex(i)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                          selectedIndex === i
                            ? "bg-primary/10 border border-primary/20"
                            : "border border-transparent hover:bg-white/5"
                        }`}
                      >
                        <span className="shrink-0">{typeIcon(r.type)}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground truncate font-sans">{r.title}</p>
                          {r.subtitle && (
                            <p className="text-[10px] text-muted-foreground/60 truncate font-mono mt-0.5">
                              {r.subtitle}
                            </p>
                          )}
                        </div>
                        {selectedIndex === i && (
                          <CornerDownLeft className="w-3 h-3 text-primary shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {/* Search — no results */}
                {mode === "search" && input.trim().length >= 3 && searchResults.length === 0 && (
                  <div className="p-8 text-center">
                    <p className="text-sm text-muted-foreground">
                      No matches for <span className="text-foreground font-mono">"{input}"</span>
                    </p>
                    <button
                      onClick={() => askCockpit(input)}
                      className="mt-3 text-[11px] text-primary hover:text-primary/80 font-mono flex items-center gap-1 mx-auto"
                    >
                      <Sparkles className="w-3 h-3" />
                      Ask AI instead
                    </button>
                  </div>
                )}
              </div>

              {/* ── Footer ── */}
              <div className="shrink-0 border-t border-border/30 px-4 py-2 flex items-center justify-between text-[9px] text-muted-foreground/30 font-mono bg-[#0f0f11]">
                <div className="flex items-center gap-3">
                  <span><kbd className="border border-border/30 px-1 rounded">↑↓</kbd> navigate</span>
                  <span><kbd className="border border-border/30 px-1 rounded">↵</kbd> run</span>
                  <span><kbd className="border border-border/30 px-1 rounded">esc</kbd> close</span>
                </div>
                <span className="text-[9px]">DevOS Cockpit</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
