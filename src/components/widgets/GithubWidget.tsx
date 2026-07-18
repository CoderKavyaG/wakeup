"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { GitCommit, GitBranch, RefreshCw, Star, ExternalLink, Settings, AlertCircle } from "lucide-react";
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
  open_issues_count: number;
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
  totalContributions: number;
  languageBreakdown: LanguageShare[];
}

export function GithubWidget() {
  const { showTips } = useLayoutStore();
  const [username, setUsername] = useState("coderkavyag");
  const [inputUsername, setInputUsername] = useState("coderkavyag");
  const [token, setToken] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [repos, setRepos] = useState<Repository[]>([]);
  const [commits, setCommits] = useState<Commit[]>([]);
  const [stats, setStats] = useState<GithubStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [hasServerToken, setHasServerToken] = useState(false);

  useEffect(() => {
    const loadUserStatus = async () => {
      try {
        const res = await fetch("/api/user/me");
        if (res.ok) {
          const data = await res.json();
          setHasServerToken(data.hasGithubToken);
          if (data.githubUsername) {
            setUsername(data.githubUsername);
            setInputUsername(data.githubUsername);
            localStorage.setItem("GITHUB_USERNAME", data.githubUsername);
          }
        }
      } catch (err) {
        console.error("Error loading user profile status:", err);
      }
    };
    loadUserStatus();
  }, []);

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
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to load GitHub data from DevOS backend");
      }
      const data = await res.json();
      
      setRepos(data.repos || []);
      setCommits(data.commits || []);
      setStats(data.stats || null);
    } catch (err: any) {
      setError(err.message || "An error occurred");
      setStats(null);
      setRepos([]);
      setCommits([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGithubData(username);
  }, [username]);

  const handleUpdateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputUsername.trim()) {
      const newUser = inputUsername.trim();
      setUsername(newUser);
      localStorage.setItem("GITHUB_USERNAME", newUser);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      if (token) {
        const res = await fetch("/api/auth/github-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, username }),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "Failed to save token to database");
        }
        setHasServerToken(true);
        setToken(""); // Clear plaintext local state token
      }
      localStorage.setItem("GITHUB_USERNAME", username);
      setShowSettings(false);
      fetchGithubData(username);
    } catch (err: any) {
      setError(err.message || "Failed to save token");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteToken = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/auth/github-token", { method: "DELETE" });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to disconnect token");
      }
      setHasServerToken(false);
      setToken("");
      setShowSettings(false);
      fetchGithubData(username);
    } catch (err: any) {
      setError(err.message || "Failed to disconnect token");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden text-foreground px-4 py-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 shrink-0">
        <div className="flex items-center space-x-2">
          <GitBranch className="w-4 h-4 text-amber-400" />
          <h2 className="text-sm font-semibold tracking-tight text-white">GitHub Activity</h2>
        </div>
        <div className="flex items-center space-x-1.5">
          <Button 
            id="github-widget-settings-btn"
            size="icon" 
            variant="ghost" 
            className="w-6 h-6 text-white/40 hover:text-white hover:bg-white/5" 
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings className="w-3.5 h-3.5" />
          </Button>
          <form onSubmit={handleUpdateUser} className="flex items-center space-x-1.5">
            <Input
              value={inputUsername}
              onChange={(e) => setInputUsername(e.target.value)}
              placeholder="Username"
              className="h-6 w-24 text-xs bg-white/[0.03] border-white/[0.08] text-white placeholder:text-white/20"
            />
            <Button size="icon" type="submit" variant="ghost" className="w-6 h-6 border border-white/10 hover:bg-white/5" disabled={loading}>
              <RefreshCw className={`w-3 h-3 text-white/50 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </form>
        </div>
      </div>

      {showSettings && (
        <div className="mb-3 p-3 bg-white/[0.02] border border-white/[0.06] rounded-lg shrink-0 flex flex-col gap-2">
          <p className="text-[10px] font-semibold text-white/40 uppercase">GitHub Access Token (PAT)</p>
          <div className="flex gap-2">
            <Input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder={hasServerToken ? "•••••••••••••••• (Configured)" : "ghp_..."}
              className="h-7 text-xs flex-1 bg-white/[0.03] border-white/[0.08] text-white placeholder:text-white/20"
            />
            <Button size="sm" onClick={handleSaveSettings} className="h-7 text-xs bg-white text-black hover:bg-white/90">Save</Button>
            {hasServerToken && (
              <Button size="sm" variant="destructive" onClick={handleDeleteToken} className="h-7 text-xs bg-red-500 hover:bg-red-600 text-white">Disconnect</Button>
            )}
          </div>
          <p className="text-[9px] text-white/30">Stored securely in your encrypted database. Required for commits & streaks.</p>
        </div>
      )}

      {error && (
        <div className="mb-3 p-2 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center space-x-2 shrink-0">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <p className="text-[10px] text-red-400 font-medium break-all">{error}</p>
        </div>
      )}

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-4 gap-1.5 mb-3 shrink-0">
          <div className="p-2 border border-white/[0.06] bg-white/[0.01] rounded text-center flex flex-col justify-center">
            <div className="text-[8px] uppercase font-bold text-white/30">Streak</div>
            <div className="text-xs font-mono font-semibold text-amber-400">{stats.currentStreak}d</div>
          </div>
          <div className="p-2 border border-white/[0.06] bg-white/[0.01] rounded text-center flex flex-col justify-center">
            <div className="text-[8px] uppercase font-bold text-white/30">Contribs</div>
            <div className="text-xs font-mono font-semibold text-white/80">{stats.totalContributions}</div>
          </div>
          <div className="p-2 border border-white/[0.06] bg-white/[0.01] rounded text-center flex flex-col justify-center">
            <div className="text-[8px] uppercase font-bold text-white/30">Active</div>
            <div className="text-xs font-mono font-semibold text-white/80">{stats.activeReposCount}</div>
          </div>
          <div className="p-2 border border-white/[0.06] bg-white/[0.01] rounded text-center flex flex-col justify-center">
            <div className="text-[8px] uppercase font-bold text-white/30">Stale</div>
            <div className="text-xs font-mono font-semibold text-amber-400">{stats.staleReposCount}</div>
          </div>
        </div>
      )}

      {/* Main Content Areas */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3 overflow-hidden min-h-0">
        {/* Left Column: Commits & Languages */}
        <div className="flex flex-col h-full overflow-hidden space-y-2">
          {/* Language Breakdown */}
          {stats && stats.languageBreakdown.length > 0 && (
            <div className="shrink-0 space-y-1">
              <div className="flex items-center justify-between pb-1 border-b border-white/[0.04] mb-1">
                <span className="text-[10px] font-medium text-white/40 tracking-wider lowercase">languages</span>
              </div>
              <div className="flex h-1.5 rounded overflow-hidden w-full bg-white/[0.04]">
                {stats.languageBreakdown.slice(0, 4).map((lang, idx) => {
                  const colors = ["bg-amber-500", "bg-zinc-400", "bg-zinc-500", "bg-zinc-600"];
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
              <div className="flex flex-wrap gap-2 text-[8px] text-white/30">
                {stats.languageBreakdown.slice(0, 4).map((lang) => (
                  <div key={lang.language}>
                    <span className="font-mono text-white/50">{lang.language}</span> {lang.percentage}%
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pb-1 border-b border-white/[0.04] mb-1.5 shrink-0 mt-2">
            <span className="text-[10px] font-medium text-white/40 tracking-wider lowercase">latest commits</span>
          </div>
          <ScrollArea className="flex-1 border border-white/[0.06] bg-white/[0.01] rounded p-2 min-h-0 h-full w-full overflow-y-auto">
            <div className="space-y-2">
              {commits.length === 0 ? (
                <div className="text-center py-4 text-[9px] text-muted-foreground">No recent activity</div>
              ) : (
                commits.map((commit, i) => (
                  <div key={commit.sha + i} className="flex items-start space-x-1.5 text-[9px] pb-1.5 border-b border-white/[0.04] last:border-0">
                    <div className="mt-0.5 p-1 bg-amber-500/10 rounded shrink-0">
                      <GitCommit className="w-2.5 h-2.5 text-amber-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-semibold text-foreground truncate">{commit.repoName}</span>
                        <a href={commit.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-mono shrink-0">
                          {commit.sha.slice(0, 6)}
                        </a>
                      </div>
                      <p className="text-muted-foreground line-clamp-2 mt-0.5">{commit.message}</p>
                      <p className="text-[8px] text-muted-foreground/60 font-mono mt-0.5">{getRelativeTime(commit.date)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Right Column: Repositories */}
        <div className="flex flex-col h-full overflow-hidden space-y-2">
          <div className="flex items-center justify-between pb-1 border-b border-white/[0.04] mb-1.5 shrink-0">
            <span className="text-[10px] font-medium text-white/40 tracking-wider lowercase">repositories</span>
          </div>
          <ScrollArea className="flex-1 border border-white/[0.06] bg-white/[0.01] rounded p-2 min-h-0 h-full w-full overflow-y-auto">
            <div className="space-y-1.5">
              {repos.length === 0 ? (
                <div className="text-center py-4 text-[9px] text-muted-foreground">No repositories</div>
              ) : (
                repos.map((repo) => {
                  const isStale = new Date(repo.updated_at) < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
                  return (
                    <div key={repo.id} className="p-2 border border-white/[0.06] bg-white/[0.01] rounded flex flex-col justify-between gap-1">
                      <div className="flex items-start justify-between gap-1">
                        <a href={repo.html_url} target="_blank" rel="noopener noreferrer" className="font-bold text-xs text-white hover:text-amber-400 truncate flex items-center gap-1">
                          {repo.name}
                          <ExternalLink className="w-3 h-3 opacity-40 shrink-0" />
                        </a>
                        <div className="flex items-center gap-1 shrink-0">
                          {repo.open_issues_count > 0 && (
                            <Badge variant="outline" className="text-[7px] uppercase bg-red-400/10 text-red-400 border-red-400/20 px-1 py-0 h-4 rounded font-medium">
                              {repo.open_issues_count} Iss
                            </Badge>
                          )}
                          <Badge variant="outline" className={`text-[7px] uppercase px-1 py-0 h-4 rounded font-medium ${isStale ? 'bg-white/5 text-white/40 border border-white/10' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                            {isStale ? 'stale' : 'active'}
                          </Badge>
                        </div>
                      </div>
                      {repo.description && (
                         <p className="text-[10px] text-muted-foreground line-clamp-1">{repo.description}</p>
                      )}
                      <div className="flex items-center justify-between mt-1 text-[9px] text-muted-foreground opacity-80 font-mono">
                        <div className="flex items-center gap-2">
                          {repo.language && <span>{repo.language}</span>}
                          <span className="flex items-center gap-0.5">
                            <Star className="w-2.5 h-2.5" />
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
