"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useProjectStore, Project } from "@/store/useProjectStore";
import { useNoteStore } from "@/store/useNoteStore";
import { useProjectOSStore } from "@/store/useProjectOSStore";
import { useBootstrapStore } from "@/store/useBootstrapStore";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import {
  Folder,
  GitBranch,
  ExternalLink,
  Trash2,
  CheckCircle2,
  Plus,
  ArrowLeft,
  Star,
  Globe,
  Settings,
  Image,
  FileText,
  Calendar,
  Check,
  CheckSquare,
  AlertCircle,
  Copy,
  PlusCircle,
  RefreshCw,
  FolderOpen
} from "lucide-react";

const PHASES = [
  { id: 'launched', label: 'Launched', dotColor: 'bg-green-400' },
  { id: 'in_development', label: 'In Development', dotColor: 'bg-blue-400' },
  { id: 'sketching', label: 'Sketching', dotColor: 'bg-amber-400' },
  { id: 'idea', label: 'Idea Phase', dotColor: 'bg-white/30' },
];

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'ideas', label: 'Ideas' },
  { id: 'media', label: 'Media' },
  { id: 'braindump', label: 'Brain Dump' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'controlroom', label: 'Control Room' },
];

const timeAgo = (dateInput: any) => {
  if (!dateInput) return "never";
  const date = new Date(dateInput);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

// ─────────────────────────────────────────────
// Subcomponents
// ─────────────────────────────────────────────

function PhaseBadge({ project }: { project: Project }) {
  const [open, setOpen] = useState(false);
  const phase = PHASES.find(p => p.id === project.phase) || PHASES[3];
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function changePhase(newPhase: string) {
    try {
      await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phase: newPhase })
      });
      useProjectStore.getState().updateProject(project.id, { phase: newPhase as any });
    } catch (err) {
      console.error(err);
    }
    setOpen(false);
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/[0.05] border border-white/[0.08] text-xs text-white/60 hover:bg-white/[0.08] transition-colors cursor-pointer select-none">
        <span className={`w-1.5 h-1.5 rounded-full ${phase.dotColor}`} />
        {phase.label}
        <span className="text-white/30 text-[9px]">▼</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-[#15151b] border border-white/10 rounded-lg overflow-hidden shadow-xl z-20 w-44">
          {PHASES.map(p => (
            <button key={p.id} onClick={() => changePhase(p.id)}
              className={`w-full text-left px-3 py-2.5 text-xs flex items-center gap-2 hover:bg-white/5 transition-colors cursor-pointer
                ${project.phase === p.id ? 'text-white font-medium bg-white/[0.02]' : 'text-white/50'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${p.dotColor}`} />
              {p.label}
              {project.phase === p.id && <span className="ml-auto text-purple-400">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── 1. Overview Tab ──
function OverviewTab({ project }: { project: Project }) {
  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-[#121217] border border-white/[0.04] p-4 rounded-xl space-y-1">
          <span className="text-[9px] uppercase tracking-wider text-white/30 font-mono">Completion</span>
          <p className="text-2xl font-bold font-mono text-white">{project.completionPercentage ?? 0}%</p>
          <div className="w-full bg-white/[0.04] h-1.5 rounded-full overflow-hidden mt-2">
            <div className="bg-purple-500 h-full rounded-full" style={{ width: `${project.completionPercentage ?? 0}%` }} />
          </div>
        </div>
        <div className="bg-[#121217] border border-white/[0.04] p-4 rounded-xl space-y-1">
          <span className="text-[9px] uppercase tracking-wider text-white/30 font-mono">Status Indicator</span>
          <div className="flex items-center gap-2 mt-1">
            <span className={`w-2.5 h-2.5 rounded-full ${
              project.status === "active" ? "bg-green-400" :
              project.status === "planning" ? "bg-blue-400" :
              project.status === "completed" ? "bg-purple-400" : "bg-amber-400"
            }`} />
            <span className="text-sm font-semibold capitalize text-white/80">{project.status}</span>
          </div>
        </div>
        <div className="bg-[#121217] border border-white/[0.04] p-4 rounded-xl space-y-1">
          <span className="text-[9px] uppercase tracking-wider text-white/30 font-mono">Linked Path</span>
          <p className="text-xs font-mono text-white/60 truncate mt-1.5" title={project.folderPath || "Local-only unlinked"}>
            {project.folderPath || "Not connected to local workspace"}
          </p>
        </div>
      </div>

      <div className="bg-[#121217] border border-white/[0.04] p-5 rounded-xl space-y-4">
        <h3 className="text-xs uppercase tracking-wider text-white/40 font-mono">Resume / Milestones Context</h3>
        <div className="space-y-4">
          <div>
            <span className="text-[10px] text-white/30">Architecture overview & highlights</span>
            <p className="text-xs text-white/70 leading-relaxed mt-1 whitespace-pre-wrap">{project.architectureNotes || "None documented yet."}</p>
          </div>
          <div className="h-px bg-white/[0.04]" />
          <div>
            <span className="text-[10px] text-white/30">Auto-generated resume bullet points</span>
            <p className="text-xs text-white/70 leading-relaxed mt-1 font-mono italic">
              {project.resumeBullet ? `• ${project.resumeBullet}` : "Create task list milestones and push code to generate portfolio bullet points."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 2. Ideas Tab ──
const STATUS_COLS = [
  { id: 'raw',       label: 'Raw Ideas',  color: 'text-white/40',    borderColor: 'border-white/[0.06]',   dotColor: 'bg-white/30'    },
  { id: 'validated', label: 'Validated',  color: 'text-blue-400/80', borderColor: 'border-blue-500/20',    dotColor: 'bg-blue-400'    },
  { id: 'building',  label: 'Building',   color: 'text-green-400/80',borderColor: 'border-green-500/20',   dotColor: 'bg-green-400'   },
  { id: 'shelved',   label: 'Shelved',    color: 'text-white/20',    borderColor: 'border-white/[0.04]',   dotColor: 'bg-white/20'    },
];

function timeAgoShort(date: string) {
  const d = new Date(date);
  const now = Date.now();
  const diff = now - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

interface Idea {
  id: string;
  content: string;
  source: string;
  status: string;
  starred: boolean;
  createdAt: string;
  projectId: string | null;
}

interface IdeaCardProps {
  idea: Idea;
  projectId: string;
  onUpdate: (id: string, updates: Partial<Idea>) => void;
  onDelete: (id: string) => void;
}

function IdeaCard({ idea, projectId, onUpdate, onDelete }: IdeaCardProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(idea.content);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [editing]);

  const saveEdit = async () => {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === idea.content) { setEditing(false); return; }
    // Optimistic
    onUpdate(idea.id, { content: trimmed });
    setEditing(false);
    try {
      await fetch(`/api/projects/${projectId}/ideas?ideaId=${idea.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: trimmed }),
      });
    } catch {}
  };

  const handleStarClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdate(idea.id, { starred: !idea.starred });
    fetch(`/api/projects/${projectId}/ideas?ideaId=${idea.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ starred: !idea.starred }),
    }).catch(() => {});
  };

  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-3 group relative hover:border-white/10 transition-colors">
      {/* Source badge */}
      {idea.source !== 'manual' && (
        <div className="flex items-center gap-1 mb-1.5">
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400/70 border border-purple-500/20 font-mono">
            via {idea.source}
          </span>
        </div>
      )}

      {/* Content — click to edit */}
      {editing ? (
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={saveEdit}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit(); }
            if (e.key === 'Escape') { setDraft(idea.content); setEditing(false); }
          }}
          className="w-full bg-transparent text-xs text-white/80 resize-none outline-none leading-relaxed min-h-[60px] placeholder:text-white/20"
          rows={3}
        />
      ) : (
        <p
          className="text-xs text-white/70 leading-relaxed cursor-text select-text"
          onClick={() => setEditing(true)}
        >
          {idea.content}
        </p>
      )}

      {/* Footer — shown on hover */}
      <div className="flex items-center justify-between mt-2 pt-1.5 opacity-0 group-hover:opacity-100 transition-opacity border-t border-white/[0.04]">
        <span className="text-[9px] text-white/25 font-mono">{timeAgoShort(idea.createdAt)}</span>
        <div className="flex items-center gap-1">
          {/* Star */}
          <button
            onClick={handleStarClick}
            className={`w-5 h-5 flex items-center justify-center rounded transition-colors cursor-pointer ${idea.starred ? 'text-amber-400' : 'text-white/25 hover:text-amber-400'}`}
            title={idea.starred ? 'Unstar' : 'Star idea'}
          >
            <Star className={`w-3 h-3 ${idea.starred ? 'fill-amber-400' : ''}`} />
          </button>
          {/* Status move */}
          <select
            value={idea.status}
            onChange={e => onUpdate(idea.id, { status: e.target.value })}
            onClick={e => e.stopPropagation()}
            className="text-[9px] bg-black/50 border border-white/10 text-white/40 rounded px-1 py-0.5 outline-none cursor-pointer hover:text-white/70 transition-colors"
          >
            {STATUS_COLS.map(s => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
          {/* Delete */}
          <button
            onClick={() => onDelete(idea.id)}
            className="w-5 h-5 flex items-center justify-center text-white/20 hover:text-red-400 transition-colors cursor-pointer rounded"
            title="Delete"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

function IdeasTab({ project }: { project: Project }) {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingToCol, setAddingToCol] = useState<string | null>(null);
  const [newIdeaText, setNewIdeaText] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const addInputRef = useRef<HTMLTextAreaElement>(null);

  const fetchIdeas = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/ideas`);
      if (res.ok) setIdeas(await res.json());
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { fetchIdeas(); }, [project.id]);

  useEffect(() => {
    if (addingToCol && addInputRef.current) {
      addInputRef.current.focus();
    }
  }, [addingToCol]);

  // Group ideas by status
  const ideasByStatus = ideas.reduce((acc: Record<string, Idea[]>, idea) => {
    const key = idea.status || 'raw';
    if (!acc[key]) acc[key] = [];
    acc[key].push(idea);
    return acc;
  }, {});

  // Optimistic update helper
  const updateIdeaLocal = (id: string, updates: Partial<Idea>) => {
    setIdeas(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));
  };

  // Handle status change (optimistic + API)
  const handleStatusChange = async (id: string, newStatus: string) => {
    updateIdeaLocal(id, { status: newStatus });
    try {
      await fetch(`/api/projects/${project.id}/ideas?ideaId=${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
    } catch {}
  };

  const handleDelete = async (id: string) => {
    // Optimistic
    setIdeas(prev => prev.filter(i => i.id !== id));
    try {
      await fetch(`/api/projects/${project.id}/ideas?ideaId=${id}`, { method: 'DELETE' });
    } catch {}
  };

  const submitNewIdea = async (status: string) => {
    const text = newIdeaText.trim();
    if (!text) { setAddingToCol(null); return; }

    // Optimistic temp card
    const tempId = `temp-${Date.now()}`;
    const tempIdea: Idea = {
      id: tempId,
      content: text,
      source: 'manual',
      status,
      starred: false,
      createdAt: new Date().toISOString(),
      projectId: project.id,
    };
    setIdeas(prev => [tempIdea, ...prev]);
    setNewIdeaText('');
    setAddingToCol(null);

    try {
      const res = await fetch(`/api/projects/${project.id}/ideas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text, status }),
      });
      if (res.ok) {
        const saved = await res.json();
        setIdeas(prev => prev.map(i => i.id === tempId ? saved : i));
      } else {
        setIdeas(prev => prev.filter(i => i.id !== tempId));
      }
    } catch {
      setIdeas(prev => prev.filter(i => i.id !== tempId));
    }
  };

  // AI validation — streams from cockpit
  const askAI = async () => {
    const rawIdeas = ideas.filter(i => i.status === 'raw').map(i => i.content);
    if (rawIdeas.length === 0) {
      setAiResponse('No raw ideas to evaluate. Add some ideas to the Raw Ideas column first.');
      return;
    }
    setAiLoading(true);
    setAiResponse('');
    try {
      const res = await fetch('/api/cockpit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `I have these raw ideas for the project "${project.name}": ${rawIdeas.map((idea, i) => `${i + 1}. ${idea}`).join(' | ')}. Which one has the most potential and why? Consider: technical feasibility, user value, and how it fits with the project's current phase (${project.phase}). Be direct, pick one winner and explain in 3-4 sentences.`
        }),
      });

      if (!res.ok || !res.body) {
        setAiResponse('AI unavailable — check your GROQ_API_KEY or OPENROUTER_API_KEY.');
        setAiLoading(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        // Parse SSE data lines
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data);
              const token = parsed.choices?.[0]?.delta?.content || '';
              fullText += token;
              setAiResponse(fullText);
            } catch {
              // Plain text stream
              fullText += data;
              setAiResponse(fullText);
            }
          } else if (line.trim() && !line.startsWith(':') && !line.startsWith('event:')) {
            fullText += line;
            setAiResponse(fullText);
          }
        }
      }
    } catch (e) {
      setAiResponse('Failed to reach AI endpoint.');
    }
    setAiLoading(false);
  };

  if (loading) {
    return <div className="p-8 text-center text-xs text-white/30 animate-pulse">Loading ideas...</div>;
  }

  return (
    <div className="p-6 flex flex-col h-full overflow-hidden">
      {/* Header row */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div>
          <h2 className="text-sm font-semibold text-white/80">Ideas Board</h2>
          <p className="text-[10px] text-white/30 font-mono mt-0.5">{ideas.length} idea{ideas.length !== 1 ? 's' : ''} · click any card to edit</p>
        </div>
        <button
          onClick={askAI}
          disabled={aiLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-300 hover:bg-purple-500/20 hover:text-purple-200 transition-all cursor-pointer disabled:opacity-50"
        >
          {aiLoading ? (
            <>
              <RefreshCw className="w-3 h-3 animate-spin" />
              Thinking...
            </>
          ) : (
            <>
              <PlusCircle className="w-3 h-3" />
              Ask AI: what should I build next?
            </>
          )}
        </button>
      </div>

      {/* AI Response panel */}
      {aiResponse && (
        <div className="mb-4 flex-shrink-0 p-3 bg-purple-500/[0.06] border border-purple-500/20 rounded-xl relative">
          <div className="flex items-start gap-2">
            <span className="text-purple-400/60 text-[9px] font-mono uppercase tracking-wider mt-0.5 shrink-0">AI →</span>
            <p className="text-xs text-white/70 leading-relaxed">{aiResponse}</p>
          </div>
          <button
            onClick={() => setAiResponse('')}
            className="absolute top-2 right-2 text-white/20 hover:text-white/50 transition-colors cursor-pointer"
          >
            <AlertCircle className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* 4-column Kanban board */}
      <div className="grid grid-cols-4 gap-3 flex-1 min-h-0">
        {STATUS_COLS.map(col => {
          const colIdeas = ideasByStatus[col.id] || [];
          return (
            <div
              key={col.id}
              className={`flex flex-col border ${col.borderColor} rounded-xl bg-white/[0.01] overflow-hidden`}
            >
              {/* Column header */}
              <div className="px-3 pt-3 pb-2 flex-shrink-0">
                <div className={`flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider ${col.color}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${col.dotColor} flex-shrink-0`} />
                  {col.label}
                  <span className="ml-auto opacity-50 font-mono">{colIdeas.length}</span>
                </div>
              </div>

              {/* Idea cards — scrollable */}
              <div className="flex flex-col gap-2 px-2 pb-2 flex-1 overflow-y-auto custom-scrollbar">
                {colIdeas.map(idea => (
                  <IdeaCard
                    key={idea.id}
                    idea={idea}
                    projectId={project.id}
                    onUpdate={(id, updates) => {
                      if (updates.status && updates.status !== idea.status) {
                        handleStatusChange(id, updates.status);
                      } else {
                        updateIdeaLocal(id, updates);
                      }
                    }}
                    onDelete={handleDelete}
                  />
                ))}

                {/* Inline add input */}
                {addingToCol === col.id && (
                  <div className="bg-white/[0.04] border border-white/10 rounded-lg p-2">
                    <textarea
                      ref={addInputRef}
                      value={newIdeaText}
                      onChange={e => setNewIdeaText(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitNewIdea(col.id); }
                        if (e.key === 'Escape') { setAddingToCol(null); setNewIdeaText(''); }
                      }}
                      onBlur={() => submitNewIdea(col.id)}
                      placeholder="Type an idea and press Enter..."
                      className="w-full bg-transparent text-xs text-white/80 resize-none outline-none leading-relaxed placeholder:text-white/20"
                      rows={2}
                    />
                    <div className="flex items-center gap-1 mt-1">
                      <button
                        onMouseDown={e => { e.preventDefault(); submitNewIdea(col.id); }}
                        className="text-[9px] px-2 py-0.5 rounded bg-white/10 text-white/60 hover:bg-white/15 transition-colors cursor-pointer"
                      >
                        Add
                      </button>
                      <button
                        onMouseDown={e => { e.preventDefault(); setAddingToCol(null); setNewIdeaText(''); }}
                        className="text-[9px] px-2 py-0.5 rounded text-white/25 hover:text-white/50 transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Column footer — add button */}
              <div className="px-3 py-2 flex-shrink-0 border-t border-white/[0.04]">
                <button
                  onClick={() => { setAddingToCol(col.id); setNewIdeaText(''); }}
                  className={`w-full text-left text-[11px] transition-colors cursor-pointer ${col.color} hover:opacity-80`}
                >
                  + add idea
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── 3. Media Tab ──
function MediaVaultTab({ project }: { project: Project }) {
  const [media, setMedia] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [type, setType] = useState("screenshot");

  const fetchMedia = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/media`);
      if (res.ok) setMedia(await res.json());
    } catch (e) {}
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchMedia();
  }, [project.id]);

  const addMedia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    try {
      const res = await fetch(`/api/projects/${project.id}/media`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          url: url.trim(),
          title: title.trim() || undefined
        })
      });
      if (res.ok) {
        const created = await res.json();
        setMedia(prev => [created, ...prev]);
        setUrl("");
        setTitle("");
      }
    } catch (e) {}
  };

  const deleteMedia = async (mediaId: string) => {
    if (!confirm("Delete this media asset?")) return;
    try {
      const res = await fetch(`/api/projects/${project.id}/media?mediaId=${mediaId}`, {
        method: "DELETE"
      });
      if (res.ok) {
        setMedia(prev => prev.filter(m => m.id !== mediaId));
      }
    } catch (e) {}
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <form onSubmit={addMedia} className="grid grid-cols-4 gap-2 bg-[#121217] border border-white/[0.04] p-3 rounded-xl items-end">
        <div className="space-y-1.5 col-span-1">
          <label className="text-[10px] text-white/30 font-mono uppercase">Asset Type</label>
          <select
            value={type}
            onChange={e => setType(e.target.value)}
            className="w-full h-9 bg-black/40 border border-white/10 rounded-lg text-xs text-white px-2 focus:outline-none focus:ring-1 focus:ring-primary/20"
          >
            <option value="screenshot">Screenshot</option>
            <option value="sketch">Design Sketch</option>
            <option value="chat_export">Slack / WhatsApp Export</option>
            <option value="link_preview">External Link Preview</option>
          </select>
        </div>
        <div className="space-y-1.5 col-span-1">
          <label className="text-[10px] text-white/30 font-mono uppercase">Title</label>
          <Input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Dashboard Redesign v2"
            className="h-9 bg-black/40 border-white/10 text-xs text-white rounded-lg focus-visible:ring-primary/20"
          />
        </div>
        <div className="space-y-1.5 col-span-2 flex gap-2 items-end">
          <div className="flex-1 space-y-1.5">
            <label className="text-[10px] text-white/30 font-mono uppercase">Asset URL or Filepath</label>
            <Input
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://example.com/asset.png"
              className="h-9 bg-black/40 border-white/10 text-xs text-white rounded-lg focus-visible:ring-primary/20"
            />
          </div>
          <Button type="submit" size="sm" className="h-9 px-4 bg-white text-black hover:bg-white/90 font-medium text-xs rounded-lg shrink-0">
            Add Asset
          </Button>
        </div>
      </form>

      {loading ? (
        <div className="text-center text-xs text-white/30 py-8">Loading media...</div>
      ) : media.length === 0 ? (
        <div className="text-center text-xs text-white/20 py-12">No media assets in the project vault.</div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {media.map((item) => (
            <div key={item.id} className="bg-[#121217] border border-white/[0.04] rounded-xl overflow-hidden group relative flex flex-col h-48">
              <div className="flex-1 bg-black/40 relative flex items-center justify-center overflow-hidden">
                {item.url.startsWith("http") ? (
                  <img src={item.url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                ) : (
                  <Image className="w-8 h-8 text-white/10" />
                )}
                <Badge variant="secondary" className="absolute top-2 left-2 text-[8px] uppercase bg-black/85 text-white/70 border border-white/10">
                  {item.type}
                </Badge>
                <button
                  onClick={() => deleteMedia(item.id)}
                  className="absolute top-2 right-2 p-1.5 rounded-md bg-black/80 hover:bg-red-500 text-white/50 hover:text-white transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="p-3 flex-shrink-0 bg-[#14141a] border-t border-white/[0.04]">
                <h4 className="text-xs font-semibold text-white/90 truncate">{item.title || "Untitled Asset"}</h4>
                <p className="text-[10px] text-white/40 truncate font-mono mt-0.5">{item.url}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── 4. Brain Dump Tab ──
function BrainDumpTab({ project }: { project: Project }) {
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [newNote, setNewNote] = useState("");

  const fetchNotes = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/notes?projectId=${project.id}`);
      if (res.ok) setNotes(await res.json());
    } catch (e) {}
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchNotes();
  }, [project.id]);

  const addNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    try {
      const res = await fetch(`/api/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newNote.trim(), projectId: project.id })
      });
      if (res.ok) {
        const created = await res.json();
        setNotes(prev => [created, ...prev]);
        setNewNote("");
      }
    } catch (e) {}
  };

  const deleteNote = async (noteId: string) => {
    if (!confirm("Delete this note?")) return;
    try {
      const res = await fetch(`/api/notes?id=${noteId}`, { method: "DELETE" });
      if (res.ok) {
        setNotes(prev => prev.filter(n => n.id !== noteId));
      }
    } catch (e) {}
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <form onSubmit={addNote} className="flex gap-2 bg-[#121217] border border-white/[0.04] p-3 rounded-xl">
        <Input
          value={newNote}
          onChange={e => setNewNote(e.target.value)}
          placeholder="Enter a code memo or feature bug note..."
          className="flex-1 h-9 bg-black/40 border-white/10 text-xs text-white placeholder-white/20 rounded-lg focus-visible:ring-primary/20"
        />
        <Button type="submit" size="sm" className="h-9 px-4 bg-white text-black hover:bg-white/90 font-medium text-xs rounded-lg">
          Save Note
        </Button>
      </form>

      {loading ? (
        <div className="text-center text-xs text-white/30 py-8">Loading notes...</div>
      ) : notes.length === 0 ? (
        <div className="text-center text-xs text-white/20 py-12">Empty brain dump. Tag notes in the Focus Panel using @{project.name}.</div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {notes.map((note) => (
            <div key={note.id} className="p-4 bg-[#121217] border border-white/[0.04] rounded-xl flex flex-col justify-between h-32 group relative">
              <p className="text-xs text-white/70 leading-relaxed font-sans line-clamp-3 overflow-hidden whitespace-pre-wrap">{note.content}</p>
              <div className="flex justify-between items-center mt-3 pt-2 border-t border-white/[0.02]">
                <span className="text-[9px] text-white/25 font-mono">{timeAgo(note.createdAt)}</span>
                <Button variant="ghost" size="icon" className="w-6 h-6 text-white/35 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity absolute top-2 right-2" onClick={() => deleteNote(note.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── 5. Project Tasks Tab ──
function ProjectTasksTab({ project }: { project: Project }) {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("medium");
  const [milestone, setMilestone] = useState("");

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/tasks`);
      if (res.ok) setTasks(await res.json());
    } catch (e) {}
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchTasks();
  }, [project.id]);

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      const res = await fetch(`/api/projects/${project.id}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          priority,
          milestone: milestone.trim() || undefined
        })
      });
      if (res.ok) {
        const created = await res.json();
        setTasks(prev => [...prev, created]);
        setTitle("");
        setMilestone("");
      }
    } catch (e) {}
  };

  const toggleComplete = async (taskId: string, currentVal: boolean) => {
    try {
      const res = await fetch(`/api/projects/${project.id}/tasks?taskId=${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: !currentVal })
      });
      if (res.ok) {
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, completed: !currentVal } : t));
      }
    } catch (e) {}
  };

  const deleteTask = async (taskId: string) => {
    if (!confirm("Delete this task?")) return;
    try {
      const res = await fetch(`/api/projects/${project.id}/tasks?taskId=${taskId}`, {
        method: "DELETE"
      });
      if (res.ok) {
        setTasks(prev => prev.filter(t => t.id !== taskId));
      }
    } catch (e) {}
  };

  // Group tasks by milestone
  const milestones = tasks.reduce((acc: Record<string, any[]>, t) => {
    const key = t.milestone || "No Milestone";
    acc[key] = acc[key] || [];
    acc[key].push(t);
    return acc;
  }, {});

  const priorityColors = {
    urgent: "text-red-400 bg-red-500/10 border-red-500/20",
    high: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    medium: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    low: "text-white/40 bg-white/5 border-white/10"
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <form onSubmit={addTask} className="grid grid-cols-4 gap-2 bg-[#121217] border border-white/[0.04] p-3 rounded-xl items-end">
        <div className="space-y-1.5 col-span-1">
          <label className="text-[10px] text-white/30 font-mono uppercase">Priority</label>
          <select
            value={priority}
            onChange={e => setPriority(e.target.value)}
            className="w-full h-9 bg-black/40 border border-white/10 rounded-lg text-xs text-white px-2 focus:outline-none focus:ring-1 focus:ring-primary/20"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
        <div className="space-y-1.5 col-span-1">
          <label className="text-[10px] text-white/30 font-mono uppercase">Milestone</label>
          <Input
            value={milestone}
            onChange={e => setMilestone(e.target.value)}
            placeholder="Phase 1: Setup"
            className="h-9 bg-black/40 border-white/10 text-xs text-white rounded-lg focus-visible:ring-primary/20"
          />
        </div>
        <div className="space-y-1.5 col-span-2 flex gap-2 items-end">
          <div className="flex-1 space-y-1.5">
            <label className="text-[10px] text-white/30 font-mono uppercase">Task Description</label>
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Configure next-auth providers..."
              className="h-9 bg-black/40 border-white/10 text-xs text-white rounded-lg focus-visible:ring-primary/20"
            />
          </div>
          <Button type="submit" size="sm" className="h-9 px-4 bg-white text-black hover:bg-white/90 font-medium text-xs rounded-lg shrink-0 font-semibold">
            Add
          </Button>
        </div>
      </form>

      {loading ? (
        <div className="text-center text-xs text-white/30 py-8">Loading tasks...</div>
      ) : tasks.length === 0 ? (
        <div className="text-center text-xs text-white/20 py-12">No tasks generated for this project.</div>
      ) : (
        <div className="space-y-6">
          {Object.entries(milestones).map(([mName, mTasks]) => (
            <div key={mName} className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-white/30 font-semibold uppercase tracking-wider font-mono">{mName}</span>
                <div className="flex-1 h-px bg-white/[0.04]" />
              </div>
              <div className="space-y-1.5">
                {mTasks.map((t) => (
                  <div key={t.id} className="flex items-center justify-between p-2.5 bg-[#121217] border border-white/[0.04] rounded-lg group">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={t.completed}
                        onChange={() => toggleComplete(t.id, t.completed)}
                        className="rounded border-white/20 bg-black/40 text-purple-600 focus:ring-purple-500/20"
                      />
                      <span className={`text-xs ${t.completed ? "line-through text-white/30" : "text-white/80"}`}>{t.title}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={`text-[8px] uppercase tracking-wider font-mono px-1 rounded border ${(priorityColors as any)[t.priority] || priorityColors.medium}`}>
                        {t.priority}
                      </Badge>
                      <Button variant="ghost" size="icon" className="w-5 h-5 text-white/30 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => deleteTask(t.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── 6. Control Room Tab ──
function ControlRoomTab({ project }: { project: Project }) {
  const vercel = useBootstrapStore(s => s.vercel);
  const updateProject = useProjectStore(s => s.updateProject);

  const [deployments, setDeployments] = useState<any[]>([]);
  const [deploymentsLoading, setDeploymentsLoading] = useState(false);
  const [weeklyVisits, setWeeklyVisits] = useState<number[]>([]);
  const [totalVisits, setTotalVisits] = useState(0);
  const [maxVisits, setMaxVisits] = useState(1);

  const [projectLinks, setProjectLinks] = useState<any[]>([]);
  const [linksLoading, setLinksLoading] = useState(false);
  const [pingingLinks, setPingingLinks] = useState(false);

  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [newLinkLabel, setNewLinkLabel] = useState("");
  const [newLinkType, setNewLinkType] = useState("other");
  const [creatingLink, setCreatingLink] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  const fetchDeploymentsAndVisits = () => {
    if (!project.vercelProjectId) return;
    setDeploymentsLoading(true);
    fetch(`/api/vercel?type=deployments&vercelProjectId=${project.vercelProjectId}`)
      .then(r => r.json())
      .then(data => {
        setDeployments(data.deployments || []);
        setDeploymentsLoading(false);
      })
      .catch(() => setDeploymentsLoading(false));

    fetch(`/api/vercel?type=analytics&projectId=${project.vercelProjectId}`)
      .then(r => r.json())
      .then(data => {
        const rawVisits = data.data?.map((d: any) => d.visits ?? d.views ?? 0) || [];
        const visits = [...Array(7)].map((_, i) => rawVisits[i] ?? 0);
        setWeeklyVisits(visits);
        setTotalVisits(visits.reduce((a, b) => a + b, 0));
        setMaxVisits(Math.max(...visits, 1));
      })
      .catch(() => {
        setWeeklyVisits([0,0,0,0,0,0,0]);
        setTotalVisits(0);
        setMaxVisits(1);
      });
  };

  const fetchLinks = async () => {
    setLinksLoading(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/links`);
      const data = await res.json();
      setProjectLinks(Array.isArray(data) ? data : []);
    } catch (e) {}
    finally { setLinksLoading(false); }
  };

  useEffect(() => {
    fetchDeploymentsAndVisits();
    fetchLinks();
  }, [project.id]);

  const pingLinks = async () => {
    if (projectLinks.length === 0) return;
    setPingingLinks(true);
    try {
      await Promise.all(
        projectLinks.map(async (link) => {
          try {
            const res = await fetch(`/api/projects/${project.id}/links/ping?linkId=${link.id}`, { method: "POST" });
            if (res.ok) {
              const data = await res.json();
              if (Array.isArray(data) && data[0]) {
                const updatedLink = data[0];
                setProjectLinks(prev => prev.map(l => l.id === updatedLink.id ? updatedLink : l));
              }
            }
          } catch (e) {}
        })
      );
    } catch (e) {}
    finally { setPingingLinks(false); }
  };

  const submitNewLink = async () => {
    if (!newLinkUrl || !newLinkLabel) return;
    setCreatingLink(true);
    try {
      let urlToSubmit = newLinkUrl;
      if (!urlToSubmit.startsWith('http')) {
        urlToSubmit = 'https://' + urlToSubmit;
      }
      const res = await fetch(`/api/projects/${project.id}/links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlToSubmit, label: newLinkLabel, type: newLinkType })
      });
      if (res.ok) {
        fetchLinks();
        setNewLinkUrl("");
        setNewLinkLabel("");
        setNewLinkType("other");
        setJustAdded(true);
        setTimeout(() => setJustAdded(false), 2000);
      }
    } catch (e) {}
    finally { setCreatingLink(false); }
  };

  const deleteLink = async (linkId: string) => {
    try {
      const res = await fetch(`/api/projects/${project.id}/links/${linkId}`, {
        method: "DELETE"
      });
      if (res.ok) {
        setProjectLinks(prev => prev.filter(l => l.id !== linkId));
      }
    } catch (e) {}
  };

  const mapVercelProject = async (vercelProjId: string) => {
    try {
      const vp = vercel?.projects?.find((p: any) => p.id === vercelProjId);
      let alias = "";
      if (vp) {
        const rawAlias = vp.targets?.production?.alias?.[0] || vp.alias?.[0];
        if (rawAlias) alias = `https://${rawAlias}`;
      }
      await updateProject(project.id, { vercelProjectId: vercelProjId, liveUrl: alias || undefined });
      alert("Successfully linked to Vercel project!");
      fetchDeploymentsAndVisits();
    } catch (e) {}
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="grid grid-cols-2 gap-4">
        {/* Vercel details */}
        <div className="bg-[#121217] border border-white/[0.04] p-5 rounded-xl space-y-4">
          <h4 className="text-xs uppercase font-mono tracking-wider text-white/40">Vercel Deployment</h4>
          {!project.vercelProjectId ? (
            <div className="space-y-3">
              <p className="text-xs text-white/40">Link a Vercel project to load traffic metrics & deployments.</p>
              <select
                onChange={e => mapVercelProject(e.target.value)}
                className="w-full h-8 bg-black/40 border border-white/10 rounded-lg text-xs text-white px-2 focus:outline-none focus:ring-1 focus:ring-primary/20"
              >
                <option value="">Select Vercel Project...</option>
                {vercel?.projects?.map((vp: any) => (
                  <option key={vp.id} value={vp.id}>{vp.name}</option>
                ))}
              </select>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-black/40 border border-white/5">
                <div>
                  <span className="text-[9px] font-bold uppercase text-white/20 tracking-wider">Weekly Visits</span>
                  <p className="text-xl font-bold font-mono text-white mt-0.5">{totalVisits}</p>
                </div>
                <div className="h-6 flex items-end gap-1.5 select-none pr-1">
                  {weeklyVisits.map((v, idx) => (
                    <div
                      key={idx}
                      style={{ height: `${Math.max(15, Math.round((v / maxVisits) * 100))}%` }}
                      className="w-1.5 bg-blue-500/60 hover:bg-blue-400 rounded-t transition-all duration-300"
                      title={`${v} visits`}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-[9px] font-bold uppercase text-white/20 tracking-wider">Deployments</span>
                {deploymentsLoading ? (
                  <p className="text-[10px] text-white/30 animate-pulse">Loading deployments...</p>
                ) : (
                  <div className="space-y-2">
                    {deployments.slice(0, 3).map((dep: any) => (
                      <div key={dep.uid} className="flex items-center justify-between p-2 rounded-lg bg-black/35 border border-white/5 text-xs text-white/60">
                        <span className="truncate flex-1 pr-2">{dep.meta?.githubCommitMessage || dep.name || "Deploy"}</span>
                        <Badge variant="outline" className="text-[8px] uppercase tracking-wide text-white/40 shrink-0 font-mono">
                          {dep.state}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Link creation */}
        <div className="bg-[#121217] border border-white/[0.04] p-5 rounded-xl space-y-4">
          <h4 className="text-xs uppercase font-mono tracking-wider text-white/40">Add Environment Link</h4>
          <div className="space-y-3">
            <Input
              value={newLinkLabel}
              onChange={e => setNewLinkLabel(e.target.value)}
              placeholder="Database Connection"
              className="h-8 bg-black/40 border-white/10 text-xs text-white rounded-lg focus-visible:ring-primary/20"
            />
            <div className="flex gap-2">
              <select
                value={newLinkType}
                onChange={e => setNewLinkType(e.target.value)}
                className="h-8 bg-black/40 border border-white/10 rounded-lg text-xs text-white px-2 focus:outline-none focus:ring-1 focus:ring-primary/20 flex-1"
              >
                <option value="frontend">Frontend</option>
                <option value="backend">Backend</option>
                <option value="database">Database</option>
                <option value="storage">Storage</option>
                <option value="monitoring">Monitoring</option>
                <option value="logs">Logs</option>
                <option value="other">Other</option>
              </select>
              <Input
                value={newLinkUrl}
                onChange={e => setNewLinkUrl(e.target.value)}
                placeholder="https://console.neon.tech"
                className="h-8 bg-black/40 border-white/10 text-xs text-white rounded-lg focus-visible:ring-primary/20 flex-[2]"
              />
            </div>
            <Button
              onClick={submitNewLink}
              disabled={creatingLink || !newLinkUrl || !newLinkLabel}
              className={`w-full h-8 text-xs font-semibold rounded-lg transition-all ${
                justAdded ? 'bg-green-500 hover:bg-green-600 text-white' : 'bg-white text-black hover:bg-white/90'
              }`}
            >
              {creatingLink ? "..." : justAdded ? "Added!" : "Save Link"}
            </Button>
          </div>
        </div>
      </div>

      {/* Infrastructure list */}
      <div className="bg-[#121217] border border-white/[0.04] p-5 rounded-xl space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-xs uppercase font-mono tracking-wider text-white/40">Infrastructure Links</h4>
          <Button size="sm" variant="outline" className="h-7 text-[10px] bg-transparent border-white/10 text-white/70 hover:bg-white/5 cursor-pointer" onClick={pingLinks} disabled={pingingLinks}>
            {pingingLinks ? "Pinging..." : "Ping All"}
          </Button>
        </div>

        {linksLoading ? (
          <p className="text-xs text-white/30 text-center py-4">Loading infrastructure links...</p>
        ) : projectLinks.length === 0 ? (
          <p className="text-xs text-white/20 text-center py-4">No external dashboard links added yet.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {projectLinks.map((link) => (
              <div key={link.id} className="p-2.5 rounded-lg bg-black/40 border border-white/5 flex items-center justify-between gap-3 group">
                <div className="flex items-center gap-2 min-w-0">
                  <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    !link.lastPinged || link.lastStatus === null ? 'bg-gray-500' :
                    (link.lastStatus >= 200 && link.lastStatus < 300) ? 'bg-green-400' : 'bg-red-400'
                  }`} />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white/80 truncate leading-tight">{link.label}</p>
                    <span className="text-[9px] font-mono text-white/30 truncate block mt-0.5">{link.url.replace(/^https?:\/\//, '')}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <a href={link.url} target="_blank" className="w-6 h-6 text-white/35 hover:text-white hover:bg-white/5 inline-flex items-center justify-center rounded-md" title="Open Link">
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <Button size="icon" variant="ghost" className="w-6 h-6 text-white/35 hover:text-red-400" onClick={() => deleteLink(link.id)} title="Delete Link">
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Main Overlay Component
// ─────────────────────────────────────────────

export function ProjectOS() {
  const { isOpen, selectedProjectId, activeTab, close, selectProject, setTab } = useProjectOSStore();
  const { projects } = useProjectStore();

  const selectedProject = projects.find(p => p.id === selectedProjectId) || null;

  // ESC key to close overlay
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [close]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#0a0a0f] flex flex-col pointer-events-auto select-text text-foreground">
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.15 }}
        className="w-full h-full flex flex-col"
      >
        {/* Header bar — matches the AmbientBar height (40px) */}
        <div className="h-10 flex items-center px-4 border-b border-white/[0.04] flex-shrink-0 bg-[#07070a] select-none">
          <button onClick={close} className="flex items-center gap-1 text-white/40 hover:text-white/70 transition-colors mr-3 cursor-pointer text-xs">
            <ArrowLeft className="w-3 h-3" />
            <span>DevOS</span>
          </button>
          <span className="text-xs text-white/20 mx-2">/</span>
          <span className="text-xs text-white/60 font-medium">Projects</span>
          {selectedProject && (
            <>
              <span className="text-xs text-white/20 mx-2">/</span>
              <span className="text-xs text-white font-medium">{selectedProject.name}</span>
            </>
          )}
          <div className="flex-1" />
          {selectedProject && <PhaseBadge project={selectedProject} />}
        </div>

        {/* Main content — sidebar + content area */}
        <div className="flex flex-1 min-h-0">

          {/* LEFT SIDEBAR — project list organized by phase */}
          <div className="w-52 border-r border-white/[0.04] bg-[#07070a] flex flex-col flex-shrink-0 overflow-y-auto select-none custom-scrollbar">
            {/* Phase groups */}
            {PHASES.map(phase => {
              const phaseProjects = projects.filter(p => p.phase === phase.id);
              if (phaseProjects.length === 0) return null;
              return (
                <div key={phase.id} className="mb-1">
                  <div className="px-3 pt-3 pb-1 flex items-center gap-2">
                    <span className="text-[10px] text-white/25 font-medium uppercase tracking-wider">
                      {phase.label}
                    </span>
                    <span className="text-[10px] text-white/15">{phaseProjects.length}</span>
                  </div>
                  {phaseProjects.map(p => (
                    <button
                      key={p.id}
                      onClick={() => selectProject(p.id)}
                      className={`w-full text-left px-3 py-2 flex items-center gap-2 transition-colors cursor-pointer
                        ${selectedProjectId === p.id
                          ? 'bg-white/[0.06] text-white'
                          : 'text-white/50 hover:text-white/80 hover:bg-white/[0.03]'}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${phase.dotColor}`} />
                      <span className="text-xs truncate flex-1">{p.name}</span>
                      {p.health && p.health < 50 && (
                        <span className="text-[9px] text-red-400/60 font-semibold font-mono shrink-0">{p.health}%</span>
                      )}
                    </button>
                  ))}
                </div>
              );
            })}

            {/* Add new project button */}
            <button
              onClick={() => {
                close();
                // Dispatch event to open Add Project Dialog on Dashboard
                setTimeout(() => {
                  window.dispatchEvent(new CustomEvent("open_projects_add_dialog"));
                }, 100);
              }}
              className="mx-3 mt-4 mb-3 py-1.5 text-xs text-white/25 hover:text-white/50 border border-white/[0.06] hover:border-white/10 rounded-md transition-colors cursor-pointer text-center font-medium bg-transparent"
            >
              + new project
            </button>
          </div>

          {/* RIGHT CONTENT AREA */}
          {selectedProject ? (
            <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-[#0a0a0f]">

              {/* Project header */}
              <div className="px-6 py-4 border-b border-white/[0.04] flex items-start gap-4 flex-shrink-0">
                <div className="w-12 h-12 rounded-lg bg-white/[0.04] border border-white/[0.06] overflow-hidden flex-shrink-0 flex items-center justify-center">
                  {selectedProject.ogImageUrl ? (
                    <img src={selectedProject.ogImageUrl} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-purple-400/70 text-lg font-bold font-mono bg-purple-500/10 border border-purple-500/20 rounded-lg">
                      {selectedProject.name[0].toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-base font-semibold text-white">{selectedProject.name}</h1>
                  <p className="text-xs text-white/40 mt-0.5 truncate">{selectedProject.description || 'No description'}</p>
                  <div className="flex items-center gap-3 mt-2 select-none">
                    {selectedProject.githubUrl && (
                      <a href={selectedProject.githubUrl} target="_blank" className="text-[11px] text-white/30 hover:text-white/60 flex items-center gap-1 font-medium">
                        GitHub ↗
                      </a>
                    )}
                    {selectedProject.liveUrl && (
                      <a href={selectedProject.liveUrl} target="_blank" className="text-[11px] text-white/30 hover:text-white/60 flex items-center gap-1 font-medium">
                        Live ↗
                      </a>
                    )}
                    <span className="text-[11px] text-white/20">
                      Updated {timeAgo(selectedProject.updatedAt)}
                    </span>
                  </div>
                </div>
                {/* Health score */}
                <div className="flex-shrink-0 text-right select-none">
                  <div className={`text-2xl font-bold font-mono leading-none ${
                    (selectedProject.health ?? 100) >= 70 ? 'text-green-400' :
                    (selectedProject.health ?? 100) >= 40 ? 'text-amber-400' : 'text-red-400'
                  }`}>{selectedProject.health ?? '—'}%</div>
                  <div className="text-[10px] text-white/25 font-semibold uppercase tracking-wider font-mono mt-1">health</div>
                </div>
              </div>

              {/* Tab navigation */}
              <div className="px-6 flex items-center gap-1 border-b border-white/[0.04] flex-shrink-0 bg-[#09090d] select-none">
                {TABS.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setTab(tab.id as any)}
                    className={`px-3 py-2.5 text-xs font-semibold transition-colors border-b-2 -mb-px cursor-pointer
                      ${activeTab === tab.id
                        ? 'text-white border-purple-500'
                        : 'text-white/35 border-transparent hover:text-white/60'}`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab content — ideas fills, others scroll */}
              <div className={`flex-1 min-h-0 ${activeTab === 'ideas' ? 'overflow-hidden' : 'overflow-y-auto custom-scrollbar'}`}>
                {activeTab === 'overview' && <OverviewTab project={selectedProject} />}
                {activeTab === 'ideas' && <IdeasTab project={selectedProject} />}
                {activeTab === 'media' && <MediaVaultTab project={selectedProject} />}
                {activeTab === 'braindump' && <BrainDumpTab project={selectedProject} />}
                {activeTab === 'tasks' && <ProjectTasksTab project={selectedProject} />}
                {activeTab === 'controlroom' && <ControlRoomTab project={selectedProject} />}
              </div>

            </div>
          ) : (
            // Empty state when no project selected
            <div className="flex-1 flex items-center justify-center bg-[#0a0a0f] select-none">
              <div className="text-center">
                <FolderOpen className="w-10 h-10 text-white/10 mx-auto mb-2" />
                <div className="text-white/30 text-xs font-medium">Select a project from the sidebar</div>
                <div className="text-white/15 text-[10px] font-mono mt-1">or register a new local workspace folder</div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
