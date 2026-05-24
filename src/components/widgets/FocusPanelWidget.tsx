"use client";

import React, { useState, useEffect, useRef } from "react";
import { useTaskStore, Task } from "@/store/useTaskStore";
import { useNoteStore, Note } from "@/store/useNoteStore";
import { useUrlStore, ResourceUrl } from "@/store/useUrlStore";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ListTodo,
  BrainCircuit,
  Link2,
  Trash2,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Loader2
} from "lucide-react";

export function FocusPanelWidget() {
  const { tasks, addTask, toggleTask, deleteTask } = useTaskStore();
  const { notes, addNote, deleteNote } = useNoteStore();
  const { urls, addUrl, deleteUrl } = useUrlStore();

  // Tasks State
  const [taskInput, setTaskInput] = useState("");
  const [showDone, setShowDone] = useState(false);
  const taskInputRef = useRef<HTMLInputElement>(null);

  // Notes State
  const [noteInput, setNoteInput] = useState("");

  // URLs State
  const [urlInput, setUrlInput] = useState("");
  const [urlLoading, setUrlLoading] = useState(false);
  const [urlFilter, setUrlFilter] = useState<string>("All");

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

  const handleAddTask = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && taskInput.trim()) {
      const parsed = parseTaskInput(taskInput);
      addTask({ title: parsed.title, priority: parsed.priority, dueDate: parsed.dueDate });
      setTaskInput("");
    }
  };

  // Keyboard shortcut for task input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        e.preventDefault();
        taskInputRef.current?.focus();
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
  const handleAddNote = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      if (noteInput.trim()) {
        addNote(noteInput.trim());
        setNoteInput("");
      }
    }
  };

  const wordCount = notes.reduce((acc, note) => acc + (note.content.match(/\b\w+\b/g)?.length || 0), 0);

  const renderNoteCard = (note: Note) => {
    const lines = note.content.split("\n");
    const firstLine = lines[0];
    const rest = lines.slice(1).join("\n");
    return (
      <div key={note.id} className="group relative p-3 border border-border bg-card rounded-lg text-sm transition-all hover:border-primary/30">
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

  // ── URLS LOGIC ──
  const guessCategory = (urlStr: string): "docs" | "deployment" | "github" | "other" => {
    const lower = urlStr.toLowerCase();
    if (lower.includes("github.com")) return "github";
    if (lower.includes("docs") || lower.includes("developer") || lower.includes("reference")) return "docs";
    if (lower.includes("vercel.com") || lower.includes("netlify.com") || lower.includes("aws") || lower.includes("railway") || lower.includes("neon")) return "deployment";
    return "other";
  };

  const handleAddUrl = async (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && urlInput.trim()) {
      e.preventDefault();
      const rawUrl = urlInput.trim();
      const validUrl = rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`;
      setUrlLoading(true);
      
      try {
        const res = await fetch(`/api/urls/meta?url=${encodeURIComponent(validUrl)}`);
        let title = validUrl;
        if (res.ok) {
          const data = await res.json();
          if (data.title) title = data.title;
        }
        
        addUrl({
          url: validUrl,
          label: title,
          category: guessCategory(validUrl)
        });
        setUrlInput("");
      } catch (err) {
        // Fallback
        addUrl({ url: validUrl, label: validUrl, category: guessCategory(validUrl) });
        setUrlInput("");
      } finally {
        setUrlLoading(false);
      }
    }
  };

  const urlCategories = ["All", "docs", "deployment", "github", "other"];
  const filteredUrls = urlFilter === "All" ? urls : urls.filter(u => u.category === urlFilter);

  return (
    <div className="flex flex-col h-full text-foreground bg-background rounded-xl overflow-hidden divide-y divide-border/40">
      
      {/* ── TASKS SECTION ── */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="px-4 py-3 flex items-center justify-between shrink-0 bg-popover/30">
          <div className="flex items-center gap-2">
            <ListTodo className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold tracking-tight">Today's Focus</h3>
          </div>
          <Badge variant="secondary" className="font-mono text-[10px]">{pendingTasks.length}</Badge>
        </div>
        
        <div className="px-4 pb-2 shrink-0">
          <Input 
            ref={taskInputRef}
            value={taskInput}
            onChange={e => setTaskInput(e.target.value)}
            onKeyDown={handleAddTask}
            placeholder="Press / to add task (e.g. 'Deploy app tomorrow urgent')"
            className="h-8 text-xs bg-card border-border/80 focus-visible:ring-1 focus-visible:ring-primary/50"
          />
        </div>

        <ScrollArea className="flex-1 px-4 pb-2 min-h-0 h-full w-full overflow-y-auto">
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
                  {t.dueDate && <span className="ml-2 text-[10px] text-muted-foreground font-mono bg-popover px-1 rounded">{t.dueDate}</span>}
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
              <div className="mt-4 pt-2 border-t border-border/30">
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
        <div className="px-4 py-3 flex items-center justify-between shrink-0 bg-popover/30">
          <div className="flex items-center gap-2">
            <BrainCircuit className="w-4 h-4 text-purple-400" />
            <h3 className="text-sm font-semibold tracking-tight">Brain Dump</h3>
          </div>
          <span className="text-[10px] font-mono text-muted-foreground">{wordCount} words</span>
        </div>
        
        <div className="px-4 pb-2 shrink-0">
          <Textarea 
            value={noteInput}
            onChange={e => setNoteInput(e.target.value)}
            onKeyDown={handleAddNote}
            placeholder="Type your thoughts... (Ctrl+Enter to save)"
            className="min-h-[60px] text-xs resize-none bg-card border-border/80 focus-visible:ring-1 focus-visible:ring-purple-500/50"
          />
        </div>

        <ScrollArea className="flex-1 px-4 pb-2 min-h-0 h-full w-full overflow-y-auto">
          <div className="space-y-2">
            {notes.map(renderNoteCard)}
          </div>
        </ScrollArea>
      </div>

      {/* ── URLS SECTION ── */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="px-4 py-3 flex items-center justify-between shrink-0 bg-popover/30">
          <div className="flex items-center gap-2">
            <Link2 className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-semibold tracking-tight">Quick Links</h3>
          </div>
          <div className="flex gap-1 overflow-x-auto no-scrollbar">
            {urlCategories.map(cat => (
              <Badge 
                key={cat} 
                variant={urlFilter === cat ? "default" : "outline"}
                className={`text-[9px] cursor-pointer hover:bg-primary/20 ${urlFilter === cat ? 'bg-primary/20 text-primary border-primary/30' : 'text-muted-foreground'}`}
                onClick={() => setUrlFilter(cat)}
              >
                {cat}
              </Badge>
            ))}
          </div>
        </div>

        <div className="px-4 pb-2 shrink-0 relative">
          <Input 
            value={urlInput}
            onChange={e => setUrlInput(e.target.value)}
            onKeyDown={handleAddUrl}
            disabled={urlLoading}
            placeholder="Paste URL and hit Enter..."
            className="h-8 text-xs bg-card border-border/80 focus-visible:ring-1 focus-visible:ring-blue-500/50 pr-8"
          />
          {urlLoading && <Loader2 className="w-3 h-3 absolute right-7 top-2.5 animate-spin text-muted-foreground" />}
        </div>

        <ScrollArea className="flex-1 px-4 pb-2 min-h-0 h-full w-full overflow-y-auto">
          <div className="space-y-1.5">
            {filteredUrls.map(u => {
              let domain = "";
              try { domain = new URL(u.url).hostname; } catch {}
              return (
                <div key={u.id} className="group flex items-center gap-3 p-2 border border-border/50 bg-card rounded hover:bg-white/5 transition-colors">
                  <img 
                    src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`} 
                    alt="favicon" 
                    className="w-4 h-4 rounded-sm"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    <a href={u.url} target="_blank" rel="noopener noreferrer" className="text-xs text-foreground/90 hover:text-primary hover:underline truncate font-medium">
                      {u.label}
                    </a>
                    {u.category && u.category !== "other" && (
                      <Badge variant="outline" className="text-[8px] uppercase px-1 py-0 h-4 border-border/60 shrink-0">{u.category}</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <a href={u.url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground p-1">
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <Button variant="ghost" size="icon" className="w-5 h-5 text-muted-foreground hover:text-destructive" onClick={() => deleteUrl(u.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </div>

    </div>
  );
}
