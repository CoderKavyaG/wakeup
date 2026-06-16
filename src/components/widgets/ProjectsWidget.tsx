"use client";

import React, { useState, useEffect, useRef } from "react";
import { useProjectStore, Project, ProjectStatus } from "@/store/useProjectStore";
import { useNoteStore } from "@/store/useNoteStore";
import { useTaskStore } from "@/store/useTaskStore";
import { useBootstrapStore } from "@/store/useBootstrapStore";
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

  const openSettingsDialog = () => {
    setGithubUsernameInput(localStorage.getItem("GITHUB_USERNAME") || "coderkavyag");
    setGithubTokenInput(localStorage.getItem("GITHUB_TOKEN") || "");
    setVercelTokenInput(vercel?.hasToken ? "configured" : "");
    setIsSettingsOpen(true);
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      localStorage.setItem("GITHUB_USERNAME", githubUsernameInput.trim());
      if (githubTokenInput.trim()) {
        localStorage.setItem("GITHUB_TOKEN", githubTokenInput.trim());
      } else {
        localStorage.removeItem("GITHUB_TOKEN");
      }

      if (vercelTokenInput.trim() && vercelTokenInput.trim() !== "configured") {
        await setVercelToken(vercelTokenInput.trim());
      } else if (!vercelTokenInput.trim() && vercel?.hasToken) {
        await removeVercelToken();
      }
      
      const { bootstrap } = useBootstrapStore.getState();
      await bootstrap(true);
      
      setIsSettingsOpen(false);
    } catch (err: any) {
      alert(`Failed to save integration settings: ${err.message}`);
    } finally {
      setSavingSettings(false);
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
        await fetch("/api/machine/register-workspace", {
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

  const { tasks } = useTaskStore();
  const { notes, fetchNotes, addNote: notesStoreAddNote, deleteNote: notesStoreDeleteNote } = useNoteStore();

  // GitHub Stats State
  const [githubStats, setGithubStats] = useState<Record<string, { lastCommit: string, issues: number, stars: number, lastCommitMsg: string | null }>>({});
  const [staleWarningCount, setStaleWarningCount] = useState(0);
  const [showStaleOnly, setShowStaleOnly] = useState(false);

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

  // Auto-Sync GitHub Repos on Mount disabled to prevent auto-seeding


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

  // Fetch GitHub stats on mount
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const savedUsername = localStorage.getItem("GITHUB_USERNAME") || "coderkavyag";
        const savedToken = localStorage.getItem("GITHUB_TOKEN");
        const headers: HeadersInit = {};
        if (savedToken) {
          headers["Authorization"] = `Bearer ${savedToken}`;
        }
        
        const res = await fetch(`/api/github?username=${encodeURIComponent(savedUsername)}`, { headers });
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

              // Check staleness (older than 90 days)
              const updated = new Date(repo.updated_at);
              const daysAgo = (Date.now() - updated.getTime()) / (1000 * 3600 * 24);
              if (daysAgo > 90) {
                staleCount++;
              }
            });
          }

          // Also count local stale projects
          projects.forEach(p => {
            if (!p.githubUrl && p.status !== "stale" && p.status !== "completed") {
              const daysAgo = (Date.now() - new Date(p.updatedAt).getTime()) / (1000 * 3600 * 24);
              if (daysAgo > 90) staleCount++;
            }
          });

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
        }
      } catch (err) {
        console.error("Failed to fetch github stats", err);
      }
    };
    fetchStats();
  }, []);

  // Auto-prompt Integrations settings just once if missing
  useEffect(() => {
    if (!loaded) return;
    const hasGithub = localStorage.getItem("GITHUB_USERNAME") && localStorage.getItem("GITHUB_TOKEN");
    const hasVercel = vercel?.hasToken;
    
    if (!hasGithub || !hasVercel) {
      const prompted = localStorage.getItem("devos_integrations_prompted");
      if (!prompted) {
        localStorage.setItem("devos_integrations_prompted", "true");
        openSettingsDialog();
      }
    }
  }, [loaded, vercel?.hasToken]);

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
              {projects.filter(p => p.githubUrl).length === 0 && (
                <div className="text-center py-6 text-xs text-muted-foreground">No GitHub repositories synced yet.</div>
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
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (confirm(`Are you sure you want to delete project "${project.name}"?`)) {
                            await deleteProject(project.id);
                            if (selectedProject?.id === project.id) {
                              setSelectedProject(null);
                            }
                          }
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
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (confirm(`Are you sure you want to delete project "${project.name}"?`)) {
                            await deleteProject(project.id);
                            if (selectedProject?.id === project.id) {
                              setSelectedProject(null);
                            }
                          }
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
        </div>
      </div>

      {selectedProject && currentProject && (
        <div className="w-2/3 flex flex-col h-full overflow-hidden pl-3">
          <div className="flex items-center justify-between mb-3 shrink-0 bg-[#0f0f11] p-3 rounded-xl border border-white/10">
            <div className="flex-1 min-w-0 pr-4 space-y-1">
              <div className="flex items-center gap-3 flex-wrap">
                <div className={`w-2.5 h-2.5 rounded-full shadow-sm ${
                  currentProject.status === "active" ? "bg-green-400 shadow-green-400/50" :
                  currentProject.status === "planning" ? "bg-blue-400 shadow-blue-400/50" :
                  currentProject.status === "completed" ? "bg-white/30 shadow-white/10" :
                  currentProject.status === "stale" ? "bg-amber-400 shadow-amber-400/50" : "bg-zinc-400 shadow-zinc-500/50"
                }`} />
                <h3 className="text-base font-bold text-foreground truncate">{currentProject.name}</h3>
                
                {(() => {
                  const curatedPhase = getCuratedPhase(currentProject.id);
                  if (!curatedPhase) return null;
                  const phaseInfo = PHASE_MAP[curatedPhase as keyof typeof PHASE_MAP];
                  if (!phaseInfo) return null;
                  return (
                    <Badge variant="outline" className={`text-[9px] font-bold uppercase tracking-wider ${phaseInfo.color}`}>
                      {phaseInfo.label}
                    </Badge>
                  );
                })()}
              </div>

              <p className="text-xs text-white/50 leading-relaxed truncate max-w-[400px]">
                {currentProject.description || "No description provided."}
              </p>

              {currentProject.tags && currentProject.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {currentProject.tags.map((tag: string) => (
                    <Badge key={tag} variant="secondary" className="text-[8px] py-0 px-1.5 uppercase bg-primary/10 text-primary border-primary/20">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-1 shrink-0 self-start">
              <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogTrigger className="w-7 h-7 text-muted-foreground hover:text-foreground transition-colors inline-flex items-center justify-center rounded-md" onClick={() => {
                  setFormData({
                    name: selectedProject.name,
                    description: selectedProject.description,
                    folderPath: selectedProject.folderPath || "",
                    status: selectedProject.status || "green"
                  });
                }}>
                  <Pencil className="w-3.5 h-3.5" />
                </DialogTrigger>
                <DialogContent className="bg-[#0f0f11] border-white/10 text-foreground">
                  <DialogHeader>
                    <DialogTitle>Edit Project</DialogTitle>
                  </DialogHeader>
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
                            <button
                              key={color}
                              onClick={() => setFormData({...formData, status: color})}
                              className={`w-5 h-5 rounded-full ${color === 'green' ? 'bg-green-500' : color === 'yellow' ? 'bg-yellow-500' : 'bg-red-500'} ${formData.status === color ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0f0f11]' : 'opacity-50 hover:opacity-100'}`}
                            />
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
                        updateProject(selectedProject.id, {
                          name: formData.name.trim(),
                          description: formData.description.trim(),
                          folderPath: formData.folderPath.trim() || undefined,
                          status: formData.status as any,
                        });
                        setSelectedProject({ 
                          ...selectedProject, 
                          name: formData.name.trim(),
                          description: formData.description.trim(),
                          folderPath: formData.folderPath.trim() || undefined,
                          status: formData.status as any,
                        });
                        setIsEditDialogOpen(false);
                      }
                    }}>Save Changes</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <AlertDialog>
                <AlertDialogTrigger className="w-7 h-7 hover:bg-green-500/10 hover:text-green-500 text-muted-foreground transition-colors rounded-md inline-flex items-center justify-center" title="Mark issues resolved">
                  <CheckCircle2 className="w-4 h-4" />
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-[#0f0f11] border-white/10 text-foreground">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Mark Issues Resolved?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will mark all issues as resolved and set the project status to completed.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="bg-transparent border-white/10 hover:bg-white/5">Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      className="bg-green-500 hover:bg-green-600 text-white"
                      onClick={() => {
                        updateProject(selectedProject.id, { status: "completed", completionPercentage: 100 });
                        setSelectedProject(null);
                      }}
                    >
                      Resolve Issues
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <Button size="icon" variant="ghost" className="w-7 h-7" onClick={() => setSelectedProject(null)}>
                <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
              </Button>
            </div>
          </div>

          {/* Drawer Content */}
          <ScrollArea className="flex-1 pr-2 custom-scrollbar">
            <div className="space-y-4 pb-4">
              
              {/* GitHub and Live URL Actions */}
              {(currentProject.githubUrl || currentProject.liveUrl) && (
                <div className="grid grid-cols-2 gap-3">
                  {currentProject.githubUrl && (
                    <a 
                      href={currentProject.githubUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 rounded-xl border border-white/5 bg-white/[0.01] hover:bg-white/[0.03] hover:border-white/10 transition-all text-xs font-semibold text-white/80 group animate-in fade-in slide-in-from-bottom-1 duration-200"
                    >
                      <span className="flex items-center gap-2">
                        <GitBranch className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform" />
                        GitHub Repo
                      </span>
                      <ExternalLink className="w-3.5 h-3.5 text-white/30" />
                    </a>
                  )}
                  {currentProject.liveUrl && (
                    <a 
                      href={currentProject.liveUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 rounded-xl border border-white/5 bg-white/[0.01] hover:bg-white/[0.03] hover:border-white/10 transition-all text-xs font-semibold text-white/80 group animate-in fade-in slide-in-from-bottom-1 duration-200"
                    >
                      <span className="flex items-center gap-2">
                        <ExternalLink className="w-4 h-4 text-green-400 group-hover:scale-110 transition-transform" />
                        Live Link
                      </span>
                      <ExternalLink className="w-3.5 h-3.5 text-white/30" />
                    </a>
                  )}
                </div>
              )}

              {/* Local Folder Connection Card */}
              <div className="p-3.5 rounded-xl border bg-white/[0.01] border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-white/45">Local Connection</span>
                  <Badge variant="outline" className={`text-[8px] font-bold uppercase ${
                    currentProject.folderPath 
                      ? "bg-green-500/10 text-green-400 border-green-500/20" 
                      : "bg-red-500/10 text-red-400 border-red-500/20"
                  }`}>
                    {currentProject.folderPath ? "Connected" : "Unlinked"}
                  </Badge>
                </div>
                
                {currentProject.folderPath ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3 bg-black/40 border border-white/5 rounded-lg p-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <FolderOpen className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span className="text-[11px] font-mono text-white/70 truncate" title={currentProject.folderPath}>
                          {currentProject.folderPath}
                        </span>
                      </div>
                      <button 
                        onClick={() => window.open(`vscode://file/${currentProject.folderPath}`)}
                        className="text-[10px] font-bold text-sky-400 hover:text-sky-300 hover:underline shrink-0 cursor-pointer"
                      >
                        Open in VS Code
                      </button>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <Button 
                        size="sm"
                        variant="outline"
                        className="h-7 text-[10px] px-3 border-white/10 bg-transparent text-muted-foreground hover:text-foreground hover:bg-white/5"
                        onClick={() => handlePickFolder("link")}
                        disabled={isPickingFolder}
                      >
                        Change Link
                      </Button>
                      <Button 
                        size="sm"
                        className="h-7 text-[10px] px-3 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 hover:text-amber-300 border border-amber-500/20 transition-all font-semibold"
                        onClick={handleGenerateContext}
                        disabled={generatingContext}
                      >
                        {generatingContext ? "⚡ Generating..." : "⚡ Generate Context (CLAUDE.md)"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3 bg-black/20 border border-white/5 rounded-lg p-3">
                    <div className="space-y-0.5">
                      <p className="text-xs font-semibold text-white/80">Not linked to local folder</p>
                      <p className="text-[10px] text-white/45 leading-normal">Connect local folder to enable VS Code launching & context generation</p>
                    </div>
                    <Button 
                      size="sm"
                      onClick={() => handlePickFolder("link")}
                      disabled={isPickingFolder}
                      className="h-7 text-[10px] font-bold px-3 bg-primary hover:bg-primary/90 text-primary-foreground shrink-0"
                    >
                      {isPickingFolder ? "Linking..." : "Link Folder"}
                    </Button>
                  </div>
                )}
              </div>

              {/* Unified Feedback Feed */}
              <div className="pt-2 space-y-3">
                <div className="flex items-center justify-between pb-1.5 border-b border-white/[0.04]">
                  <span className="text-[10px] font-medium text-white/40 tracking-wider lowercase">brain dump</span>
                </div>

                <div className="space-y-3">
                  {projectNotes.length === 0 ? (
                    <div className="text-center py-6">
                      <div className="text-xs text-white/30">No notes yet.</div>
                      <div className="text-xs text-white/20 mt-1">
                        Tag this project in Focus Panel using <span className="font-mono text-amber-400/60">@{selectedProject.name}</span>
                      </div>
                    </div>
                  ) : (
                    (() => {
                      const categoryStyle = {
                        feedback: 'bg-orange-500/15 text-orange-300 border-orange-500/20',
                        bug: 'bg-red-500/15 text-red-300 border-red-500/20',
                        idea: 'bg-amber-500/15 text-amber-300 border-amber-500/20',
                        note: 'bg-white/5 text-white/40 border-white/10'
                      };
                      return projectNotes.map(note => {
                        const cat = note.category;
                        let colorClass = categoryStyle.note;
                        if (cat && cat !== 'classifying...') {
                          const validCat = cat.toLowerCase() as keyof typeof categoryStyle;
                          colorClass = categoryStyle[validCat] || categoryStyle.note;
                        }

                        return (
                          <div key={note.id} className="group p-3 border border-white/5 bg-transparent hover:bg-white/[0.04] transition-colors rounded-lg flex flex-col gap-2 relative">
                            <div className="flex justify-between items-center gap-2">
                              {(!cat || cat === 'classifying...') ? (
                                <Badge variant="secondary" className="text-[8px] py-0 px-1.5 uppercase bg-white/5 text-muted-foreground border-white/10 animate-pulse shrink-0">
                                  classifying...
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className={`text-[8px] py-0 px-1.5 uppercase shrink-0 ${colorClass}`}>
                                  {cat}
                                </Badge>
                              )}
                              
                              <p className="text-[9px] text-muted-foreground font-mono ml-auto mr-1 truncate">
                                {timeAgo(note.createdAt)}
                              </p>

                              <Button variant="ghost" size="icon" className="w-5 h-5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-400" onClick={() => handleDeleteNote(note.id)}>
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                            <p className="text-xs leading-relaxed text-foreground/90 whitespace-pre-wrap pr-1 line-clamp-4">{note.content}</p>
                            <div className="flex justify-end gap-2 mt-1">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 text-[9px] px-2 bg-green-500/10 border-green-500/20 text-green-400 hover:bg-green-500/20"
                                onClick={() => handleDeleteNote(note.id)}
                              >
                                <CheckCircle2 className="w-3 h-3 mr-1" /> Resolve
                              </Button>
                              {selectedProject.githubUrl && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={isCreatingIssue === note.id}
                                  className="h-6 text-[9px] px-2 bg-transparent border-white/10 hover:bg-blue-500/10 hover:border-blue-500/20 hover:text-blue-300 transition-colors"
                                  onClick={() => createGitHubIssue(note)}
                                >
                                  {isCreatingIssue === note.id ? (
                                    <><span className="w-3 h-3 mr-1 rounded-full border-2 border-current border-t-transparent animate-spin inline-block" /> Creating...</>
                                  ) : (
                                    <><GitBranch className="w-3 h-3 mr-1" /> Open as Issue</>
                                  )}
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      });
                    })()
                  )}
                </div>
              </div>

              {/* Recent Commits Feed */}
              {selectedProject.githubUrl && (
                <div className="pt-4 border-t border-white/[0.04] space-y-3">
                  <div className="flex items-center justify-between pb-1.5 border-b border-white/[0.04]">
                    <span className="text-[10px] font-medium text-white/40 tracking-wider lowercase">recent commits</span>
                  </div>

                  <div className="px-1">
                    {commitsLoading && projectCommits.length === 0 ? (
                      <div className="text-center py-4">
                        <span className="text-xs text-muted-foreground animate-pulse">Loading commits...</span>
                      </div>
                    ) : projectCommits.length === 0 ? (
                      <div className="text-center py-4">
                        <span className="text-xs text-muted-foreground">No recent commits found.</span>
                      </div>
                    ) : (
                      <div className="space-y-3 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-white/10 before:to-transparent">
                        {projectCommits.slice(0, commitLimit).map((commit: any) => {
                          const commitAgo = Math.floor((Date.now() - new Date(commit.date).getTime()) / (1000 * 60 * 60));
                          const timeAgoString = commitAgo < 24 ? `${commitAgo}h ago` : `${Math.floor(commitAgo / 24)}d ago`;
                          return (
                            <div key={commit.sha} className="relative flex items-center justify-between group">
                              <div className="flex items-center gap-3 w-full">
                                <div className="flex items-center justify-center w-4 h-4 rounded-full bg-[#0f0f11] border border-white/20 z-10 shrink-0">
                                  <div className="w-1.5 h-1.5 rounded-full bg-primary/60 group-hover:bg-primary transition-colors" />
                                </div>
                                <div className="flex-1 min-w-0 pr-2">
                                  <p className="text-[11px] text-foreground truncate">{commit.message}</p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="text-[9px] text-muted-foreground">{timeAgoString}</span>
                                  <a 
                                    href={commit.url} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 text-primary/80 hover:text-primary transition-colors"
                                  >
                                    {commit.sha.substring(0, 7)}
                                  </a>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        
                        {projectCommits.length > commitLimit && (
                          <div className="pt-2 flex justify-center">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-6 text-[10px] text-muted-foreground hover:text-foreground"
                              onClick={() => setCommitLimit(prev => prev + 10)}
                            >
                              Load more
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
              
            </div>
          </ScrollArea>
        </div>
      )}

      {/* View Note Dialog */}
      {viewNote && (
        <Dialog open={!!viewNote} onOpenChange={(o) => !o && setViewNote(null)}>
          <DialogContent className="bg-[#0f0f11] border-white/10 text-foreground max-w-lg max-h-[80vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                Feedback Details
                {viewNote.category && (
                  <Badge variant="secondary" className="text-[10px] py-0 px-1.5 uppercase bg-primary/10 text-primary border-primary/20">
                    {viewNote.category}
                  </Badge>
                )}
              </DialogTitle>
            </DialogHeader>
            <ScrollArea className="flex-1 mt-4 text-sm whitespace-pre-wrap leading-relaxed custom-scrollbar max-h-[60vh] overflow-y-auto pr-3">
              {viewNote.content}
            </ScrollArea>
            <DialogFooter className="mt-6 border-t border-white/10 pt-4">
              <Button variant="outline" onClick={() => setViewNote(null)} className="border-white/10 bg-transparent">Close</Button>
              {selectedProject?.githubUrl && (
                <Button onClick={() => createGitHubIssue(viewNote.content)}>
                  <GitBranch className="w-4 h-4 mr-2" /> Open as Issue
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

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
                <span className={`text-[10px] uppercase tracking-wider font-mono font-bold ${telegramLinked ? 'text-green-400' : 'text-amber-400'}`}>
                  {telegramLinked ? '● Connected' : '○ Not Linked'}
                </span>
              </label>
              
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-white/50 font-medium">Your Link Code:</span>
                  <code className="text-xs font-mono font-bold text-amber-400 select-all bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                    DEVOS-{userId ? userId.slice(0, 8) : 'unknown'}
                  </code>
                </div>
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  Message this code to the bot <a href="https://t.me/AssistmeOs_Bot" target="_blank" rel="noreferrer" className="text-amber-400 hover:underline">@AssistmeOs_Bot</a> to link your accounts. Once linked, you can capture tasks, ideas, or notes directly from chat!
                </p>
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
