"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { GitCommit, GitBranch, RefreshCw, Star, ExternalLink } from "lucide-react";
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
          <GitBranch className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold tracking-tight text-foreground">GitHub Activity</h2>
        </div>
        <form onSubmit={handleUpdateUser} className="flex items-center space-x-1.5">
          <Input
            value={inputUsername}
            onChange={(e) => setInputUsername(e.target.value)}
            placeholder="Username"
            className="h-6 w-24 text-xs bg-popover border-border text-foreground placeholder:text-muted-foreground"
          />
          <Button size="icon" type="submit" variant="ghost" className="w-6 h-6 border border-border" disabled={loading}>
            <RefreshCw className={`w-3 h-3 text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </form>
      </div>

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-3 gap-1.5 mb-3 shrink-0">
          <div className="p-2 border border-border bg-card rounded text-center">
            <div className="text-[8px] uppercase font-bold text-muted-foreground">Streak</div>
            <div className="text-xs font-mono font-semibold text-foreground">{stats.currentStreak}d</div>
          </div>
          <div className="p-2 border border-border bg-card rounded text-center">
            <div className="text-[8px] uppercase font-bold text-muted-foreground">Active</div>
            <div className="text-xs font-mono font-semibold text-foreground">{stats.activeReposCount}</div>
          </div>
          <div className="p-2 border border-border bg-card rounded text-center">
            <div className="text-[8px] uppercase font-bold text-muted-foreground">Stale</div>
            <div className="text-xs font-mono font-semibold text-foreground">{stats.staleReposCount}</div>
          </div>
        </div>
      )}

      {/* Main Content Areas */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3 overflow-hidden">
        {/* Left Column: Commits & Languages */}
        <div className="flex flex-col h-full overflow-hidden space-y-2">
          {/* Language Breakdown */}
          {stats && stats.languageBreakdown.length > 0 && (
            <div className="shrink-0 space-y-1">
              <div className="text-[9px] font-bold uppercase text-muted-foreground tracking-wider">Languages</div>
              <div className="flex h-1 rounded overflow-hidden w-full bg-border">
                {stats.languageBreakdown.slice(0, 4).map((lang, idx) => {
                  const colors = ["bg-primary", "bg-slate-400", "bg-slate-500", "bg-slate-600"];
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
              <div className="flex flex-wrap gap-2 text-[8px] text-muted-foreground">
                {stats.languageBreakdown.slice(0, 4).map((lang) => (
                  <div key={lang.language}>
                    <span className="font-mono">{lang.language}</span> {lang.percentage}%
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="text-[9px] font-bold uppercase text-muted-foreground tracking-wider shrink-0">Activity</div>
          <ScrollArea className="flex-1 border border-border bg-popover rounded p-2">
            <div className="space-y-2">
              {commits.length === 0 ? (
                <div className="text-center py-4 text-[9px] text-muted-foreground">No recent activity</div>
              ) : (
                commits.map((commit, i) => (
                  <div key={commit.sha + i} className="flex items-start space-x-1.5 text-[9px] pb-1.5 border-b border-border/30 last:border-0">
                    <div className="mt-0.5 p-1 bg-primary/10 rounded shrink-0">
                      <GitCommit className="w-2.5 h-2.5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-semibold text-foreground truncate">{commit.repoName}</span>
                        <a href={commit.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-mono shrink-0">
                          {commit.sha.slice(0, 6)}
                        </a>
                      </div>
                      <p className="text-muted-foreground line-clamp-1">{commit.message}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Right Column: Repositories */}
        <div className="flex flex-col h-full overflow-hidden space-y-2">
          <div className="text-[9px] font-bold uppercase text-muted-foreground tracking-wider shrink-0">Repositories</div>
          <ScrollArea className="flex-1 border border-border bg-popover rounded p-2">
            <div className="space-y-1.5">
              {repos.length === 0 ? (
                <div className="text-center py-4 text-[9px] text-muted-foreground">No repositories</div>
              ) : (
                repos.map((repo) => {
                  const isStale = new Date(repo.updated_at) < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
                  return (
                    <div key={repo.id} className="p-1.5 border border-border bg-popover rounded text-[8px]">
                      <div className="flex items-start justify-between gap-1">
                        <a href={repo.html_url} target="_blank" rel="noopener noreferrer" className="font-semibold text-foreground hover:text-primary truncate flex items-center gap-1">
                          {repo.name}
                          <ExternalLink className="w-2 h-2 opacity-40 shrink-0" />
                        </a>
                        <Badge variant="outline" className={`text-[7px] uppercase shrink-0 ${isStale ? 'bg-border text-muted-foreground' : 'bg-primary/10 text-primary'}`}>
                          {isStale ? 'stale' : 'active'}
                        </Badge>
                      </div>
                      {repo.description && (
                        <p className="text-muted-foreground line-clamp-1 mt-0.5">{repo.description}</p>
                      )}
                      <div className="flex items-center justify-between mt-1 text-muted-foreground opacity-70">
                        <div className="flex items-center gap-2">
                          {repo.language && <span>{repo.language}</span>}
                          <span className="flex items-center gap-0.5">
                            <Star className="w-2 h-2" />
                            {repo.stargazers_count}
                          </span>
                        </div>
                        <span>{getRelativeTime(repo.updated_at)}</span>
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
