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
  Folder, GitBranch, ExternalLink, Trash2, 
  Brain, CheckCircle2, Sparkles, Plus,
  HelpCircle, Activity, ChevronRight, X, Heart, 
  Code2, Play, AlertCircle
} from "lucide-react";

export function ProjectsWidget() {
  const { projects, deleteProject, updateProject, addProject, loading } = useProjectStore();
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  
  // New Feedback State
  const [newFeedback, setNewFeedback] = useState("");
  
  // Add Project State
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");

  const { tasks } = useTaskStore();
  const { notes, fetchNotes, addNote: notesStoreAddNote, deleteNote: notesStoreDeleteNote } = useNoteStore();

  useEffect(() => {
    fetchNotes();
  }, []);

  // GitHub Stats State
  const [githubStats, setGithubStats] = useState<Record<string, { lastCommit: string, issues: number, stars: number }>>({});
  const [staleWarningCount, setStaleWarningCount] = useState(0);

  // Local Health Stats
  const [localHealthStats, setLocalHealthStats] = useState<Record<string, number>>({});

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
                stars: repo.stargazers_count || 0
              };

              // Check staleness (older than 14 days)
              const updated = new Date(repo.updated_at);
              const daysAgo = (Date.now() - updated.getTime()) / (1000 * 3600 * 24);
              if (daysAgo > 14) {
                staleCount++;
              }
            });
          }
          setGithubStats(stats);
          setStaleWarningCount(staleCount);
          
          // Auto-update projects based on staleness
          projects.forEach((proj) => {
            if (proj.githubUrl && stats[proj.githubUrl.toLowerCase()]) {
              const repo = stats[proj.githubUrl.toLowerCase()];
              const updated = new Date(repo.lastCommit);
              const daysAgo = (Date.now() - updated.getTime()) / (1000 * 3600 * 24);
              if (daysAgo > 14 && proj.status !== "stale" && proj.status !== "completed") {
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

  const getStatusColor = (status: ProjectStatus) => {
    switch (status) {
      case "active":
        return "bg-[#0f0f11] text-foreground border-green-500/20";
      case "planning":
        return "bg-[#0f0f11] text-foreground border-yellow-500/20";
      case "completed":
        return "bg-[#0f0f11] text-foreground border-purple-500/20";
      case "stale":
        return "bg-[#0f0f11] text-foreground border-red-500/20";
      default:
        return "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";
    }
  };

  const [isSavingFeedback, setIsSavingFeedback] = useState(false);

  const saveFeedback = async () => {
    if (!newFeedback.trim() || !selectedProject) return;
    setIsSavingFeedback(true);
    try {
      const res = await fetch("/api/ai/classify-note", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: newFeedback.trim() })
      });
      if (res.ok) {
        const data = await res.json();
        const items = data.items || [];
        for (const item of items) {
          await notesStoreAddNote(item.content, selectedProject.id, item.category);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSavingFeedback(false);
      setNewFeedback("");
    }
  };



  const createGitHubIssue = async (feedbackText: string) => {
    if (!selectedProject?.githubUrl) return alert("No GitHub URL for this project.");
    try {
      const match = selectedProject.githubUrl.match(/github\.com\/([^\/]+\/[^\/]+)/);
      if (!match) return alert("Invalid GitHub URL");
      const repo = match[1];

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
        alert("Failed to create GitHub Issue.");
      }
    } catch (e) {
      alert("Failed to connect to API.");
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
          </div>
          <Button variant="ghost" size="icon" className="w-6 h-6 hover:bg-white/5" onClick={() => setIsAddingProject(!isAddingProject)}>
            <Plus className="w-4 h-4 text-muted-foreground" />
          </Button>
        </div>
        
        {isAddingProject && (
          <div className="mb-4 px-1 shrink-0">
            <Input 
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newProjectName.trim()) {
                  addProject({
                    name: newProjectName.trim(),
                    description: "New Project",
                    status: "planning",
                    tags: [],
                  });
                  setNewProjectName("");
                  setIsAddingProject(false);
                }
              }}
              placeholder="Project Name & Enter..."
              className="h-8 text-xs bg-[#0f0f11] border-white/10"
              autoFocus
            />
          </div>
        )}

        <Tabs defaultValue="github" className="flex-1 flex flex-col min-h-0">
          <TabsList className="mx-2 mb-2 bg-[#0f0f11] border border-white/10">
            <TabsTrigger value="github" className="flex-1 text-[10px] uppercase font-bold tracking-wider data-[state=active]:bg-primary/20 data-[state=active]:text-primary">GitHub</TabsTrigger>
            <TabsTrigger value="local" className="flex-1 text-[10px] uppercase font-bold tracking-wider data-[state=active]:bg-primary/20 data-[state=active]:text-primary">Local</TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 px-2 custom-scrollbar">

            {!selectedProject && staleWarningCount > 0 && (
              <div className="mb-4 p-2 bg-orange-500/10 border border-orange-500/20 rounded-lg flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-orange-400 shrink-0" />
                <p className="text-[11px] text-orange-400 font-medium">You have {staleWarningCount} stale projects with no commits in 14 days.</p>
              </div>
            )}
                 <TabsContent value="github" className="m-0 space-y-2 pb-4">
              {projects.filter(p => p.githubUrl).length === 0 && (
                <div className="text-center py-6 text-xs text-muted-foreground">No GitHub repositories synced yet.</div>
              )}
              {projects.filter(p => p.githubUrl).map((project) => {
                const stats = githubStats[project.githubUrl!.toLowerCase()];
                const isSelected = selectedProject?.id === project.id;
                
                return (
                  <div 
                    key={project.id} 
                    className={`p-2.5 rounded-lg border flex flex-col gap-2 cursor-pointer transition-all duration-200 
                      ${isSelected ? "bg-primary/10 border-primary/40 shadow-sm" : "bg-transparent border-white/5 hover:bg-white/5 hover:border-white/10"}`}
                    onClick={() => setSelectedProject(project)}
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={`text-[8px] font-semibold py-0 px-1 uppercase border ${getStatusColor(project.status)} shrink-0`}>
                        {project.status}
                      </Badge>
                      <div className="flex items-center gap-2 overflow-hidden flex-1">
                        <span className="text-xs font-bold text-foreground truncate">{project.name}</span>
                        {stats && stats.stars > 0 && (
                          <Badge variant="secondary" className="text-[8px] px-1 py-0 bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                            ★ {stats.stars}
                          </Badge>
                        )}
                      </div>
                      {project.folderPath && (
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
                    
                    {!selectedProject && stats && (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${new Date().getTime() - new Date(stats.lastCommit).getTime() > 14*24*3600*1000 ? "bg-orange-500" : "bg-green-500"}`} />
                        <span className="text-[9px] text-muted-foreground font-mono">Last commit: {new Date(stats.lastCommit).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </TabsContent>

            <TabsContent value="local" className="m-0 space-y-2 pb-4">
              {projects.filter(p => !p.githubUrl).length === 0 && (
                <div className="text-center py-6 text-xs text-muted-foreground">No local workspaces found.</div>
              )}
              {projects.filter(p => !p.githubUrl).map((project) => {
                const isSelected = selectedProject?.id === project.id;
                const healthScore = localHealthStats[project.id];
                
                return (
                  <div 
                    key={project.id} 
                    className={`p-2.5 rounded-lg border flex flex-col gap-2 cursor-pointer transition-all duration-200 
                      ${isSelected ? "bg-primary/10 border-primary/40 shadow-sm" : "bg-transparent border-white/5 hover:bg-white/5 hover:border-white/10"}`}
                    onClick={() => setSelectedProject(project)}
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={`text-[8px] font-semibold py-0 px-1 uppercase border ${getStatusColor(project.status)} shrink-0`}>
                        {project.status}
                      </Badge>
                      <div className="flex items-center gap-1.5 overflow-hidden flex-1">
                        {healthScore !== undefined && (
                          <div 
                            className={`w-2 h-2 rounded-full shrink-0 ${healthScore >= 70 ? 'bg-green-500' : healthScore >= 40 ? 'bg-amber-500' : 'bg-red-500'}`} 
                            title="Health Status"
                          />
                        )}
                        <span className="text-xs font-bold text-foreground truncate">{project.name}</span>
                      </div>
                      {project.folderPath && (
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
          </ScrollArea>
        </Tabs>
      </div>

      {/* ── DETAIL VIEW (Slides in) ── */}
      {selectedProject && (
        <div className="w-2/3 flex flex-col h-full overflow-hidden pl-3">
          <div className="flex items-center justify-between mb-3 shrink-0 bg-[#0f0f11] p-3 rounded-xl border border-white/10">
            <div className="flex-1 min-w-0 pr-4 space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-foreground truncate">{selectedProject.name}</h3>
                <Badge variant="outline" className={`text-[9px] font-semibold py-0 uppercase border ${getStatusColor(selectedProject.status)}`}>
                  {selectedProject.status}
                </Badge>
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
            </div>
            
            <div className="flex items-center gap-1 shrink-0">
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
              {/* Folder Path & VS Code */}
              <div className="p-3 bg-transparent rounded-xl flex items-center gap-3">
                <div className="flex-1 space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Local Folder Path</label>
                  <Input 
                    value={selectedProject.folderPath || ""}
                    onChange={(e) => {
                      updateProject(selectedProject.id, { folderPath: e.target.value });
                      setSelectedProject({ ...selectedProject, folderPath: e.target.value });
                    }}
                    placeholder="C:\Users\Kavya\Projects\..."
                    className="bg-[#0f0f11] border-white/10 text-xs text-foreground h-7"
                  />
                </div>
                {selectedProject.folderPath && (
                  <Button 
                    size="sm" 
                    onClick={() => window.open(`vscode://file/${selectedProject.folderPath}`)}
                    className="h-7 mt-4 text-[10px] bg-[#007acc]/10 text-[#007acc] hover:bg-[#007acc]/20 border border-[#007acc]/20"
                  >
                    <Code2 className="w-3.5 h-3.5 mr-1.5" /> VS Code
                  </Button>
                )}
              </div>

              {/* Progress bars / Metrics */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5 p-3 bg-transparent rounded-xl flex items-center">
                  <div className="flex justify-between w-full items-center text-[10px] uppercase font-bold text-muted-foreground">
                    <span>Project Health</span>
                    <div 
                      className={`w-3 h-3 rounded-full shadow-sm ${(localHealthStats[selectedProject.id] ?? 100) >= 70 ? 'bg-green-500 shadow-green-500/50' : (localHealthStats[selectedProject.id] ?? 100) >= 40 ? 'bg-amber-500 shadow-amber-500/50' : 'bg-red-500 shadow-red-500/50'}`} 
                    />
                  </div>
                </div>
                <div className="space-y-2 p-3 bg-transparent rounded-xl">
                  <div className="flex justify-between text-[10px] uppercase font-bold text-muted-foreground"><span>Completion</span><span className="text-primary">{selectedProject.completionPercentage || 0}%</span></div>
                  <div className="flex gap-1 h-6">
                    {[
                      { label: 'Not started', val: 0 },
                      { label: 'Early', val: 25 },
                      { label: 'Mid', val: 50 },
                      { label: 'Almost', val: 75 },
                      { label: 'Done', val: 100 }
                    ].map((step) => {
                      const isActive = (selectedProject.completionPercentage || 0) === step.val;
                      return (
                        <button
                          key={step.val}
                          onClick={() => {
                            updateProject(selectedProject.id, { completionPercentage: step.val });
                            setSelectedProject({ ...selectedProject, completionPercentage: step.val });
                          }}
                          title={step.label}
                          className={`flex-1 rounded flex items-center justify-center text-[8px] font-bold uppercase transition-colors border ${isActive ? 'bg-white text-black border-white' : 'bg-transparent border-white/5 text-muted-foreground hover:bg-white/5'}`}
                        >
                          {step.val === 100 && isActive ? <CheckCircle2 className="w-3 h-3" /> : step.label.slice(0, 3)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Unified Feedback Feed */}
              <div className="pt-4 border-t border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest px-1">Feedback & Brain Dump</h3>
                </div>
                <div className="p-3 border border-white/5 bg-[#0f0f11]/50 rounded-xl space-y-3">
                  <Textarea 
                    value={newFeedback}
                    onChange={(e) => setNewFeedback(e.target.value)}
                    placeholder="Paste multiple bugs, ideas, or feedback points here... AI will split them up!"
                    className="bg-transparent border-white/10 text-xs min-h-[80px] custom-scrollbar focus-visible:ring-1 focus-visible:ring-primary/50"
                  />
                  <div className="flex justify-end">
                    <Button size="sm" onClick={saveFeedback} disabled={isSavingFeedback} className="h-7 text-[10px]">
                      {isSavingFeedback ? "Parsing..." : "Save Feedback"}
                    </Button>
                  </div>
                </div>

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
                        <p className="text-xs leading-relaxed text-foreground whitespace-pre-wrap pr-6">{note.content}</p>
                        {selectedProject.githubUrl && (
                          <div className="flex justify-end mt-1">
                            <Button size="sm" variant="outline" className="h-6 text-[9px] px-2 bg-transparent border-white/10 hover:bg-white/5" onClick={() => createGitHubIssue(note.content)}>
                              <GitBranch className="w-3 h-3 mr-1.5" /> Open as Issue
                            </Button>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 text-xs text-muted-foreground">No notes or feedback recorded yet.</div>
                  )}
                </div>
              </div>
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
