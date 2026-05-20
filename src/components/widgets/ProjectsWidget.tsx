"use client";

import React, { useState } from "react";
import { useProjectStore, Project, ProjectStatus } from "@/store/useProjectStore";
import { useLayoutStore } from "@/store/useLayoutStore";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Folder, GitBranch, ExternalLink, Plus, Trash2, Code2, 
  Brain, CheckCircle2, Sparkles, 
  HelpCircle, Activity, ChevronRight, X, Heart
} from "lucide-react";

export function ProjectsWidget() {
  const { projects, addProject, deleteProject, updateProject } = useProjectStore();
  const { showTips } = useLayoutStore();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "arch" | "resume" | "interview">("overview");
  
  // Form State for new project
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<ProjectStatus>("active");
  const [tagsString, setTagsString] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [liveUrl, setLiveUrl] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const tags = tagsString
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    addProject({
      name,
      description,
      status,
      tags,
      githubUrl: githubUrl.trim() || undefined,
      liveUrl: liveUrl.trim() || undefined,
    });

    // Reset
    setName("");
    setDescription("");
    setStatus("active");
    setTagsString("");
    setGithubUrl("");
    setLiveUrl("");
    setIsOpen(false);
  };

  const getStatusColor = (status: ProjectStatus) => {
    switch (status) {
      case "active":
        return "bg-popover text-foreground border-green-500/20";
      case "planning":
        return "bg-popover text-foreground border-yellow-500/20";
      case "completed":
        return "bg-popover text-foreground border-purple-500/20";
      case "stale":
        return "bg-popover text-foreground border-red-500/20";
      default:
        return "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";
    }
  };

  const calculateHealth = (proj: Project) => {
    let health = 100;
    if (proj.status === "stale") health -= 30;
    if (!proj.githubUrl) health -= 10;
    if (!proj.liveUrl) health -= 10;
    if (!proj.nextAction) health -= 15;
    return Math.max(10, health);
  };

  const calculateMomentum = (proj: Project) => {
    let momentum = 0;
    if (proj.status === "active") momentum += 40;
    if (proj.githubUrl) momentum += 20;
    if (proj.liveUrl) momentum += 15;
    if (proj.nextAction) momentum += 25;
    return Math.min(100, momentum);
  };

  // Generate automated resume bullet
  const handleGenerateResumeBullet = (proj: Project) => {
    const tech = proj.tags.slice(0, 3).join(", ") || "modern web stack";
    const bullet = `Designed and deployed "${proj.name}", a personal developer cockpit application using ${tech}, improving workspace productivity and reducing context switching overhead through automated multi-widget dashboard orchestration.`;
    updateProject(proj.id, { resumeBullet: bullet });
    if (selectedProject?.id === proj.id) {
      setSelectedProject(prev => prev ? { ...prev, resumeBullet: bullet } : null);
    }
  };

  // Generate standard interview preparation mock questions based on tags
  const handleGenerateInterviewPrep = (proj: Project) => {
    const prepQuestions = [
      {
        q: `What was the biggest technical challenge you faced when building "${proj.name}"?`,
        a: "Optimizing state synchronization and coordination across multiple draggable dashboard widgets while maintaining instantaneous 0ms UI reactivity."
      },
      {
        q: `How did you manage architecture choices and stack selection for ${proj.tags.join(" & ") || "this project"}?`,
        a: `Selected the current stack to optimize for rapid component loading, strict Type-Safety (TypeScript), and low-latency database queries.`
      }
    ];
    updateProject(proj.id, { interviewNotes: JSON.stringify(prepQuestions) });
    if (selectedProject?.id === proj.id) {
      setSelectedProject(prev => prev ? { ...prev, interviewNotes: JSON.stringify(prepQuestions) } : null);
    }
  };

  return (
    <div className="flex h-full w-full overflow-hidden text-foreground">
      {/* List Panel */}
      <div className={`flex flex-col h-full overflow-hidden transition-all duration-300 ${selectedProject ? "w-1/2 border-r border-border/60 pr-4" : "w-full"}`}>
        <div className="flex items-center justify-between mb-4 shrink-0">
          <div className="flex items-center space-x-2">
            <Folder className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold tracking-wider uppercase text-secondary-foreground">Project Intelligence</h2>
          </div>
        </div>

        {showTips && (
          <div className="mb-3 p-3 bg-popover border border-amber-500/20 text-[10px] text-foreground rounded-lg select-none leading-relaxed shrink-0">
            ⚡ **Projects DevTools Tips**: Centralize your active repository list here. Clicking a project opens detail sheets that automatically generate resume bullet summaries, compute velocity health, and compile custom interview prep cards.
          </div>
        )}

        <div className="flex items-center justify-between mb-3 shrink-0">
          <span className="text-[10px] uppercase font-bold text-muted-foreground select-none">Registry Items</span>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger
              render={
                <Button size="icon" variant="ghost" className="w-8 h-8 rounded-lg border border-border bg-popover/30">
                  <Plus className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                </Button>
              }
            />
            <DialogContent className="bg-popover border border-border text-foreground">
              <DialogHeader>
                <DialogTitle className="text-lg font-bold text-foreground">Register New Project</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Project Name</label>
                  <Input
                    required
                    placeholder="e.g. Arc Clone"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-card border-border text-foreground placeholder:text-muted-foreground"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Description</label>
                  <Textarea
                    placeholder="What are you building?"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="bg-card border-border text-foreground placeholder:text-muted-foreground min-h-[80px]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Status</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as ProjectStatus)}
                      className="w-full h-10 px-3 rounded-md bg-card border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="planning">Planning</option>
                      <option value="active">Active</option>
                      <option value="completed">Completed</option>
                      <option value="stale">Stale</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Tags (comma separated)</label>
                    <Input
                      placeholder="Next.js, Tailwind, Rust"
                      value={tagsString}
                      onChange={(e) => setTagsString(e.target.value)}
                      className="bg-card border-border text-foreground placeholder:text-muted-foreground"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">GitHub Repository URL</label>
                    <Input
                      placeholder="https://github.com/..."
                      value={githubUrl}
                      onChange={(e) => setGithubUrl(e.target.value)}
                      className="bg-card border-border text-foreground placeholder:text-muted-foreground"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Live Deployment URL</label>
                    <Input
                      placeholder="https://..."
                      value={liveUrl}
                      onChange={(e) => setLiveUrl(e.target.value)}
                      className="bg-card border-border text-foreground placeholder:text-muted-foreground"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button type="submit" className="bg-primary hover:bg-primary/90 text-white font-semibold">
                    Register Project
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <ScrollArea className="flex-1 -mx-2 px-2">
          <div className="space-y-3 pb-4">
            {projects.map((project) => {
              const health = calculateHealth(project);
              const momentum = calculateMomentum(project);
              return (
                <Card 
                  key={project.id} 
                  className={`bg-popover border flex flex-col justify-between hover:border-primary/40 transition-all duration-300 cursor-pointer ${selectedProject?.id === project.id ? "border-primary/60 shadow-lg" : "border-border/80"}`}
                  onClick={() => {
                    setSelectedProject(project);
                    setActiveTab("overview");
                  }}
                >
                  <CardHeader className="p-3 pb-1.5 flex flex-row items-center justify-between">
                    <div className="space-y-1 min-w-0 flex-1 pr-2">
                      <div className="flex items-center space-x-1.5">
                        <CardTitle className="text-[13px] font-bold text-foreground truncate">{project.name}</CardTitle>
                        <Badge variant="outline" className={`text-[8px] font-semibold py-0 uppercase border ${getStatusColor(project.status)}`}>
                          {project.status}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center space-x-0.5 shrink-0">
                      {project.githubUrl && (
                        <a href={project.githubUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                          <Button size="icon" variant="ghost" className="w-6 h-6">
                            <GitBranch className="w-3.5 h-3.5 text-muted-foreground" />
                          </Button>
                        </a>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="w-6 h-6 hover:text-destructive text-muted-foreground"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteProject(project.id);
                          if (selectedProject?.id === project.id) setSelectedProject(null);
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-3 pt-0">
                    <p className="text-[11px] text-muted-foreground line-clamp-1 mb-2">
                      {project.description || "No description provided."}
                    </p>
                    
                    {/* Health & Momentum Micro Badges */}
                    <div className="flex items-center space-x-4 mb-2 text-[10px]">
                      <div className="flex items-center space-x-1 text-muted-foreground">
                        <Heart className="w-3 h-3 text-foreground " />
                        <span>Health: <strong className="text-foreground">{health}%</strong></span>
                      </div>
                      <div className="flex items-center space-x-1 text-muted-foreground">
                        <Activity className="w-3 h-3 text-primary" />
                        <span>Momentum: <strong className="text-foreground">{momentum}%</strong></span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-1">
                      <div className="flex flex-wrap gap-1">
                        {project.tags.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-[8px] px-1 bg-card border border-border text-muted-foreground rounded py-0">
                            {tag}
                          </Badge>
                        ))}
                        {project.tags.length > 3 && (
                          <span className="text-[9px] text-muted-foreground">+{project.tags.length - 3}</span>
                        )}
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      {/* Detail Drawer Panel */}
      {selectedProject && (
        <div className="w-1/2 flex flex-col h-full overflow-hidden pl-4">
          <div className="flex items-center justify-between mb-3 shrink-0">
            <div className="flex items-center space-x-2">
              <Brain className="w-4 h-4 text-primary " />
              <h3 className="text-sm font-bold text-foreground truncate">{selectedProject.name} Explorer</h3>
            </div>
            <Button size="icon" variant="ghost" className="w-7 h-7" onClick={() => setSelectedProject(null)}>
              <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
            </Button>
          </div>

          {/* detail navigation tabs */}
          <div className="flex space-x-1 border-b border-border/60 pb-1.5 mb-3 shrink-0">
            <Button 
              size="sm" 
              variant={activeTab === "overview" ? "secondary" : "ghost"}
              className="text-[10px] h-7 px-2 font-semibold uppercase tracking-wider"
              onClick={() => setActiveTab("overview")}
            >
              Overview
            </Button>
            <Button 
              size="sm" 
              variant={activeTab === "arch" ? "secondary" : "ghost"}
              className="text-[10px] h-7 px-2 font-semibold uppercase tracking-wider flex items-center space-x-1"
              onClick={() => setActiveTab("arch")}
            >
              <Code2 className="w-3 h-3" />
              <span>Architecture</span>
            </Button>
            <Button 
              size="sm" 
              variant={activeTab === "resume" ? "secondary" : "ghost"}
              className="text-[10px] h-7 px-2 font-semibold uppercase tracking-wider flex items-center space-x-1"
              onClick={() => setActiveTab("resume")}
            >
              <Sparkles className="w-3 h-3 text-foreground" />
              <span>Resume</span>
            </Button>
            <Button 
              size="sm" 
              variant={activeTab === "interview" ? "secondary" : "ghost"}
              className="text-[10px] h-7 px-2 font-semibold uppercase tracking-wider flex items-center space-x-1"
              onClick={() => setActiveTab("interview")}
            >
              <HelpCircle className="w-3 h-3" />
              <span>Prep</span>
            </Button>
          </div>

          {/* Drawer Content */}
          <ScrollArea className="flex-1 pr-1">
            {activeTab === "overview" && (
              <div className="space-y-4 pb-4">
                {/* Stats health circles */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 border border-border/80 bg-popover/30 rounded-xl flex flex-col justify-between">
                    <span className="text-[10px] uppercase text-muted-foreground font-semibold">Project Health</span>
                    <div className="flex items-baseline space-x-2 mt-2">
                      <span className="text-xl font-black font-mono text-foreground">{calculateHealth(selectedProject)}%</span>
                      <Heart className="w-4 h-4 text-foreground  " />
                    </div>
                    <p className="text-[9px] text-muted-foreground mt-1">Based on repositories link and active status.</p>
                  </div>
                  <div className="p-3 border border-border/80 bg-popover/30 rounded-xl flex flex-col justify-between">
                    <span className="text-[10px] uppercase text-muted-foreground font-semibold">Momentum Score</span>
                    <div className="flex items-baseline space-x-2 mt-2">
                      <span className="text-xl font-black font-mono text-primary">{calculateMomentum(selectedProject)}%</span>
                      <Activity className="w-4 h-4 text-primary " />
                    </div>
                    <p className="text-[9px] text-muted-foreground mt-1">Calculated using next actions and links health.</p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-1.5 p-3 border border-border/80 bg-popover/30 rounded-xl">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase text-muted-foreground font-semibold">Completion Status</span>
                    <span className="text-xs font-bold font-mono text-primary">{selectedProject.completionPercentage || 0}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    value={selectedProject.completionPercentage || 0}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      updateProject(selectedProject.id, { completionPercentage: val });
                      setSelectedProject(prev => prev ? { ...prev, completionPercentage: val } : null);
                    }}
                    className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                </div>

                {/* Next Action input */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider flex items-center space-x-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                    <span>Next Milestone / Action Item</span>
                  </label>
                  <Input 
                    value={selectedProject.nextAction || ""}
                    onChange={(e) => {
                      updateProject(selectedProject.id, { nextAction: e.target.value });
                      setSelectedProject(prev => prev ? { ...prev, nextAction: e.target.value } : null);
                    }}
                    placeholder="e.g. Set up auth middleware or compile bundle..."
                    className="bg-card border-border text-xs text-foreground placeholder:text-muted-foreground/60 h-8"
                  />
                </div>

                {/* Tags breakdown */}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Tech Stack Tags</label>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {selectedProject.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="bg-popover text-foreground/80 border-border text-[9px] font-bold py-0.5 px-2">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* General project summary */}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Project Summary</label>
                  <Textarea 
                    value={selectedProject.summary || ""}
                    onChange={(e) => {
                      updateProject(selectedProject.id, { summary: e.target.value });
                      setSelectedProject(prev => prev ? { ...prev, summary: e.target.value } : null);
                    }}
                    placeholder="Provide a deep, long-form system overview..."
                    className="bg-card border-border text-xs text-foreground placeholder:text-muted-foreground/60 min-h-[100px]"
                  />
                </div>
              </div>
            )}

            {activeTab === "arch" && (
              <div className="space-y-4 pb-4">
                <div className="p-3 border border-yellow-500/10 bg-yellow-500/5 rounded-lg text-[10px] text-foreground flex items-start space-x-1.5">
                  <Code2 className="w-4 h-4 flex-shrink-0" />
                  <p><strong>Architecture Workspace:</strong> Draft comprehensive markdown diagrams, design details, caching mechanisms, or pipeline details for your systems.</p>
                </div>
                <Textarea 
                  value={selectedProject.architectureNotes || ""}
                  onChange={(e) => {
                    updateProject(selectedProject.id, { architectureNotes: e.target.value });
                    setSelectedProject(prev => prev ? { ...prev, architectureNotes: e.target.value } : null);
                  }}
                  placeholder="### Architecture Overview&#10;&#10;- **Database**: PostgreSQL singleton adapter&#10;- **Caching**: In-Memory & Redis backend cache layers&#10;- **Components**: Event-driven polling queue with BullMQ"
                  className="bg-card border-border font-mono text-xs text-foreground placeholder:text-muted-foreground/60 min-h-[260px] leading-relaxed p-3"
                />
              </div>
            )}

            {activeTab === "resume" && (
              <div className="space-y-4 pb-4">
                <div className="flex items-center justify-between shrink-0">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Impact & Resume Bullet</span>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => handleGenerateResumeBullet(selectedProject)}
                    className="h-7 text-[10px] border border-primary/20 hover:border-primary/40 bg-primary/5 hover:bg-primary/10 text-primary font-bold flex items-center space-x-1"
                  >
                    <Sparkles className="w-3 h-3 text-foreground" />
                    <span>Auto-Generate Bullet</span>
                  </Button>
                </div>

                <div className="p-3 border border-border bg-popover/30 rounded-xl space-y-2">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold">Generated Output</p>
                  {selectedProject.resumeBullet ? (
                    <p className="text-xs leading-relaxed text-foreground bg-card border border-border/80 p-3 rounded-lg font-medium selection:bg-primary/20">
                      {selectedProject.resumeBullet}
                    </p>
                  ) : (
                    <div className="text-center py-6 text-xs text-muted-foreground">Click &quot;Auto-Generate Bullet&quot; to map tech stack to a professional bullet point!</div>
                  )}
                </div>

                <Textarea 
                  value={selectedProject.resumeBullet || ""}
                  onChange={(e) => {
                    updateProject(selectedProject.id, { resumeBullet: e.target.value });
                    setSelectedProject(prev => prev ? { ...prev, resumeBullet: e.target.value } : null);
                  }}
                  placeholder="Or draft your own professional resume achievements here..."
                  className="bg-card border-border text-xs text-foreground placeholder:text-muted-foreground/60 min-h-[100px]"
                />
              </div>
            )}

            {activeTab === "interview" && (
              <div className="space-y-4 pb-4">
                <div className="flex items-center justify-between shrink-0">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Mock Technical Q&A</span>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => handleGenerateInterviewPrep(selectedProject)}
                    className="h-7 text-[10px] border border-primary/20 hover:border-primary/40 bg-primary/5 hover:bg-primary/10 text-primary font-bold flex items-center space-x-1"
                  >
                    <Sparkles className="w-3 h-3 text-foreground" />
                    <span>Generate Prep Prep Q&A</span>
                  </Button>
                </div>

                <div className="space-y-3">
                  {selectedProject.interviewNotes ? (
                    (() => {
                      try {
                        const qas = JSON.parse(selectedProject.interviewNotes) as { q: string; a: string }[];
                        return qas.map((qa, idx) => (
                          <div key={idx} className="p-3 border border-border bg-card rounded-lg space-y-1.5">
                            <p className="text-xs font-bold text-primary flex items-start space-x-1.5">
                              <HelpCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                              <span>{qa.q}</span>
                            </p>
                            <p className="text-[11px] text-muted-foreground leading-relaxed pl-5 border-l border-border/80">
                              {qa.a}
                            </p>
                          </div>
                        ));
                      } catch {
                        return <p className="text-xs text-muted-foreground">{selectedProject.interviewNotes}</p>;
                      }
                    })()
                  ) : (
                    <div className="text-center py-8 text-xs text-muted-foreground">Click &quot;Generate Prep Q&A&quot; to build custom mock interview questions based on tags.</div>
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

