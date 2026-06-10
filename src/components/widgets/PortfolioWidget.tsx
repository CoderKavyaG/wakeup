"use client";

import React, { useState, useEffect } from "react";
import { useBootstrapStore } from "@/store/useBootstrapStore";
import { useProjectStore } from "@/store/useProjectStore";
import {
  Globe,
  TrendingUp,
  TrendingDown,
  ExternalLink,
  RefreshCw,
  GitBranch,
  AlertCircle,
  BarChart2,
  Plus,
} from "lucide-react";

interface PortfolioAnalytics {
  thisWeek: number;
  lastWeek: number;
  uniqueVisitors: number;
  topPages: Array<{ path: string; views: number }>;
}

// Shimmer skeleton
function Shimmer({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-white/[0.04] rounded-md ${className}`} />
  );
}

export function PortfolioWidget() {
  const vercel = useBootstrapStore((s) => s.vercel);
  const projects = useProjectStore((s) => s.projects);

  const [analytics, setAnalytics] = useState<PortfolioAnalytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [lastDeploy, setLastDeploy] = useState<any>(null);
  const [unlistedProjects, setUnlistedProjects] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Find the portfolio Vercel project by matching name containing "coderkavyag" or "portfolio"
  const portfolioVercelProject = vercel?.projects?.find((vp: any) => {
    const n = (vp.name || "").toLowerCase();
    return (
      n.includes("coderkavyag") ||
      n.includes("portfolio") ||
      n.includes("kavya")
    );
  });

  const portfolioId = portfolioVercelProject?.id;

  // Find last deployment for portfolio project
  useEffect(() => {
    if (!vercel?.deployments || !portfolioVercelProject) return;
    const deploy = vercel.deployments.find((d: any) => {
      const proj = (d.name || d.meta?.githubCommitRef || "").toLowerCase();
      return (
        proj.includes("coderkavyag") ||
        proj.includes("portfolio") ||
        d.projectId === portfolioId
      );
    });
    setLastDeploy(deploy || null);
  }, [vercel, portfolioVercelProject]);

  const fetchAnalytics = async () => {
    if (!portfolioId) return;
    setAnalyticsLoading(true);
    setAnalyticsError(null);
    try {
      const [thisWeekRes, lastWeekRes] = await Promise.all([
        fetch(`/api/vercel?type=analytics&projectId=${portfolioId}&period=week`),
        fetch(`/api/vercel?type=analytics&projectId=${portfolioId}&period=lastweek`),
      ]);
      const thisWeekData = await thisWeekRes.json();
      const lastWeekData = await lastWeekRes.json();

      const thisWeekVisits =
        (thisWeekData.data || []).reduce(
          (a: number, d: any) => a + (d.visits ?? d.views ?? 0),
          0
        ) as number;
      const lastWeekVisits =
        (lastWeekData.data || []).reduce(
          (a: number, d: any) => a + (d.visits ?? d.views ?? 0),
          0
        ) as number;

      // Top pages from path analytics
      const topPages: Array<{ path: string; views: number }> = [];
      if (thisWeekData.topPaths) {
        thisWeekData.topPaths.slice(0, 5).forEach((p: any) => {
          topPages.push({ path: p.path || p.key, views: p.visits ?? p.count ?? 0 });
        });
      }

      setAnalytics({
        thisWeek: thisWeekVisits,
        lastWeek: lastWeekVisits,
        uniqueVisitors: thisWeekData.uniqueVisitors ?? 0,
        topPages,
      });
    } catch (e: any) {
      setAnalyticsError("Failed to load analytics");
    } finally {
      setAnalyticsLoading(false);
    }
  };

  // Compute unlisted projects: DevOS projects not on Vercel portfolio
  useEffect(() => {
    if (!vercel?.projects || !projects.length) return;
    // Use Vercel project names as the "portfolio" source since portfolio repo is private
    const vercelNames = new Set(
      vercel.projects.map((vp: any) => vp.name.toLowerCase().replace(/[-_]/g, ""))
    );
    const unlisted = projects
      .filter((p) => {
        if (!p.githubUrl) return false; // skip local-only
        const normalized = p.name.toLowerCase().replace(/[-_\s]/g, "");
        return !vercelNames.has(normalized);
      })
      .map((p) => p.name)
      .slice(0, 5);
    setUnlistedProjects(unlisted);
  }, [projects, vercel]);

  useEffect(() => {
    fetchAnalytics();
  }, [portfolioId]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAnalytics();
    setRefreshing(false);
  };

  const weekChange =
    analytics && analytics.lastWeek > 0
      ? Math.round(
          ((analytics.thisWeek - analytics.lastWeek) / analytics.lastWeek) * 100
        )
      : null;
  const isUp = weekChange !== null && weekChange >= 0;
  const deployState = lastDeploy?.state?.toUpperCase();

  if (!vercel?.hasToken) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3 p-6">
        <div className="w-10 h-10 rounded-full bg-white/[0.04] flex items-center justify-center">
          <Globe className="w-5 h-5 text-white/30" />
        </div>
        <div className="text-xs text-white/40 text-center leading-relaxed">
          Connect Vercel to track <span className="text-white/60 font-mono">coderkavyag.me</span>
        </div>
        <button
          className="bg-white/[0.06] border border-white/[0.08] text-white/70 text-xs px-3 py-1.5 rounded-md hover:bg-white/10 transition-colors"
          onClick={() =>
            window.dispatchEvent(
              new CustomEvent("open_integrations_settings")
            )
          }
        >
          Configure Integrations →
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden text-foreground bg-[#0f0f11]">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-blue-400" />
          <h2 className="text-sm font-semibold tracking-tight">
            coderkavyag.me
          </h2>
          {deployState && (
            <span
              className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase border ${
                deployState === "READY"
                  ? "bg-green-500/10 text-green-400/80 border-green-500/20"
                  : deployState === "ERROR"
                  ? "bg-red-500/10 text-red-400/80 border-red-500/20"
                  : deployState === "BUILDING"
                  ? "bg-amber-500/10 text-amber-400/80 border-amber-500/20 animate-pulse"
                  : "bg-white/5 text-white/30 border-white/10"
              }`}
            >
              {deployState}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing || analyticsLoading}
            className="text-white/30 hover:text-white/70 transition-colors p-1 rounded disabled:opacity-30"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
          </button>
          <a
            href="https://coderkavyag.me"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/30 hover:text-white/70 transition-colors p-1 rounded"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.06) transparent" }}>
        {/* Analytics Cards */}
        {!portfolioId ? (
          <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
            <p className="text-[11px] text-amber-400/80">
              ⚠ No Vercel project matched for coderkavyag.me. Link it in the Projects widget → Control Room.
            </p>
          </div>
        ) : analyticsLoading ? (
          <div className="space-y-2">
            <Shimmer className="h-16" />
            <div className="grid grid-cols-2 gap-2">
              <Shimmer className="h-12" />
              <Shimmer className="h-12" />
            </div>
          </div>
        ) : analyticsError ? (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/5 border border-red-500/20">
            <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
            <span className="text-xs text-red-400/80">{analyticsError}</span>
          </div>
        ) : analytics ? (
          <>
            {/* Visit stats */}
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[9px] font-bold uppercase text-white/25 tracking-widest mb-1">
                    Visits This Week
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold font-mono text-white">
                      {analytics.thisWeek.toLocaleString()}
                    </span>
                    {weekChange !== null && (
                      <span
                        className={`text-xs font-bold flex items-center gap-0.5 ${
                          isUp ? "text-green-400" : "text-red-400"
                        }`}
                      >
                        {isUp ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : (
                          <TrendingDown className="w-3 h-3" />
                        )}
                        {Math.abs(weekChange)}%
                      </span>
                    )}
                  </div>
                </div>
                <BarChart2 className="w-8 h-8 text-white/10" />
              </div>
            </div>

            {/* Stat grid */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                <p className="text-[9px] font-bold uppercase text-white/25 tracking-widest mb-1">
                  Last Week
                </p>
                <span className="text-lg font-bold font-mono text-white/60">
                  {analytics.lastWeek.toLocaleString()}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                <p className="text-[9px] font-bold uppercase text-white/25 tracking-widest mb-1">
                  Unique Visitors
                </p>
                <span className="text-lg font-bold font-mono text-white/60">
                  {analytics.uniqueVisitors.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Top Pages */}
            {analytics.topPages.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-white/25 font-medium tracking-wider uppercase">
                    top pages
                  </span>
                  <div className="flex-1 h-px bg-white/[0.04]" />
                </div>
                {analytics.topPages.map((page) => (
                  <div
                    key={page.path}
                    className="flex items-center justify-between py-1"
                  >
                    <span className="text-xs font-mono text-white/50 truncate pr-2">
                      {page.path}
                    </span>
                    <span className="text-xs font-mono text-white/30 shrink-0">
                      {page.views}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : null}

        {/* Deployment Info */}
        {lastDeploy && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-white/25 font-medium tracking-wider uppercase">
                last deploy
              </span>
              <div className="flex-1 h-px bg-white/[0.04]" />
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.05]">
              <div
                className={`w-2 h-2 rounded-full shrink-0 shadow-sm ${
                  deployState === "READY"
                    ? "bg-green-400 shadow-green-400/50"
                    : deployState === "ERROR"
                    ? "bg-red-400 shadow-red-400/50"
                    : deployState === "BUILDING"
                    ? "bg-amber-400 shadow-amber-400/50 animate-pulse"
                    : "bg-zinc-500"
                }`}
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-white/60 truncate">
                  {lastDeploy.meta?.githubCommitMessage || lastDeploy.name || "Manual deploy"}
                </p>
                <p className="text-[10px] font-mono text-white/25">
                  {lastDeploy.meta?.githubCommitRef || "main"} ·{" "}
                  {Math.floor(
                    (Date.now() - (lastDeploy.createdAt || lastDeploy.created)) /
                      (1000 * 60 * 60)
                  )}h ago
                </p>
              </div>
              {lastDeploy.url && (
                <a
                  href={`https://${lastDeploy.url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/20 hover:text-white/60 transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        )}

        {/* Unlisted Projects */}
        {unlistedProjects.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-white/25 font-medium tracking-wider uppercase">
                not on portfolio
              </span>
              <div className="flex-1 h-px bg-white/[0.04]" />
            </div>
            <div className="space-y-1">
              {unlistedProjects.map((name) => (
                <div
                  key={name}
                  className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <GitBranch className="w-3 h-3 text-white/20" />
                    <span className="text-xs text-white/50">{name}</span>
                  </div>
                  <a
                    href="https://github.com/coderkavyag/coderkavyag.me"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[11px] text-purple-400/70 hover:text-purple-300 transition-colors font-medium"
                  >
                    <Plus className="w-3 h-3" />
                    Add
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
