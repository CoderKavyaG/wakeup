"use client";

import React, { useState, useEffect, useRef } from "react";
import { useTaskStore, Task } from "@/store/useTaskStore";
import { useNoteStore, Note } from "@/store/useNoteStore";
import { useUrlStore, ResourceUrl } from "@/store/useUrlStore";
import { useProjectStore, Project } from "@/store/useProjectStore";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ListTodo,
  BrainCircuit,
  CheckSquare,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
  X,
  Loader2
} from "lucide-react";

export function FocusPanelWidget() {
  const { tasks, addTask, toggleTask, deleteTask } = useTaskStore();
  const { notes, addNote, deleteNote } = useNoteStore();
  // Unified Input State
  const [inputMode, setInputMode] = useState<"task" | "note">("task");
  const [unifiedInput, setUnifiedInput] = useState("");
  const unifiedInputRef = useRef<HTMLTextAreaElement>(null);

  const { projects } = useProjectStore();
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [projectSearch, setProjectSearch] = useState("");
  const [taggedProject, setTaggedProject] = useState<Project | null>(null);
  const [isClassifying, setIsClassifying] = useState(false);

  // Tasks State
  const [showDone, setShowDone] = useState(false);

  // ── TASKS LOGIC ──
  const parseTaskInput = (text: string) => {
    let title = text;
    let priority: "low" | "medium" | "high" = "medium";
    let dueDate: string | undefined = undefined;

    const lower = text.toLowerCase();
    
    if (lower.includes("urgent") || lower.includes("high")) priority = "high";
    else if (lower.includes("low")) priority = "low";

    const dateKeywords = ["today", "tomorrow", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
    for (const kw of dateKeywords) {
      if (lower.includes(kw)) {
        const d = new Date();
        if (kw === "tomorrow") d.setDate(d.getDate() + 1);
        else if (kw !== "today") {
          const days = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];
          const targetDay = days.indexOf(kw);
          const currentDay = d.getDay();
          let diff = targetDay - currentDay;
          if (diff <= 0) diff += 7;
          d.setDate(d.getDate() + diff);
        }
        dueDate = d.toISOString().split("T")[0];
        break;
      }
    }

    // Strip keywords from title roughly
    title = title
      .replace(/(urgent|high priority|low priority|today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)/gi, "")
      .replace(/\s+/g, " ")
      .trim();

    return { title: title || text, priority, dueDate };
  };

  const handleUnifiedEnter = async (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setShowProjectDropdown(false);
      setTaggedProject(null);
      return;
    }

    if (e.key === "Enter" && !e.shiftKey) {
      if (showProjectDropdown) {
        const matches = projects.filter(p => p.name.toLowerCase().includes(projectSearch.toLowerCase()));
        if (matches.length > 0) {
          e.preventDefault();
          setTaggedProject(matches[0]);
          setShowProjectDropdown(false);
          setUnifiedInput(prev => prev.slice(0, prev.lastIndexOf("@")) + `@${matches[0].name} `);
          return;
        } else {
          setShowProjectDropdown(false);
        }
      }

      // If a project is tagged, auto-route to project feedback/note regardless of mode
      if (taggedProject) {
        e.preventDefault();
        if (unifiedInput.trim()) {
          const content = unifiedInput.trim();
          setUnifiedInput("");
          
          setIsClassifying(true);
          try {
            const res = await fetch("/api/ai/classify-note", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ text: content })
            });
            const data = await res.json();
            addNote(content, taggedProject.id, data.category || "general note");
          } catch (e) {
            addNote(content, taggedProject.id, "general note");
          } finally {
            setIsClassifying(false);
            setTaggedProject(null);
          }
        }
        return;
      }

      // Normal task/note logic
      if (inputMode === "task") {
        e.preventDefault();
        if (unifiedInput.trim()) {
          const parsed = parseTaskInput(unifiedInput);
          addTask({ title: parsed.title, priority: parsed.priority, dueDate: parsed.dueDate });
          setUnifiedInput("");
          setShowProjectDropdown(false);
        }
      } else if (inputMode === "note") {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          if (unifiedInput.trim()) {
            addNote(unifiedInput.trim());
            setUnifiedInput("");
            setShowProjectDropdown(false);
          }
        }
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setUnifiedInput(val);
    const atIndex = val.lastIndexOf("@");
    if (atIndex !== -1 && !taggedProject) {
      setShowProjectDropdown(true);
      setProjectSearch(val.slice(atIndex + 1));
    } else {
      setShowProjectDropdown(false);
    }
  };

  // Keyboard shortcut for task input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        e.preventDefault();
        unifiedInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const pendingTasks = tasks.filter(t => !t.completed);
  const completedTasks = tasks.filter(t => t.completed);

  const getPriorityColor = (p: string) => {
    if (p === "high") return "bg-red-500";
    if (p === "medium") return "bg-amber-500";
    return "bg-slate-500";
  };

  // ── NOTES LOGIC ──

  const renderNoteCard = (note: Note) => {
    const lines = note.content.split("\n");
    const firstLine = lines[0];
    const rest = lines.slice(1).join("\n");
    return (
      <div key={note.id} className="group relative p-3 border border-white/10 bg-[#0f0f11] rounded-lg text-sm transition-all hover:border-primary/30">
        <div className="font-bold text-foreground line-clamp-1">{firstLine}</div>
        {rest && <div className="text-muted-foreground mt-1 line-clamp-2 text-xs whitespace-pre-wrap">{rest}</div>}
        <div className="mt-2 flex justify-between items-center opacity-40 text-[10px] font-mono">
          <span>{new Date(note.createdAt).toLocaleString()}</span>
        </div>
        <Button 
          variant="destructive" 
          size="icon" 
          className="absolute top-2 right-2 w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => deleteNote(note.id)}
        >
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>
    );
  };

  const wordCount = notes.reduce((acc, note) => acc + (note.content.match(/\b\w+\b/g)?.length || 0), 0);

  return (
    <div className="flex flex-col h-full text-foreground bg-[#0f0f11] rounded-xl overflow-hidden divide-y divide-border/40">
      
      {/* ── UNIFIED INPUT SECTION ── */}
      <div className="px-4 py-3 shrink-0 relative bg-[#0f0f11]">
        <Textarea 
          ref={unifiedInputRef as any}
          value={unifiedInput}
          onChange={handleInputChange}
          onKeyDown={handleUnifiedEnter}
          placeholder={inputMode === "task" ? "Add a task... (try 'fix bug tomorrow')" : "Brain dump... (Type @ to tag project, Ctrl+Enter to save)"}
          className="min-h-[60px] text-sm resize-none bg-[#0f0f11] border-white/10 focus-visible:ring-1 focus-visible:ring-primary/50 p-3 pr-10 custom-scrollbar"
        />
        
        {isClassifying && (
          <div className="absolute bottom-2 right-12 flex items-center text-[10px] text-primary gap-1">
            <Loader2 className="w-3 h-3 animate-spin" /> Classifying...
          </div>
        )}

        {showProjectDropdown && (
          <div className="absolute top-full left-4 right-4 mt-1 bg-[#1a1a1d] border border-white/10 rounded-lg shadow-xl z-50 max-h-40 overflow-y-auto">
            {projects.filter(p => p.name.toLowerCase().includes(projectSearch.toLowerCase())).map(p => (
              <div 
                key={p.id} 
                className="px-3 py-2 text-xs hover:bg-white/10 cursor-pointer text-foreground"
                onClick={() => {
                  setTaggedProject(p);
                  setShowProjectDropdown(false);
                  setUnifiedInput(prev => prev.slice(0, prev.lastIndexOf("@")) + `@${p.name} `);
                  unifiedInputRef.current?.focus();
                }}
              >
                {p.name}
              </div>
            ))}
            {projects.filter(p => p.name.toLowerCase().includes(projectSearch.toLowerCase())).length === 0 && (
              <div className="px-3 py-2 text-xs text-muted-foreground">No projects found</div>
            )}
          </div>
        )}

        {taggedProject && (
          <div className="absolute bottom-2 left-5 flex items-center gap-1 bg-primary/20 text-primary text-[10px] px-2 py-0.5 rounded-full font-bold z-10">
            @{taggedProject.name}
            <button onClick={() => setTaggedProject(null)}><X className="w-3 h-3 hover:text-white" /></button>
          </div>
        )}

        <button
          onClick={() => setInputMode(m => m === "task" ? "note" : "task")}
          className="absolute top-5 right-6 transition-all flex items-center justify-center w-6 h-6 rounded hover:bg-white/5"
          title={inputMode === "task" ? "Switch to Note Mode" : "Switch to Task Mode"}
        >
          {inputMode === "task" ? (
            <CheckSquare className="w-4 h-4 text-white/80 drop-shadow-[0_0_2px_rgba(255,255,255,0.8)]" />
          ) : (
            <Pencil className="w-4 h-4 text-white/80 drop-shadow-[0_0_2px_rgba(255,255,255,0.8)]" />
          )}
        </button>
      </div>

      <div className="flex-1 flex flex-col min-h-0 divide-y divide-border/40">
        
        {/* ── TASKS SECTION ── */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="px-4 py-2 flex items-center justify-between shrink-0 bg-[#0f0f11]">
            <div className="flex items-center gap-2">
              <ListTodo className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold tracking-tight">Today's Focus</h3>
            </div>
            <Badge variant="secondary" className="font-mono text-[10px]">{pendingTasks.length}</Badge>
          </div>

          <ScrollArea className="flex-1 px-4 pb-2 min-h-0 h-full w-full overflow-y-auto custom-scrollbar">
            <div className="space-y-1.5">
              {pendingTasks.map(t => (
                <div key={t.id} className="group flex items-start gap-2.5 p-1.5 rounded hover:bg-white/5 transition-colors">
                  <Checkbox 
                    checked={t.completed} 
                    onCheckedChange={() => toggleTask(t.id)} 
                    className="mt-0.5 border-muted-foreground/50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-foreground/90 leading-tight">{t.title}</span>
                    {t.dueDate && <span className="ml-2 text-[10px] text-muted-foreground font-mono bg-[#0f0f11] px-1 rounded">{t.dueDate}</span>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className={`w-1.5 h-1.5 rounded-full ${getPriorityColor(t.priority)}`} title={`Priority: ${t.priority}`} />
                    <Button variant="ghost" size="icon" className="w-5 h-5 text-muted-foreground hover:text-destructive" onClick={() => deleteTask(t.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}

              {completedTasks.length > 0 && (
                <div className="mt-4 pt-2 border-t border-white/10">
                  <button 
                    onClick={() => setShowDone(!showDone)}
                    className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-semibold uppercase tracking-wider hover:text-foreground transition-colors"
                  >
                    {showDone ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                    Done today ({completedTasks.length})
                  </button>
                  
                  {showDone && (
                    <div className="mt-2 space-y-1">
                      {completedTasks.map(t => (
                        <div key={t.id} className="group flex items-center gap-2.5 p-1 rounded opacity-50 hover:opacity-100 transition-all">
                          <Checkbox checked={t.completed} onCheckedChange={() => toggleTask(t.id)} />
                          <span className="text-xs line-through text-muted-foreground flex-1 truncate">{t.title}</span>
                          <Button variant="ghost" size="icon" className="w-5 h-5 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100" onClick={() => deleteTask(t.id)}>
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

        {/* ── NOTES SECTION ── */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="px-4 py-2 flex items-center justify-between shrink-0 bg-[#0f0f11]">
            <div className="flex items-center gap-2">
              <BrainCircuit className="w-4 h-4 text-purple-400" />
              <h3 className="text-sm font-semibold tracking-tight">Brain Dump</h3>
            </div>
            <span className="text-[10px] font-mono text-muted-foreground">{wordCount} words</span>
          </div>

          <ScrollArea className="flex-1 px-4 pb-2 min-h-0 h-full w-full overflow-y-auto custom-scrollbar">
            <div className="space-y-2">
              {notes.map(renderNoteCard)}
            </div>
          </ScrollArea>
        </div>

      </div>
    </div>
  );
}
