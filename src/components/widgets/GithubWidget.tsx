"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { GitCommit, GitBranch, RefreshCw, Star, ExternalLink, Flame, PieChart, AlertTriangle } from "lucide-react";
import { useLayoutStore } from "@/store/useLayoutStore";

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

interface LanguageShare {
  language: string;
  count: number;
  percentage: number;
}

interface GithubStats {
  totalRepos: number;
  activeReposCount: number;
  staleReposCount: number;
  currentStreak: number;
  languageBreakdown: LanguageShare[];
}

export function GithubWidget() {
  const { showTips } = useLayoutStore();
  const [username, setUsername] = useState("coderkavyag");
  const [inputUsername, setInputUsername] = useState("coderkavyag");
  const [repos, setRepos] = useState<Repository[]>([]);
  const [commits, setCommits] = useState<Commit[]>([]);
  const [stats, setStats] = useState<GithubStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getRelativeTime = (dateStr: string) => {
    const elapsed = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(elapsed / 60000);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);
    
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const fetchGithubData = async (user: string) => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/github?username=${user}`);
      if (!res.ok) throw new Error("Failed to load GitHub data from DevOS backend");
      const data = await res.json();
      
      setRepos(data.repos || []);
      setCommits(data.commits || []);
      setStats(data.stats || null);
    } catch (err: any) {
      setError(err.message || "An error occurred");
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
        html_url: "https://github.com/coderkavyag/wake-up",
        updated_at: new Date().toISOString(),
        stargazers_count: 14,
        forks_count: 2,
        language: "TypeScript"
      },
      {
        id: 2,
        name: "webrtc-chat",
        description: "Multi-user stranger video chat with automatic ICE recovery",
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
    setStats({
      totalRepos: 2,
      activeReposCount: 1,
      staleReposCount: 1,
      currentStreak: 5,
      languageBreakdown: [
        { language: "TypeScript", count: 1, percentage: 50 },
        { language: "JavaScript", count: 1, percentage: 50 }
      ]
    });
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

  const staleRepos = repos.filter(repo => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return new Date(repo.updated_at) < thirtyDaysAgo;
  });

  return (
    <div className="flex flex-col h-full overflow-hidden text-foreground">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 shrink-0">
        <div className="flex items-center space-x-2">
          <GitBranch className="w-4 h-4 text-primary animate-pulse" />
          <h2 className="text-sm font-semibold tracking-wider uppercase text-secondary-foreground">GitHub Workspace</h2>
        </div>
        <form onSubmit={handleUpdateUser} className="flex items-center space-x-2">
          <Input
            value={inputUsername}
            onChange={(e) => setInputUsername(e.target.value)}
            placeholder="Username"
            className="h-7 w-28 text-xs bg-popover border-border text-foreground placeholder:text-muted-foreground py-0"
          />
          <Button size="icon" type="submit" variant="ghost" className="w-7 h-7 border border-border bg-popover/30" disabled={loading}>
            <RefreshCw className={`w-3.5 h-3.5 text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </form>
      </div>

      {showTips && (
        <div className="mb-3 p-3 bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-400 rounded-lg select-none leading-relaxed shrink-0">
          ⚡ **GitHub DevTools Tips**: Fetches real-time profile highlights, commit events stream, and active/stale state tracking directly from GitHub. Change username input to import and monitor other developer accounts!
        </div>
      )}

      {/* Highlights & Stats Banner */}
      {stats && (
        <div className="grid grid-cols-3 gap-2 mb-3 shrink-0">
          <div className="p-2 border border-border/60 bg-popover/20 rounded-lg flex items-center justify-between">
            <div className="min-w-0">
              <span className="text-[9px] uppercase tracking-wider text-muted-foreground block">Streak</span>
              <span className="text-xs font-bold font-mono">{stats.currentStreak} Days</span>
            </div>
            <Flame className={`w-4 h-4 ${stats.currentStreak > 0 ? "text-orange-500 fill-orange-500/20" : "text-muted-foreground"}`} />
          </div>
          <div className="p-2 border border-border/60 bg-popover/20 rounded-lg flex items-center justify-between">
            <div className="min-w-0">
              <span className="text-[9px] uppercase tracking-wider text-muted-foreground block">Active Repos</span>
              <span className="text-xs font-bold font-mono text-green-400">{stats.activeReposCount}</span>
            </div>
            <GitBranch className="w-4 h-4 text-green-400" />
          </div>
          <div className="p-2 border border-border/60 bg-popover/20 rounded-lg flex items-center justify-between">
            <div className="min-w-0">
              <span className="text-[9px] uppercase tracking-wider text-muted-foreground block">Stale Repos</span>
              <span className="text-xs font-bold font-mono text-yellow-400">{stats.staleReposCount}</span>
            </div>
            <AlertTriangle className="w-4 h-4 text-yellow-400" />
          </div>
        </div>
      )}

      {/* Main Content Areas split horizontally */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-hidden">
        {/* Left Column: Commits & Languages */}
        <div className="flex flex-col h-full overflow-hidden space-y-3">
          {/* Language Breakdown */}
          {stats && stats.languageBreakdown.length > 0 && (
            <div className="shrink-0 space-y-1.5">
              <div className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider flex items-center space-x-1.5">
                <PieChart className="w-3 h-3 text-primary" />
                <span>Language Share</span>
              </div>
              <div className="flex h-1.5 rounded-full overflow-hidden w-full bg-muted">
                {stats.languageBreakdown.slice(0, 4).map((lang, idx) => {
                  const colors = ["bg-primary", "bg-emerald-500", "bg-amber-500", "bg-indigo-500"];
                  return (
                    <div 
                      key={lang.language} 
                      className={`${colors[idx % colors.length]}`} 
                      style={{ width: `${lang.percentage}%` }}
                      title={`${lang.language}: ${lang.percentage}%`}
                    />
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-[9px] text-muted-foreground">
                {stats.languageBreakdown.slice(0, 4).map((lang, idx) => {
                  const dotColors = ["bg-primary", "bg-emerald-500", "bg-amber-500", "bg-indigo-500"];
                  return (
                    <div key={lang.language} className="flex items-center space-x-1">
                      <span className={`w-1.5 h-1.5 rounded-full ${dotColors[idx % dotColors.length]}`} />
                      <span className="font-bold text-foreground/80">{lang.language}</span>
                      <span>{lang.percentage}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider flex items-center space-x-1.5 shrink-0">
            <GitCommit className="w-3.5 h-3.5 text-primary animate-pulse" />
            <span>Activity Feed</span>
          </div>
          <ScrollArea className="flex-1 border border-border/80 bg-popover/20 rounded-lg p-3">
            <div className="space-y-3">
              {commits.length === 0 ? (
                <div className="text-center py-6 text-xs text-muted-foreground">No recent pushes detected.</div>
              ) : (
                commits.map((commit, i) => (
                  <div key={commit.sha + i} className="flex items-start space-x-2 border-b border-border/40 pb-2 last:border-0 last:pb-0">
                    <div className="mt-0.5 p-1 bg-primary/10 rounded shrink-0">
                      <GitCommit className="w-3 h-3 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-foreground truncate">{commit.repoName}</span>
                        <a href={commit.url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary hover:underline font-mono">
                          {commit.sha}
                        </a>
                      </div>
                      <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{commit.message}</p>
                      <span className="text-[9px] text-muted-foreground/60">{getRelativeTime(commit.date)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Right Column: Repositories */}
        <div className="flex flex-col h-full overflow-hidden space-y-3">
          <div className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider flex items-center space-x-1.5 shrink-0">
            <GitBranch className="w-3.5 h-3.5 text-primary" />
            <span>Repositiories</span>
          </div>
          <ScrollArea className="flex-1 border border-border/80 bg-popover/20 rounded-lg p-3">
            <div className="space-y-2.5">
              {staleRepos.length > 0 && (
                <div className="p-2 bg-yellow-500/10 border border-yellow-500/20 rounded text-[10px] text-yellow-400 space-y-1">
                  <div className="flex items-center space-x-1 font-semibold">
                    <AlertTriangle className="w-3 h-3" />
                    <span>{staleRepos.length} Stale Repositories Detected</span>
                  </div>
                  <p className="text-[9px] text-muted-foreground/80">No commits in over 30 days. Action recommended.</p>
                </div>
              )}

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
                          <Badge variant="outline" className="text-[8px] bg-yellow-500/10 text-yellow-400 border-yellow-500/20 uppercase shrink-0 py-0">stale</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[8px] bg-emerald-500/10 text-emerald-400 border-emerald-500/20 uppercase shrink-0 py-0">active</Badge>
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
                        <span>Last Commit: {getRelativeTime(repo.updated_at)}</span>
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
