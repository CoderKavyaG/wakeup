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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { 
  Folder, GitBranch, ExternalLink, Trash2, 
  Brain, CheckCircle2, Sparkles, Plus,
  HelpCircle, Activity, ChevronRight, X, Heart, 
  Code2, Play, AlertCircle, Pencil,
  Eye,
} from "lucide-react";

export function ProjectsWidget() {
  const { projects, deleteProject, updateProject, addProject, loading } = useProjectStore();
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  
  // New Feedback State
  
  // Add/Edit Project State
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", description: "", folderPath: "", status: "green" });

  const { tasks } = useTaskStore();
  const { notes, fetchNotes, addNote: notesStoreAddNote, deleteNote: notesStoreDeleteNote } = useNoteStore();

  useEffect(() => {
    fetchNotes();
  }, []);

  // GitHub Stats State
  const [githubStats, setGithubStats] = useState<Record<string, { lastCommit: string, issues: number, stars: number, lastCommitMsg: string | null }>>({});
  const [staleWarningCount, setStaleWarningCount] = useState(0);
  const [showStaleOnly, setShowStaleOnly] = useState(false);

  // Local Health Stats
  const [localHealthStats, setLocalHealthStats] = useState<Record<string, number>>({});

  const [viewNote, setViewNote] = useState<any>(null);

  // Auto-Sync GitHub Repos on Mount
  useEffect(() => {
    let isMounted = true;
    const syncGithub = async () => {
      try {
        const res = await fetch("/api/github?username=CoderKavyaG");
        if (!res.ok) return;
        const data = await res.json();
        
        if (data && data.repos) {
          // get existing github urls
          const existingUrls = new Set(projects.map(p => p.githubUrl).filter(Boolean));
          
          for (const repo of data.repos) {
            if (!existingUrls.has(repo.html_url) && isMounted) {
              await addProject({
                name: repo.name,
                description: repo.description || "",
                status: "planning",
                tags: [repo.language].filter(Boolean),
                githubUrl: repo.html_url,
              });
              existingUrls.add(repo.html_url); // add to set so we don't duplicate within same loop
            }
          }
        }
      } catch (err) {
        console.error("Auto-sync failed", err);
      }
    };
    if (projects.length > 0 || !loading) {
       syncGithub();
    }
    return () => { isMounted = false; };
  }, []); // Run once on mount

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
        const res = await fetch("/api/github?username=CoderKavyaG");
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

  const createGitHubIssue = async (feedbackText: string) => {
    if (!selectedProject?.githubUrl) return alert("No GitHub URL for this project.");
    try {
      const cleanUrl = selectedProject.githubUrl.replace(/\.git$/, '');
      const match = cleanUrl.match(/github\.com\/([^\/]+\/[^\/]+)/);
      if (!match) return alert("Invalid GitHub URL");
      let repo = match[1];
      repo = repo.split('?')[0].split('#')[0].replace(/\/$/, '');

      const res = await fetch("/api/github/issues/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo, title: "Feedback Review", body: feedbackText })
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
    }
  };


  return (
    <div className="flex h-full w-full overflow-hidden text-foreground bg-[#0f0f11] rounded-xl">
      {/* ── COLLAPSED VIEW (Always visible) ── */}
      <div className={`flex flex-col h-full overflow-hidden transition-all duration-300 ${selectedProject ? "w-1/3 border-r border-white/10 pr-3" : "w-full"}`}>
        <div className="flex items-center justify-between mb-4 shrink-0 px-1 pt-1">
          <div className="flex items-center space-x-2">
            <Folder className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold tracking-wider uppercase text-secondary-foreground">Projects</h2>
            {!selectedProject && staleWarningCount > 0 && (
              <button 
                onClick={() => setShowStaleOnly(!showStaleOnly)}
                className={`ml-2 px-1.5 py-0.5 border rounded flex items-center space-x-1 transition-colors ${
                  showStaleOnly 
                    ? "bg-primary/20 border-primary/40" 
                    : "bg-orange-500/10 border-orange-500/20 hover:bg-orange-500/20"
                }`}
              >
                <AlertCircle className={`w-2.5 h-2.5 ${showStaleOnly ? "text-primary" : "text-orange-400"}`} />
                <span className={`text-[9px] font-bold ${showStaleOnly ? "text-primary" : "text-orange-400"}`}>
                  {showStaleOnly ? "Showing stale · Clear" : `${staleWarningCount} Stale`}
                </span>
              </button>
            )}
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger className="w-6 h-6 hover:bg-white/5 inline-flex items-center justify-center rounded-md text-muted-foreground transition-colors" onClick={() => {
              setFormData({ name: "", description: "", folderPath: "", status: "green" });
            }}>
              <Plus className="w-4 h-4" />
            </DialogTrigger>
            <DialogContent className="bg-[#0f0f11] border-white/10 text-foreground">
              <DialogHeader>
                <DialogTitle>Add Local Project</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground">Title</label>
                  <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="bg-transparent border-white/10" placeholder="Project name" />
                </div>
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
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} className="border-white/10 bg-transparent">Cancel</Button>
                <Button onClick={() => {
                  if (formData.name.trim()) {
                    addProject({
                      name: formData.name.trim(),
                      description: formData.description.trim() || "New Project",
                      folderPath: formData.folderPath.trim() || undefined,
                      status: formData.status as any,
                      tags: [],
                    });
                    setIsAddDialogOpen(false);
                  }
                }}>Add Project</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="github" className="flex-1 flex flex-col min-h-0">
          <TabsList className="mx-2 mb-2 bg-[#0f0f11] border border-white/10 shrink-0">
            <TabsTrigger value="github" className="flex-1 text-[10px] uppercase font-bold tracking-wider data-[state=active]:bg-primary/20 data-[state=active]:text-primary">GitHub</TabsTrigger>
            <TabsTrigger value="local" className="flex-1 text-[10px] uppercase font-bold tracking-wider data-[state=active]:bg-primary/20 data-[state=active]:text-primary">Local</TabsTrigger>
          </TabsList>

          <div 
            className="flex-1 overflow-y-auto px-2"
            style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.08) transparent' }}
          >
             <TabsContent value="github" className="m-0 space-y-1.5 pb-4">
              {projects.filter(p => p.githubUrl).length === 0 && (
                <div className="text-center py-6 text-xs text-muted-foreground">No GitHub repositories synced yet.</div>
              )}
              {projects.filter(p => p.githubUrl).sort((a, b) => {
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
                    </div>
                  </div>
                );
              })}
            </TabsContent>

            <TabsContent value="local" className="m-0 space-y-1.5 pb-4">
              {projects.filter(p => !p.githubUrl && p.status !== "archived").filter(p => {
                if (!showStaleOnly) return true;
                const daysAgo = (Date.now() - new Date(p.updatedAt).getTime()) / (1000 * 3600 * 24);
                return daysAgo > 14;
              }).length === 0 && (
                <div className="text-center py-6 text-xs text-muted-foreground">No local workspaces found.</div>
              )}
              {projects.filter(p => !p.githubUrl && p.status !== "archived").filter(p => {
                if (!showStaleOnly) return true;
                const daysAgo = (Date.now() - new Date(p.updatedAt).getTime()) / (1000 * 3600 * 24);
                return daysAgo > 14;
              }).map((project) => {
                const isSelected = selectedProject?.id === project.id;
                const healthScore = localHealthStats[project.id];
                
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
                    </div>
                  </div>
                );
              })}
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {/* ── DETAIL VIEW (Slides in) ── */}
      {selectedProject && (
        <div className="w-2/3 flex flex-col h-full overflow-hidden pl-3">
          <div className="flex items-center justify-between mb-3 shrink-0 bg-[#0f0f11] p-3 rounded-xl border border-white/10">
            <div className="flex-1 min-w-0 pr-4 space-y-1">
              <div className="flex items-center gap-3">
                <div className={`w-2.5 h-2.5 rounded-full shadow-sm ${selectedProject.githubUrl ? ((!githubStats[selectedProject.githubUrl.toLowerCase()] || (new Date().getTime() - new Date(githubStats[selectedProject.githubUrl.toLowerCase()].lastCommit).getTime() <= 45*24*3600*1000)) ? "bg-green-500 shadow-green-500/50" : "bg-yellow-500 shadow-yellow-500/50") : getStatusColor(selectedProject.status)}`} />
                <h3 className="text-base font-bold text-foreground truncate">{selectedProject.name}</h3>
              </div>
              <div className="flex items-center gap-3 text-[10px] font-mono text-muted-foreground">
                <span>Updated: {new Date(selectedProject.updatedAt).toLocaleDateString()}</span>
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
              
              {/* Project Completion Pills */}
              <div className="flex items-center gap-1 pt-1 overflow-x-auto custom-scrollbar pb-1">
                {[
                  { label: "Not started", value: 0 },
                  { label: "Planning", value: 25 },
                  { label: "Building", value: 50 },
                  { label: "Almost done", value: 75 },
                  { label: "Done", value: 100 }
                ].map((pill) => {
                  const isActive = (selectedProject.completionPercentage || 0) === pill.value;
                  return (
                    <button
                      key={pill.value}
                      onClick={() => {
                        updateProject(selectedProject.id, { completionPercentage: pill.value });
                        setSelectedProject({ ...selectedProject, completionPercentage: pill.value });
                      }}
                      className={`text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-full whitespace-nowrap transition-colors border ${
                        isActive 
                          ? "bg-white text-black border-white shadow-sm" 
                          : "bg-transparent text-muted-foreground border-white/10 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      {pill.label}
                    </button>
                  );
                })}
              </div>
            </div>
            
            <div className="flex items-center gap-1 shrink-0">
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
                <AlertDialogTrigger className="w-7 h-7 hover:bg-red-500/10 hover:text-red-500 text-muted-foreground transition-colors rounded-md inline-flex items-center justify-center">
                  <Trash2 className="w-4 h-4" />
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-[#0f0f11] border-white/10 text-foreground">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Project?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete the project from your workspace. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="bg-transparent border-white/10 hover:bg-white/5">Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      className="bg-red-500 hover:bg-red-600 text-white"
                      onClick={() => {
                        deleteProject(selectedProject.id);
                        setSelectedProject(null);
                      }}
                    >
                      Delete
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
              
              {selectedProject.folderPath && (
                <div className="flex items-center justify-end">
                  <Button 
                    size="sm" 
                    onClick={() => window.open(`vscode://file/${selectedProject.folderPath}`)}
                    className="h-7 text-[10px] bg-white/10 text-white hover:bg-white/20 border border-white/20"
                  >
                    <Code2 className="w-3.5 h-3.5 mr-1.5" /> Open in VS Code
                  </Button>
                </div>
              )}

              {/* Unified Feedback Feed */}
              <div className="pt-4 border-t border-white/10 space-y-4">
                <div className="flex items-center justify-between pb-2">
                  <h3 className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest px-1">Next Feedbacks</h3>
                </div>

                <ScrollArea className="h-[250px] custom-scrollbar pr-2">
                  <div className="space-y-3">
                    {notes.filter(n => n.projectId === selectedProject.id).length > 0 ? (
                      notes.filter(n => n.projectId === selectedProject.id).map(note => (
                        <div key={note.id} className="group p-3 border border-white/5 bg-transparent hover:bg-white/5 transition-colors rounded-lg flex flex-col gap-2 relative">
                          <div className="flex justify-between items-center">
                            <p className="text-[9px] text-muted-foreground font-mono">{new Date(note.createdAt).toLocaleString()}</p>
                            <div className="flex items-center gap-2">
                              {note.category && (
                                <Badge variant="secondary" className="text-[8px] py-0 px-1.5 uppercase bg-primary/10 text-primary border-primary/20">
                                  {note.category}
                                </Badge>
                              )}
                              <Button variant="ghost" size="icon" className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-400" onClick={() => notesStoreDeleteNote(note.id)}>
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                          <p className="text-xs leading-relaxed text-foreground whitespace-pre-wrap pr-6 line-clamp-3">{note.content}</p>
                          <div className="flex justify-end gap-2 mt-2">
                            <Button size="sm" variant="outline" className="h-6 text-[9px] px-2 bg-transparent border-white/10 hover:bg-white/5" onClick={() => setViewNote(note)}>
                              <Eye className="w-3 h-3 mr-1.5" /> Open
                            </Button>
                            {selectedProject.githubUrl && (
                              <Button size="sm" variant="outline" className="h-6 text-[9px] px-2 bg-transparent border-white/10 hover:bg-white/5" onClick={() => createGitHubIssue(note.content)}>
                                <GitBranch className="w-3 h-3 mr-1.5" /> Open as Issue
                              </Button>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-6 flex flex-col items-center gap-1">
                        <span className="text-xs text-muted-foreground">No notes or feedback recorded yet.</span>
                        <span className="text-[10px] text-muted-foreground/60 italic">Tag a note to this project using @{selectedProject.name} in the Focus Panel</span>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
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

    </div>
  );
}
