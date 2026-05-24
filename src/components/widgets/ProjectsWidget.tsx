"use client";

import React, { useState } from "react";
import { useProjectStore, Project, ProjectStatus } from "@/store/useProjectStore";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Folder, Github, ExternalLink, Plus, Trash2, Code2, AlertCircle } from "lucide-react";

export function ProjectsWidget() {
  const { projects, addProject, deleteProject, updateProject } = useProjectStore();
  const [isOpen, setIsOpen] = useState(false);
  
  // Form State
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
        return "bg-green-500/10 text-green-400 border-green-500/20";
      case "planning":
        return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
      case "completed":
        return "bg-purple-500/10 text-purple-400 border-purple-500/20";
      case "stale":
        return "bg-red-500/10 text-red-400 border-red-500/20";
      default:
        return "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-center space-x-2">
          <Folder className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold tracking-wider uppercase text-secondary-foreground">Project Registry</h2>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button size="icon" variant="ghost" className="w-8 h-8 rounded-lg border border-border bg-popover/30">
              <Plus className="w-4 h-4 text-muted-foreground hover:text-foreground" />
            </Button>
          </DialogTrigger>
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4">
          {projects.map((project) => (
            <Card key={project.id} className="bg-popover border border-border/80 flex flex-col justify-between hover:border-primary/30 transition-all duration-300">
              <CardHeader className="p-4 pb-2">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-sm font-bold text-foreground flex items-center space-x-1.5">
                      <span>{project.name}</span>
                    </CardTitle>
                    <Badge variant="outline" className={`text-[10px] font-semibold py-0 uppercase border ${getStatusColor(project.status)}`}>
                      {project.status}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    {project.githubUrl && (
                      <a href={project.githubUrl} target="_blank" rel="noopener noreferrer">
                        <Button size="icon" variant="ghost" className="w-7 h-7 rounded-md">
                          <Github className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
                        </Button>
                      </a>
                    )}
                    {project.liveUrl && (
                      <a href={project.liveUrl} target="_blank" rel="noopener noreferrer">
                        <Button size="icon" variant="ghost" className="w-7 h-7 rounded-md">
                          <ExternalLink className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
                        </Button>
                      </a>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="w-7 h-7 rounded-md text-muted-foreground hover:text-destructive"
                      onClick={() => deleteProject(project.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="p-4 pt-0 flex-1 flex flex-col justify-between">
                <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                  {project.description || "No description provided."}
                </p>
                
                <div className="flex flex-wrap gap-1 mt-auto">
                  {project.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-[9px] px-1.5 py-0 bg-card border border-border text-muted-foreground rounded">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
