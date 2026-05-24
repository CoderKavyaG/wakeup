"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Github, GitCommit, GitBranch, AlertTriangle, RefreshCw, Star, ExternalLink } from "lucide-react";

interface Repository {
  id: number;
  name: string;
  description: string | null;
  html_url: string;
  updated_at: string;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
}

interface Commit {
  sha: string;
  repoName: string;
  message: string;
  date: string;
  url: string;
}

export function GithubWidget() {
  const [username, setUsername] = useState("TPAteeq");
  const [inputUsername, setInputUsername] = useState("TPAteeq");
  const [repos, setRepos] = useState<Repository[]>([]);
  const [commits, setCommits] = useState<Commit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchGithubData = async (user: string) => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      // Fetch repos
      const reposRes = await fetch(`https://api.github.com/users/${user}/repos?sort=updated&per_page=10`);
      if (!reposRes.ok) throw new Error("User not found or API limit exceeded");
      const reposData = await reposRes.json();
      
      // Map and set repositories
      const sortedRepos = (reposData as any[]).map((r: any) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        html_url: r.html_url,
        updated_at: r.updated_at,
        stargazers_count: r.stargazers_count,
        forks_count: r.forks,
        language: r.language
      }));
      setRepos(sortedRepos);

      // Fetch public events to extract commits
      const eventsRes = await fetch(`https://api.github.com/users/${user}/events/public?per_page=20`);
      if (eventsRes.ok) {
        const eventsData = await eventsRes.json();
        const extractedCommits: Commit[] = [];
        
        eventsData.forEach((event: any) => {
          if (event.type === "PushEvent" && event.payload?.commits) {
            event.payload.commits.forEach((c: any) => {
              extractedCommits.push({
                sha: c.sha.substring(0, 7),
                repoName: event.repo.name.split("/")[1] || event.repo.name,
                message: c.message,
                date: event.created_at,
                url: `https://github.com/${event.repo.name}/commit/${c.sha}`
              });
            });
          }
        });
        
        setCommits(extractedCommits.slice(0, 5));
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
      // Load fallback mock data for smooth offline developer demo experience
      loadMockData();
    } finally {
      setLoading(false);
    }
  };

  const loadMockData = () => {
    setRepos([
      {
        id: 1,
        name: "wake-up",
        description: "DevOS Personal developer cockpit dashboard",
        html_url: "https://github.com/TPAteeq/wake-up",
        updated_at: new Date().toISOString(),
        stargazers_count: 14,
        forks_count: 2,
        language: "TypeScript"
      },
      {
        id: 2,
        name: "webrtc-chat",
        description: "Multi-user stragner video chat with automatic ICE recovery",
        html_url: "https://github.com/example/webrtc-chat",
        updated_at: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(),
        stargazers_count: 8,
        forks_count: 1,
        language: "JavaScript"
      }
    ]);
    setCommits([
      {
        sha: "a3b5c71",
        repoName: "wake-up",
        message: "feat: add draggable layout persistence system",
        date: new Date().toISOString(),
        url: "#"
      },
      {
        sha: "f2d8e19",
        repoName: "wake-up",
        message: "feat: create project registry widget",
        date: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
        url: "#"
      }
    ]);
  };

  useEffect(() => {
    fetchGithubData(username);
  }, [username]);

  const handleUpdateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputUsername.trim()) {
      setUsername(inputUsername.trim());
    }
  };

  const getStaleRepos = () => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return repos.filter(r => new Date(r.updated_at) < thirtyDaysAgo);
  };

  const activeRepos = repos.filter(r => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return new Date(r.updated_at) >= thirtyDaysAgo;
  });

  const staleRepos = getStaleRepos();

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-center space-x-2">
          <Github className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold tracking-wider uppercase text-secondary-foreground">GitHub Integration</h2>
        </div>
        <form onSubmit={handleUpdateUser} className="flex items-center space-x-2">
          <Input
            value={inputUsername}
            onChange={(e) => setInputUsername(e.target.value)}
            placeholder="Username"
            className="h-7 w-28 text-xs bg-popover border-border text-foreground placeholder:text-muted-foreground py-0"
          />
          <Button size="icon" variant="ghost" className="w-7 h-7 border border-border bg-popover/30" disabled={loading}>
            <RefreshCw className={`w-3.5 h-3.5 text-muted-foreground ${loading ? 'animate-spin' : ''}`} onClick={() => fetchGithubData(username)} />
          </Button>
        </form>
      </div>

      {error && (
        <div className="mb-2 p-2 bg-red-500/10 border border-red-500/20 rounded text-[11px] text-red-400 flex items-center space-x-1 shrink-0">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>Using mock data ({error})</span>
        </div>
      )}

      {/* Main Content Areas split horizontally */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-hidden">
        {/* Left Column: Activity Feed & Commits */}
        <div className="flex flex-col h-full overflow-hidden space-y-3">
          <div className="text-xs font-semibold uppercase text-muted-foreground tracking-wider flex items-center space-x-1.5 shrink-0">
            <GitCommit className="w-3.5 h-3.5 text-primary" />
            <span>Recent Commits</span>
          </div>
          <ScrollArea className="flex-1 border border-border/80 bg-popover/20 rounded-lg p-3">
            <div className="space-y-3">
              {commits.length === 0 ? (
                <div className="text-center py-6 text-xs text-muted-foreground">No recent pushes detected.</div>
              ) : (
                commits.map((commit, i) => (
                  <div key={commit.sha + i} className="flex items-start space-x-2 border-b border-border/50 pb-2.5 last:border-0 last:pb-0">
                    <div className="mt-0.5 p-1 bg-primary/10 rounded">
                      <GitBranch className="w-3 h-3 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-foreground truncate">{commit.repoName}</span>
                        <a href={commit.url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary hover:underline font-mono">
                          {commit.sha}
                        </a>
                      </div>
                      <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{commit.message}</p>
                      <span className="text-[9px] text-muted-foreground/60">{new Date(commit.date).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Right Column: Repositories */}
        <div className="flex flex-col h-full overflow-hidden space-y-3">
          <div className="text-xs font-semibold uppercase text-muted-foreground tracking-wider flex items-center space-x-1.5 shrink-0">
            <Github className="w-3.5 h-3.5 text-primary" />
            <span>Repositiories</span>
          </div>
          <ScrollArea className="flex-1 border border-border/80 bg-popover/20 rounded-lg p-3">
            <div className="space-y-3">
              {/* Stale Warning Banner if any */}
              {staleRepos.length > 0 && (
                <div className="p-2 bg-yellow-500/10 border border-yellow-500/20 rounded text-[10px] text-yellow-400 space-y-1">
                  <div className="flex items-center space-x-1 font-semibold">
                    <AlertTriangle className="w-3 h-3" />
                    <span>{staleRepos.length} Stale Repositories Detected</span>
                  </div>
                  <p className="text-[9px] text-muted-foreground">No updates in over 30 days. Action recommended.</p>
                </div>
              )}

              {/* Active Repos */}
              {repos.length === 0 ? (
                <div className="text-center py-6 text-xs text-muted-foreground">No repositories found.</div>
              ) : (
                repos.map((repo) => {
                  const isStale = new Date(repo.updated_at) < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
                  return (
                    <div key={repo.id} className="p-2 border border-border/80 bg-popover/40 rounded-md hover:border-primary/20 transition-all">
                      <div className="flex items-start justify-between">
                        <div className="min-w-0">
                          <a href={repo.html_url} target="_blank" rel="noopener noreferrer" className="text-[11px] font-bold text-foreground hover:text-primary transition-colors flex items-center space-x-1">
                            <span className="truncate">{repo.name}</span>
                            <ExternalLink className="w-2.5 h-2.5 opacity-50" />
                          </a>
                          {repo.description && (
                            <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">{repo.description}</p>
                          )}
                        </div>
                        {isStale ? (
                          <Badge variant="outline" className="text-[9px] bg-red-500/10 text-red-400 border-red-500/20 uppercase shrink-0 py-0">stale</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[9px] bg-green-500/10 text-green-400 border-green-500/20 uppercase shrink-0 py-0">active</Badge>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-2 text-[9px] text-muted-foreground/80">
                        <div className="flex items-center space-x-2">
                          {repo.language && (
                            <span className="flex items-center space-x-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block"></span>
                              <span>{repo.language}</span>
                            </span>
                          )}
                          <span className="flex items-center space-x-0.5">
                            <Star className="w-2.5 h-2.5" />
                            <span>{repo.stargazers_count}</span>
                          </span>
                        </div>
                        <span>Updated: {new Date(repo.updated_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
