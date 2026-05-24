"use client";

import React, { useState, useEffect, useRef } from "react";
import { useProjectStore, Project, ProjectStatus } from "@/store/useProjectStore";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Folder, GitBranch, ExternalLink, Trash2, 
  Brain, CheckCircle2, Sparkles, Plus,
  HelpCircle, Activity, ChevronRight, X, Heart, 
  Code2, Play, AlertCircle
} from "lucide-react";

export function ProjectsWidget() {
  const { projects, deleteProject, updateProject, addProject } = useProjectStore();
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "notes" | "feedback">("overview");
  
  // New Feedback State
  const [newFeedback, setNewFeedback] = useState("");
  
  // Add Project State
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");

  // GitHub Stats State
  const [githubStats, setGithubStats] = useState<Record<string, { lastCommit: string, issues: number, stars: number }>>({});
  const [staleWarningCount, setStaleWarningCount] = useState(0);

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

  const saveFeedback = () => {
    if (!newFeedback.trim() || !selectedProject) return;
    const currentFeedback = selectedProject.feedback || [];
    const newEntry = { id: Date.now().toString(), text: newFeedback.trim(), date: new Date().toISOString() };
    const updatedFeedback = [newEntry, ...currentFeedback];
    updateProject(selectedProject.id, { feedback: updatedFeedback });
    setSelectedProject({ ...selectedProject, feedback: updatedFeedback });
    setNewFeedback("");
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
        alert("GitHub Issue created successfully!");
      } else {
        alert("Failed to create GitHub Issue.");
      }
    } catch (e) {
      alert("Failed to connect to API.");
    }
  };

  const nextFocusProject = [...projects].filter(p => p.nextAction && p.status === 'active').sort((a, b) => b.projectHealth! - a.projectHealth!)[0];

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

        <ScrollArea className="flex-1 -mx-2 px-2">
          {!selectedProject && nextFocusProject && (
            <div className="mb-4 p-3 bg-primary/10 border border-primary/20 rounded-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-2 opacity-20"><Play className="w-12 h-12 text-primary" /></div>
              <h3 className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1 relative z-10">Next Focus</h3>
              <p className="text-sm font-bold text-foreground relative z-10">{nextFocusProject.name}</p>
              <p className="text-[11px] text-muted-foreground mt-1 relative z-10 line-clamp-2">{nextFocusProject.nextAction}</p>
              <Button size="sm" variant="ghost" className="h-6 px-2 mt-2 text-[10px] text-primary bg-primary/10 hover:bg-primary/20 relative z-10" onClick={() => setSelectedProject(nextFocusProject)}>
                Open Project
              </Button>
            </div>
          )}

          {!selectedProject && staleWarningCount > 0 && (
            <div className="mb-4 p-2 bg-orange-500/10 border border-orange-500/20 rounded-lg flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-orange-400 shrink-0" />
              <p className="text-[11px] text-orange-400 font-medium">You have {staleWarningCount} stale projects with no commits in 14 days.</p>
            </div>
          )}

          <div className="space-y-4 pb-4">
            
            {/* GitHub Repositories Section */}
            {projects.filter(p => p.githubUrl).length > 0 && (
              <div className="space-y-2">
                <h3 className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest px-1 flex items-center gap-1.5"><GitBranch className="w-3 h-3" /> GitHub Repositories</h3>
                {projects.filter(p => p.githubUrl).map((project) => {
                  const stats = githubStats[project.githubUrl!.toLowerCase()];
                  const isSelected = selectedProject?.id === project.id;
                  
                  return (
                    <div 
                      key={project.id} 
                      className={`p-2.5 rounded-lg border flex flex-col gap-2 cursor-pointer transition-all duration-200 
                        ${isSelected ? "bg-primary/5 border-primary/40 shadow-sm" : "bg-[#0f0f11] border-white/10 hover:border-primary/30"}`}
                      onClick={() => {
                        setSelectedProject(project);
                        if (!activeTab) setActiveTab("overview");
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <span className="text-xs font-bold text-foreground truncate">{project.name}</span>
                          {stats && stats.stars > 0 && (
                            <Badge variant="secondary" className="text-[8px] px-1 py-0 bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                              ★ {stats.stars}
                            </Badge>
                          )}
                        </div>
                        <Badge variant="outline" className={`text-[8px] font-semibold py-0 px-1 uppercase border ${getStatusColor(project.status)} shrink-0`}>
                          {project.status}
                        </Badge>
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
              </div>
            )}

            {/* Local Workspaces Section */}
            {projects.filter(p => !p.githubUrl).length > 0 && (
              <div className="space-y-2">
                <h3 className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest px-1 flex items-center gap-1.5"><Folder className="w-3 h-3" /> Local Workspaces</h3>
                {projects.filter(p => !p.githubUrl).map((project) => {
                  const isSelected = selectedProject?.id === project.id;
                  
                  return (
                    <div 
                      key={project.id} 
                      className={`p-2.5 rounded-lg border flex flex-col gap-2 cursor-pointer transition-all duration-200 
                        ${isSelected ? "bg-primary/5 border-primary/40 shadow-sm" : "bg-[#0f0f11] border-white/10 hover:border-primary/30"}`}
                      onClick={() => {
                        setSelectedProject(project);
                        if (!activeTab) setActiveTab("overview");
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <span className="text-xs font-bold text-foreground truncate">{project.name}</span>
                        </div>
                        <Badge variant="outline" className={`text-[8px] font-semibold py-0 px-1 uppercase border ${getStatusColor(project.status)} shrink-0`}>
                          {project.status}
                        </Badge>
                      </div>
                      
                      {!selectedProject && (
                        <div className="flex items-center gap-3">
                          <div className="flex-1 space-y-1">
                            <div className="flex justify-between text-[8px] uppercase text-muted-foreground font-semibold">
                              <span>Health</span>
                              <span>{project.projectHealth}%</span>
                            </div>
                            <div className="h-1 bg-muted rounded-full overflow-hidden"><div className="h-full bg-green-500" style={{ width: `${project.projectHealth}%` }} /></div>
                          </div>
                          <div className="flex-1 space-y-1">
                            <div className="flex justify-between text-[8px] uppercase text-muted-foreground font-semibold">
                              <span>Momentum</span>
                              <span>{project.momentumScore}%</span>
                            </div>
                            <div className="h-1 bg-muted rounded-full overflow-hidden"><div className="h-full bg-primary" style={{ width: `${project.momentumScore}%` }} /></div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </ScrollArea>
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
            <Button size="icon" variant="ghost" className="w-7 h-7 shrink-0" onClick={() => setSelectedProject(null)}>
              <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
            </Button>
          </div>

          {/* detail navigation tabs */}
          <div className="flex space-x-1 border-b border-white/10 pb-1.5 mb-3 shrink-0 overflow-x-auto no-scrollbar">
            {["overview", "notes", "feedback"].map((tab) => (
              <Button 
                key={tab}
                size="sm" 
                variant={activeTab === tab ? "secondary" : "ghost"}
                className="text-[10px] h-7 px-2.5 font-semibold uppercase tracking-wider shrink-0"
                onClick={() => setActiveTab(tab as any)}
              >
                {tab}
              </Button>
            ))}
          </div>

          {/* Drawer Content */}
          <ScrollArea className="flex-1 pr-2">
            {activeTab === "overview" && (
              <div className="space-y-4 pb-4">
                {/* Folder Path & VS Code */}
                <div className="p-3 border border-white/10 bg-[#0f0f11] rounded-xl flex items-center gap-3">
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

                {/* Progress bars */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5 p-3 border border-white/10 bg-[#0f0f11] rounded-xl">
                    <div className="flex justify-between text-[10px] uppercase font-bold text-muted-foreground"><span>Health</span><span className="text-green-500">{selectedProject.projectHealth}%</span></div>
                    <input type="range" min="0" max="100" value={selectedProject.projectHealth || 0} onChange={(e) => {
                      const val = parseInt(e.target.value);
                      updateProject(selectedProject.id, { projectHealth: val });
                      setSelectedProject({ ...selectedProject, projectHealth: val });
                    }} className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer accent-green-500" />
                  </div>
                  <div className="space-y-1.5 p-3 border border-white/10 bg-[#0f0f11] rounded-xl">
                    <div className="flex justify-between text-[10px] uppercase font-bold text-muted-foreground"><span>Completion</span><span className="text-primary">{selectedProject.completionPercentage || 0}%</span></div>
                    <input type="range" min="0" max="100" value={selectedProject.completionPercentage || 0} onChange={(e) => {
                      const val = parseInt(e.target.value);
                      updateProject(selectedProject.id, { completionPercentage: val });
                      setSelectedProject({ ...selectedProject, completionPercentage: val });
                    }} className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer accent-primary" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Next Action</label>
                  <Input value={selectedProject.nextAction || ""} onChange={(e) => {
                      updateProject(selectedProject.id, { nextAction: e.target.value });
                      setSelectedProject({ ...selectedProject, nextAction: e.target.value });
                    }} placeholder="e.g. Set up auth middleware..." className="bg-[#0f0f11] border-white/10 text-xs h-8" />
                </div>
              </div>
            )}

            {activeTab === "notes" && (
              <div className="space-y-4 pb-4 h-full flex flex-col">
                <Textarea 
                  value={selectedProject.architectureNotes || ""}
                  onChange={(e) => {
                    updateProject(selectedProject.id, { architectureNotes: e.target.value });
                    setSelectedProject({ ...selectedProject, architectureNotes: e.target.value });
                  }}
                  placeholder="Project-specific notes, architecture, ideas..."
                  className="bg-[#0f0f11] border-white/10 font-mono text-xs text-foreground placeholder:text-muted-foreground/60 min-h-[300px] p-3 flex-1"
                />
              </div>
            )}

            {activeTab === "feedback" && (
              <div className="space-y-4 pb-4">
                <div className="p-3 border border-white/10 bg-[#0f0f11] rounded-xl space-y-3">
                  <Textarea 
                    value={newFeedback}
                    onChange={(e) => setNewFeedback(e.target.value)}
                    placeholder="Paste received feedback here..."
                    className="bg-[#0f0f11] border-white/10 text-xs min-h-[80px]"
                  />
                  <div className="flex justify-end">
                    <Button size="sm" onClick={saveFeedback} className="h-7 text-[10px]">Save Feedback</Button>
                  </div>
                </div>

                <div className="space-y-3">
                  {selectedProject.feedback?.map((fb) => (
                    <div key={fb.id} className="p-3 border border-white/10 bg-[#0f0f11] rounded-lg flex flex-col gap-2">
                      <p className="text-[9px] text-muted-foreground font-mono">{new Date(fb.date).toLocaleString()}</p>
                      <p className="text-xs leading-relaxed text-foreground whitespace-pre-wrap">{fb.text}</p>
                      {selectedProject.githubUrl && (
                        <div className="flex justify-end mt-1">
                          <Button size="sm" variant="outline" className="h-6 text-[9px] px-2" onClick={() => createGitHubIssue(fb.text)}>
                            <GitBranch className="w-3 h-3 mr-1.5" /> Open as Issue
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                  {(!selectedProject.feedback || selectedProject.feedback.length === 0) && (
                    <div className="text-center py-6 text-xs text-muted-foreground">No feedback recorded yet.</div>
                  )}
                </div>
              </div>
            )}


          </ScrollArea>
        </div>
      )}
    </div>
  );
}
