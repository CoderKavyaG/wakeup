"use client";

import React, { useState, useEffect, useRef } from "react";
import { useProjectStore, Project, ProjectStatus } from "@/store/useProjectStore";
import { useNoteStore } from "@/store/useNoteStore";
import { useTaskStore } from "@/store/useTaskStore";
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
  Eye, FolderOpen, GitCommit
} from "lucide-react";

export function ProjectsWidget() {
  const { projects, deleteProject, updateProject, addProject, loading } = useProjectStore();
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const currentProject = projects.find(p => p.id === selectedProject?.id) || selectedProject;
  
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

  useEffect(() => {
    fetchNotes();
  }, []);

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

  const pingLinks = async (projectId: string, showToast = true) => {
    setPingingLinks(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/links/ping`, { method: "POST" });
      const data = await res.json();
      if (Array.isArray(data)) {
        setProjectLinks(data);
        if (showToast) {
          data.forEach(link => {
            if (link.lastStatus && (link.lastStatus < 200 || link.lastStatus >= 300)) {
              // Create a custom toast or alert
              alert(`⚠️ ${selectedProject?.name} ${link.type} link (${link.label}) returned ${link.lastStatus}`);
            }
          });
        }
      }
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
  const [creatingLink, setCreatingLink] = useState(false);

  const handleUrlPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text');
    if (text.startsWith('http://') || text.startsWith('https://')) {
      let label = text.replace(/^https?:\/\//, '').split('/')[0];
      if (label.includes('vercel.app')) label = label.replace('.vercel.app', ' (Vercel)');
      else if (label.includes('railway.app')) label = label.replace('.railway.app', ' (Railway)');
      else if (label.includes('supabase.co')) label = 'Supabase';
      else if (label.includes('firebase')) label = 'Firebase';
      setNewLinkLabel(label);
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
        body: JSON.stringify({ url: urlToSubmit, label: newLinkLabel })
      });
      if (res.ok) {
        fetchLinks(selectedProject.id);
        setNewLinkUrl("");
        setNewLinkLabel("");
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

  // Auto-Sync GitHub Repos on Mount
  useEffect(() => {
    if (loading || projects.length === 0 || hasSynced) return;
    
    let isMounted = true;
    const syncGithub = async () => {
      try {
        const savedUsername = localStorage.getItem("GITHUB_USERNAME") || "coderkavyag";
        const savedToken = localStorage.getItem("GITHUB_TOKEN");
        const headers: HeadersInit = {};
        if (savedToken) {
          headers["Authorization"] = `Bearer ${savedToken}`;
        }
        
        const res = await fetch(`/api/github?username=${encodeURIComponent(savedUsername)}`, { headers });
        if (!res.ok) return;
        const data = await res.json();
        
        if (data && data.repos && isMounted) {
          const existingUrls = new Set(projects.map(p => p.githubUrl?.toLowerCase()).filter(Boolean));
          
          for (const repo of data.repos) {
            const repoUrlLower = repo.html_url.toLowerCase();
            if (!existingUrls.has(repoUrlLower) && isMounted) {
              await addProject({
                name: repo.name,
                description: repo.description || "",
                status: "planning",
                tags: [repo.language].filter(Boolean),
                githubUrl: repo.html_url,
              });
              existingUrls.add(repoUrlLower);
            }
          }
          setHasSynced(true);
        }
      } catch (err) {
        console.error("Auto-sync failed", err);
      }
    };
    
    syncGithub();
    return () => { isMounted = false; };
  }, [projects, loading, hasSynced]);

  useEffect(() => {
    const handleFilterStale = () => {
      setShowStaleOnly(true);
      setActiveListTab("github");
    };
    window.addEventListener("filter_stale_projects", handleFilterStale);
    return () => window.removeEventListener("filter_stale_projects", handleFilterStale);
  }, []);

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
              const url = repo.html_url.toLowerCase();
              stats[url] = {
                lastCommit: repo.updated_at,
                issues: repo.open_issues_count || 0,
                stars: repo.stargazers_count || 0,
                lastCommitMsg: repo.last_commit_message || null
              };

              // Check staleness (older than 14 days)
              const updated = new Date(repo.updated_at);
              const daysAgo = (Date.now() - updated.getTime()) / (1000 * 3600 * 24);
              if (daysAgo > 14) {
                staleCount++;
              }
            });
          }

          // Also count local stale projects
          projects.forEach(p => {
            if (!p.githubUrl && p.status !== "stale" && p.status !== "completed") {
              const daysAgo = (Date.now() - new Date(p.updatedAt).getTime()) / (1000 * 3600 * 24);
              if (daysAgo > 14) staleCount++;
            }
          });

          setGithubStats(stats);
          setStaleWarningCount(staleCount);
          
          // Auto-update projects based on staleness
          projects.forEach((proj) => {
            if (proj.githubUrl && stats[proj.githubUrl.toLowerCase()]) {
              const repo = stats[proj.githubUrl.toLowerCase()];
              const updated = new Date(repo.lastCommit);
              const daysAgo = (Date.now() - updated.getTime()) / (1000 * 3600 * 24);
              if (daysAgo > 14 && proj.status !== "stale" && proj.status !== "completed" && proj.status !== "archived") {
                updateProject(proj.id, { status: "stale" });
              }
            } else if (!proj.githubUrl) {
              const daysAgo = (Date.now() - new Date(proj.updatedAt).getTime()) / (1000 * 3600 * 24);
              if (daysAgo > 14 && proj.status !== "stale" && proj.status !== "completed" && proj.status !== "archived") {
                updateProject(proj.id, { status: "stale" });
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "green": return "bg-green-500 shadow-green-500/50";
      case "yellow": return "bg-yellow-500 shadow-yellow-500/50";
      case "red": return "bg-red-500 shadow-red-500/50";
      default: return "bg-zinc-500 shadow-zinc-500/50";
    }
  };

  const renderHealthScore = (health: number | null | undefined) => {
    if (health === undefined || health === null) {
      return <span className="text-white/20 text-[10px] select-none ml-1.5">—</span>;
    }
    let colorClass = "text-red-400";
    if (health >= 80) {
      colorClass = "text-green-400";
    } else if (health >= 50) {
      colorClass = "text-yellow-400";
    }
    return <span className={`text-[10px] font-bold font-mono ml-1.5 ${colorClass}`} title="Project Health">{health}%</span>;
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
    <div className="flex h-full w-full overflow-hidden text-foreground bg-[#0f0f11] rounded-xl">
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
            {!selectedProject && staleWarningCount > 0 && activeListTab === "github" && (
              <button 
                onClick={() => setShowStaleOnly(!showStaleOnly)}
                className={`px-1.5 py-0.5 border rounded flex items-center space-x-1 transition-colors ${
                  showStaleOnly 
                    ? "bg-primary/20 border-primary/40" 
                    : "bg-orange-500/10 border-orange-500/20 hover:bg-orange-500/20"
                }`}
              >
                <AlertCircle className={`w-2.5 h-2.5 ${showStaleOnly ? "text-primary" : "text-orange-400"}`} />
                <span className={`text-[9px] font-bold ${showStaleOnly ? "text-primary" : "text-orange-400"}`}>
                  {showStaleOnly ? "Clear" : `${staleWarningCount}`}
                </span>
              </button>
            )}
          </div>
          
        </div>

        <div className="flex-1 flex flex-col min-h-0">
          <div 
            className="flex-1 overflow-y-auto px-2 space-y-1.5 pb-4"
            style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.08) transparent' }}
          >
             {activeListTab === "github" && (
              <>
              {projects.filter(p => p.githubUrl && !p.folderPath).length === 0 && (
                <div className="text-center py-6 text-xs text-muted-foreground">No GitHub repositories synced yet.</div>
              )}
              {projects.filter(p => p.githubUrl && !p.folderPath).sort((a, b) => {
                const aCommit = githubStats[a.githubUrl!.toLowerCase()]?.lastCommit;
                const bCommit = githubStats[b.githubUrl!.toLowerCase()]?.lastCommit;
                if (!aCommit) return 1;
                if (!bCommit) return -1;
                return new Date(bCommit).getTime() - new Date(aCommit).getTime();
              }).filter(p => {
                if (p.status === "archived") return false;
                if (!showStaleOnly) return true;
                const stats = githubStats[p.githubUrl!.toLowerCase()];
                if (!stats) return false;
                const daysAgo = (Date.now() - new Date(stats.lastCommit).getTime()) / (1000 * 3600 * 24);
                return daysAgo > 14;
              }).map((project) => {
                const stats = githubStats[project.githubUrl!.toLowerCase()];
                const isSelected = selectedProject?.id === project.id;
                
                const daysAgo = stats ? Math.floor((Date.now() - new Date(stats.lastCommit).getTime()) / (1000 * 3600 * 24)) : 0;
                const isStale = daysAgo > 14;
                
                return (
                  <div 
                    key={project.id} 
                    className={`px-3 py-2.5 rounded-lg flex items-center justify-between cursor-pointer transition-all duration-200 border border-transparent 
                      ${isSelected ? "bg-primary/10 border-primary/20 shadow-sm" : "bg-transparent hover:bg-white/5 hover:border-white/10"}
                      ${isStale ? "opacity-70 hover:opacity-100" : ""}`}
                    onClick={() => setSelectedProject(project)}
                  >
                    <div className="flex flex-col overflow-hidden w-full pr-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full shrink-0 shadow-sm ${!isStale ? "bg-green-500 shadow-green-500/50" : "bg-yellow-500 shadow-yellow-500/50"}`} />
                        <span className={`text-sm font-semibold truncate ${isSelected ? 'text-primary' : 'text-foreground'}`}>{project.name}</span>
                        {renderHealthScore(project.health)}
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
                if (!showStaleOnly) return true;
                const daysAgo = (Date.now() - new Date(p.updatedAt).getTime()) / (1000 * 3600 * 24);
                return daysAgo > 14;
              }).length === 0 && (
                <div className="text-center py-6 text-xs text-muted-foreground">No local workspaces found.</div>
              )}
              {projects.filter(p => (p.folderPath || !p.githubUrl) && p.status !== "archived").filter(p => {
                if (!showStaleOnly) return true;
                const daysAgo = (Date.now() - new Date(p.updatedAt).getTime()) / (1000 * 3600 * 24);
                return daysAgo > 14;
              }).map((project) => {
                const isSelected = selectedProject?.id === project.id;
                
                const daysAgo = Math.floor((Date.now() - new Date(project.updatedAt).getTime()) / (1000 * 3600 * 24));
                const isStale = daysAgo > 14;
                
                return (
                  <div 
                    key={project.id} 
                    className={`px-3 py-2.5 rounded-lg flex items-center justify-between cursor-pointer transition-all duration-200 border border-transparent group
                      ${isSelected ? "bg-primary/10 border-primary/20 shadow-sm" : "bg-transparent hover:bg-white/5 hover:border-white/10"}
                      ${isStale ? "opacity-70 hover:opacity-100" : ""}`}
                    onClick={() => setSelectedProject(project)}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div 
                        className={`w-2 h-2 rounded-full shrink-0 shadow-sm ${!isStale ? getStatusColor(project.status) : "bg-yellow-500 shadow-yellow-500/50"}`} 
                        title="Project Color"
                      />
                      <span className={`text-sm font-semibold truncate ${isSelected ? 'text-primary' : 'text-foreground'}`}>{project.name}</span>
                      {renderHealthScore(project.health)}
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
              <div className="flex items-center gap-3">
                <div className={`w-2.5 h-2.5 rounded-full shadow-sm ${currentProject.githubUrl ? ((!githubStats[currentProject.githubUrl.toLowerCase()] || (new Date().getTime() - new Date(githubStats[currentProject.githubUrl.toLowerCase()].lastCommit).getTime() <= 45*24*3600*1000)) ? "bg-green-500 shadow-green-500/50" : "bg-yellow-500 shadow-yellow-500/50") : getStatusColor(currentProject.status)}`} />
                <h3 className="text-base font-bold text-foreground truncate">{currentProject.name}</h3>
                <span className="text-[10px] font-mono text-muted-foreground ml-1 mt-0.5">Updated: {new Date(currentProject.updatedAt).toLocaleDateString()}</span>
                {currentProject.health !== undefined && currentProject.health !== null && (
                  <span className={`text-xs font-bold font-mono ml-2 px-2 py-0.5 rounded bg-black/30 border border-white/5 ${currentProject.health >= 80 ? "text-green-400" : currentProject.health >= 50 ? "text-yellow-400" : "text-red-400"}`}>
                    Health: {currentProject.health}%
                  </span>
                )}
              </div>
              
              {/* Health Signals */}
              {currentProject.healthSignals && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {(() => {
                    try {
                      const signals = JSON.parse(currentProject.healthSignals);
                      if (Array.isArray(signals) && signals.length > 0) {
                        return signals.map((sig: string) => (
                          <span key={sig} className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[8px] text-muted-foreground font-sans uppercase tracking-wider">
                            {sig}
                          </span>
                        ));
                      }
                    } catch (e) {}
                    return null;
                  })()}
                </div>
              )}

              <div className="flex items-center gap-3 text-[10px] font-mono text-muted-foreground">
                {selectedProject.githubUrl && (
                  <a href={selectedProject.githubUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-foreground">
                    <GitBranch className="w-3 h-3" /> GitHub
                  </a>
                )}
                {selectedProject.liveUrl && (
                  <a href={selectedProject.liveUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-foreground">
                    <ExternalLink className="w-3 h-3" /> Live
                  </a>
                )}
              </div>

              {!selectedProject.folderPath && selectedProject.githubUrl && (
                <div className="pt-3 pb-2">
                  <div className="bg-primary/10 border border-primary/20 rounded-md p-2 flex items-center justify-between gap-3 overflow-hidden group hover:border-primary/40 transition-colors">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-primary/20 flex items-center justify-center shrink-0">
                        <FolderOpen className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[11px] font-bold text-primary leading-tight">Unlinked</span>
                        <span className="text-[9px] text-primary/70 leading-tight">Connect local folder for IDE features</span>
                      </div>
                    </div>
                    <Button 
                      size="sm"
                      onClick={() => handlePickFolder("link")}
                      disabled={isPickingFolder}
                      className="h-6 text-[10px] font-semibold px-3 bg-primary hover:bg-primary/90 text-primary-foreground shrink-0"
                    >
                      {isPickingFolder ? "..." : "Link Now"}
                    </Button>
                  </div>
                </div>
              )}

              {selectedProject.tags && selectedProject.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {selectedProject.tags.map((tag: string) => (
                    <Badge key={tag} variant="secondary" className="text-[8px] py-0 px-1.5 uppercase bg-primary/10 text-primary border-primary/20">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
              
              <div className="pt-2">
                <DropdownMenu>
                  <DropdownMenuTrigger className="text-[9px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full whitespace-nowrap transition-colors border bg-white/5 text-foreground hover:bg-white/10 border-white/10 flex items-center gap-2 outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer">
                      Status: {
                        [
                          { label: "Not started", value: 0 },
                          { label: "Planning", value: 25 },
                          { label: "Building", value: 50 },
                          { label: "Almost done", value: 75 },
                          { label: "Done", value: 100 }
                        ].find(p => p.value === getDerivedCompletion(selectedProject))?.label || "Unknown"
                      }
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="bg-[#0f0f11] border-white/10 text-foreground min-w-[140px] shadow-xl">
                    {[
                      { label: "Not started", value: 0 },
                      { label: "Planning", value: 25 },
                      { label: "Building", value: 50 },
                      { label: "Almost done", value: 75 },
                      { label: "Done", value: 100 }
                    ].map((pill) => {
                       const isActive = getDerivedCompletion(selectedProject) === pill.value;
                       return (
                         <DropdownMenuItem 
                           key={pill.value}
                           className={`text-xs font-bold uppercase cursor-pointer focus:bg-white/10 focus:text-white ${isActive ? "bg-white/10 text-white" : "text-muted-foreground"}`}
                           onClick={() => {
                              updateProject(selectedProject.id, { completionPercentage: pill.value });
                              setSelectedProject({ ...selectedProject, completionPercentage: pill.value });
                           }}
                         >
                           {pill.label}
                         </DropdownMenuItem>
                       )
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            
            <div className="flex items-center gap-1 shrink-0 self-start">
              {selectedProject.folderPath && (
                <button 
                  className="w-7 h-7 text-muted-foreground hover:text-[#007acc] hover:bg-[#007acc]/10 transition-colors inline-flex items-center justify-center rounded-md"
                  onClick={() => window.open(`vscode://file/${selectedProject.folderPath}`)}
                  title="Open in VS Code"
                >
                  <Code2 className="w-3.5 h-3.5" />
                </button>
              )}
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

          <div className="flex items-center gap-4 border-b border-white/10 px-1 mb-4 shrink-0">
            <button
              onClick={() => setActiveTab("overview")}
              className={`pb-2 text-[10px] uppercase font-bold tracking-wider border-b-2 transition-colors ${activeTab === "overview" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab("control_room")}
              className={`pb-2 text-[10px] uppercase font-bold tracking-wider border-b-2 transition-colors ${activeTab === "control_room" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              Control Room
            </button>
          </div>

          {/* Drawer Content */}
          <ScrollArea className="flex-1 pr-2 custom-scrollbar">
            {activeTab === "overview" && (
              <div className="space-y-4 pb-4">
                
                {/* Unified Feedback Feed */}
                <div className="pt-2 space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-white/10">
                    <h3 className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest px-1">Brain Dump</h3>
                  </div>

                  <div className="space-y-3">
                    {(() => {
                      const projectNotes = notes.filter(n => n.projectId === selectedProject.id);
                      if (projectNotes.length === 0) {
                        return (
                          <div className="text-center py-6 flex flex-col items-center gap-1">
                            <span className="text-xs text-muted-foreground">No notes yet. Tag this project in Brain Dump using @{selectedProject.name}</span>
                          </div>
                        );
                      }

                      const categoryColors = {
                        feedback: 'bg-orange-500/20 text-orange-300 border-orange-500/20',
                        bug: 'bg-red-500/20 text-red-300 border-red-500/20',
                        idea: 'bg-purple-500/20 text-purple-300 border-purple-500/20',
                        note: 'bg-white/10 text-white/50 border-white/10'
                      };

                      return projectNotes.map(note => (
                        <div key={note.id} className="group p-3 border border-white/5 bg-transparent hover:bg-white/[0.04] transition-colors rounded-lg flex flex-col gap-2 relative">
                          <div className="flex justify-between items-center gap-2">
                            {(() => {
                              const cat = note.category;
                              if (!cat || cat === 'classifying...') {
                                return (
                                  <Badge variant="secondary" className="text-[8px] py-0 px-1.5 uppercase bg-white/5 text-muted-foreground border-white/10 animate-pulse shrink-0">
                                    classifying...
                                  </Badge>
                                );
                              }
                              const validCat = (cat.toLowerCase() as keyof typeof categoryColors);
                              const colorClass = categoryColors[validCat] || 'bg-white/10 text-white/50 border-white/10';
                              return (
                                <Badge variant="secondary" className={`text-[8px] py-0 px-1.5 uppercase shrink-0 ${colorClass}`}>
                                  {cat}
                                </Badge>
                              );
                            })()}
                            
                            <p className="text-[9px] text-muted-foreground font-mono ml-auto mr-1 truncate">
                              {new Date(note.createdAt).toLocaleString()}
                            </p>

                            <Button variant="ghost" size="icon" className="w-5 h-5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-400" onClick={() => notesStoreDeleteNote(note.id)}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                          <p className="text-xs leading-relaxed text-foreground/90 whitespace-pre-wrap pr-1 line-clamp-4">{note.content}</p>
                          <div className="flex justify-end gap-2 mt-1">
                            {/* Resolve — marks note as done by deleting it */}
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 text-[9px] px-2 bg-green-500/10 border-green-500/20 text-green-400 hover:bg-green-500/20"
                              onClick={() => notesStoreDeleteNote(note.id)}
                            >
                              <CheckCircle2 className="w-3 h-3 mr-1" /> Resolve
                            </Button>
                            {/* Open as Issue — only shown when project has a GitHub URL */}
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
                      ));
                    })()}
                  </div>
                </div>

                {/* Recent Commits Feed */}
                {selectedProject.githubUrl && (
                  <div className="pt-4 border-t border-white/10 space-y-4">
                    <div className="flex items-center justify-between pb-2">
                      <h3 className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest px-1">Recent Commits</h3>
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
            )}

            {activeTab === "control_room" && (
              <div className="space-y-6 pb-4">
                
                {/* Live Link Section */}
                {selectedProject.liveUrl && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold text-foreground">Live Link</h3>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-primary/10 border border-primary/20">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-green-500 shadow-sm shadow-green-500/50" />
                        <span className="text-xs font-semibold text-foreground">{selectedProject.name} (Live)</span>
                      </div>
                      <a href={selectedProject.liveUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs font-medium text-primary hover:text-primary/80 transition-colors truncate pl-4">
                        {selectedProject.liveUrl.replace(/^https?:\/\//, '')} <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                      </a>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-white/10">
                  <h3 className="text-xs font-semibold text-foreground">Infrastructure Links</h3>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="h-7 text-[10px] bg-transparent border-white/10 hover:bg-white/5"
                    onClick={() => pingLinks(selectedProject.id)}
                    disabled={pingingLinks}
                  >
                    {pingingLinks ? "Pinging..." : "Ping All"}
                  </Button>
                </div>

                {/* Always-visible Add Link Form */}
                <div className="p-3 rounded-xl bg-black/40 border border-white/5 relative overflow-hidden group shadow-inner">
                  <div className="flex items-center gap-3 relative z-10">
                    <Input 
                      value={newLinkLabel} 
                      onChange={e => setNewLinkLabel(e.target.value)} 
                      placeholder="Label (e.g. Vercel)" 
                      className="h-9 text-xs bg-black/40 border-white/10 rounded-lg focus-visible:ring-primary/30 w-[120px]" 
                    />
                    <Input 
                      value={newLinkUrl} 
                      onChange={e => setNewLinkUrl(e.target.value)} 
                      onPaste={handleUrlPaste}
                      placeholder="URL (paste to auto-detect)" 
                      className="h-9 text-xs bg-black/40 border-white/10 rounded-lg focus-visible:ring-primary/30 flex-1 min-w-0"
                      onKeyDown={e => e.key === 'Enter' && submitNewLink()}
                    />
                    <Button 
                      size="sm" 
                      onClick={submitNewLink} 
                      disabled={creatingLink || !newLinkUrl || !newLinkLabel}
                      className={`h-9 px-5 text-xs font-semibold tracking-wide rounded-lg transition-all shrink-0 ${justAdded ? 'bg-green-500 hover:bg-green-600 text-white shadow-[0_0_15px_rgba(34,197,94,0.3)]' : 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-md'}`}
                    >
                      {creatingLink ? "..." : justAdded ? "Added!" : "Add Link"}
                    </Button>
                  </div>
                </div>

                {linksLoading ? (
                  <div className="text-center py-4 text-xs text-muted-foreground">Loading links...</div>
                ) : (
                  <div className="space-y-6">
                    {['frontend', 'backend', 'database', 'storage', 'monitoring', 'other'].map(type => {
                      const typeLinks = projectLinks.filter(l => l.type === type);
                      if (typeLinks.length === 0) return null;

                      return (
                        <div key={type} className="space-y-2">
                          <h4 className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">{type}</h4>
                          <div className="space-y-1">
                            {typeLinks.map(link => (
                              <div key={link.id} className="group flex items-center justify-between p-2 rounded-md hover:bg-white/5 transition-colors border border-transparent hover:border-white/5">
                                <div className="flex items-center gap-3 min-w-0">
                                  <div 
                                    className={`w-2 h-2 rounded-full shrink-0 shadow-sm ${!link.lastPinged ? 'bg-gray-500' : (link.lastStatus && link.lastStatus >= 200 && link.lastStatus < 300) ? 'bg-green-500 shadow-green-500/50' : (link.lastStatus && link.lastStatus >= 300 && link.lastStatus < 400) ? 'bg-yellow-500 shadow-yellow-500/50' : 'bg-red-500 shadow-red-500/50'}`}
                                    title={link.lastPinged ? `Last status: ${link.lastStatus}` : 'Never pinged'}
                                  />
                                  <div className="flex flex-col min-w-0">
                                    <span className="text-xs font-medium text-foreground truncate">{link.label}</span>
                                    <span className="text-[10px] font-mono text-muted-foreground truncate">{link.url.replace(/^https?:\/\//, '')}</span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                  <Button size="icon" variant="ghost" className="w-6 h-6 text-muted-foreground hover:text-foreground" onClick={() => navigator.clipboard.writeText(link.url)}>
                                    <Code2 className="w-3 h-3" />
                                  </Button>
                                  <a href={link.url} target="_blank" rel="noopener noreferrer" className="w-6 h-6 text-muted-foreground hover:text-foreground inline-flex items-center justify-center rounded-md hover:bg-white/5">
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                  <Button size="icon" variant="ghost" className="w-6 h-6 text-muted-foreground hover:text-red-400" onClick={() => deleteLink(link.id)}>
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                    {projectLinks.length === 0 && (
                      <div className="text-center py-8">
                        <span className="text-xs text-muted-foreground">No infrastructure links added yet.</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
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

    </div>
  );
}
