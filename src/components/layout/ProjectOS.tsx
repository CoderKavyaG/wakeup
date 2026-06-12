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
  FolderOpen,
  Code2,
  Lightbulb,
  FlaskConical,
  BookOpen,
  Search,
  Sparkles,
  ChevronRight,
  Pencil,
  Activity,
  X,
  Terminal
} from "lucide-react";
import ProjectTasksTab from "./ProjectTasksTab";
import ProjectOSCommandPalette from "./ProjectOSCommandPalette";
import ProjectPhysicsBox from "./ProjectPhysicsBox";

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
    <div className="p-6 space-y-6 max-w-4xl animate-in fade-in duration-300">
      {/* Overview Cards Grid */}
      <div className="grid grid-cols-3 gap-5">
        <div className="bg-white/[0.02] border border-white/[0.05] p-5 rounded-2xl space-y-2 hover:border-white/10 transition-colors">
          <span className="text-[10px] uppercase tracking-wider text-white/30 font-mono font-semibold">Completion</span>
          <p className="text-3xl font-extrabold font-mono text-white leading-none">
            {project.completionPercentage ?? 0}%
          </p>
          <div className="w-full bg-white/[0.04] h-1.5 rounded-full overflow-hidden mt-3">
            <div
              className="bg-gradient-to-r from-purple-500 to-indigo-500 h-full rounded-full"
              style={{ width: `${project.completionPercentage ?? 0}%` }}
            />
          </div>
        </div>

        <div className="bg-white/[0.02] border border-white/[0.05] p-5 rounded-2xl space-y-2 hover:border-white/10 transition-colors">
          <span className="text-[10px] uppercase tracking-wider text-white/30 font-mono font-semibold">Status</span>
          <div className="flex items-center gap-2 mt-1">
            <span className={`w-2 h-2 rounded-full ${project.status === "active" ? "bg-green-400" :
                project.status === "planning" ? "bg-blue-400" :
                  project.status === "completed" ? "bg-purple-400" : "bg-amber-400"
              }`} />
            <span className="text-sm font-semibold capitalize text-white/80">{project.status}</span>
          </div>
        </div>

        <div className="bg-white/[0.02] border border-white/[0.05] p-5 rounded-2xl space-y-2 hover:border-white/10 transition-colors">
          <span className="text-[10px] uppercase tracking-wider text-white/30 font-mono font-semibold">Linked Workspace</span>
          <p className="text-xs font-mono text-white/60 truncate mt-1.5" title={project.folderPath || "Local-only unlinked"}>
            {project.folderPath || "No local path connected"}
          </p>
        </div>
      </div>

      {/* Architecture & Resume section */}
      <div className="bg-white/[0.02] border border-white/[0.05] p-6 rounded-2xl space-y-5">
        <h3 className="text-xs uppercase tracking-wider text-white/40 font-mono font-semibold">Project Intelligence</h3>

        <div className="space-y-5">
          <div className="space-y-1.5">
            <span className="text-[10px] text-white/35 font-mono uppercase tracking-wider block">Architecture Overview</span>
            <p className="text-xs text-white/70 leading-relaxed whitespace-pre-wrap font-sans">
              {project.architectureNotes || "No architecture notes documented yet."}
            </p>
          </div>

          <div className="h-px bg-white/[0.05]" />

          <div className="space-y-1.5">
            <span className="text-[10px] text-white/35 font-mono uppercase tracking-wider block">Auto-Generated Resume Context</span>
            <div className="p-3 bg-white/[0.01] border border-white/[0.03] rounded-xl">
              <p className="text-xs text-white/60 leading-relaxed font-mono italic">
                {project.resumeBullet ? project.resumeBullet : "Create task list milestones and push code to generate portfolio bullet points."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 2. Ideas Tab ──
const STATUS_COLS = [
  { id: 'raw', label: 'Raw Ideas', color: 'text-white/40', borderColor: 'border-white/[0.06]', dotColor: 'bg-white/30' },
  { id: 'validated', label: 'Validated', color: 'text-blue-400/80', borderColor: 'border-blue-500/20', dotColor: 'bg-blue-400' },
  { id: 'building', label: 'Building', color: 'text-green-400/80', borderColor: 'border-green-500/20', dotColor: 'bg-green-400' },
  { id: 'shelved', label: 'Shelved', color: 'text-white/20', borderColor: 'border-white/[0.04]', dotColor: 'bg-white/20' },
];

function timeAgoShort(date: string) {
  const d = new Date(date);
  const now = Date.now();
  const diff = now - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'now';
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
    } catch { }
  };

  const handleStarClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdate(idea.id, { starred: !idea.starred });
    fetch(`/api/projects/${projectId}/ideas?ideaId=${idea.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ starred: !idea.starred }),
    }).catch(() => { });
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
    } catch { }
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
    } catch { }
  };

  const handleDelete = async (id: string) => {
    // Optimistic
    setIdeas(prev => prev.filter(i => i.id !== id));
    try {
      await fetch(`/api/projects/${project.id}/ideas?ideaId=${id}`, { method: 'DELETE' });
    } catch { }
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

// ── 3. Media Vault Tab ──
interface MediaItem {
  id: string;
  type: string;
  url: string;
  thumbnailUrl?: string | null;
  title?: string | null;
  description?: string | null;
  mimeType?: string | null;
  sizeBytes?: number | null;
  createdAt: string;
}

const MEDIA_FILTERS = ['all', 'image', 'screenshot', 'sketch', 'link_preview'] as const;

function MediaVaultTab({ project }: { project: Project }) {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkLoading, setLinkLoading] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const [lightboxItem, setLightboxItem] = useState<MediaItem | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchMedia = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/media`);
      if (res.ok) setMedia(await res.json());
    } catch { }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchMedia(); }, [project.id]);

  // ── ESC closes lightbox ──
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && lightboxItem) {
        e.stopPropagation();
        setLightboxItem(null);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [lightboxItem]);

  // ── File upload handler ──
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);

    const formData = new FormData();
    Array.from(files).forEach(f => formData.append('files', f));
    formData.append('type', 'image');

    try {
      const res = await fetch(`/api/projects/${project.id}/media`, {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        const items = Array.isArray(data) ? data : [data];
        setMedia(prev => [...items, ...prev]);
      }
    } catch { }
    finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ── Link preview handler ──
  const handleLinkPreview = async (url: string) => {
    if (!url.trim()) return;
    let fullUrl = url.trim();
    if (!fullUrl.startsWith('http')) fullUrl = 'https://' + fullUrl;

    setLinkLoading(true);
    setLinkUrl('');

    // Optimistic temp card
    const tempId = `temp-link-${Date.now()}`;
    const tempItem: MediaItem = {
      id: tempId, type: 'link_preview', url: fullUrl,
      title: 'Fetching preview...', createdAt: new Date().toISOString(),
    };
    setMedia(prev => [tempItem, ...prev]);

    try {
      const res = await fetch(`/api/projects/${project.id}/media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'link_preview', url: fullUrl }),
      });
      if (res.ok) {
        const saved = await res.json();
        setMedia(prev => prev.map(m => m.id === tempId ? saved : m));
      } else {
        setMedia(prev => prev.filter(m => m.id !== tempId));
      }
    } catch {
      setMedia(prev => prev.filter(m => m.id !== tempId));
    }
    setLinkLoading(false);
  };

  // ── Delete media ──
  const deleteMedia = async (mediaId: string) => {
    setMedia(prev => prev.filter(m => m.id !== mediaId));
    if (lightboxItem?.id === mediaId) setLightboxItem(null);
    try {
      await fetch(`/api/projects/${project.id}/media?mediaId=${mediaId}`, { method: 'DELETE' });
    } catch { }
  };

  // ── Filter logic ──
  const filteredItems = filter === 'all' ? media : media.filter(m => m.type === filter);

  // ── Determine if URL is renderable as image ──
  const isImageUrl = (url: string) =>
    url.startsWith('/uploads/') || /\.(jpg|jpeg|png|gif|webp|svg|bmp|avif)(\?|$)/i.test(url) || url.startsWith('http');

  if (loading) {
    return <div className="p-8 text-center text-xs text-white/30 animate-pulse">Loading media...</div>;
  }

  return (
    <div className="p-6 overflow-y-auto h-full custom-scrollbar">
      {/* Upload toolbar */}
      <div className="flex items-center gap-3 mb-4">
        <label className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded-lg bg-white/[0.06] border border-white/10 text-white/60 hover:bg-white/10 hover:text-white/80 transition-all cursor-pointer ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleUpload}
          />
          {uploading ? (
            <><RefreshCw className="w-3 h-3 animate-spin" /> Uploading...</>
          ) : (
            <>
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5"><path d="M8 12V3M4 7l4-4 4 4" /><path d="M2 14h12" /></svg>
              Upload images
            </>
          )}
        </label>

        <div className="flex-1 flex items-center gap-2">
          <input
            value={linkUrl}
            onChange={e => setLinkUrl(e.target.value)}
            placeholder="Paste a URL to save a link preview..."
            className="flex-1 h-8 bg-black/40 border border-white/10 rounded-lg text-xs text-white px-3 focus:outline-none focus:ring-1 focus:ring-purple-500/30 placeholder:text-white/20 transition-colors"
            onKeyDown={e => { if (e.key === 'Enter') handleLinkPreview(linkUrl); }}
            disabled={linkLoading}
          />
          {linkUrl && (
            <button
              onClick={() => handleLinkPreview(linkUrl)}
              disabled={linkLoading}
              className="text-[10px] px-2 py-1 bg-purple-500/10 border border-purple-500/20 text-purple-300 rounded-md hover:bg-purple-500/20 transition-colors cursor-pointer disabled:opacity-50"
            >
              {linkLoading ? '...' : 'Preview'}
            </button>
          )}
        </div>

        <span className="text-[10px] text-white/20 font-mono shrink-0">{media.length} items</span>
      </div>

      {/* Filter pills */}
      <div className="flex gap-1.5 mb-5">
        {MEDIA_FILTERS.map(t => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`text-[10px] px-2.5 py-1 rounded-full transition-all cursor-pointer font-medium ${filter === t
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                : 'text-white/30 hover:text-white/50 border border-transparent hover:border-white/10'
              }`}
          >
            {t === 'all' ? 'All' : t === 'link_preview' ? 'Link Preview' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Masonry grid */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-16">
          <Image className="w-10 h-10 text-white/10 mx-auto mb-3" />
          <div className="text-white/25 text-sm font-medium">No media yet</div>
          <div className="text-white/15 text-[11px] mt-1">Upload screenshots, sketches, or paste a URL</div>
        </div>
      ) : (
        <div style={{ columns: '3 220px', gap: '12px' }}>
          {filteredItems.map(item => (
            <div
              key={item.id}
              style={{ breakInside: 'avoid', marginBottom: '12px' }}
              className="group relative rounded-xl overflow-hidden border border-white/[0.06] bg-white/[0.02] cursor-pointer hover:border-white/10 transition-colors"
              onClick={() => setLightboxItem(item)}
            >
              {item.type === 'link_preview' ? (
                // ── Link preview card ──
                <div className="p-3 space-y-2">
                  {item.thumbnailUrl && (
                    <img
                      src={item.thumbnailUrl}
                      className="w-full rounded-lg object-cover max-h-36"
                      loading="lazy"
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  )}
                  <div className="text-xs font-semibold text-white/70 leading-tight line-clamp-2">{item.title || 'Untitled'}</div>
                  <div className="text-[9px] text-white/25 font-mono truncate">{item.url.replace(/^https?:\/\//, '')}</div>
                  {item.description && (
                    <p className="text-[11px] text-white/40 leading-relaxed line-clamp-3">{item.description}</p>
                  )}
                  <Badge variant="outline" className="text-[8px] uppercase text-purple-400/60 border-purple-500/20 bg-purple-500/5 font-mono tracking-wider">
                    link preview
                  </Badge>
                </div>
              ) : (
                // ── Image card ──
                <>
                  {isImageUrl(item.url) ? (
                    <img
                      src={item.url}
                      className="w-full object-cover"
                      loading="lazy"
                      onError={e => {
                        (e.target as HTMLImageElement).style.display = 'none';
                        const parent = (e.target as HTMLImageElement).parentElement;
                        if (parent) {
                          const placeholder = document.createElement('div');
                          placeholder.className = 'w-full h-32 flex items-center justify-center bg-black/30';
                          placeholder.innerHTML = '<span class="text-white/15 text-xs">Image unavailable</span>';
                          parent.insertBefore(placeholder, e.target as HTMLImageElement);
                        }
                      }}
                    />
                  ) : (
                    <div className="w-full h-32 flex items-center justify-center bg-black/30">
                      <Image className="w-8 h-8 text-white/10" />
                    </div>
                  )}
                  {/* Type badge */}
                  <Badge variant="secondary" className="absolute top-2 left-2 text-[8px] uppercase bg-black/75 text-white/60 border border-white/10 backdrop-blur-sm font-mono tracking-wider">
                    {item.type}
                  </Badge>
                  {/* Title bar */}
                  {item.title && (
                    <div className="p-2 bg-[#0c0c10] border-t border-white/[0.04]">
                      <span className="text-[10px] text-white/50 truncate block">{item.title}</span>
                    </div>
                  )}
                </>
              )}

              {/* Hover overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                <div className="flex items-center justify-between w-full">
                  <span className="text-[10px] text-white/50 font-mono">{item.type}</span>
                  <button
                    onClick={e => { e.stopPropagation(); deleteMedia(item.id); }}
                    className="w-6 h-6 flex items-center justify-center rounded-md bg-black/60 text-white/50 hover:text-red-400 hover:bg-red-500/20 transition-colors cursor-pointer"
                    title="Delete"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Lightbox ── */}
      {lightboxItem && (
        <div
          className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-sm flex items-center justify-center cursor-zoom-out select-none"
          onClick={() => setLightboxItem(null)}
        >
          <div className="relative max-w-[92vw] max-h-[90vh]" onClick={e => e.stopPropagation()}>
            {lightboxItem.type === 'link_preview' ? (
              <div className="bg-[#121217] border border-white/10 rounded-xl p-6 max-w-md space-y-3">
                {lightboxItem.thumbnailUrl && (
                  <img src={lightboxItem.thumbnailUrl} className="w-full rounded-lg object-cover max-h-56" />
                )}
                <h3 className="text-sm font-semibold text-white">{lightboxItem.title || 'Untitled'}</h3>
                <a href={lightboxItem.url} target="_blank" className="text-[11px] text-purple-400 hover:underline font-mono block truncate">{lightboxItem.url}</a>
                {lightboxItem.description && (
                  <p className="text-xs text-white/50 leading-relaxed">{lightboxItem.description}</p>
                )}
              </div>
            ) : (
              <img
                src={lightboxItem.url}
                className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg shadow-2xl"
              />
            )}
            {lightboxItem.title && lightboxItem.type !== 'link_preview' && (
              <div className="absolute -bottom-8 left-0 right-0 text-center">
                <span className="text-xs text-white/40">{lightboxItem.title}</span>
              </div>
            )}
          </div>
          <button
            onClick={() => setLightboxItem(null)}
            className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white/60 hover:text-white flex items-center justify-center transition-colors cursor-pointer text-lg"
          >
            ✕
          </button>
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
    } catch (e) { }
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
    } catch (e) { }
  };

  const deleteNote = async (noteId: string) => {
    if (!confirm("Delete this note?")) return;
    try {
      const res = await fetch(`/api/notes?id=${noteId}`, { method: "DELETE" });
      if (res.ok) {
        setNotes(prev => prev.filter(n => n.id !== noteId));
      }
    } catch (e) { }
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
// Imported from ./ProjectTasksTab

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
        setWeeklyVisits([0, 0, 0, 0, 0, 0, 0]);
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
    } catch (e) { }
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
          } catch (e) { }
        })
      );
    } catch (e) { }
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
    } catch (e) { }
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
    } catch (e) { }
  };

  const mapVercelProject = async (vercelProjId: string) => {
    try {
      const vp = vercel?.projects?.find((p: any) => p.id === vercelProjId);
      if (vp) {
        await updateProject(project.id, { vercelProjectId: vercelProjId });
      }
    } catch (e) { }
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl animate-in fade-in duration-300">

      {/* Vercel and Add Environment Link row */}
      <div className="grid grid-cols-2 gap-6">

        {/* Vercel Deployment Control */}
        <div className="bg-white/[0.02] border border-white/[0.05] p-6 rounded-2xl flex flex-col space-y-5">
          <div className="flex items-center justify-between">
            <h4 className="text-xs uppercase font-mono tracking-widest text-white/40 font-bold">Vercel Deployment</h4>
            {project.vercelProjectId && (
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20 font-mono font-bold uppercase tracking-wider">
                connected
              </span>
            )}
          </div>

          {!project.vercelProjectId ? (
            <div className="flex-1 flex flex-col justify-center space-y-4 py-4">
              <p className="text-xs text-white/55 leading-relaxed">
                Connect a Vercel project to load visitor traffic metrics and trigger production deployments.
              </p>
              <select
                onChange={e => mapVercelProject(e.target.value)}
                className="w-full h-9 bg-white/[0.02] border border-white/[0.08] rounded-xl text-xs text-white px-3 focus:outline-none focus:border-purple-500/40 cursor-pointer font-semibold transition-all"
              >
                <option value="" className="bg-[#0f0f11]">Select Vercel Project...</option>
                {vercel?.projects?.map((vp: any) => (
                  <option key={vp.id} value={vp.id} className="bg-[#0f0f11]">{vp.name}</option>
                ))}
              </select>
            </div>
          ) : (
            <div className="space-y-5 flex-1 flex flex-col justify-between">
              <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.01] border border-white/[0.03]">
                <div>
                  <span className="text-[9px] font-bold uppercase text-white/30 tracking-wider">Weekly Visits</span>
                  <p className="text-2xl font-bold font-mono text-white mt-1">{totalVisits}</p>
                </div>
                <div className="h-10 flex items-end gap-2 pr-1 select-none">
                  {weeklyVisits.map((v, idx) => (
                    <div
                      key={idx}
                      style={{ height: `${Math.max(15, Math.round((v / maxVisits) * 100))}%` }}
                      className="w-2.5 bg-gradient-to-t from-purple-500 to-indigo-400 hover:from-purple-400 hover:to-indigo-300 rounded-t transition-all duration-300 cursor-help"
                      title={`${v} visits`}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-2.5">
                <span className="text-[9px] font-bold uppercase text-white/30 tracking-wider block">Production Deployments</span>
                {deploymentsLoading ? (
                  <p className="text-[10px] text-white/30 animate-pulse font-mono">Fetching deployment history...</p>
                ) : (
                  <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                    {deployments.slice(0, 3).map((dep: any) => {
                      const isReady = dep.state === "READY";
                      const isError = dep.state === "ERROR" || dep.state === "FAILED";
                      return (
                        <div key={dep.uid} className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.01] border border-white/[0.03] text-xs text-white/60 hover:bg-white/[0.03] transition-colors">
                          <span className="truncate flex-1 pr-3 text-[11px] font-medium text-white/80">{dep.meta?.githubCommitMessage || dep.name || "Production Deploy"}</span>
                          <span className={`text-[8px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded ${isReady ? "bg-green-500/10 text-green-400 border border-green-500/20" :
                              isError ? "bg-red-500/10 text-red-400 border border-red-500/20" :
                                "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                            }`}>
                            {dep.state.toLowerCase()}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Add Environment Link Card */}
        <div className="bg-white/[0.02] border border-white/[0.05] p-6 rounded-2xl space-y-5">
          <h4 className="text-xs uppercase font-mono tracking-widest text-white/40 font-bold">Add Environment Link</h4>
          <div className="space-y-4">
            <div className="space-y-1">
              <span className="text-[9px] text-white/30 font-bold uppercase tracking-wider font-mono">Link Label</span>
              <Input
                value={newLinkLabel}
                onChange={e => setNewLinkLabel(e.target.value)}
                placeholder="Database Connection Console"
                className="h-9 bg-white/[0.02] border border-white/[0.08] focus:border-purple-500/40 text-xs text-white rounded-xl focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none transition-all placeholder:text-white/20"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-1 space-y-1">
                <span className="text-[9px] text-white/30 font-bold uppercase tracking-wider font-mono">Type</span>
                <select
                  value={newLinkType}
                  onChange={e => setNewLinkType(e.target.value)}
                  className="w-full h-9 bg-white/[0.02] border border-white/[0.08] focus:border-purple-500/40 rounded-xl text-xs text-white px-2.5 focus:outline-none cursor-pointer font-medium transition-all"
                >
                  <option value="frontend" className="bg-[#0f0f11]">Frontend</option>
                  <option value="backend" className="bg-[#0f0f11]">Backend</option>
                  <option value="database" className="bg-[#0f0f11]">Database</option>
                  <option value="storage" className="bg-[#0f0f11]">Storage</option>
                  <option value="monitoring" className="bg-[#0f0f11]">Monitoring</option>
                  <option value="logs" className="bg-[#0f0f11]">Logs</option>
                  <option value="other" className="bg-[#0f0f11]">Other</option>
                </select>
              </div>
              <div className="col-span-2 space-y-1">
                <span className="text-[9px] text-white/30 font-bold uppercase tracking-wider font-mono">Target URL</span>
                <Input
                  value={newLinkUrl}
                  onChange={e => setNewLinkUrl(e.target.value)}
                  placeholder="https://console.neon.tech/..."
                  className="h-9 bg-white/[0.02] border border-white/[0.08] focus:border-purple-500/40 text-xs text-white rounded-xl focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none transition-all placeholder:text-white/20"
                />
              </div>
            </div>

            <div className="pt-2">
              <Button
                onClick={submitNewLink}
                disabled={creatingLink || !newLinkUrl || !newLinkLabel}
                className={`w-full h-9 text-xs font-bold rounded-xl transition-all cursor-pointer border-0 ${justAdded
                    ? 'bg-green-500 hover:bg-green-600 text-white'
                    : 'bg-white text-black hover:bg-white/90'
                  }`}
              >
                {creatingLink ? "Saving link..." : justAdded ? "Saved Link!" : "Save Link"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Infrastructure list */}
      <div className="bg-white/[0.02] border border-white/[0.05] p-6 rounded-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-white/[0.04] pb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-purple-400" />
            <h4 className="text-xs uppercase font-mono tracking-widest text-white/40 font-bold">Infrastructure Links</h4>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-[10px] bg-transparent border-white/10 text-white/60 hover:bg-white/5 cursor-pointer font-bold px-3 rounded-lg flex items-center gap-1"
            onClick={pingLinks}
            disabled={pingingLinks}
          >
            {pingingLinks ? "Pinging..." : "Ping All Links"}
          </Button>
        </div>

        {linksLoading ? (
          <p className="text-xs text-white/30 text-center py-6 font-mono">Loading links registry...</p>
        ) : projectLinks.length === 0 ? (
          <p className="text-xs text-white/20 text-center py-8 italic">No environment or infrastructure links added yet.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {projectLinks.map((link) => {
              return (
                <div key={link.id} className="p-3.5 rounded-xl bg-white/[0.01] border border-white/[0.04] flex items-center justify-between gap-3 group hover:border-white/10 hover:bg-white/[0.02] transition-all">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="relative flex h-2 w-2 shrink-0">
                      {(!link.lastPinged || link.lastStatus === null) ? (
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white/20 opacity-75"></span>
                      ) : (link.lastStatus >= 200 && link.lastStatus < 300) ? (
                        <span className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-green-400/40 opacity-75"></span>
                      ) : (
                        <span className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-red-400/40 opacity-75"></span>
                      )}
                      <span className={`relative inline-flex rounded-full h-2 w-2 ${!link.lastPinged || link.lastStatus === null ? 'bg-white/30' :
                          (link.lastStatus >= 200 && link.lastStatus < 300) ? 'bg-green-400' : 'bg-red-400'
                        }`}></span>
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-semibold text-white/85 truncate leading-none">{link.label}</p>
                        <span className="text-[8px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/[0.04] text-white/30 border border-white/5 font-mono">
                          {link.type}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-white/35 truncate block mt-1">{link.url.replace(/^https?:\/\//, '')}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <a
                      href={link.url}
                      target="_blank"
                      className="w-7 h-7 text-white/40 hover:text-white hover:bg-white/5 inline-flex items-center justify-center rounded-lg border border-white/5"
                      title="Navigate to console"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="w-7 h-7 text-white/40 hover:text-red-400 hover:bg-red-500/10 rounded-lg border border-transparent"
                      onClick={() => deleteLink(link.id)}
                      title="Remove link"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Main Overlay Component
// ─────────────────────────────────────────────

const PRIORITY_BADGES = {
  critical: { label: "Critical", color: "text-red-400 bg-red-400/10 border-red-500/20" },
  high: { label: "High", color: "text-orange-400 bg-orange-400/10 border-orange-500/20" },
  medium: { label: "Medium", color: "text-yellow-400 bg-yellow-400/10 border-yellow-500/20" },
  low: { label: "Low", color: "text-zinc-400 bg-zinc-400/10 border-zinc-500/20" },
};

const TYPE_BADGES = {
  code: { label: "Code", color: "text-blue-400 bg-blue-400/10 border-blue-500/20", icon: Code2 },
  idea: { label: "Idea", color: "text-purple-400 bg-purple-400/10 border-purple-500/20", icon: Lightbulb },
  research: { label: "Research", color: "text-indigo-400 bg-indigo-400/10 border-indigo-500/20", icon: BookOpen },
  experiment: { label: "Experiment", color: "text-amber-400 bg-amber-400/10 border-amber-500/20", icon: FlaskConical },
};

const getPriorityBadge = (priority: string) => {
  const cfg = PRIORITY_BADGES[priority as keyof typeof PRIORITY_BADGES] || PRIORITY_BADGES.medium;
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium border ${cfg.color}`}>
      {cfg.label}
    </span>
  );
};

const getTypeBadge = (type: string) => {
  const cfg = TYPE_BADGES[type as keyof typeof TYPE_BADGES] || TYPE_BADGES.code;
  const Icon = cfg.icon;
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium border flex items-center gap-1 ${cfg.color}`}>
      <Icon className="w-2.5 h-2.5" />
      {cfg.label}
    </span>
  );
};

// ─────────────────────────────────────────────
// Project Form Modal (Create / Edit)
// ─────────────────────────────────────────────
interface ProjectFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectToEdit?: Project | null;
  defaultPhase?: "launched" | "in_development" | "sketching" | "idea";
  onSaveSuccess?: (project: Project) => void;
}

function ProjectFormModal({ isOpen, onClose, projectToEdit, defaultPhase, onSaveSuccess }: ProjectFormModalProps) {
  const { addProject, updateProject } = useProjectStore();

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [phase, setPhaseState] = useState<"launched" | "in_development" | "sketching" | "idea">("idea");
  const [type, setType] = useState<"code" | "idea" | "research" | "experiment">("code");
  const [priority, setPriority] = useState<"critical" | "high" | "medium" | "low">("medium");
  const [pinned, setPinned] = useState(false);
  const [githubUrl, setGithubUrl] = useState("");
  const [liveUrl, setLiveUrl] = useState("");
  const [folderPath, setFolderPath] = useState("");

  // Idea fields
  const [confidenceLevel, setConfidenceLevel] = useState<number>(3);
  const [effortEstimate, setEffortEstimate] = useState<string>("m");
  const [potentialImpact, setPotentialImpact] = useState<string>("medium");
  const [stage, setStage] = useState<string>("concept");

  // Local scan state
  const [localScanning, setLocalScanning] = useState(false);

  // Initialize form when opening/editing
  useEffect(() => {
    if (isOpen) {
      if (projectToEdit) {
        setName(projectToEdit.name || "");
        setDescription(projectToEdit.description || "");
        setPhaseState((projectToEdit.phase as any) || "idea");
        setType(projectToEdit.type || "code");
        setPriority(projectToEdit.priority || "medium");
        setPinned(projectToEdit.pinned || false);
        setGithubUrl(projectToEdit.githubUrl || "");
        setLiveUrl(projectToEdit.liveUrl || "");
        setFolderPath(projectToEdit.folderPath || "");
        setConfidenceLevel(projectToEdit.confidenceLevel || 3);
        setEffortEstimate(projectToEdit.effortEstimate || "m");
        setPotentialImpact(projectToEdit.potentialImpact || "medium");
        setStage(projectToEdit.stage || "concept");
      } else {
        setName("");
        setDescription("");
        setPhaseState(defaultPhase || (useProjectOSStore.getState().activePhase as any) || "idea");
        setType("code");
        setPriority("medium");
        setPinned(false);
        setGithubUrl("");
        setLiveUrl("");
        setFolderPath("");
        setConfidenceLevel(3);
        setEffortEstimate("m");
        setPotentialImpact("medium");
        setStage("concept");
      }
    }
  }, [isOpen, projectToEdit, defaultPhase]);

  const handleScanLocal = async () => {
    setLocalScanning(true);
    try {
      const res = await fetch("/api/machine/pick-and-scan-folder", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "No folder selected") return;
        throw new Error(data.error);
      }
      
      // Auto-detect fields
      if (data.name) setName(data.name || "");
      if (data.description) setDescription(data.description || "");
      setFolderPath(data.folderPath || "");
      if (data.githubUrl) {
        setGithubUrl(data.githubUrl);
      }
      setType("code");

      // Auto-register workspace
      try {
        await fetch("/api/machine/register-workspace", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path: data.folderPath })
        });
      } catch { }
    } catch (e: any) {
      alert(`Local scan failed: ${e.message}`);
    } finally {
      setLocalScanning(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert("Project name is required.");
      return;
    }

    if (projectToEdit) {
      const payload: Partial<Project> = {
        name: name.trim(),
        description: description.trim(),
        phase,
        workspace: phase === "launched" || phase === "in_development" ? "main" : "incubation",
        type,
        priority,
        pinned,
        githubUrl: githubUrl.trim() || undefined,
        liveUrl: liveUrl.trim() || undefined,
        folderPath: folderPath.trim() || undefined,
        confidenceLevel: type === "idea" ? confidenceLevel : undefined,
        effortEstimate: type === "idea" ? effortEstimate : undefined,
        potentialImpact: type === "idea" ? potentialImpact : undefined,
        stage: type === "idea" ? stage : undefined,
      };

      try {
        await updateProject(projectToEdit.id, payload);
        onClose();
      } catch (err: any) {
        alert(`Failed to save project: ${err.message}`);
      }
    } else {
      const payload = {
        name: name.trim(),
        description: description.trim(),
        phase,
        workspace: (phase === "launched" || phase === "in_development" ? "main" : "incubation") as any,
        type,
        priority,
        pinned,
        status: "active" as const,
        tags: [] as string[],
        githubUrl: githubUrl.trim() || undefined,
        liveUrl: liveUrl.trim() || undefined,
        folderPath: folderPath.trim() || undefined,
        confidenceLevel: type === "idea" ? confidenceLevel : undefined,
        effortEstimate: type === "idea" ? effortEstimate : undefined,
        potentialImpact: type === "idea" ? potentialImpact : undefined,
        stage: type === "idea" ? stage : undefined,
      };

      try {
        const saved = await addProject(payload);
        if (saved && onSaveSuccess) {
          onSaveSuccess(saved);
        }
        onClose();
      } catch (err: any) {
        alert(`Failed to save project: ${err.message}`);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg bg-surface-1 border border-white/[0.08] rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
      >
        <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">
            {projectToEdit ? `Configure ${projectToEdit.name}` : "Create New Project"}
          </h2>
          <button onClick={onClose} className="text-white/40 hover:text-white/70 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <form onSubmit={handleSave} className="space-y-4">
            {/* Name & Workspace */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] uppercase tracking-wider text-white/30 font-bold block mb-1">Project Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="My SaaS App"
                  className="w-full h-8 bg-black/40 border border-white/10 rounded-lg text-xs text-white px-3 focus:outline-none focus:ring-1 focus:ring-purple-500/30 placeholder:text-white/20"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-white/30 font-bold block mb-1">Project Phase</label>
                <select
                  value={phase}
                  onChange={e => setPhaseState(e.target.value as any)}
                  className="w-full h-8 bg-black/40 border border-white/10 rounded-lg text-[11px] text-white px-3 focus:outline-none focus:ring-1 focus:ring-purple-500/30 font-semibold"
                >
                  <option value="idea">Idea Phase</option>
                  <option value="sketching">Sketching</option>
                  <option value="in_development">In Development</option>
                  <option value="launched">Launched</option>
                </select>
              </div>
            </div>

            {/* Type Selection */}
            <div>
              <label className="text-[10px] uppercase tracking-wider text-white/30 font-bold block mb-1.5">Project Type</label>
              <div className="grid grid-cols-4 gap-2">
                {(["code", "idea", "research", "experiment"] as const).map(t => {
                  const badge = TYPE_BADGES[t];
                  const Icon = badge.icon;
                  const isSelected = type === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setType(t)}
                      className={`h-9 border rounded-lg flex flex-col items-center justify-center gap-1 transition-all ${isSelected
                          ? "bg-purple-500/10 border-purple-500/40 text-purple-300"
                          : "bg-black/20 border-white/10 text-white/40 hover:text-white/60"
                        }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span className="text-[9px] font-semibold uppercase">{badge.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="text-[10px] uppercase tracking-wider text-white/30 font-bold block mb-1">Description</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Tell DevOS what this project is about..."
                className="w-full bg-black/40 border border-white/10 rounded-lg text-xs text-white p-3 focus:outline-none focus:ring-1 focus:ring-purple-500/30 placeholder:text-white/20 h-16 resize-none"
              />
            </div>

            {/* Priority & Pinned */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] uppercase tracking-wider text-white/30 font-bold block mb-1">Priority</label>
                <div className="flex bg-black/40 rounded-lg p-0.5 border border-white/5 h-8">
                  {(["low", "medium", "high", "critical"] as const).map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      className={`flex-1 text-[10px] font-semibold rounded capitalize transition-all ${priority === p ? "bg-white/10 text-white" : "text-white/40 hover:text-white/60"
                        }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between h-8 mt-5 px-3 bg-black/20 border border-white/5 rounded-lg">
                <span className="text-xs text-white/50">Pin to sidebar</span>
                <button
                  type="button"
                  onClick={() => setPinned(!pinned)}
                  className={`w-8 h-4 rounded-full p-0.5 transition-colors duration-200 focus:outline-none ${pinned ? "bg-purple-500" : "bg-white/10"
                    }`}
                >
                  <div className={`bg-white w-3 h-3 rounded-full shadow-md transform transition-transform duration-200 ${pinned ? "translate-x-4" : "translate-x-0"
                    }`} />
                </button>
              </div>
            </div>

            {/* Idea-specific fields */}
            {type === "idea" && (
              <div className="p-4 bg-purple-500/[0.02] border border-purple-500/10 rounded-xl space-y-4">
                <h3 className="text-[10px] uppercase tracking-widest text-purple-400 font-bold font-mono">Idea Validation Parameters</h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] text-white/45 block mb-1">Confidence Score (1–5)</label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map(val => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setConfidenceLevel(val)}
                          className={`flex-1 py-1 rounded border text-xs font-mono transition-all ${confidenceLevel === val
                              ? "bg-purple-500/20 border-purple-500/50 text-purple-300 font-bold"
                              : "bg-black/25 border-white/10 text-white/40"
                            }`}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-white/45 block mb-1">Effort Estimate</label>
                    <div className="flex gap-1 bg-black/40 rounded-lg p-0.5 border border-white/5">
                      {(["xs", "s", "m", "l", "xl"] as const).map(ef => (
                        <button
                          key={ef}
                          type="button"
                          onClick={() => setEffortEstimate(ef)}
                          className={`flex-1 text-[9px] uppercase font-bold rounded transition-all ${effortEstimate === ef ? "bg-white/15 text-white" : "text-white/40 hover:text-white/60"
                            }`}
                        >
                          {ef}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] text-white/45 block mb-1">Potential Impact</label>
                    <select
                      value={potentialImpact}
                      onChange={e => setPotentialImpact(e.target.value)}
                      className="w-full h-8 bg-black/40 border border-white/10 rounded-lg text-xs text-white px-2 focus:outline-none"
                    >
                      <option value="low">Low Impact</option>
                      <option value="medium">Medium Impact</option>
                      <option value="high">High Impact</option>
                      <option value="massive">Massive Impact</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-white/45 block mb-1">Idea Stage</label>
                    <select
                      value={stage}
                      onChange={e => setStage(e.target.value)}
                      className="w-full h-8 bg-black/40 border border-white/10 rounded-lg text-xs text-white px-2 focus:outline-none"
                    >
                      <option value="concept">Concept Only</option>
                      <option value="research">Active Research</option>
                      <option value="validated">Market Validated</option>
                      <option value="prototyping">Prototyping</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Integrations URLs */}
            {type !== "idea" && (
              <div className="space-y-3 pt-2">
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-white/30 block mb-1">GitHub Repo URL (Optional)</label>
                  <input
                    type="text"
                    value={githubUrl}
                    onChange={e => setGithubUrl(e.target.value)}
                    placeholder="https://github.com/username/project"
                    className="w-full h-8 bg-black/40 border border-white/10 rounded-lg text-xs text-white px-3 focus:outline-none focus:ring-1 focus:ring-purple-500/30 placeholder:text-white/25 font-mono"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-white/30 block mb-1">Production URL (Optional)</label>
                    <input
                      type="text"
                      value={liveUrl}
                      onChange={e => setLiveUrl(e.target.value)}
                      placeholder="https://project.vercel.app"
                      className="w-full h-8 bg-black/40 border border-white/10 rounded-lg text-xs text-white px-3 focus:outline-none focus:ring-1 focus:ring-purple-500/30 placeholder:text-white/25 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-white/30 block mb-1">Local Directory Path (Optional)</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={folderPath}
                        onChange={e => setFolderPath(e.target.value)}
                        placeholder="C:/Users/name/Projects/app"
                        className="flex-1 h-8 bg-black/40 border border-white/10 rounded-lg text-xs text-white px-3 focus:outline-none focus:ring-1 focus:ring-purple-500/30 placeholder:text-white/25 font-mono"
                      />
                      <button
                        type="button"
                        onClick={handleScanLocal}
                        disabled={localScanning}
                        className="px-3 h-8 text-[11px] font-semibold rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 hover:bg-purple-500/20 hover:text-purple-300 disabled:opacity-50 disabled:pointer-events-none transition-colors cursor-pointer"
                      >
                        {localScanning ? "Choosing..." : "Choose Folder"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-3 border-t border-white/[0.04]">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-white/10 text-white hover:bg-white/15 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-purple-500 hover:bg-purple-600 text-white transition-all cursor-pointer"
              >
                {projectToEdit ? "Update Project" : "Create Project"}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Main Overlay Component
// ─────────────────────────────────────────────
export function ProjectOS() {
  const {
    isOpen,
    selectedProjectId,
    activeTab,
    close,
    selectProject,
    setTab,
    activePhase,
    setPhase,
    openCommandPalette
  } = useProjectOSStore();
  const { projects } = useProjectStore();

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectModalOpen, setSelectModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [curatedIds, setCuratedIds] = useState<string[]>([]);
  const [selectedDefaultPhase, setSelectedDefaultPhase] = useState<"launched" | "in_development" | "sketching" | "idea" | undefined>(undefined);

  const selectedProject = projects.find(p => p.id === selectedProjectId) || null;

  const handleHideProject = (projectId: string, phase: string) => {
    const key = `devos_curated_${phase}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        let list = JSON.parse(stored) as string[];
        list = list.filter(id => id !== projectId);
        localStorage.setItem(key, JSON.stringify(list));
        loadCurationLists();
      } catch { }
    }
  };

  const handleMoveProjectPhase = async (projectId: string, newPhase: string) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;
    const oldPhase = project.phase;
    if (oldPhase === newPhase) return;

    try {
      await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phase: newPhase })
      });
      useProjectStore.getState().updateProject(project.id, { phase: newPhase as any });

      // Remove from old curation list
      const oldKey = `devos_curated_${oldPhase}`;
      const oldStored = localStorage.getItem(oldKey);
      if (oldStored) {
        try {
          let list = JSON.parse(oldStored) as string[];
          list = list.filter(id => id !== project.id);
          localStorage.setItem(oldKey, JSON.stringify(list));
        } catch { }
      }

      // Add to new curation list
      const newKey = `devos_curated_${newPhase}`;
      const newStored = localStorage.getItem(newKey);
      let list: string[] = [];
      if (newStored) {
        try { list = JSON.parse(newStored); } catch { }
      }
      if (!list.includes(project.id)) {
        list.push(project.id);
        localStorage.setItem(newKey, JSON.stringify(list));
      }

      loadCurationLists();
    } catch (err) {
      console.error(err);
    }
  };

  // Curation lists state for all 4 phases
  const [curatedLaunched, setCuratedLaunched] = useState<string[]>([]);
  const [curatedInDev, setCuratedInDev] = useState<string[]>([]);
  const [curatedSketching, setCuratedSketching] = useState<string[]>([]);
  const [curatedIdea, setCuratedIdea] = useState<string[]>([]);

  const loadCurationLists = () => {
    if (typeof window !== "undefined") {
      const loadList = (phase: string) => {
        const stored = localStorage.getItem(`devos_curated_${phase}`);
        if (stored) {
          try {
            return JSON.parse(stored) as string[];
          } catch {
            return [];
          }
        } else {
          // If no stored curation list exists yet, default to showing ALL projects in this phase!
          const ids = projects.filter(p => p.phase === phase).map(p => p.id);
          localStorage.setItem(`devos_curated_${phase}`, JSON.stringify(ids));
          return ids;
        }
      };
      setCuratedLaunched(loadList("launched"));
      setCuratedInDev(loadList("in_development"));
      setCuratedSketching(loadList("sketching"));
      setCuratedIdea(loadList("idea"));
    }
  };

  // Synchronize curation lists when projects or overlay open state changes
  useEffect(() => {
    loadCurationLists();
  }, [projects, isOpen]);

  // Automatically move project IDs in curated lists when their DB phase shifts!
  useEffect(() => {
    if (typeof window === "undefined") return;
    let modified = false;
    projects.forEach(p => {
      // Find if this project is currently curated in a phase that doesn't match its DB phase
      PHASES.forEach(phaseObj => {
        if (p.phase !== phaseObj.id) {
          const key = `devos_curated_${phaseObj.id}`;
          const stored = localStorage.getItem(key);
          if (stored) {
            try {
              let list = JSON.parse(stored) as string[];
              if (list.includes(p.id)) {
                // Remove from incorrect phase list
                list = list.filter(id => id !== p.id);
                localStorage.setItem(key, JSON.stringify(list));
                modified = true;

                // Add to correct phase list
                const correctKey = `devos_curated_${p.phase}`;
                const correctStored = localStorage.getItem(correctKey);
                let correctList = correctStored ? JSON.parse(correctStored) : [];
                if (!correctList.includes(p.id)) {
                  correctList.push(p.id);
                  localStorage.setItem(correctKey, JSON.stringify(correctList));
                }
              }
            } catch { }
          }
        }
      });
    });
    if (modified) {
      loadCurationLists();
    }
  }, [projects]);

  // Keyboard shortcut hook
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") {
        // useProjectOSStore handles ESC or manual trigger handles it here
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        openCommandPalette();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, openCommandPalette]);

  if (!isOpen) return null;

  // Curated lists
  const launchedProjects = projects.filter(p => p.phase === "launched" && curatedLaunched.includes(p.id));
  const inDevProjects = projects.filter(p => p.phase === "in_development" && curatedInDev.includes(p.id));
  const sketchingProjects = projects.filter(p => p.phase === "sketching" && curatedSketching.includes(p.id));
  const ideaProjects = projects.filter(p => p.phase === "idea" && curatedIdea.includes(p.id));

  // Curated list for the currently active phase tab (for left rail sidebar list)
  const activeCuratedList =
    activePhase === "launched" ? launchedProjects :
      activePhase === "in_development" ? inDevProjects :
        activePhase === "sketching" ? sketchingProjects : ideaProjects;

  // Filter sidebar projects by active tab & search query
  const filteredProjects = activeCuratedList.filter(p => {
    if (searchQuery) {
      const match = `${p.name} ${p.description} ${p.tags.join(" ")}`.toLowerCase();
      return match.includes(searchQuery.toLowerCase());
    }
    return true;
  });

  // Group into pinned and regular for the sidebar
  const pinnedProjects = filteredProjects.filter(p => p.pinned);
  const otherProjects = filteredProjects.filter(p => !p.pinned);

  // Stats calculation by phase (all DB projects, not curated only, to match totals)
  const stats = {
    launched: projects.filter(p => p.phase === "launched").length,
    in_development: projects.filter(p => p.phase === "in_development").length,
    sketching: projects.filter(p => p.phase === "sketching").length,
    idea: projects.filter(p => p.phase === "idea").length,
  };

  // Dashboard general stats based on all curated projects across all columns
  const allCuratedProjects = [...launchedProjects, ...inDevProjects, ...sketchingProjects, ...ideaProjects];
  const totalCuratedCount = allCuratedProjects.length;
  const codeProjectsCount = allCuratedProjects.filter(p => p.type === "code").length;
  const ideaProjectsCount = allCuratedProjects.filter(p => p.type === "idea").length;
  const avgProgress = allCuratedProjects.length > 0
    ? Math.round(allCuratedProjects.reduce((sum, p) => sum + (p.completionPercentage ?? 0), 0) / allCuratedProjects.length)
    : 0;

  // Quick phase shifter handler for visual board columns
  const shiftPhase = async (project: Project, direction: "left" | "right") => {
    const currentIndex = PHASES.findIndex(ph => ph.id === project.phase);
    let newIndex = currentIndex;
    if (direction === "left") {
      newIndex = Math.max(0, currentIndex - 1);
    } else {
      newIndex = Math.min(PHASES.length - 1, currentIndex + 1);
    }
    if (newIndex === currentIndex) return;

    const oldPhase = project.phase;
    const newPhase = PHASES[newIndex].id;

    try {
      await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phase: newPhase })
      });
      useProjectStore.getState().updateProject(project.id, { phase: newPhase as any });

      // Remove from old curation list
      const oldKey = `devos_curated_${oldPhase}`;
      const oldStored = localStorage.getItem(oldKey);
      if (oldStored) {
        try {
          let list = JSON.parse(oldStored) as string[];
          list = list.filter(id => id !== project.id);
          localStorage.setItem(oldKey, JSON.stringify(list));
        } catch { }
      }

      // Add to new curation list
      const newKey = `devos_curated_${newPhase}`;
      const newStored = localStorage.getItem(newKey);
      let list: string[] = [];
      if (newStored) {
        try { list = JSON.parse(newStored); } catch { }
      }
      if (!list.includes(project.id)) {
        list.push(project.id);
        localStorage.setItem(newKey, JSON.stringify(list));
      }

      loadCurationLists();
    } catch (err) {
      console.error(err);
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5 select-none">
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={`w-1.5 h-1.5 rounded-full ${star <= rating ? "bg-purple-400" : "bg-white/15"
              }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0a0a0f] flex flex-col pointer-events-auto select-text text-foreground">
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.15 }}
        className="w-full h-full flex flex-col bg-surface-0"
      >
        {/* TopBar Header (52px height) */}
        <div className="h-12 flex items-center px-4 border-b border-surface-border flex-shrink-0 bg-surface-1 select-none justify-between">
          <div className="flex items-center gap-1.5">
            <button onClick={close} className="flex items-center gap-1.5 text-white/40 hover:text-white/70 transition-colors mr-2 cursor-pointer text-xs font-semibold">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>DevOS</span>
            </button>
            <span className="text-white/20 text-xs">/</span>
            <button onClick={() => selectProject(null)} className="text-xs text-white/50 hover:text-white font-medium cursor-pointer">
              Projects
            </button>
            {selectedProject && (
              <>
                <span className="text-white/20 text-xs">/</span>
                <span className="text-xs text-white font-semibold flex items-center gap-1.5">
                  {selectedProject.pinned && <Star className="w-3 h-3 text-amber-400 fill-amber-400" />}
                  {selectedProject.name}
                </span>
              </>
            )}
          </div>

          {/* Center search element to open Command Palette */}
          <div className="flex-1 max-w-sm mx-4 relative">
            <button
              onClick={openCommandPalette}
              className="w-full h-7 rounded-lg bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.06] hover:border-white/15 px-3 flex items-center justify-between text-left transition-all cursor-pointer text-white/35"
            >
              <span className="text-[11px] flex items-center gap-2">
                <Search className="w-3.5 h-3.5" /> Search command panel...
              </span>
              <kbd className="text-[9px] font-mono bg-white/5 border border-white/10 px-1 py-0.5 rounded text-white/40">
                ⌘K
              </kbd>
            </button>
          </div>

          <div className="flex items-center gap-3">
            {selectedProject && (
              <>
                <button
                  onClick={() => setEditModalOpen(true)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] hover:text-white text-white/60 transition-colors cursor-pointer"
                  title="Configure project"
                >
                  <Settings className="w-3.5 h-3.5" />
                </button>
                <PhaseBadge project={selectedProject} />
              </>
            )}
            <button
              onClick={close}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/[0.06] text-white/45 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Workspace Body Layout */}
        <div className="flex flex-1 min-h-0">

          {/* Left Rail Sidebar */}
          {selectedProjectId && (
            <div className="w-60 border-r border-surface-border bg-surface-1 flex flex-col flex-shrink-0 select-none">
              {/* Phase Selector */}
              <div className="p-3 border-b border-surface-border space-y-1">
                <span className="text-[9px] font-bold uppercase tracking-widest text-white/20 px-1.5 font-mono">Project Phase</span>
                <div className="grid grid-cols-2 gap-1 bg-black/40 rounded-lg p-0.5 border border-white/5 mt-1">
                  {PHASES.map(phaseObj => {
                    const isActive = activePhase === phaseObj.id;
                    const count = stats[phaseObj.id as keyof typeof stats] || 0;
                    return (
                      <button
                        key={phaseObj.id}
                        onClick={() => {
                          setPhase(phaseObj.id as any);
                          selectProject(null); // Return to dashboard
                        }}
                        className={`py-1.5 px-0.5 rounded flex flex-col items-center justify-center transition-all cursor-pointer text-center ${isActive
                            ? "bg-white/10 text-purple-300 font-bold"
                            : "text-white/40 hover:text-white/60"
                          }`}
                      >
                        <span className="text-[8px] uppercase tracking-wider font-semibold truncate w-full px-1">{phaseObj.label}</span>
                        <span className="text-[9px] font-mono mt-0.5 opacity-60 leading-none">{count}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sidebar projects list search filter */}
              <div className="p-2 border-b border-surface-border bg-[#07070a] flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-white/20 shrink-0 ml-1.5" />
                <input
                  type="text"
                  placeholder="Filter phase projects..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent text-[11px] text-white placeholder-white/20 focus:outline-none"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} className="text-white/25 hover:text-white/50 cursor-pointer pr-1">
                    ✕
                  </button>
                )}
              </div>

              {/* Scrollable Projects lists */}
              <div className="flex-1 overflow-y-auto py-2 custom-scrollbar">
                {/* Pinned Projects Section */}
                {pinnedProjects.length > 0 && (
                  <div className="mb-4">
                    <span className="px-3 py-1 flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-white/25 font-mono">
                      <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400 shrink-0" /> Pinned
                    </span>
                    <div className="space-y-0.5 mt-1">
                      {pinnedProjects.map(p => {
                        const badge = TYPE_BADGES[p.type] || TYPE_BADGES.code;
                        const Icon = badge.icon;
                        const isSelected = selectedProjectId === p.id;
                        return (
                          <button
                            key={p.id}
                            onClick={() => selectProject(p.id)}
                            className={`w-full text-left px-3 py-1.5 flex items-center gap-2 border-l-2 transition-all cursor-pointer group/item
                              ${isSelected
                                ? 'bg-white/[0.06] text-white border-purple-500 font-semibold'
                                : 'text-white/50 hover:text-white/80 hover:bg-white/[0.02] border-transparent'}`}
                          >
                            <Icon className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                            <span className="text-[12px] truncate flex-1">{p.name}</span>
                            {p.folderPath && (
                              <span
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(`vscode://file/${p.folderPath}`);
                                }}
                                className="text-white/35 hover:text-blue-400 p-0.5 hover:bg-white/5 rounded transition-all cursor-pointer opacity-0 group-hover/item:opacity-100 shrink-0"
                                title="Open in VS Code"
                              >
                                <Code2 className="w-3.5 h-3.5 text-blue-400" />
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Regular Projects Section */}
                {otherProjects.length > 0 && (
                  <div className="mb-4">
                    <span className="px-3 py-1 text-[9px] font-bold uppercase tracking-widest text-white/20 block font-mono">
                      {pinnedProjects.length > 0 ? "Other projects" : "Projects"}
                    </span>
                    <div className="space-y-0.5 mt-1">
                      {otherProjects.map(p => {
                        const badge = TYPE_BADGES[p.type] || TYPE_BADGES.code;
                        const Icon = badge.icon;
                        const isSelected = selectedProjectId === p.id;
                        return (
                          <button
                            key={p.id}
                            onClick={() => selectProject(p.id)}
                            className={`w-full text-left px-3 py-1.5 flex items-center gap-2 border-l-2 transition-all cursor-pointer group/item
                              ${isSelected
                                ? 'bg-white/[0.06] text-white border-purple-500 font-semibold'
                                : 'text-white/50 hover:text-white/80 hover:bg-white/[0.02] border-transparent'}`}
                          >
                            <Icon className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                            <span className="text-[12px] truncate flex-1">{p.name}</span>
                            {p.folderPath && (
                              <span
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(`vscode://file/${p.folderPath}`);
                                }}
                                className="text-white/35 hover:text-blue-400 p-0.5 hover:bg-white/5 rounded transition-all cursor-pointer opacity-0 group-hover/item:opacity-100 shrink-0"
                                title="Open in VS Code"
                              >
                                <Code2 className="w-3.5 h-3.5 text-blue-400" />
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom New button */}
              <div className="p-3 border-t border-surface-border">
                <button
                  onClick={() => setCreateModalOpen(true)}
                  className="w-full py-1.5 text-xs text-purple-400 hover:text-purple-300 border border-purple-500/20 hover:border-purple-500/40 rounded-lg transition-all cursor-pointer text-center font-medium bg-purple-500/5 flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Project</span>
                </button>
              </div>
            </div>
          )}

          {/* Right Main Panel */}
          {selectedProject ? (
            <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-surface-0">

              {/* Detailed Project Header */}
              <div className="px-6 py-4 border-b border-surface-border flex items-start gap-4 flex-shrink-0 bg-surface-1">
                <div className="w-10 h-10 rounded-lg bg-white/[0.03] border border-white/[0.06] shrink-0 flex items-center justify-center select-none">
                  {selectedProject.ogImageUrl ? (
                    <img src={selectedProject.ogImageUrl} className="w-full h-full object-cover rounded-lg" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-purple-400/80 text-[15px] font-bold font-mono bg-purple-500/10 border border-purple-500/20 rounded-lg">
                      {selectedProject.name[0].toUpperCase()}
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-sm font-semibold text-white truncate max-w-sm leading-none">{selectedProject.name}</h1>
                    {getTypeBadge(selectedProject.type)}
                    {selectedProject.folderPath && (
                      <button
                        onClick={() => window.open(`vscode://file/${selectedProject.folderPath}`)}
                        className="w-6 h-6 rounded-md hover:bg-[#007acc]/10 text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20 ml-1 transition-all cursor-pointer bg-transparent"
                        title="Open in VS Code"
                      >
                        <Code2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <p className="text-[11px] text-white/40 mt-1 truncate max-w-xl">{selectedProject.description || 'No description provided.'}</p>

                  <div className="flex items-center gap-3 mt-2 select-none text-[10px] text-white/30">
                    {selectedProject.githubUrl && (
                      <a href={selectedProject.githubUrl} target="_blank" className="hover:text-purple-400 flex items-center gap-0.5 font-medium transition-colors">
                        GitHub ↗
                      </a>
                    )}
                    {selectedProject.liveUrl && (
                      <a href={selectedProject.liveUrl} target="_blank" className="hover:text-purple-400 flex items-center gap-0.5 font-medium transition-colors">
                        Live ↗
                      </a>
                    )}
                    <span>·</span>
                    <span>Updated {timeAgo(selectedProject.updatedAt)}</span>
                  </div>
                </div>
              </div>

              {/* Tab Navigation Menu */}
              <div className="px-6 flex items-center gap-1 border-b border-surface-border flex-shrink-0 bg-surface-1 select-none">
                {TABS.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setTab(tab.id as any)}
                    className={`px-3.5 py-2.5 text-[11px] font-semibold transition-colors border-b-2 -mb-px cursor-pointer
                      ${activeTab === tab.id
                        ? 'text-purple-300 border-purple-500'
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
                {activeTab === 'tasks' && <ProjectTasksTab project={selectedProject} />}
                {activeTab === 'controlroom' && <ControlRoomTab project={selectedProject} />}
              </div>
            </div>
          ) : (
            // Curved Intentional Command Center Dashboard (Visual Gravity Physics Box layout)
            <div className="flex-1 flex flex-col overflow-hidden bg-surface-0 p-6 space-y-6 min-h-0 h-full">

              {/* Dashboard Banner */}
              <div className="flex items-center justify-between border-b border-surface-border pb-4 flex-shrink-0 select-none">
                <div>
                  <h1 className="text-sm font-bold text-white tracking-wide">Command Center Dashboard</h1>
                  <p className="text-[11px] text-white/45 mt-0.5">Global projects registry board mapped by active build phases</p>
                </div>

              </div>

              {/* Physics Board Wrapper */}
              <div className="relative flex-1 min-h-0 w-full">

                {/* HTML Columns Grid underneath (for background boxes and headers) */}
                <div className="grid grid-cols-4 gap-4 h-full w-full absolute inset-0">
                  {[
                    { id: "launched", label: "Launched", color: "text-green-400/80", dotColor: "bg-green-400", list: launchedProjects },
                    { id: "in_development", label: "In Development", color: "text-blue-400/80", dotColor: "bg-blue-400", list: inDevProjects },
                    { id: "sketching", label: "Sketching", color: "text-amber-400/80", dotColor: "bg-amber-400", list: sketchingProjects },
                    { id: "idea", label: "Idea Phase", color: "text-white/50", dotColor: "bg-white/20", list: ideaProjects },
                  ].map((col) => {
                    const filteredList = searchQuery
                      ? col.list.filter(p => {
                        const match = `${p.name} ${p.description} ${p.tags.join(" ")}`.toLowerCase();
                        return match.includes(searchQuery.toLowerCase());
                      })
                      : col.list;

                    return (
                      <div key={col.id} className="bg-white/[0.01] border border-white/[0.03] rounded-2xl p-4 flex flex-col h-full overflow-hidden">
                        {/* Column Header */}
                        <div className="flex items-center justify-between pb-3 border-b border-white/[0.04] mb-3 select-none">
                          <span className={`text-[10px] font-bold uppercase tracking-wider font-mono flex items-center gap-2 ${col.color}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${col.dotColor}`} />
                            {col.label}
                            <span className="opacity-40 font-mono">({filteredList.length})</span>
                          </span>

                          <button
                            onClick={() => {
                              setSelectedDefaultPhase(col.id as any);
                              setCreateModalOpen(true);
                            }}
                            className="w-5 h-5 rounded hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-colors cursor-pointer border-0 p-0"
                            title={`Add project to ${col.label}`}
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Spacer for physics overlay */}
                        <div className="flex-1 w-full relative" />
                      </div>
                    );
                  })}
                </div>

                {/* Transparent Physics Canvas Overlay */}
                <ProjectPhysicsBox
                  projects={projects}
                  searchQuery={searchQuery}
                  onSelectProject={(id) => selectProject(id)}
                  curatedLaunched={curatedLaunched}
                  curatedInDev={curatedInDev}
                  curatedSketching={curatedSketching}
                  curatedIdea={curatedIdea}
                  onMoveProjectPhase={handleMoveProjectPhase}
                  onHideProject={handleHideProject}
                />
              </div>

            </div>
          )}

        </div>

        {/* Project Board Curation Modal */}
        {selectModalOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm select-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-md bg-[#121217] border border-white/[0.08] rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[70vh]"
            >
              <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-white">Manage Phase Board</h2>
                  <p className="text-[10px] text-white/40 font-mono mt-0.5">
                    Select projects to display in {PHASES.find(p => p.id === activePhase)?.label}
                  </p>
                </div>
                <button onClick={() => setSelectModalOpen(false)} className="text-white/40 hover:text-white/70 transition-colors cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                {projects.length === 0 ? (
                  <p className="text-center text-xs text-white/30 py-8 italic">No projects registered. Create a project first.</p>
                ) : (
                  projects.map(p => {
                    const activeCuratedIds =
                      activePhase === "launched" ? curatedLaunched :
                        activePhase === "in_development" ? curatedInDev :
                          activePhase === "sketching" ? curatedSketching : curatedIdea;

                    const isCuratedInThisPhase = activeCuratedIds.includes(p.id) && p.phase === activePhase;
                    const belongsToOtherPhase = p.phase !== activePhase;

                    return (
                      <label
                        key={p.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.03] cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <input
                            type="checkbox"
                            checked={isCuratedInThisPhase}
                            onChange={async (e) => {
                              const checked = e.target.checked;
                              let updatedList = [...activeCuratedIds];

                              if (checked) {
                                if (!updatedList.includes(p.id)) {
                                  updatedList.push(p.id);
                                }
                                if (p.phase !== activePhase) {
                                  try {
                                    await fetch(`/api/projects/${p.id}`, {
                                      method: 'PATCH',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ phase: activePhase })
                                    });
                                    useProjectStore.getState().updateProject(p.id, { phase: activePhase as any });
                                  } catch (err) {
                                    console.error(err);
                                  }
                                }
                              } else {
                                updatedList = updatedList.filter(id => id !== p.id);
                              }

                              localStorage.setItem(`devos_curated_${activePhase}`, JSON.stringify(updatedList));
                              loadCurationLists();
                            }}
                            className="w-4 h-4 rounded border-white/20 bg-black/40 text-purple-500 focus:ring-purple-500 focus:ring-offset-0 cursor-pointer"
                          />
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-white truncate">{p.name}</p>
                            <p className="text-[10px] text-white/30 truncate">
                              {belongsToOtherPhase
                                ? `Current Phase: ${PHASES.find(ph => ph.id === p.phase)?.label || p.phase}`
                                : p.description || "No description"
                              }
                            </p>
                          </div>
                        </div>
                        <div className="shrink-0">
                          {getTypeBadge(p.type)}
                        </div>
                      </label>
                    );
                  })
                )}
              </div>

              <div className="px-5 py-3 border-t border-white/[0.06] bg-black/20 flex justify-end">
                <button
                  onClick={() => setSelectModalOpen(false)}
                  className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-white text-black hover:bg-white/90 transition-all cursor-pointer"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Create / Edit Project Modals */}
        <ProjectFormModal
          isOpen={createModalOpen}
          onClose={() => {
            setCreateModalOpen(false);
            setSelectedDefaultPhase(undefined);
          }}
          defaultPhase={selectedDefaultPhase}
          onSaveSuccess={(newProj) => {
            const key = `devos_curated_${newProj.phase}`;
            const stored = localStorage.getItem(key);
            let list: string[] = [];
            if (stored) {
              try { list = JSON.parse(stored); } catch { }
            }
            if (!list.includes(newProj.id)) {
              list.push(newProj.id);
              localStorage.setItem(key, JSON.stringify(list));
            }
            loadCurationLists();
          }}
        />

        <ProjectFormModal
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          projectToEdit={selectedProject}
        />

        {/* Command Palette */}
        <ProjectOSCommandPalette
          onOpenCreateModal={() => setCreateModalOpen(true)}
        />

      </motion.div>
    </div>
  );
}
