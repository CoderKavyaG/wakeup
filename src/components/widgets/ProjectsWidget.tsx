"use client";

import React, { useState, useEffect, useRef } from "react";
import { getAgentUrl } from "@/lib/agentClient";
import { useProjectStore, Project, ProjectStatus } from "@/store/useProjectStore";
import { useNoteStore } from "@/store/useNoteStore";
import { useTaskStore } from "@/store/useTaskStore";
import { useBootstrapStore } from "@/store/useBootstrapStore";
import { useProjectOSStore } from "@/store/useProjectOSStore";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { 
  Folder, GitBranch, ExternalLink, Trash2, 
  Brain, CheckCircle2, Sparkles, Plus,
  HelpCircle, Activity, ChevronRight, X, Heart, 
  Code2, Play, AlertCircle, Pencil,
  Eye, FolderOpen, GitCommit, Settings, Copy
} from "lucide-react";
import { timeAgo } from "@/lib/utils";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

const normalizeGithubUrl = (url: string | null | undefined): string => {
  if (!url) return "";
  let clean = url.trim().toLowerCase();
  if (clean.endsWith(".git")) {
    clean = clean.substring(0, clean.length - 4);
  }
  if (clean.endsWith("/")) {
    clean = clean.substring(0, clean.length - 1);
  }
  return clean;
};

export function ProjectsWidget() {
  const { projects, deleteProject, updateProject, addProject, loading } = useProjectStore();
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const currentProject = projects.find(p => p.id === selectedProject?.id) || selectedProject;

  const getCuratedPhase = (projectId: string): string | null => {
    if (typeof window === "undefined") return null;
    const phases = ["launched", "in_development", "sketching", "idea"];
    for (const phase of phases) {
      const stored = localStorage.getItem(`devos_curated_${phase}`);
      if (stored) {
        try {
          const list = JSON.parse(stored) as string[];
          if (list.includes(projectId)) {
            return phase;
          }
        } catch {}
      }
    }
    return null;
  };

  const PHASE_MAP = {
    launched: { label: "Launched", color: "bg-green-500/10 text-green-400 border-green-500/20" },
    in_development: { label: "In Development", color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
    sketching: { label: "Sketching", color: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
    idea: { label: "Idea Phase", color: "bg-white/5 text-white/60 border-white/10" },
  };

  const vercel = useBootstrapStore(s => s.vercel);
  const loaded = useBootstrapStore(s => s.loaded);
  const setVercelToken = useBootstrapStore(s => s.setVercelToken);
  const removeVercelToken = useBootstrapStore(s => s.removeVercelToken);
  const userId = useBootstrapStore(s => s.userId);
  const telegramLinked = useBootstrapStore(s => s.telegramLinked);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [githubUsernameInput, setGithubUsernameInput] = useState("");
  const [githubTokenInput, setGithubTokenInput] = useState("");
  const [vercelTokenInput, setVercelTokenInput] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);
  const [hasGithubToken, setHasGithubToken] = useState(false);
  const [showMascot, setShowMascot] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setShowMascot(localStorage.getItem("devos_hide_mascot") !== "true");
    }
  }, []);

  const openSettingsDialog = async () => {
    setGithubUsernameInput(localStorage.getItem("GITHUB_USERNAME") || "coderkavyag");
    
    try {
      const res = await fetch("/api/auth/token");
      if (res.ok) {
        const data = await res.json();
        setHasGithubToken(data.hasGithubToken);
        setGithubTokenInput(data.hasGithubToken ? "configured" : "");
      } else {
        setGithubTokenInput("");
      }
    } catch {
      setGithubTokenInput("");
    }
    
    setVercelTokenInput(vercel?.hasToken ? "configured" : "");
    setIsSettingsOpen(true);
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    const isNewGithubToken = githubTokenInput.trim() && githubTokenInput.trim() !== "configured";
    try {
      localStorage.setItem("GITHUB_USERNAME", githubUsernameInput.trim());
      
      // Save/encrypt or delete GitHub token via secure API
      if (isNewGithubToken) {
        const tokenRes = await fetch("/api/auth/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ githubToken: githubTokenInput.trim() })
        });
        if (!tokenRes.ok) throw new Error("Failed to save GitHub token");
        setHasGithubToken(true);
      } else if (!githubTokenInput.trim() && hasGithubToken) {
        const tokenRes = await fetch("/api/auth/token?type=github", {
          method: "DELETE"
        });
        if (!tokenRes.ok) throw new Error("Failed to delete GitHub token");
        setHasGithubToken(false);
        setGithubRepos([]);
      }

      // Save/encrypt or delete Vercel token via Bootstrap Store actions
      if (vercelTokenInput.trim() && vercelTokenInput.trim() !== "configured") {
        await setVercelToken(vercelTokenInput.trim());
      } else if (!vercelTokenInput.trim() && vercel?.hasToken) {
        await removeVercelToken();
      }
      
      const { bootstrap } = useBootstrapStore.getState();
      await bootstrap(true);
      
      setIsSettingsOpen(false);

      // After saving a new GitHub token, fetch repos and auto-sync all
      if (isNewGithubToken) {
        const username = githubUsernameInput.trim();
        const token = githubTokenInput.trim();
        const headers: HeadersInit = { Authorization: `Bearer ${token}` };
        try {
          const res = await fetch(`/api/github?username=${encodeURIComponent(username)}`, { headers });
          if (res.ok) {
            const data = await res.json();
            const repos = data.repos || [];
            setGithubRepos(repos);
            // Pass current projects snapshot so dedup works
            const currentProjects = useProjectStore.getState().projects;
            autoSyncAllRepos(repos, currentProjects);
          }
        } catch (e) {
          console.error("Failed to fetch repos after token save", e);
        }
      }
    } catch (err: any) {
      alert(`Failed to save integration settings: ${err.message}`);
    } finally {
      setSavingSettings(false);
    }
  };

  // Auto-sync all unsynced GitHub repos silently, one by one
  const autoSyncAllRepos = async (repos: any[], existingProjects: typeof projects) => {
    const toSync = repos.filter(repo => {
      const normalizedUrl = normalizeGithubUrl(repo.html_url);
      return !existingProjects.some(p => p.githubUrl && normalizeGithubUrl(p.githubUrl) === normalizedUrl);
    });
    if (toSync.length === 0) return;

    setAutoSyncing(true);
    try {
      // Fire all imports concurrently but cap at 5 at a time to avoid flooding
      const BATCH = 5;
      for (let i = 0; i < toSync.length; i += BATCH) {
        const batch = toSync.slice(i, i + BATCH);
        await Promise.allSettled(
          batch.map(repo =>
            addProject({
              name: repo.name,
              description: repo.description || "",
              status: "active",
              githubUrl: repo.html_url,
              tags: [repo.language].filter(Boolean),
              phase: "idea"
            })
          )
        );
      }
      setAutoSyncDone(true);
      setTimeout(() => setAutoSyncDone(false), 3000);
    } catch (err) {
      console.error("Auto-sync error:", err);
    } finally {
      setAutoSyncing(false);
    }
  };

  const handleMapProject = async (vercelProjId: string) => {
    if (!currentProject) return;
    try {
      const vp = vercel?.projects?.find((p: any) => p.id === vercelProjId);
      let alias = "";
      if (vp) {
        const rawAlias = vp.targets?.production?.alias?.[0] || vp.alias?.[0] || vp.latestDeployments?.[0]?.url;
        if (rawAlias) {
          alias = rawAlias.startsWith("http") ? rawAlias : `https://${rawAlias}`;
        }
      }

      if (!alias) {
        if (vercelProjId === "prj_wakeup") alias = "https://wakeup.vercel.app";
        if (vercelProjId === "prj_gridlock") alias = "https://gridlock.vercel.app";
      }

      await updateProject(currentProject.id, { 
        vercelProjectId: vercelProjId,
        liveUrl: alias || undefined
      });
      setSelectedProject({ ...currentProject, vercelProjectId: vercelProjId, liveUrl: alias || undefined });
    } catch (err) {
      alert("Failed to map project");
    }
  };

  const handleSaveControlRoomConfig = async () => {
    if (!selectedProject || !controlRoomName.trim()) return;
    setIsUpdatingControlRoom(true);
    try {
      await updateProject(selectedProject.id, {
        name: controlRoomName.trim(),
        githubUrl: controlRoomGithub.trim() || undefined,
      });
      setSelectedProject({
        ...selectedProject,
        name: controlRoomName.trim(),
        githubUrl: controlRoomGithub.trim() || undefined,
      });
      alert("Project configurations updated successfully.");
    } catch (err: any) {
      alert(`Failed to update project: ${err.message}`);
    } finally {
      setIsUpdatingControlRoom(false);
    }
  };

  const [generatingContext, setGeneratingContext] = useState(false);

  const handleGenerateContext = async () => {
    if (!selectedProject?.folderPath) return;
    setGeneratingContext(true);
    try {
      const res = await fetch("/api/machine/generate-context", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: selectedProject.folderPath })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to generate context files");
      }
      alert("⚡ CLAUDE.md and AGENTS.md context files successfully written to project root!");
    } catch (e: any) {
      alert(`⚠️ Generation Failed: ${e.message}`);
    } finally {
      setGeneratingContext(false);
    }
  };
  
  // New Feedback State
  
  // Add/Edit Project State
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", description: "", folderPath: "", status: "green" });

  // Smart Import State
  const [isPickingFolder, setIsPickingFolder] = useState(false);
  
  // List toggle state
  const [activeListTab, setActiveListTab] = useState<"github" | "local">("github");
  const [hasSynced, setHasSynced] = useState(false);

  // Delete confirmation state (AlertDialog instead of confirm())
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handlePickFolder = async (action: "import" | "link") => {
    setIsPickingFolder(true);
    try {
      const res = await fetch("/api/machine/pick-and-scan-folder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({})
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "No folder selected") return; // User cancelled
        throw new Error(data.error || "Failed to scan project");
      }

      const newTags = data.tags || [];

      // Auto-register workspace in devos-agent
      try {
        await fetch(getAgentUrl("/register-workspace"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path: data.folderPath })
        });
      } catch(e) {}
      
      if (action === "import") {
        addProject({
          name: data.name,
          description: data.description || "Imported local project",
          folderPath: data.folderPath,
          status: "active",
          tags: newTags,
          githubUrl: data.githubUrl || undefined,
        });
      } else if (action === "link" && selectedProject) {
        updateProject(selectedProject.id, {
          folderPath: data.folderPath,
          tags: newTags
        });
        setSelectedProject({ ...selectedProject, folderPath: data.folderPath, tags: newTags });
      }
    } catch (e: any) {
      alert(`Failed to ${action}: ${e.message}`);
    } finally {
      setIsPickingFolder(false);
    }
  };

  const { tasks, deleteTask } = useTaskStore();
  const { notes, fetchNotes, addNote: notesStoreAddNote, deleteNote: notesStoreDeleteNote } = useNoteStore();

  // GitHub Stats State
  const [githubStats, setGithubStats] = useState<Record<string, { lastCommit: string, issues: number, stars: number, lastCommitMsg: string | null }>>({});
  const [staleWarningCount, setStaleWarningCount] = useState(0);
  const [showStaleOnly, setShowStaleOnly] = useState(false);
  const [githubRepos, setGithubRepos] = useState<any[]>([]);
  const [autoSyncing, setAutoSyncing] = useState(false);
  const [autoSyncDone, setAutoSyncDone] = useState(false);

  const [localHealthStats, setLocalHealthStats] = useState<Record<string, number>>({});

  const [viewNote, setViewNote] = useState<any>(null);

  // Commits State
  const [projectCommits, setProjectCommits] = useState<any[]>([]);
  const [commitsLoading, setCommitsLoading] = useState(false);
  const [commitLimit, setCommitLimit] = useState(10);

  // Links & Control Room State
  const [projectLinks, setProjectLinks] = useState<any[]>([]);
  const [linksLoading, setLinksLoading] = useState(false);
  const [pingingLinks, setPingingLinks] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "control_room">("overview");
  const [isCreatingIssue, setIsCreatingIssue] = useState<string | null>(null); // note id being processed
  const [controlRoomName, setControlRoomName] = useState("");
  const [controlRoomGithub, setControlRoomGithub] = useState("");
  const [isUpdatingControlRoom, setIsUpdatingControlRoom] = useState(false);

  // Dynamic Vercel stats & deployments states
  const [deployments, setDeployments] = useState<any[]>([]);
  const [deploymentsLoading, setDeploymentsLoading] = useState(false);
  const [weeklyVisits, setWeeklyVisits] = useState<number[]>([]);
  const [totalVisits, setTotalVisits] = useState<number>(0);
  const [maxVisits, setMaxVisits] = useState<number>(1);

  // Fetch deployments and analytics dynamically when control room is open
  useEffect(() => {
    if (activeTab === "control_room" && selectedProject?.vercelProjectId) {
      setDeploymentsLoading(true);
      fetch(`/api/vercel?type=deployments&vercelProjectId=${selectedProject.vercelProjectId}`)
        .then(r => r.json())
        .then(data => {
          setDeployments(data.deployments || []);
          setDeploymentsLoading(false);
        })
        .catch(err => {
          console.error(err);
          setDeploymentsLoading(false);
        });

      // Handle analytics/visits
      const cachedAnalytics = vercel?.analytics?.[selectedProject.id];
      if (cachedAnalytics?.data) {
        const rawVisits = cachedAnalytics.data.map((d: any) => d.visits ?? d.views ?? 0);
        const visits = [...Array(7)].map((_, i) => rawVisits[i] ?? 0);
        setWeeklyVisits(visits);
        setTotalVisits(visits.reduce((a, b) => a + b, 0));
        setMaxVisits(Math.max(...visits, 1));
      } else {
        fetch(`/api/vercel?type=analytics&projectId=${selectedProject.vercelProjectId}`)
          .then(r => r.json())
          .then(data => {
            const rawVisits = data.data?.map((d: any) => d.visits ?? d.views ?? 0) || [];
            const visits = [...Array(7)].map((_, i) => rawVisits[i] ?? 0);
            setWeeklyVisits(visits);
            setTotalVisits(visits.reduce((a, b) => a + b, 0));
            setMaxVisits(Math.max(...visits, 1));
          })
          .catch(err => {
            console.error(err);
            setWeeklyVisits([0,0,0,0,0,0,0]);
            setTotalVisits(0);
            setMaxVisits(1);
          });
      }
    } else {
      setDeployments([]);
      setWeeklyVisits([]);
      setTotalVisits(0);
      setMaxVisits(1);
    }
  }, [selectedProject?.id, selectedProject?.vercelProjectId, activeTab, vercel?.analytics]);

  const [projectNotes, setProjectNotes] = useState<any[]>([]);

  // Fetch notes dynamically when project is selected
  useEffect(() => {
    if (selectedProject?.id) {
      fetch(`/api/notes?projectId=${selectedProject.id}`)
        .then(r => r.json())
        .then(data => {
          setProjectNotes(Array.isArray(data) ? data : []);
        })
        .catch(err => {
          console.error(err);
          setProjectNotes([]);
        });
    } else {
      setProjectNotes([]);
    }
  }, [selectedProject?.id, notes]);

  const handleDeleteNote = async (noteId: string) => {
    try {
      await notesStoreDeleteNote(noteId);
      setProjectNotes(prev => prev.filter(n => n.id !== noteId));
    } catch (err) {
      console.error("Failed to delete note", err);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteTask(taskId);
    } catch (err) {
      console.error("Failed to delete task", err);
    }
  };

  const pingLinks = async (projectId: string, showToast = true) => {
    if (projectLinks.length === 0) return;
    setPingingLinks(true);
    try {
      await Promise.all(
        projectLinks.map(async (link) => {
          try {
            const res = await fetch(`/api/projects/${projectId}/links/ping?linkId=${link.id}`, { method: "POST" });
            if (res.ok) {
              const data = await res.json();
              if (Array.isArray(data) && data[0]) {
                const updatedLink = data[0];
                setProjectLinks(prev => prev.map(l => l.id === updatedLink.id ? updatedLink : l));
                if (showToast && updatedLink.lastStatus && (updatedLink.lastStatus < 200 || updatedLink.lastStatus >= 300)) {
                  alert(`⚠️ ${selectedProject?.name} ${updatedLink.type} link (${updatedLink.label}) returned ${updatedLink.lastStatus}`);
                }
              }
            }
          } catch (e) {
            console.error(`Failed to ping link ${link.id}`, e);
          }
        })
      );
    } catch (e) {
      console.error(e);
    } finally {
      setPingingLinks(false);
    }
  };

  const fetchLinks = async (projectId: string) => {
    setLinksLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/links`);
      const data = await res.json();
      setProjectLinks(Array.isArray(data) ? data : []);
      
      if (Array.isArray(data) && data.length > 0) {
        const needsPing = data.some(link => !link.lastPinged || (Date.now() - new Date(link.lastPinged).getTime()) > 15 * 60 * 1000);
        if (needsPing) {
          pingLinks(projectId, false);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLinksLoading(false);
    }
  };

  // Add Link State & Logic
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [newLinkLabel, setNewLinkLabel] = useState("");
  const [newLinkType, setNewLinkType] = useState("other");
  const [creatingLink, setCreatingLink] = useState(false);

  const handleUrlPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text');
    if (text.startsWith('http://') || text.startsWith('https://')) {
      const urlVal = text.toLowerCase();
      let label = text.replace(/^https?:\/\//, '').split('/')[0];
      let type = "other";

      if (urlVal.includes('vercel.app') || urlVal.includes('netlify.app') || urlVal.includes('github.io')) {
        label = label.replace('.vercel.app', '').replace('.netlify.app', '') + ' (Frontend)';
        type = "frontend";
      } else if (urlVal.includes('railway.app') || urlVal.includes('heroku.com') || urlVal.includes('render.com')) {
        label = label.replace('.railway.app', '').replace('.herokuapp.com', '') + ' (Backend)';
        type = "backend";
      } else if (urlVal.includes('supabase.co') || urlVal.includes('neon.tech') || urlVal.includes('mongodb.net') || urlVal.includes('postgres')) {
        label = 'Supabase Database';
        type = "database";
      } else if (urlVal.includes('firebase') || urlVal.includes('aws.amazon.com/s3') || urlVal.includes('cloudinary')) {
        label = 'Firebase Console';
        type = "storage";
      } else if (urlVal.includes('sentry.io') || urlVal.includes('datadoghq') || urlVal.includes('logflare') || urlVal.includes('upstash')) {
        label = 'Sentry Monitoring';
        type = "monitoring";
      }

      setNewLinkLabel(label);
      setNewLinkType(type);
    }
  };

  const [justAdded, setJustAdded] = useState(false);

  const submitNewLink = async () => {
    if (!newLinkUrl || !newLinkLabel || !selectedProject) return;
    setCreatingLink(true);
    try {
      let urlToSubmit = newLinkUrl;
      if (!urlToSubmit.startsWith('http')) {
        urlToSubmit = 'https://' + urlToSubmit;
      }
      
      const res = await fetch(`/api/projects/${selectedProject.id}/links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlToSubmit, label: newLinkLabel, type: newLinkType })
      });
      if (res.ok) {
        fetchLinks(selectedProject.id);
        setNewLinkUrl("");
        setNewLinkLabel("");
        setNewLinkType("other");
        setJustAdded(true);
        setTimeout(() => setJustAdded(false), 2000);
      } else {
        const err = await res.json();
        alert(`Failed to add link: ${err.error || 'Server error'}`);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCreatingLink(false);
    }
  };

  const deleteLink = async (linkId: string) => {
    if (!selectedProject) return;
    try {
      const res = await fetch(`/api/projects/${selectedProject.id}/links/${linkId}`, {
        method: "DELETE"
      });
      if (res.ok) {
        setProjectLinks(prev => prev.filter(l => l.id !== linkId));
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Fetch data on project select
  useEffect(() => {
    setActiveTab("overview");
    if (selectedProject?.id) {
      setControlRoomName(selectedProject.name);
      setControlRoomGithub(selectedProject.githubUrl || "");
      fetchLinks(selectedProject.id);
      // Background health check
      fetch("/api/projects/health", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: selectedProject.id })
      })
        .then(res => res.json())
        .then(data => {
          if (data && data.score !== undefined) {
            updateProject(selectedProject.id, {
              health: data.score,
              healthSignals: JSON.stringify(data.signals)
            });
          }
        })
        .catch(err => console.error("Health check fetch error", err));
    } else {
      setProjectLinks([]);
    }

    if (selectedProject?.githubUrl) {
      setCommitsLoading(true);
      const savedToken = localStorage.getItem("GITHUB_TOKEN");
      const headers: HeadersInit = {};
      if (savedToken) {
        headers["Authorization"] = `Bearer ${savedToken}`;
      }
      fetch(`/api/github/commits?projectId=${selectedProject.id}&days=14`, { headers })
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setProjectCommits(data);
          } else {
            setProjectCommits([]);
          }
          setCommitsLoading(false);
          setCommitLimit(10);
        })
        .catch(() => setCommitsLoading(false));
    } else {
      setProjectCommits([]);
    }
  }, [selectedProject?.id]);

  useEffect(() => {
    const handleFilterStale = () => {
      setShowStaleOnly(true);
      setActiveListTab("github");
    };
    window.addEventListener("filter_stale_projects", handleFilterStale);
    return () => window.removeEventListener("filter_stale_projects", handleFilterStale);
  }, []);

  // Cross-widget: open a specific project when a note's project tag is clicked
  useEffect(() => {
    const handleFocusProject = (e: Event) => {
      const projectId = (e as CustomEvent).detail?.projectId;
      if (!projectId) return;
      const target = projects.find((p) => p.id === projectId);
      if (target) {
        setSelectedProject(target);
        setActiveListTab(target.githubUrl && !target.folderPath ? "github" : "local");
      }
    };
    window.addEventListener("focus_project", handleFocusProject);
    return () => window.removeEventListener("focus_project", handleFocusProject);
  }, [projects]);

  useEffect(() => {
    const fetchLocalStats = async () => {
      const stats: Record<string, number> = {};
      
      for (const proj of projects.filter(p => !p.githubUrl && p.folderPath)) {
        let score = 100;
        try {
          const res = await fetch(`/api/machine/files?path=${encodeURIComponent(proj.folderPath!)}`);
          if (res.ok) {
            const data = await res.json();
            const lastMod = new Date(data.lastModified);
            const daysAgo = (Date.now() - lastMod.getTime()) / (1000 * 3600 * 24);
            
            if (daysAgo <= 3) score = 100;
            else if (daysAgo <= 7) score = 70;
            else if (daysAgo <= 14) score = 40;
            else score = 20;
          }
        } catch (e) {}

        const projTasks = tasks.filter(t => t.projectId === proj.id && !t.completed);
        const overdueTasks = projTasks.filter(t => t.dueDate && new Date(t.dueDate).getTime() < Date.now());
        score -= (overdueTasks.length * 10);
        
        stats[proj.id] = Math.max(0, score);
      }
      setLocalHealthStats(stats);
    };

    fetchLocalStats();
  }, [projects, tasks]);

  // Fetch GitHub stats + auto-sync all repos on mount (if token exists)
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const savedUsername = localStorage.getItem("GITHUB_USERNAME") || "coderkavyag";
        // Use server-side token via /api/auth/token (not localStorage)
        // We just call the github API route which reads the encrypted token server-side
        const res = await fetch(`/api/github?username=${encodeURIComponent(savedUsername)}`);
        if (res.ok) {
          const data = await res.json();
          const stats: Record<string, any> = {};
          let staleCount = 0;
          
          if (data.repos) {
            data.repos.forEach((repo: any) => {
              const url = normalizeGithubUrl(repo.html_url);
              stats[url] = {
                lastCommit: repo.updated_at,
                issues: repo.open_issues_count || 0,
                stars: repo.stargazers_count || 0,
                lastCommitMsg: repo.last_commit_message || null
              };

              const updated = new Date(repo.updated_at);
              const daysAgo = (Date.now() - updated.getTime()) / (1000 * 3600 * 24);
              if (daysAgo > 90) staleCount++;
            });
          }

          // Also count local stale projects
          projects.forEach(p => {
            if (!p.githubUrl && p.status !== "stale" && p.status !== "completed") {
              const daysAgo = (Date.now() - new Date(p.updatedAt).getTime()) / (1000 * 3600 * 24);
              if (daysAgo > 90) staleCount++;
            }
          });

          const repos = data.repos || [];
          setGithubRepos(repos);
          setGithubStats(stats);
          setStaleWarningCount(staleCount);
          
          // Auto-update projects based on staleness
          projects.forEach((proj) => {
            if (proj.githubUrl && stats[normalizeGithubUrl(proj.githubUrl)]) {
              const repo = stats[normalizeGithubUrl(proj.githubUrl)];
              const updated = new Date(repo.lastCommit);
              const daysAgo = (Date.now() - updated.getTime()) / (1000 * 3600 * 24);
              if (daysAgo > 90 && proj.status !== "stale" && proj.status !== "completed" && proj.status !== "archived") {
                updateProject(proj.id, { status: "stale" });
              } else if (daysAgo <= 90 && proj.status === "stale") {
                updateProject(proj.id, { status: "active" });
              }
            } else if (!proj.githubUrl) {
              const daysAgo = (Date.now() - new Date(proj.updatedAt).getTime()) / (1000 * 3600 * 24);
              if (daysAgo > 90 && proj.status !== "stale" && proj.status !== "completed" && proj.status !== "archived") {
                updateProject(proj.id, { status: "stale" });
              } else if (daysAgo <= 90 && proj.status === "stale") {
                updateProject(proj.id, { status: "active" });
              }
            }
          });

          // ── AUTO-SYNC: Import any repos not yet in the workspace ──
          // Only auto-sync if user has a token and we got real repos back
          if (repos.length > 0 && hasGithubToken) {
            const currentProjects = useProjectStore.getState().projects;
            autoSyncAllRepos(repos, currentProjects);
          }
        }
      } catch (err) {
        console.error("Failed to fetch github stats", err);
      }
    };
    // Only fetch when we know the token status is resolved
    if (loaded) fetchStats();
  }, [loaded, hasGithubToken]);

  // Load token config and usernames on mount
  useEffect(() => {
    const loadConfig = async () => {
      setGithubUsernameInput(localStorage.getItem("GITHUB_USERNAME") || "coderkavyag");
      try {
        const res = await fetch("/api/auth/token");
        if (res.ok) {
          const data = await res.json();
          setHasGithubToken(data.hasGithubToken);
          setGithubTokenInput(data.hasGithubToken ? "configured" : "");
        }
      } catch (err) {
        console.error("Failed to load token config on mount", err);
      }
    };
    loadConfig();
  }, []);

  // Sync Vercel / GitHub configured states when store properties change
  useEffect(() => {
    setVercelTokenInput(vercel?.hasToken ? "configured" : "");
  }, [vercel?.hasToken]);

  useEffect(() => {
    setGithubTokenInput(hasGithubToken ? "configured" : "");
  }, [hasGithubToken]);

  // Auto-prompt Integrations settings just once if missing
  useEffect(() => {
    if (!loaded) return;
    if (!hasGithubToken && !vercel?.hasToken) {
      const prompted = localStorage.getItem("devos_integrations_prompted");
      if (!prompted) {
        localStorage.setItem("devos_integrations_prompted", "true");
        openSettingsDialog();
      }
    }
  }, [loaded, hasGithubToken, vercel?.hasToken]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "green": return "bg-green-500 shadow-green-500/50";
      case "yellow": return "bg-yellow-500 shadow-yellow-500/50";
      case "red": return "bg-red-500 shadow-red-500/50";
      default: return "bg-zinc-500 shadow-zinc-500/50";
    }
  };



  const createGitHubIssue = async (note: { id: string; content: string; category?: string }) => {
    if (!selectedProject?.githubUrl) return alert("No GitHub URL for this project.");
    setIsCreatingIssue(note.id);
    try {
      const cleanUrl = selectedProject.githubUrl.replace(/\.git$/, '');
      const match = cleanUrl.match(/github\.com\/([^\/]+\/[^\/]+)/);
      if (!match) { alert("Invalid GitHub URL"); return; }
      let repo = match[1];
      repo = repo.split('?')[0].split('#')[0].replace(/\/$/, '');

      // Build a smart title from category + first line of note
      const firstLine = note.content.split('\n')[0].trim().substring(0, 80);
      const catPrefix = note.category ? `[${note.category.charAt(0).toUpperCase() + note.category.slice(1)}] ` : '';
      const issueTitle = `${catPrefix}${firstLine}`;

      const token = localStorage.getItem("GITHUB_TOKEN");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const issueBody = `**Reported via DevOS Brain Dump**\n\n${note.content}\n\n---\n*Auto-created from project note — ${new Date().toLocaleDateString()}*`;

      const res = await fetch("/api/github/issues/create", {
        method: "POST",
        headers,
        body: JSON.stringify({ repo, title: issueTitle, body: issueBody })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.html_url) {
          window.open(data.html_url, '_blank');
        }
      } else {
        const errData = await res.json().catch(() => null);
        alert(`Failed to create GitHub Issue: ${errData?.error || res.statusText}`);
      }
    } catch (e: any) {
      alert(`Failed to connect to API: ${e.message}`);
    } finally {
      setIsCreatingIssue(null);
    }
  };

  const getDerivedCompletion = (project: any) => {
    if (project.completionPercentage !== undefined) return project.completionPercentage;
    if (project.githubUrl) return 75; // Default GitHub repos to "Almost Done" since issues aren't always used
    return 0; // Default local to 0
  };

  const unsyncedRepos = githubRepos.filter(repo => {
    const normalizedUrl = normalizeGithubUrl(repo.html_url);
    return !projects.some(p => p.githubUrl && normalizeGithubUrl(p.githubUrl) === normalizedUrl);
  });

  return (
    <div id="projects-widget" className="flex h-full w-full overflow-hidden text-foreground bg-[#0f0f11] rounded-xl">
      {/* ── COLLAPSED VIEW (Always visible) ── */}
      <div className={`flex flex-col h-full overflow-hidden transition-all duration-300 ${selectedProject ? "w-1/3 border-r border-white/10 pr-3" : "w-full"}`}>
        <div className="flex items-center justify-between mb-4 shrink-0 px-1 pt-1">
          <div className="flex items-center space-x-2">
            <Folder className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold tracking-wider uppercase text-secondary-foreground">Projects</h2>
          </div>
          <div className="flex items-center bg-black/40 p-0.5 rounded-full border border-white/5 shadow-inner mx-1 shrink-0">
            <button 
              onClick={() => setActiveListTab("github")} 
              className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase transition-all duration-300 ${activeListTab === "github" ? "bg-white text-black shadow-sm" : "text-muted-foreground hover:text-white"}`}
            >
              GitHub
            </button>
            <button 
              onClick={() => setActiveListTab("local")} 
              className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase transition-all duration-300 ${activeListTab === "local" ? "bg-white text-black shadow-sm" : "text-muted-foreground hover:text-white"}`}
            >
              Local
            </button>
          </div>
          <div className="flex items-center space-x-2">
            {!selectedProject && (
              <button 
                onClick={() => setShowStaleOnly(!showStaleOnly)}
                className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase transition-all duration-300 border ${
                  showStaleOnly 
                    ? "bg-amber-500/20 border-amber-500/30 text-amber-400 hover:bg-amber-500/30" 
                    : "bg-green-500/20 border-green-500/30 text-green-400 hover:bg-green-500/30"
                }`}
              >
                {showStaleOnly ? "Stale" : "Active"}
              </button>
            )}
            {!showMascot && (
              <Button
                variant="ghost"
                size="icon"
                className="w-6 h-6 hover:bg-white/5 text-amber-400/80 hover:text-amber-400 shrink-0"
                onClick={() => {
                  setShowMascot(true);
                  localStorage.removeItem("devos_hide_mascot");
                }}
                title="Show Onboarding Mascot"
              >
                <HelpCircle className="w-3.5 h-3.5" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="w-6 h-6 hover:bg-white/5 text-white/50 hover:text-white shrink-0"
              onClick={openSettingsDialog}
              title="Integrations Settings"
            >
              <Settings className="w-3.5 h-3.5" />
            </Button>
          </div>
          
        </div>

        <div className="flex-1 flex flex-col min-h-0">
          <div 
            className="flex-1 overflow-y-auto px-2 space-y-1.5 pb-4"
            style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.08) transparent' }}
          >
             {activeListTab === "github" && (
              <>
              {!hasGithubToken ? (
                <div className="p-3.5 bg-white/[0.02] border border-white/10 rounded-xl space-y-3 shadow-xl relative overflow-hidden my-2 mx-1 select-none">
                  <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 font-mono flex items-center gap-1.5">
                      <GitBranch className="w-3.5 h-3.5" />
                      GitHub Integration
                    </h4>
                    <p className="text-[10px] text-white/50 leading-relaxed font-sans">
                      Connect your GitHub account to sync repositories, track open issues, and automate commits.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase font-bold tracking-wider text-white/60 font-mono">GitHub Username</label>
                      <Input
                        value={githubUsernameInput}
                        onChange={e => setGithubUsernameInput(e.target.value)}
                        className="h-8 bg-black/40 border-white/10 text-xs focus-visible:ring-amber-500/30 text-white placeholder-white/20"
                        placeholder="e.g. coderkavyag"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[9px] uppercase font-bold tracking-wider text-white/60 font-mono flex items-center gap-1">
                          Personal Access Token
                        </label>
                        <a
                          href="https://github.com/settings/tokens/new?scopes=repo,read:org&description=DevOS%20Token"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-amber-400 hover:text-amber-300 transition-colors text-[9px] uppercase font-mono tracking-wider font-bold hover:underline"
                        >
                          Generate
                        </a>
                      </div>
                      <div className="relative flex items-center">
                        <Input
                          type="password"
                          value={githubTokenInput}
                          onChange={e => setGithubTokenInput(e.target.value)}
                          className="h-8 bg-black/40 border-white/10 text-xs focus-visible:ring-amber-500/30 text-white placeholder-white/20 w-full pr-7"
                          placeholder={hasGithubToken ? "configured" : "ghp_..."}
                        />
                        <div className="absolute right-2 flex items-center">
                          <Tooltip>
                            <TooltipTrigger>
                              <HelpCircle className="w-3.5 h-3.5 text-white/30 hover:text-white cursor-help transition-colors" />
                            </TooltipTrigger>
                            <TooltipContent className="bg-[#0f0f11] border border-white/10 text-xs text-white max-w-xs p-2.5 rounded-lg shadow-xl leading-normal font-sans" side="top" align="end">
                              Make sure you select <b>repo</b> scopes so DevOS can read your commits and project info.
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={handleSaveSettings}
                    disabled={savingSettings}
                    className="w-full h-8 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold uppercase tracking-wider transition-all shadow-md active:scale-[0.99] cursor-pointer"
                  >
                    {savingSettings ? "Connecting..." : "Connect GitHub"}
                  </Button>
                </div>
              ) : (
                <>
                  {projects.filter(p => p.githubUrl).length === 0 && (
                    <div className="text-center py-4 text-xs text-muted-foreground">
                      No GitHub repositories synced to your workspace yet.
                    </div>
                  )}

                  {/* Auto-sync status indicator */}
                  {autoSyncing && (
                    <div className="mt-3 flex items-center gap-2 px-2 py-2 bg-amber-500/5 border border-amber-500/15 rounded-lg">
                      <span className="w-3 h-3 rounded-full border-2 border-amber-400 border-t-transparent animate-spin shrink-0" />
                      <span className="text-[10px] text-amber-400/80 font-mono">Auto-syncing your GitHub repos...</span>
                    </div>
                  )}
                  {autoSyncDone && !autoSyncing && (
                    <div className="mt-3 flex items-center gap-2 px-2 py-2 bg-green-500/5 border border-green-500/15 rounded-lg">
                      <CheckCircle2 className="w-3 h-3 text-green-400 shrink-0" />
                      <span className="text-[10px] text-green-400/80 font-mono">All repos synced to workspace!</span>
                    </div>
                  )}
                </>
              )}
              {projects.filter(p => p.githubUrl).sort((a, b) => {
                const aCommit = githubStats[normalizeGithubUrl(a.githubUrl)]?.lastCommit;
                const bCommit = githubStats[normalizeGithubUrl(b.githubUrl)]?.lastCommit;
                if (!aCommit) return 1;
                if (!bCommit) return -1;
                return new Date(bCommit).getTime() - new Date(aCommit).getTime();
              }).filter(p => {
                if (p.status === "archived") return false;
                const stats = githubStats[normalizeGithubUrl(p.githubUrl)];
                const isStale = (() => {
                  if (!stats) return false;
                  const daysAgo = (Date.now() - new Date(stats.lastCommit).getTime()) / (1000 * 3600 * 24);
                  return daysAgo > 90;
                })();
                return showStaleOnly ? isStale : !isStale;
              }).map((project) => {
                const stats = githubStats[normalizeGithubUrl(project.githubUrl)];
                const isSelected = selectedProject?.id === project.id;
                const daysAgo = stats ? Math.floor((Date.now() - new Date(stats.lastCommit).getTime()) / (1000 * 3600 * 24)) : 0;
                const isStale = daysAgo > 90;

                return (
                  <div 

                    key={project.id} 
                    className={`px-3 py-2.5 rounded-lg flex items-center justify-between cursor-pointer transition-all duration-200 border border-transparent 
                      ${isSelected ? "bg-primary/10 border-primary/20 shadow-sm" : "bg-transparent hover:bg-white/5 hover:border-white/10"}
                      ${isStale ? "opacity-70 hover:opacity-100" : ""}`}
                    onClick={() => setSelectedProject(project)}
                  >
                    <div className="flex flex-col overflow-hidden w-full pr-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`w-2 h-2 rounded-full shrink-0 shadow-sm ${
                          project.status === "active" ? "bg-green-400 shadow-green-400/50" :
                          project.status === "planning" ? "bg-blue-400 shadow-blue-400/50" :
                          project.status === "completed" ? "bg-white/30 shadow-white/10" :
                          project.status === "stale" ? "bg-amber-400 shadow-amber-400/50" : "bg-zinc-400 shadow-zinc-500/50"
                        }`} />
                        <div
                          className="truncate max-w-[120px] text-sm font-medium text-white"
                          title={project.name}
                        >
                          {project.name}
                        </div>
                        {stats?.issues > 0 && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); window.open(`${project.githubUrl}/issues`); }}
                            className="ml-1 px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 text-[9px] font-bold shrink-0 hover:bg-red-500/30 transition-colors"
                          >
                            {stats.issues} issues
                          </button>
                        )}
                      </div>
                      {stats?.lastCommitMsg && (
                        <p className="text-[10px] text-muted-foreground truncate pl-4 mt-0.5">
                          {stats.lastCommitMsg.length > 35 ? stats.lastCommitMsg.substring(0, 35) + '...' : stats.lastCommitMsg}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {!selectedProject && isStale && (
                        <span className="text-[10px] text-amber-500/80 font-bold whitespace-nowrap">{daysAgo}d stale</span>
                      )}
                      
                      {!selectedProject && isStale && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity">
                           <Button 
                              variant="ghost" 
                              size="sm"
                              className="h-6 px-2 text-[10px] bg-white/5 hover:bg-white/10"
                              onClick={(e) => { e.stopPropagation(); updateProject(project.id, { status: "active" }); }}
                           >
                             Mark active
                           </Button>
                           <Button 
                              variant="ghost" 
                              size="sm"
                              className="h-6 px-2 text-[10px] bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 hover:text-rose-300"
                              onClick={(e) => { e.stopPropagation(); updateProject(project.id, { status: "archived" }); }}
                           >
                             Archive
                           </Button>
                        </div>
                      )}

                      {!selectedProject && !isStale && stats && (
                        <span className="text-[10px] text-muted-foreground font-mono opacity-80">{new Date(stats.lastCommit).toLocaleDateString()}</span>
                      )}
                      
                      {project.folderPath && !isStale && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="w-6 h-6 shrink-0 hover:bg-[#007acc]/10 text-[#007acc]"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(`vscode://file/${project.folderPath}`);
                          }}
                          title="Open in VS Code"
                        >
                          <Code2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="w-6 h-6 shrink-0 hover:bg-red-500/10 text-white/50 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDeleteId(project.id);
                        }}
                        title="Delete Project"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
              </>
            )}

            {activeListTab === "local" && (
              <>
              <div className="px-2 pt-2 pb-2">
                <Button 
                  onClick={() => handlePickFolder("import")}
                  disabled={isPickingFolder}
                  size="sm"
                  className="w-full h-8 bg-white/5 hover:bg-white/10 text-foreground border border-white/10 border-dashed flex items-center justify-center gap-1.5 transition-all duration-300 group"
                >
                  <Plus className="w-3.5 h-3.5 text-primary group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-medium">{isPickingFolder ? "Opening..." : "Import Local Project"}</span>
                </Button>
              </div>
              
              {!vercel?.hasToken && (
                <div className="p-3.5 bg-white/[0.02] border border-white/10 rounded-xl space-y-3 shadow-xl relative overflow-hidden my-2 mx-2 select-none">
                  <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-blue-400 font-mono flex items-center gap-1.5">
                      <ExternalLink className="w-3.5 h-3.5" />
                      Vercel Integration
                    </h4>
                    <p className="text-[10px] text-white/50 leading-relaxed font-sans">
                      Connect your Vercel account to view deployments, track web analytics, and run health diagnostics.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[9px] uppercase font-bold tracking-wider text-white/60 font-mono">Vercel API Token</label>
                        <a
                          href="https://vercel.com/account/tokens"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 transition-colors text-[9px] uppercase font-mono tracking-wider font-bold hover:underline"
                        >
                          Generate
                        </a>
                      </div>
                      <div className="relative flex items-center">
                        <Input
                          type="password"
                          value={vercelTokenInput}
                          onChange={e => setVercelTokenInput(e.target.value)}
                          className="h-8 bg-black/40 border-white/10 text-xs focus-visible:ring-blue-500/30 text-white placeholder-white/20 w-full pr-7"
                          placeholder={vercel?.hasToken ? "configured" : "ve_..."}
                        />
                        <div className="absolute right-2 flex items-center">
                          <Tooltip>
                            <TooltipTrigger>
                              <HelpCircle className="w-3.5 h-3.5 text-white/30 hover:text-white cursor-help transition-colors" />
                            </TooltipTrigger>
                            <TooltipContent className="bg-[#0f0f11] border border-white/10 text-xs text-white max-w-xs p-2.5 rounded-lg shadow-xl leading-normal font-sans" side="top" align="end">
                              Generate a Vercel API token with access to all projects and appropriate scopes.
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={handleSaveSettings}
                    disabled={savingSettings}
                    className="w-full h-8 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase tracking-wider transition-all shadow-md active:scale-[0.99] cursor-pointer"
                  >
                    {savingSettings ? "Connecting..." : "Connect Vercel"}
                  </Button>
                </div>
              )}
              {projects.filter(p => (p.folderPath || !p.githubUrl) && p.status !== "archived").filter(p => {
                const daysAgo = (Date.now() - new Date(p.updatedAt).getTime()) / (1000 * 3600 * 24);
                const isStale = daysAgo > 90;
                return showStaleOnly ? isStale : !isStale;
              }).length === 0 && (
                <div className="text-center py-6 text-xs text-muted-foreground">No local workspaces found.</div>
              )}
              {projects.filter(p => (p.folderPath || !p.githubUrl) && p.status !== "archived").filter(p => {
                const daysAgo = (Date.now() - new Date(p.updatedAt).getTime()) / (1000 * 3600 * 24);
                const isStale = daysAgo > 90;
                return showStaleOnly ? isStale : !isStale;
              }).map((project) => {
                const isSelected = selectedProject?.id === project.id;
                
                const daysAgo = Math.floor((Date.now() - new Date(project.updatedAt).getTime()) / (1000 * 3600 * 24));
                const isStale = daysAgo > 90;
                
                return (
                  <div 
                    key={project.id} 
                    className={`px-3 py-2.5 rounded-lg flex items-center justify-between cursor-pointer transition-all duration-200 border border-transparent group
                      ${isSelected ? "bg-primary/10 border-primary/20 shadow-sm" : "bg-transparent hover:bg-white/5 hover:border-white/10"}
                      ${isStale ? "opacity-70 hover:opacity-100" : ""}`}
                    onClick={() => setSelectedProject(project)}
                  >
                    <div className="flex items-center gap-3 overflow-hidden min-w-0">
                      <div 
                        className={`w-2 h-2 rounded-full shrink-0 shadow-sm ${
                          project.status === "active" ? "bg-green-400 shadow-green-400/50" :
                          project.status === "planning" ? "bg-blue-400 shadow-blue-400/50" :
                          project.status === "completed" ? "bg-white/30 shadow-white/10" :
                          project.status === "stale" ? "bg-amber-400 shadow-amber-400/50" : "bg-zinc-400 shadow-zinc-500/50"
                        }`} 
                        title="Project Status"
                      />
                      <div
                        className="truncate max-w-[120px] text-sm font-medium text-white"
                        title={project.name}
                      >
                        {project.name}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 shrink-0">
                      {!selectedProject && isStale && (
                        <span className="text-[10px] text-amber-500/80 font-bold whitespace-nowrap">{daysAgo}d stale</span>
                      )}
                      
                      {!selectedProject && isStale && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity">
                           <Button 
                              variant="ghost" 
                              size="sm"
                              className="h-6 px-2 text-[10px] bg-white/5 hover:bg-white/10"
                              onClick={(e) => { e.stopPropagation(); updateProject(project.id, { status: "active" }); }}
                           >
                             Mark active
                           </Button>
                           <Button 
                              variant="ghost" 
                              size="sm"
                              className="h-6 px-2 text-[10px] bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 hover:text-rose-300"
                              onClick={(e) => { e.stopPropagation(); updateProject(project.id, { status: "archived" }); }}
                           >
                             Archive
                           </Button>
                        </div>
                      )}

                      {project.folderPath && !isStale && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="w-6 h-6 shrink-0 hover:bg-white/10 text-white/50 hover:text-white"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(`vscode://file/${project.folderPath}`);
                          }}
                          title="Open in VS Code"
                        >
                          <Code2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="w-6 h-6 shrink-0 hover:bg-red-500/10 text-white/50 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDeleteId(project.id);
                        }}
                        title="Delete Project"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
              </>
            )}
          </div>

          {/* Mascot card at the bottom of the sidebar */}
          {showMascot && (
            <div className="shrink-0 mt-2 p-3 bg-white/[0.01] border border-white/[0.04] rounded-xl relative select-none">
              {/* Close Button */}
              <button
                onClick={() => {
                  setShowMascot(false);
                  localStorage.setItem("devos_hide_mascot", "true");
                }}
                className="absolute top-1.5 right-1.5 text-white/30 hover:text-white/70 hover:bg-white/5 p-1 rounded transition-colors cursor-pointer z-10"
                title="Dismiss guide"
              >
                <X className="w-3 h-3" />
              </button>

              <div className="flex items-center gap-3">
                {/* Devy Cartoon Mascot SVG */}
                <div className="shrink-0 relative">
                  <svg className="w-14 h-16" viewBox="0 0 64 80" fill="none">
                    {/* Hair back */}
                    <path d="M12 25c0-12 10-15 20-15s20 3 20 15v10H12V25z" fill="#EA580C" />
                    {/* Face */}
                    <rect x="18" y="22" width="28" height="26" rx="14" fill="#FED7AA" />
                    {/* Eyes */}
                    <circle cx="27" cy="33" r="3" fill="#2563EB" />
                    <circle cx="37" cy="33" r="3" fill="#2563EB" />
                    <circle cx="28.5" cy="31.5" r="1.2" fill="#FFFFFF" />
                    <circle cx="38.5" cy="31.5" r="1.2" fill="#FFFFFF" />
                    {/* Cheeks */}
                    <circle cx="23" cy="38" r="2.5" fill="#F43F5E" opacity="0.4" />
                    <circle cx="41" cy="38" r="2.5" fill="#F43F5E" opacity="0.4" />
                    {/* Smile */}
                    <path d="M28 40q4 3 8 0" stroke="#78350F" strokeWidth="2" strokeLinecap="round" />
                    {/* Hair front bangs */}
                    <path d="M14 23c4-4 12-5 18-2s14 1 18 4v-4c0-10-8-13-20-13S14 13 14 21v2z" fill="#C2410C" />
                    <path d="M16 22c5-5 12-6 16-3" stroke="#F97316" strokeWidth="2" strokeLinecap="round" />
                    {/* Body/Shirt */}
                    <path d="M16 48c0 0 4 6 16 6s16-6 16-6v20H16V48z" fill="#0D9488" />
                    {/* Overalls straps */}
                    <rect x="22" y="48" width="4" height="15" fill="#1E3A8A" />
                    <rect x="38" y="48" width="4" height="15" fill="#1E3A8A" />
                    <circle cx="24" cy="54" r="1.5" fill="#F59E0B" />
                    <circle cx="40" cy="54" r="1.5" fill="#F59E0B" />
                    {/* Arm pointing */}
                    <path d="M44 52c4 1 8-2 10-6s1-4-1-5-6 2-7 6l-2 5z" fill="#FED7AA" />
                  </svg>
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-500 border border-black animate-pulse" />
                </div>

                {/* Retro Cartoon Speech Bubble next to Devy */}
                <div className="flex-1 min-w-0 relative">
                  <div className="bg-white text-slate-900 text-[10px] leading-relaxed p-3 rounded-xl border-2 border-slate-900 shadow-[2px_2px_0px_rgba(0,0,0,0.95)] relative">
                    {/* Tail pointing to Devy */}
                    <div className="absolute top-5 -left-[7px] w-3 h-3 bg-white border-l-2 border-b-2 border-slate-900 rotate-45 transform" />
                    <p className="font-sans">
                      <span className="font-bold text-[#B45309]">Welcome Chief!</span> You can control your tasks and manage features in depth by clicking <span className="font-bold text-blue-600">Project OS</span> in your header!
                    </p>
                    <button
                      onClick={() => useProjectOSStore.getState().open()}
                      className="mt-1.5 text-[9px] text-[#0284C7] hover:text-[#0369A1] uppercase tracking-wider font-mono font-bold flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      Launch Project OS →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {selectedProject && currentProject && (
        <div className="w-2/3 flex flex-col h-full overflow-hidden pl-3">
          {/* ── Drawer Header ── */}
          <div className="shrink-0 mb-3 bg-white/[0.02] border border-white/8 rounded-xl p-3 space-y-2">
            {/* Row 1: Name + Status Dot + Actions */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div className={`w-2 h-2 rounded-full mt-0.5 shrink-0 shadow-sm ${
                  currentProject.status === "active" ? "bg-green-400 shadow-green-400/50" :
                  currentProject.status === "planning" ? "bg-blue-400 shadow-blue-400/50" :
                  currentProject.status === "completed" ? "bg-white/30" :
                  currentProject.status === "stale" ? "bg-amber-400 shadow-amber-400/50" : "bg-zinc-500"
                }`} />
                <h3 className="text-sm font-bold text-white truncate">{currentProject.name}</h3>
                {(() => {
                  const curatedPhase = getCuratedPhase(currentProject.id);
                  if (!curatedPhase) return null;
                  const phaseInfo = PHASE_MAP[curatedPhase as keyof typeof PHASE_MAP];
                  if (!phaseInfo) return null;
                  return <Badge variant="outline" className={`text-[8px] font-bold uppercase tracking-wider shrink-0 ${phaseInfo.color}`}>{phaseInfo.label}</Badge>;
                })()}
              </div>

              {/* Action icons */}
              <div className="flex items-center gap-0.5 shrink-0">
                {currentProject.githubUrl && (
                  <a href={currentProject.githubUrl} target="_blank" rel="noopener noreferrer"
                    className="w-7 h-7 flex items-center justify-center rounded-md text-white/40 hover:text-purple-400 hover:bg-purple-500/10 transition-colors"
                    title="Open GitHub Repo">
                    <GitBranch className="w-3.5 h-3.5" />
                  </a>
                )}
                {currentProject.liveUrl && (
                  <a href={currentProject.liveUrl} target="_blank" rel="noopener noreferrer"
                    className="w-7 h-7 flex items-center justify-center rounded-md text-white/40 hover:text-green-400 hover:bg-green-500/10 transition-colors"
                    title="Open Live Site">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}

                <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                  <DialogTrigger
                    className="w-7 h-7 flex items-center justify-center rounded-md text-white/40 hover:text-white hover:bg-white/8 transition-colors"
                    title="Edit Project"
                    onClick={() => setFormData({
                      name: selectedProject.name,
                      description: selectedProject.description,
                      folderPath: selectedProject.folderPath || "",
                      status: selectedProject.status || "green"
                    })}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </DialogTrigger>
                  <DialogContent className="bg-[#0f0f11] border-white/10 text-foreground">
                    <DialogHeader><DialogTitle>Edit Project</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-muted-foreground">Title</label>
                        <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="bg-transparent border-white/10" placeholder="Project name" />
                      </div>
                      {!selectedProject.githubUrl && (
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-muted-foreground">Color Indicator</label>
                          <div className="flex gap-3">
                            {['green', 'yellow', 'red'].map(color => (
                              <button key={color} onClick={() => setFormData({...formData, status: color})}
                                className={`w-5 h-5 rounded-full ${color === 'green' ? 'bg-green-500' : color === 'yellow' ? 'bg-yellow-500' : 'bg-red-500'} ${formData.status === color ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0f0f11]' : 'opacity-50 hover:opacity-100'}`} />
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-muted-foreground">Description</label>
                        <Input value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="bg-transparent border-white/10" placeholder="Brief description" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-muted-foreground">Folder Path</label>
                        <Input value={formData.folderPath} onChange={e => setFormData({...formData, folderPath: e.target.value})} className="bg-transparent border-white/10" placeholder="C:\Projects\..." />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} className="border-white/10 bg-transparent">Cancel</Button>
                      <Button onClick={() => {
                        if (formData.name.trim()) {
                          updateProject(selectedProject.id, { name: formData.name.trim(), description: formData.description.trim(), folderPath: formData.folderPath.trim() || undefined, status: formData.status as any });
                          setSelectedProject({ ...selectedProject, name: formData.name.trim(), description: formData.description.trim(), folderPath: formData.folderPath.trim() || undefined, status: formData.status as any });
                          setIsEditDialogOpen(false);
                        }
                      }}>Save Changes</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <AlertDialog>
                  <AlertDialogTrigger
                    className="w-7 h-7 flex items-center justify-center rounded-md text-white/40 hover:text-green-400 hover:bg-green-500/10 transition-colors"
                    title="Mark complete"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-[#0f0f11] border-white/10 text-foreground">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Mark as Completed?</AlertDialogTitle>
                      <AlertDialogDescription>This will set the project status to completed.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="bg-transparent border-white/10 hover:bg-white/5">Cancel</AlertDialogCancel>
                      <AlertDialogAction className="bg-green-500 hover:bg-green-600 text-white" onClick={() => { updateProject(selectedProject.id, { status: "completed", completionPercentage: 100 }); setSelectedProject(null); }}>
                        Mark Complete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                <button onClick={() => setSelectedProject(null)}
                  className="w-7 h-7 flex items-center justify-center rounded-md text-white/40 hover:text-white hover:bg-white/8 transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Row 2: Description */}
            {currentProject.description && (
              <p className="text-[11px] text-white/45 leading-relaxed pl-4 truncate">
                {currentProject.description}
              </p>
            )}

            {/* Row 3: Tags */}
            {currentProject.tags && currentProject.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 pl-4">
                {currentProject.tags.slice(0, 5).map((tag: string) => (
                  <Badge key={tag} variant="secondary" className="text-[8px] py-0 px-1.5 uppercase bg-primary/10 text-primary border-primary/20">{tag}</Badge>
                ))}
              </div>
            )}
          </div>

          {/* ── Scrollable Drawer Body ── */}
          <div
            className="flex-1 overflow-y-auto space-y-3 pb-4 pr-1"
            style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.08) transparent' }}
          >
            {/* ── Local Connection Card ── */}
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.01] p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[9px] uppercase font-bold tracking-widest text-white/35">Local Folder</span>
                <Badge variant="outline" className={`text-[8px] font-bold uppercase ${
                  currentProject.folderPath
                    ? "bg-green-500/10 text-green-400 border-green-500/20"
                    : "bg-white/5 text-white/40 border-white/10"
                }`}>
                  {currentProject.folderPath ? "Linked" : "Not linked"}
                </Badge>
              </div>
              {currentProject.folderPath ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 bg-black/30 border border-white/5 rounded-lg px-2.5 py-1.5">
                    <FolderOpen className="w-3 h-3 text-sky-400 shrink-0" />
                    <span className="text-[10px] font-mono text-white/60 truncate flex-1" title={currentProject.folderPath}>{currentProject.folderPath}</span>
                    <button onClick={() => window.open(`vscode://file/${currentProject.folderPath}`)}
                      className="text-[9px] font-bold text-sky-400 hover:text-sky-300 shrink-0 whitespace-nowrap">
                      VS Code
                    </button>
                  </div>
                  <Button size="sm" variant="outline"
                    className="h-6 text-[9px] px-2.5 border-white/10 bg-transparent text-white/50 hover:text-white hover:bg-white/5 w-full"
                    onClick={() => handlePickFolder("link")} disabled={isPickingFolder}>
                    Change Folder Link
                  </Button>
                </div>
              ) : (
                <Button size="sm"
                  onClick={() => handlePickFolder("link")} disabled={isPickingFolder}
                  className="w-full h-7 text-[10px] font-bold bg-primary hover:bg-primary/90 text-primary-foreground">
                  {isPickingFolder ? "Linking..." : "Link Local Folder"}
                </Button>
              )}
            </div>

            {/* ── Recent Commits ── */}
            {selectedProject.githubUrl && (
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.01] p-3 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] uppercase font-bold tracking-widest text-white/35">Recent Commits</span>
                  {commitsLoading && (
                    <span className="text-[9px] text-white/30 animate-pulse">Loading...</span>
                  )}
                </div>

                {!commitsLoading && projectCommits.length === 0 ? (
                  <div className="text-center py-3">
                    <span className="text-[11px] text-white/30">No commits found in last 14 days</span>
                  </div>
                ) : (
                  <div
                    className="space-y-1.5 max-h-[200px] overflow-y-auto pr-1"
                    style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.06) transparent' }}
                  >
                    {projectCommits.slice(0, commitLimit).map((commit: any) => {
                      const hoursAgo = Math.floor((Date.now() - new Date(commit.date).getTime()) / (1000 * 3600));
                      const timeStr = hoursAgo < 1 ? 'just now' : hoursAgo < 24 ? `${hoursAgo}h ago` : `${Math.floor(hoursAgo / 24)}d ago`;
                      return (
                        <div key={commit.sha} className="flex items-start gap-2 group py-1 border-b border-white/[0.04] last:border-0">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary/50 shrink-0 mt-1.5" />
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] text-white/75 leading-snug truncate">{commit.message}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[9px] text-white/30">{timeStr}</span>
                              {commit.url && (
                                <a href={commit.url} target="_blank" rel="noreferrer"
                                  className="text-[9px] font-mono text-primary/60 hover:text-primary transition-colors">
                                  {typeof commit.sha === 'string' ? commit.sha.substring(0, 7) : commit.sha}
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {projectCommits.length > commitLimit && (
                      <button onClick={() => setCommitLimit(prev => prev + 10)}
                        className="w-full text-center text-[9px] text-white/30 hover:text-white/60 py-1 transition-colors">
                        Load more ({projectCommits.length - commitLimit} remaining)
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── Brain Dump Notes & Tasks ── */}
            {(() => {
              const cleanProjectTag = `@${selectedProject.name.toLowerCase().replace(/\s+/g, "")}`;
              const spaceProjectTag = `@${selectedProject.name.toLowerCase()}`;
              const projectTasks = tasks.filter(t => {
                if (t.completed) return false;
                const titleLower = t.title.toLowerCase();
                return t.projectId === selectedProject.id ||
                       titleLower.includes(cleanProjectTag) ||
                       titleLower.includes(spaceProjectTag);
              });

              return (
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.01] p-3 space-y-2.5">
                  <span className="text-[9px] uppercase font-bold tracking-widest text-white/35">Brain Dump & Tasks</span>
                  <div className="space-y-2">
                    {projectNotes.length === 0 && projectTasks.length === 0 ? (
                      <div className="py-4 text-center">
                        <p className="text-[11px] text-white/25">No active notes or tasks for this project.</p>
                        <p className="text-[10px] text-white/20 mt-1">Use <span className="font-mono text-amber-400/50">@{selectedProject.name}</span> in Focus Panel</p>
                      </div>
                    ) : (
                      <>
                        {/* Tasks */}
                        {projectTasks.map(task => {
                          const priorityColor = task.priority === 'high' ? 'bg-orange-500/15 text-orange-300 border-orange-500/20' : 'bg-white/5 text-white/40 border-white/10';
                          return (
                            <div key={task.id} className="group p-2.5 rounded-lg border border-white/[0.05] bg-white/[0.01] hover:bg-white/[0.03] transition-colors space-y-1.5 animate-in fade-in duration-200">
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="text-[8px] py-0 px-1.5 uppercase shrink-0 bg-blue-500/10 text-blue-400 border-blue-500/25">
                                  Task
                                </Badge>
                                <Badge variant="secondary" className={`text-[8px] py-0 px-1.5 uppercase shrink-0 ${priorityColor}`}>
                                  {task.priority}
                                </Badge>
                                <span className="text-[9px] text-white/25 font-mono ml-auto">{timeAgo(task.createdAt)}</span>
                              </div>
                              <p className="text-[11px] text-white/65 leading-relaxed line-clamp-3">{task.title}</p>
                              <div className="flex gap-1.5">
                                <button onClick={() => handleDeleteTask(task.id)}
                                  className="text-[9px] px-2 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 transition-colors flex items-center gap-1">
                                  <CheckCircle2 className="w-2.5 h-2.5" /> Resolve
                                </button>
                                {selectedProject.githubUrl && (
                                  <button onClick={() => createGitHubIssue({ id: task.id, content: task.title, category: 'task' })} disabled={isCreatingIssue === task.id}
                                    className="text-[9px] px-2 py-0.5 rounded bg-white/5 text-white/40 border border-white/10 hover:bg-blue-500/10 hover:text-blue-300 hover:border-blue-500/20 transition-colors flex items-center gap-1 disabled:opacity-50">
                                    {isCreatingIssue === task.id ? <><span className="w-2.5 h-2.5 rounded-full border border-current border-t-transparent animate-spin" /> Creating</> : <><GitBranch className="w-2.5 h-2.5" /> Issue</>}
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}

                        {/* Notes */}
                        {projectNotes.map(note => {
                          const categoryStyle: Record<string, string> = {
                            feedback: 'bg-orange-500/15 text-orange-300 border-orange-500/20',
                            bug: 'bg-red-500/15 text-red-300 border-red-500/20',
                            idea: 'bg-amber-500/15 text-amber-300 border-amber-500/20',
                            note: 'bg-white/5 text-white/40 border-white/10'
                          };
                          const cat = note.category;
                          const colorClass = cat && cat !== 'classifying...' ? (categoryStyle[cat.toLowerCase()] || categoryStyle.note) : categoryStyle.note;
                          return (
                            <div key={note.id} className="group p-2.5 rounded-lg border border-white/[0.05] bg-white/[0.01] hover:bg-white/[0.03] transition-colors space-y-1.5">
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary" className={`text-[8px] py-0 px-1.5 uppercase shrink-0 ${(!cat || cat === 'classifying...') ? 'animate-pulse bg-white/5 text-white/30 border-white/10' : colorClass}`}>
                                  {(!cat || cat === 'classifying...') ? 'classifying...' : cat}
                                </Badge>
                                <span className="text-[9px] text-white/25 font-mono ml-auto">{timeAgo(note.createdAt)}</span>
                              </div>
                              <p className="text-[11px] text-white/65 leading-relaxed line-clamp-3">{note.content}</p>
                              <div className="flex gap-1.5">
                                <button onClick={() => handleDeleteNote(note.id)}
                                  className="text-[9px] px-2 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 transition-colors flex items-center gap-1">
                                  <CheckCircle2 className="w-2.5 h-2.5" /> Resolve
                                </button>
                                {selectedProject.githubUrl && (
                                  <button onClick={() => createGitHubIssue(note)} disabled={isCreatingIssue === note.id}
                                    className="text-[9px] px-2 py-0.5 rounded bg-white/5 text-white/40 border border-white/10 hover:bg-blue-500/10 hover:text-blue-300 hover:border-blue-500/20 transition-colors flex items-center gap-1 disabled:opacity-50">
                                    {isCreatingIssue === note.id ? <><span className="w-2.5 h-2.5 rounded-full border border-current border-t-transparent animate-spin" /> Creating</> : <><GitBranch className="w-2.5 h-2.5" /> Issue</>}
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ── Delete Confirmation AlertDialog ── */}
      <AlertDialog open={!!confirmDeleteId} onOpenChange={(open) => { if (!open) setConfirmDeleteId(null); }}>
        <AlertDialogContent className="bg-[#0f0f11] border-white/10 text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the project and all its data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-white/10 hover:bg-white/5" onClick={() => setConfirmDeleteId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600 text-white"
              onClick={async () => {
                if (confirmDeleteId) {
                  const idToDelete = confirmDeleteId;
                  setConfirmDeleteId(null);
                  await deleteProject(idToDelete);
                  if (selectedProject?.id === idToDelete) setSelectedProject(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Integrations Setup Dialog */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="bg-[#0f0f11] border-white/10 text-foreground max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-primary" />
              Integrations Settings
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground">GitHub Username</label>
              <Input 
                value={githubUsernameInput} 
                onChange={e => setGithubUsernameInput(e.target.value)} 
                className="bg-transparent border-white/10 focus-visible:ring-primary/30" 
                placeholder="e.g. coderkavyag" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground">GitHub Personal Access Token</label>
              <Input 
                type="password"
                value={githubTokenInput} 
                onChange={e => setGithubTokenInput(e.target.value)} 
                className="bg-transparent border-white/10 focus-visible:ring-primary/30" 
                placeholder="ghp_..." 
              />
              <p className="text-[10px] text-muted-foreground">Used for commit feeds and issue tracking.</p>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground">Vercel Integration Token</label>
              <Input 
                type="password"
                value={vercelTokenInput} 
                onChange={e => setVercelTokenInput(e.target.value)} 
                className="bg-transparent border-white/10 focus-visible:ring-primary/30" 
                placeholder={vercel?.hasToken ? "configured (leave unchanged, or clear to disconnect)" : "ve_..."} 
              />
              <p className="text-[10px] text-muted-foreground">Used for analytics sparklines, deployments, and automated health checks.</p>
            </div>
            
            <div className="border-t border-white/5 pt-4 space-y-2">
              <label className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
                <span>Telegram Integration</span>
                {telegramLinked ? (
                  <span className="text-[10px] uppercase tracking-wider font-mono font-bold text-green-400">
                    ● Linked
                  </span>
                ) : (
                  <span className="text-[10px] uppercase tracking-wider font-mono font-bold text-amber-400">
                    ○ Ready to Link
                  </span>
                )}
              </label>
              
              <div className="bg-white/[0.01] border border-white/[0.04] rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-white/40 font-medium">Your Link Code:</span>
                  <code className="text-xs font-mono font-bold text-amber-400 bg-white/5 px-1.5 py-0.5 rounded border border-white/5 select-all">
                    DEVOS-{userId ? userId.slice(0, 8) : 'unknown'}
                  </code>
                </div>
                <p className="text-[10px] text-white/40 leading-relaxed">
                  {telegramLinked 
                    ? "Connected! You can send messages directly to @AssistmeOs_Bot to capture tasks, ideas, and notes onto your DevOS dashboard instantly."
                    : "Message this code to the bot @AssistmeOs_Bot to link your accounts and start capturing tasks, ideas, and notes on the go."}
                </p>
              </div>
            </div>

            <div className="border-t border-white/5 pt-4 space-y-2">
              <label className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
                <span>Onboarding Guide Mascot</span>
              </label>
              <div className="flex items-center justify-between bg-white/[0.01] border border-white/[0.04] rounded-lg p-3">
                <span className="text-[10px] text-white/40">Reset Devy the mascot to show up on the dashboard.</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-6 text-[9px] uppercase tracking-wider font-bold border-white/10 hover:bg-white/5 bg-transparent"
                  onClick={() => {
                    setShowMascot(true);
                    localStorage.removeItem("devos_hide_mascot");
                  }}
                >
                  Reveal Mascot
                </Button>
              </div>
            </div>

          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSettingsOpen(false)} className="border-white/10 bg-transparent">Cancel</Button>
            <Button onClick={handleSaveSettings} disabled={savingSettings} className="bg-primary text-primary-foreground hover:bg-primary/90">
              {savingSettings ? "Saving..." : "Save Config"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
