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
  Folder,
  X,
  Loader2
} from "lucide-react";

export function FocusPanelWidget() {
  const { tasks, addTask, toggleTask, deleteTask } = useTaskStore();
  const { notes, addNote, deleteNote, fetchNotes } = useNoteStore();
  const [noteText, setNoteText] = useState('');
  const [mentionQuery, setMentionQuery] = useState('');
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [taggedProjectId, setTaggedProjectId] = useState<string | null>(null);
  const [taggedProjectName, setTaggedProjectName] = useState<string | null>(null);
  const [activeDropdownIndex, setActiveDropdownIndex] = useState(0);
  const [isClassifying, setIsClassifying] = useState(false);
  const unifiedInputRef = useRef<HTMLTextAreaElement>(null);

  const { projects, fetchProjects } = useProjectStore();

  function handleNoteInput(value: string) {
    setNoteText(value)
    // Detect @ trigger — supports project names with hyphens, dots, underscores
    const atMatch = value.match(/@([^\s@]*)$/)
    if (atMatch) {
      setMentionQuery(atMatch[1].toLowerCase())
      setShowMentionMenu(true)
      setActiveDropdownIndex(0)
    } else {
      setShowMentionMenu(false)
    }
  }

  const filteredProjects = projects.filter(p =>
    p.name.toLowerCase().includes(mentionQuery)
  ).slice(0, 6)

  function selectMention(project: Project) {
    // Replace the @partial text and refocus
    const newText = noteText.replace(/@[^\s@]*$/, '') // remove the @partial mention
    setNoteText(newText)
    setTaggedProjectId(project.id)
    setTaggedProjectName(project.name)
    setShowMentionMenu(false)
    setMentionQuery('')
    // Refocus the textarea
    setTimeout(() => {
      unifiedInputRef.current?.focus();
    }, 50);
  }

  // Tasks State
  const [showDone, setShowDone] = useState(false);

  // Local Date Calculations
  const getLocalDateString = (date = new Date()) => {
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().split('T')[0];
  };

  const todayStr = getLocalDateString();
  const [selectedDate, setSelectedDate] = useState(todayStr);

  const maxDate = new Date();
  maxDate.setDate(new Date().getDate() + 15);
  const maxDateStr = getLocalDateString(maxDate);

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

  const handleUnifiedEnter = async (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Escape") {
      setShowMentionMenu(false);
      return;
    }

    if (showMentionMenu) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveDropdownIndex(prev => (filteredProjects.length > 0 ? (prev + 1) % filteredProjects.length : 0));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveDropdownIndex(prev => (filteredProjects.length > 0 ? (prev - 1 + filteredProjects.length) % filteredProjects.length : 0));
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        if (filteredProjects.length > 0 && activeDropdownIndex >= 0 && activeDropdownIndex < filteredProjects.length) {
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

  const handleSubmit = async () => {
    if (noteText.trim()) {
      const textToSubmit = noteText;
      const projId = taggedProjectId;
      const projName = taggedProjectName;

      try {
        setIsClassifying(true);
        // 1. Save note to DB with projectId if tagged
        const savedNote = await fetch('/api/notes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: textToSubmit, projectId: projId })
        }).then(r => r.json());

        // 2. Reset UI immediately — don't wait for classification
        setNoteText('');
        setTaggedProjectId(null);
        setTaggedProjectName(null);
        setShowMentionMenu(false);

        // Fetch notes again to update the local store list (Zustand store fetchNotes)
        await fetchNotes();

        // 3. Background classification — fire and forget
        if (projId) {
          fetch('/api/ai/classify-note', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              noteId: savedNote.id,
              content: textToSubmit,
              projectName: projName
            })
          })
          .then(() => {
            // Refresh notes so the category badge is updated in state
            fetchNotes();
          })
          .catch(() => {}); // silent fail
        }
      } catch (e) {
        console.error("Failed to save note", e);
      } finally {
        setIsClassifying(false);
        setSelectedDate(todayStr);
      }
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

  const pendingTasks = tasks.filter(t => !t.completed && t.dueDate === todayStr);
  const completedTasks = tasks.filter(t => t.completed && t.dueDate === todayStr);

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

  const wordCount = notes.filter(n => !n.projectId).reduce((acc, note) => acc + (note.content.match(/\b\w+\b/g)?.length || 0), 0);

  return (
    <div id="focus-panel-widget" className="flex flex-col h-full text-foreground bg-[#0f0f11] rounded-xl divide-y divide-border/40" style={{ overflow: 'visible' }}>
      
      {/* ── UNIFIED INPUT SECTION ── */}
      <div className="px-4 py-3 shrink-0 bg-[#0f0f11]" style={{ position: 'relative', zIndex: 50 }}>
        <div className="relative flex flex-col bg-[#161619] border border-white/5 rounded-xl focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/50 transition-all shadow-sm">
          <Textarea 
            id="focus-panel-textarea"
            ref={unifiedInputRef as any}
            value={noteText}
            onChange={(e) => handleNoteInput(e.target.value)}
            onKeyDown={handleUnifiedEnter}
            placeholder="Type anything... AI will sort into Tasks or Brain Dump"
            className="min-h-[60px] max-h-[140px] overflow-y-auto text-sm resize-none bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 p-3 pb-2 focus:outline-none custom-scrollbar scrollbar-hide"
          />
          
          <div className="flex items-center justify-between px-3 py-2 border-t border-white/5 bg-black/10 rounded-b-xl shrink-0">
            <div className="flex items-center gap-2">
              {/* Date picker for tasks */}
              <div className="flex items-center gap-1.5 bg-[#0f0f11] border border-white/10 rounded-md px-2 py-0.5">
                <span className="text-[9px] font-bold text-muted-foreground uppercase">Deadline:</span>
                <input 
                  type="date" 
                  value={selectedDate} 
                  min={todayStr}
                  max={maxDateStr}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent border-none text-[11px] text-foreground font-mono focus:outline-none focus:ring-0 w-[110px] select-none [color-scheme:dark]"
                />
              </div>

              {taggedProjectName && (
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-xs text-white/40">tagged:</span>
                  <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full flex items-center gap-1 font-bold border border-purple-500/20">
                    @{taggedProjectName}
                    <button onClick={() => { setTaggedProjectId(null); setTaggedProjectName(null) }} className="text-purple-300/60 hover:text-purple-300 ml-1 font-bold">×</button>
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {isClassifying && (
                <div className="flex items-center text-[10px] text-primary gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> Classifying...
                </div>
              )}
              <Button 
                size="icon"
                className="w-7 h-7 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:bg-white/5 disabled:text-white/40 transition-all"
                onClick={handleSubmit}
                disabled={!noteText.trim() || isClassifying}
                title="Submit (Ctrl+Enter)"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* @-mention dropdown — renders BELOW the input box */}
        {showMentionMenu && filteredProjects.length > 0 && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: '16px',
              right: '16px',
              marginTop: '4px',
              zIndex: 9999,
            }}
            className="bg-[#1a1a24] border border-purple-500/30 rounded-xl overflow-hidden shadow-2xl"
          >
            <div className="px-3 py-1.5 border-b border-white/5 flex items-center gap-1.5">
              <span className="text-[9px] text-purple-400/70 font-bold uppercase tracking-widest">Tag a Project</span>
            </div>
            {filteredProjects.map((p, index) => (
              <button
                key={p.id}
                onMouseDown={(e) => { e.preventDefault(); selectMention(p); }}
                className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2.5 transition-colors ${
                  index === activeDropdownIndex
                    ? 'bg-purple-500/20 text-purple-200 font-semibold'
                    : 'text-white/70 hover:bg-white/5 hover:text-white'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0 shadow-sm shadow-green-400/50" />
                <span className="flex-1 truncate">{p.name}</span>
                {index === activeDropdownIndex && (
                  <span className="text-[9px] text-purple-400/60 ml-auto">↵ select</span>
                )}
              </button>
            ))}
          </div>
        )}

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

          <ScrollArea className="flex-1 px-4 pb-2 min-h-0 h-full w-full overflow-y-auto custom-scrollbar scrollbar-hide">
            <div className="space-y-1.5">
              {pendingTasks.map(t => (
                <div key={t.id} className="group flex items-start gap-2.5 p-1.5 rounded hover:bg-white/5 transition-colors">
                  <Checkbox 
                    checked={t.completed} 
                    onCheckedChange={() => toggleTask(t.id)} 
                    className="mt-0.5 border-muted-foreground/50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                  />
                  <div className="flex-1 min-w-0 flex flex-col">
                    <span className="text-sm text-foreground/90 leading-tight">{t.title}</span>
                    <div className="flex items-center gap-2 mt-1">
                      {t.createdAt && <span className="text-[9px] text-muted-foreground/60 font-mono">{new Date(t.createdAt).toLocaleDateString()}</span>}
                      {t.dueDate && <span className="text-[10px] text-muted-foreground font-mono bg-[#0f0f11] px-1 rounded">{t.dueDate}</span>}
                    </div>
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

          <ScrollArea className="flex-1 px-4 pb-2 min-h-0 h-full w-full overflow-y-auto custom-scrollbar scrollbar-hide">
            <div className="space-y-2">
              {notes.filter(n => !n.projectId).map(renderNoteCard)}
            </div>
          </ScrollArea>
        </div>

      </div>
    </div>
  );
}
