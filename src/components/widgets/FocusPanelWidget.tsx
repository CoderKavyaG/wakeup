"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useTaskStore, Task } from "@/store/useTaskStore";
import { useNoteStore, Note } from "@/store/useNoteStore";
import { useProjectStore, Project } from "@/store/useProjectStore";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ListTodo,
  BrainCircuit,
  Trash2,
  ChevronDown,
  ChevronRight,
  Folder,
  Loader2,
} from "lucide-react";

// ── Heuristic: classify text type client-side (no API call) ──
function detectInputType(text: string): "task" | "note" | "unclear" {
  const taskWords = [
    "fix", "build", "add", "update", "deploy", "review", "finish",
    "create", "write", "test", "check", "implement", "refactor",
    "debug", "migrate", "setup", "configure", "push", "merge",
  ];
  const lower = text.toLowerCase().trim();
  if (!lower) return "unclear";
  if (taskWords.some((w) => lower.startsWith(w) || lower.includes(` ${w} `)))
    return "task";
  if (text.length > 60) return "note";
  return "unclear";
}

// ── Parse natural-language dates and return { date, stripped } ──
function parseDateFromText(text: string): { date: Date | null; stripped: string } {
  const lower = text.toLowerCase();
  const today = new Date();
  let date: Date | null = null;
  let pattern: RegExp | null = null;

  if (lower.includes("today")) {
    date = new Date(today);
    pattern = /\btoday\b/gi;
  } else if (lower.includes("tomorrow")) {
    date = new Date(today);
    date.setDate(date.getDate() + 1);
    pattern = /\btomorrow\b/gi;
  } else if (lower.includes("this week") || lower.includes("eow")) {
    date = new Date(today);
    date.setDate(date.getDate() + (7 - date.getDay()));
    pattern = /\b(this week|eow)\b/gi;
  } else if (lower.includes("next week")) {
    date = new Date(today);
    date.setDate(date.getDate() + (7 - date.getDay() + 1));
    pattern = /\bnext week\b/gi;
  } else {
    const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    for (let i = 0; i < days.length; i++) {
      if (lower.includes(days[i])) {
        date = new Date(today);
        const diff = ((i - date.getDay() + 7) % 7) || 7;
        date.setDate(date.getDate() + diff);
        pattern = new RegExp(`\\b${days[i]}\\b`, "gi");
        break;
      }
    }
  }

  const stripped = pattern
    ? text.replace(pattern, "").replace(/\s{2,}/g, " ").trim()
    : text;

  return { date, stripped };
}

function getLocalDateString(date = new Date()) {
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);
  return localDate.toISOString().split("T")[0];
}

// ── NoteCard sub-component: handles collapse, delete, project tag ──
function NoteCard({
  note,
  projects,
  onDelete,
}: {
  note: Note;
  projects: Project[];
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isLong = note.content.length > 150;
  const displayContent =
    !isLong || expanded ? note.content : note.content.slice(0, 150) + "…";

  const linkedProject = note.projectId
    ? projects.find((p) => p.id === note.projectId)
    : null;

  const handleProjectClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.dispatchEvent(
      new CustomEvent("focus_project", { detail: { projectId: note.projectId } })
    );
  };

  return (
    <div className="group relative p-3 border border-white/[0.07] bg-transparent hover:bg-white/[0.03] rounded-lg text-sm transition-all hover:border-white/15">
      {/* Top row: project tag + delete */}
      <div className="flex items-center justify-between gap-2 mb-1.5">
        {linkedProject ? (
          <button
            onClick={handleProjectClick}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/20 text-amber-300 text-[9px] font-bold hover:bg-amber-500/25 transition-colors"
          >
            <Folder className="w-2.5 h-2.5" />
            {linkedProject.name}
          </button>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="w-5 h-5 text-white/30 hover:text-red-400 hover:bg-red-500/10"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(note.id);
            }}
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <p className="text-xs leading-relaxed text-foreground/80 whitespace-pre-wrap">
        {displayContent}
      </p>

      {/* Show more / less */}
      {isLong && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-1.5 text-[10px] text-amber-400/70 hover:text-amber-300 font-semibold transition-colors"
        >
          {expanded ? "Show less ↑" : "Show more ↓"}
        </button>
      )}

      {/* Timestamp */}
      <div className="mt-2 flex items-center justify-between">
        <span className="text-[9px] text-white/20 font-mono">
          {new Date(note.createdAt).toLocaleString()}
        </span>
      </div>
    </div>
  );
}

// ── Main Widget ──
export function FocusPanelWidget() {
  const { tasks, addTask, toggleTask, deleteTask } = useTaskStore();
  const { notes, deleteNote, fetchNotes, addNote } = useNoteStore();
  const { projects } = useProjectStore();

  // Input state
  const [noteText, setNoteText] = useState("");
  const [overrideType, setOverrideType] = useState<"task" | "note" | null>(null);
  const [mentionQuery, setMentionQuery] = useState("");
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [taggedProjectId, setTaggedProjectId] = useState<string | null>(null);
  const [taggedProjectName, setTaggedProjectName] = useState<string | null>(null);
  const [activeDropdownIndex, setActiveDropdownIndex] = useState(0);
  const [isClassifying, setIsClassifying] = useState(false);

  // Dropdown position
  const [dropdownAbove, setDropdownAbove] = useState(false);
  const inputWrapperRef = useRef<HTMLDivElement>(null);
  const unifiedInputRef = useRef<HTMLTextAreaElement>(null);

  // Live input hint
  const autoType = detectInputType(noteText);
  const inputType = overrideType || (autoType === "task" ? "task" : "note");

  // Task-specific: only show date picker when input looks like a task and no project is tagged
  const showDatePicker = inputType === "task" && !taggedProjectId;
  const todayStr = getLocalDateString();
  const maxDate = new Date();
  maxDate.setDate(new Date().getDate() + 30);
  const maxDateStr = getLocalDateString(maxDate);
  const [selectedDate, setSelectedDate] = useState(todayStr);

  // Tasks display: show today's tasks OR all incomplete if none due today, excluding project-tagged tasks
  const [showDone, setShowDone] = useState(false);
  const todayTasks = tasks.filter((t) => !t.completed && t.dueDate === todayStr && !t.projectId);
  const allIncomplete = tasks.filter((t) => !t.completed && !t.projectId);
  const showingAllTasks = todayTasks.length === 0 && allIncomplete.length > 0;
  const pendingTasks = showingAllTasks ? allIncomplete : todayTasks;
  const completedTasks = tasks.filter((t) => t.completed && t.dueDate === todayStr && !t.projectId);

  // Mention filtering
  const filteredProjects = projects
    .filter((p) => p.name.toLowerCase().includes(mentionQuery))
    .slice(0, 6);

  // Detect if dropdown should render above input
  const checkDropdownDirection = useCallback(() => {
    if (!inputWrapperRef.current) return;
    const rect = inputWrapperRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    setDropdownAbove(spaceBelow < 160);
  }, []);

  // Input handler
  function handleNoteInput(value: string) {
    setNoteText(value);
    if (value.trim() === "") {
      setOverrideType(null);
    }
    const atMatch = value.match(/@([^\s@]*)$/);
    if (atMatch) {
      setMentionQuery(atMatch[1].toLowerCase());
      setShowMentionMenu(true);
      setActiveDropdownIndex(0);
      checkDropdownDirection();
    } else {
      setShowMentionMenu(false);
    }
  }

  function selectMention(project: Project) {
    const newText = noteText.replace(/@[^\s@]*$/, "");
    setNoteText(newText);
    setTaggedProjectId(project.id);
    setTaggedProjectName(project.name);
    setShowMentionMenu(false);
    setMentionQuery("");
    setTimeout(() => unifiedInputRef.current?.focus(), 50);
  }

  // Parse priority from text
  function parsePriority(lower: string): "low" | "medium" | "high" {
    if (lower.includes("urgent") || lower.includes("high priority")) return "high";
    if (lower.includes("low priority")) return "low";
    return "medium";
  }

  // Submit
  const handleSubmit = async () => {
    if (!noteText.trim()) return;

    let rawText = noteText.trim();
    let projId = taggedProjectId;
    let projName = taggedProjectName;

    // If no project is tagged via dropdown, try parsing from raw text (e.g. "@ekeup" or "@wakeup")
    if (!projId) {
      const atMatches = rawText.match(/@([^\s]+)/g);
      if (atMatches) {
        for (const match of atMatches) {
          const cleanTag = match.substring(1).toLowerCase().replace(/[^a-z0-9]/g, "");
          if (cleanTag) {
            const matchedProj = projects.find(p => {
              const normName = p.name.toLowerCase().replace(/[^a-z0-9]/g, "");
              return normName === cleanTag || normName.includes(cleanTag) || cleanTag.includes(normName);
            });
            if (matchedProj) {
              projId = matchedProj.id;
              projName = matchedProj.name;
              // Strip the tag from the text
              rawText = rawText.replace(match, "").replace(/\s{2,}/g, " ").trim();
              break;
            }
          }
        }
      }
    }

    const detectedType = overrideType || detectInputType(rawText);

    // Reset UI immediately
    setNoteText("");
    setTaggedProjectId(null);
    setTaggedProjectName(null);
    setShowMentionMenu(false);

    try {
      setIsClassifying(true);

      if (detectedType === "task") {
        // Parse date from text, strip it from title
        const { date, stripped } = parseDateFromText(rawText);
        const lower = stripped.toLowerCase();

        // Strip priority words from title
        const cleanTitle = stripped
          .replace(/(urgent|high priority|low priority)/gi, "")
          .replace(/\s{2,}/g, " ")
          .trim();

        const dueDate = date
          ? getLocalDateString(date)
          : showDatePicker
          ? selectedDate
          : undefined;

        await addTask({
          title: cleanTitle || rawText,
          priority: parsePriority(lower),
          dueDate,
          projectId: projId || undefined,
        });
      } else {
        // Save as note (it's not a task)
        const savedNote = await addNote(rawText, projId || undefined);

        // Background AI classification for project-tagged notes
        if (projId && savedNote?.id) {
          fetch("/api/ai/classify-note", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              noteId: savedNote.id,
              content: rawText,
              projectName: projName,
            }),
          })
            .then(() => fetchNotes())
            .catch(() => {});
        }
      }
    } catch (e) {
      console.error("Failed to save input", e);
    } finally {
      setIsClassifying(false);
      setSelectedDate(todayStr);
      setOverrideType(null);
    }
  };

  // Keyboard handlers
  const handleUnifiedEnter = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Escape") {
      setShowMentionMenu(false);
      return;
    }
    if (showMentionMenu) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveDropdownIndex((prev) =>
          filteredProjects.length > 0 ? (prev + 1) % filteredProjects.length : 0
        );
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveDropdownIndex((prev) =>
          filteredProjects.length > 0
            ? (prev - 1 + filteredProjects.length) % filteredProjects.length
            : 0
        );
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        if (filteredProjects.length > 0 && activeDropdownIndex < filteredProjects.length) {
          selectMention(filteredProjects[activeDropdownIndex]);
        } else {
          setShowMentionMenu(false);
        }
        return;
      }
    } else {
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleSubmit();
      }
    }
  };

  // Global "/" shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "/" &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        e.preventDefault();
        unifiedInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const getPriorityColor = (p: string) => {
    if (p === "high") return "bg-red-500";
    if (p === "medium") return "bg-amber-500";
    return "bg-slate-500";
  };

  const wordCount = notes
    .filter((n) => !n.projectId)
    .reduce((acc, note) => acc + (note.content.match(/\b\w+\b/g)?.length || 0), 0);

  // Hint config
  const hintConfig = {
    task: { label: "→ looks like a task", color: "text-green-400" },
    note: { label: "→ brain dump", color: "text-amber-400" },
    unclear: { label: "→ task or note", color: "text-white/30" },
  };
  const hint = taggedProjectId
    ? { label: "→ project issue", color: "text-purple-400" }
    : hintConfig[inputType];

  return (
    <div
      id="focus-panel-widget"
      className="flex flex-col h-full text-foreground bg-[#0f0f11] rounded-xl divide-y divide-border/40"
      style={{ overflow: "visible" }}
    >
      {/* ── UNIFIED INPUT SECTION ── */}
      <div
        ref={inputWrapperRef}
        className="px-4 py-3 shrink-0 bg-[#0f0f11]"
        style={{ position: "relative", zIndex: 50 }}
      >
        <div className="relative flex flex-col bg-white/[0.03] border border-white/[0.08] rounded-xl focus-within:border-amber-500/50 focus-within:ring-1 focus-within:ring-amber-500/50 transition-all shadow-sm">
          <Textarea
            id="focus-panel-textarea"
            ref={unifiedInputRef as any}
            value={noteText}
            onChange={(e) => handleNoteInput(e.target.value)}
            onKeyDown={handleUnifiedEnter}
            placeholder="Type anything… task or thought (/ to focus)"
            className="min-h-[56px] max-h-[130px] overflow-y-auto text-sm resize-none bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 p-3 pb-1.5 focus:outline-none"
          />

          {/* Bottom toolbar */}
          <div className="flex items-center justify-between px-3 py-2 border-t border-white/[0.04] bg-white/[0.01] rounded-b-xl shrink-0 gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Live hint (Interactive Override Selector) */}
              {noteText.trim() && (
                <div className="flex items-center gap-0.5 bg-white/[0.03] border border-white/5 rounded-md p-0.5 select-none shrink-0">
                  <button
                    type="button"
                    onClick={() => setOverrideType("task")}
                    className={`px-1.5 py-0.5 rounded-[4px] text-[10px] font-bold tracking-tight transition-all duration-150 cursor-pointer ${
                      inputType === "task"
                        ? "bg-green-500/15 text-green-400 border border-green-500/10 shadow-sm"
                        : "text-white/30 hover:text-white/60 border border-transparent"
                    }`}
                  >
                    Task
                  </button>
                  <button
                    type="button"
                    onClick={() => setOverrideType("note")}
                    className={`px-1.5 py-0.5 rounded-[4px] text-[10px] font-bold tracking-tight transition-all duration-150 cursor-pointer ${
                      inputType === "note"
                        ? "bg-amber-500/15 text-amber-400 border border-amber-500/10 shadow-sm"
                        : "text-white/30 hover:text-white/60 border border-transparent"
                    }`}
                  >
                    Thought
                  </button>
                </div>
              )}

              {/* Date picker — only for task-type input */}
              {showDatePicker && (
                <div className="flex items-center gap-1 bg-[#0f0f11] border border-white/10 rounded-md px-2 py-0.5">
                  <span className="text-[9px] font-bold text-muted-foreground uppercase">Due:</span>
                  <input
                    type="date"
                    value={selectedDate}
                    min={todayStr}
                    max={maxDateStr}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="bg-transparent border-none text-[11px] text-foreground font-mono focus:outline-none focus:ring-0 w-[100px] select-none [color-scheme:dark]"
                  />
                </div>
              )}

              {/* @mention tag badge */}
              {taggedProjectName && (
                <span className="text-xs bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full flex items-center gap-1 font-bold border border-amber-500/20">
                  @{taggedProjectName}
                  <button
                    onClick={() => {
                      setTaggedProjectId(null);
                      setTaggedProjectName(null);
                    }}
                    className="text-amber-300/60 hover:text-amber-300 ml-0.5 font-bold"
                  >
                    ×
                  </button>
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {isClassifying && (
                <div className="flex items-center text-[10px] text-amber-400 gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> Saving…
                </div>
              )}
              <Button
                size="icon"
                className="w-7 h-7 rounded-lg bg-white text-black hover:bg-white/90 disabled:opacity-40 disabled:bg-white/5 disabled:text-white/30 transition-all"
                onClick={handleSubmit}
                disabled={!noteText.trim() || isClassifying}
                title="Submit (Ctrl+Enter)"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* @-mention dropdown — smart positioning: above or below */}
        {showMentionMenu && filteredProjects.length > 0 && (
          <div
            style={{
              position: "absolute",
              left: "16px",
              right: "16px",
              zIndex: 9999,
              ...(dropdownAbove
                ? { bottom: "calc(100% + 4px)" }
                : { top: "calc(100% + 4px)" }),
            }}
            className="bg-[#1a1a24] border border-amber-500/30 rounded-xl overflow-hidden shadow-2xl"
          >
            <div className="px-3 py-1.5 border-b border-white/5 flex items-center gap-1.5">
              <span className="text-[9px] text-amber-400/70 font-bold uppercase tracking-widest">
                Tag a Project
              </span>
            </div>
            {filteredProjects.map((p, index) => (
              <button
                key={p.id}
                onMouseDown={(e) => {
                  e.preventDefault();
                  selectMention(p);
                }}
                className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2.5 transition-colors ${
                  index === activeDropdownIndex
                    ? "bg-amber-500/20 text-amber-200 font-semibold"
                    : "text-white/70 hover:bg-white/5 hover:text-white"
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0 shadow-sm shadow-green-400/50" />
                <span className="flex-1 truncate">{p.name}</span>
                {index === activeDropdownIndex && (
                  <span className="text-[9px] text-amber-400/60 ml-auto">↵ select</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── TASKS + NOTES ── */}
      <div className="flex-1 flex flex-col min-h-0 divide-y divide-border/40">

        {/* TASKS SECTION */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="px-4 py-2 flex items-center justify-between shrink-0 bg-[#0f0f11]">
            <div className="flex items-center gap-2">
              <ListTodo className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold tracking-tight">
                {showingAllTasks ? "All Tasks" : "Today's Focus"}
              </h3>
              {showingAllTasks && (
                <span className="text-[9px] text-white/20 font-mono">(no due date filter)</span>
              )}
            </div>
            <Badge variant="secondary" className="font-mono text-[10px]">
              {pendingTasks.length}
            </Badge>
          </div>

          <ScrollArea className="flex-1 px-4 pb-2 min-h-0 h-full w-full overflow-y-auto">
            <div className="space-y-1.5">
              {pendingTasks.length === 0 ? (
                <div className="py-6 text-center text-xs text-white/20">
                  No tasks yet — type one above ↑
                </div>
              ) : (
                pendingTasks.map((t) => (
                  <div
                    key={t.id}
                    className="group flex items-start gap-2.5 p-1.5 rounded hover:bg-white/5 transition-colors"
                  >
                    <Checkbox
                      checked={t.completed}
                      onCheckedChange={() => toggleTask(t.id)}
                      className="mt-0.5 border-muted-foreground/50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                    />
                    <div className="flex-1 min-w-0 flex flex-col">
                      <span className="text-sm text-foreground/90 leading-tight">{t.title}</span>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {t.dueDate && (
                          <span
                            className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                              t.dueDate === todayStr
                                ? "bg-primary/20 text-primary"
                                : t.dueDate < todayStr
                                ? "bg-red-500/20 text-red-400"
                                : "bg-white/5 text-muted-foreground"
                            }`}
                          >
                            {t.dueDate}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div
                        className={`w-1.5 h-1.5 rounded-full ${getPriorityColor(t.priority)}`}
                        title={`Priority: ${t.priority}`}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-5 h-5 text-muted-foreground hover:text-destructive"
                        onClick={() => deleteTask(t.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))
              )}

              {completedTasks.length > 0 && (
                <div className="mt-4 pt-2 border-t border-white/10">
                  <button
                    onClick={() => setShowDone(!showDone)}
                    className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-semibold uppercase tracking-wider hover:text-foreground transition-colors"
                  >
                    {showDone ? (
                      <ChevronDown className="w-3 h-3" />
                    ) : (
                      <ChevronRight className="w-3 h-3" />
                    )}
                    Done today ({completedTasks.length})
                  </button>

                  {showDone && (
                    <div className="mt-2 space-y-1">
                      {completedTasks.map((t) => (
                        <div
                          key={t.id}
                          className="group flex items-center gap-2.5 p-1 rounded opacity-50 hover:opacity-100 transition-all"
                        >
                          <Checkbox checked={t.completed} onCheckedChange={() => toggleTask(t.id)} />
                          <span className="text-xs line-through text-muted-foreground flex-1 truncate">
                            {t.title}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-5 h-5 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100"
                            onClick={() => deleteTask(t.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* NOTES / BRAIN DUMP SECTION */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="px-4 py-2 flex items-center justify-between shrink-0 bg-[#0f0f11]">
            <div className="flex items-center gap-2">
              <BrainCircuit className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-semibold tracking-tight">Brain Dump</h3>
            </div>
            <span className="text-[10px] font-mono text-muted-foreground">{wordCount}w</span>
          </div>

          <ScrollArea className="flex-1 px-4 pb-2 min-h-0 h-full w-full overflow-y-auto">
            <div className="space-y-2">
              {notes.filter((n) => !n.projectId).length === 0 ? (
                <div className="py-6 text-center text-xs text-white/20">
                  Brain dump lives here. Type a thought above ↑
                </div>
              ) : (
                notes
                  .filter((n) => !n.projectId)
                  .map((note) => (
                    <NoteCard
                      key={note.id}
                      note={note}
                      projects={projects}
                      onDelete={deleteNote}
                    />
                  ))
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
