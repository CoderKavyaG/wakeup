"use client";

import React, { useEffect, useState } from "react";
import { useProjectIntelligenceStore, ProjectIntelligence, ProjectGrouping } from "@/store/useProjectIntelligenceStore";
import { useProjectStore } from "@/store/useProjectStore";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertCircle,
  Target,
  TrendingUp,
  RefreshCw,
  Zap,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Lightbulb,
} from "lucide-react";

export function ProjectIntelligenceWidget() {
  const { projectIntelligence, projectGroupings, loading, refreshProjectIntelligence } =
    useProjectIntelligenceStore();
  const { projects } = useProjectStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      refreshProjectIntelligence();
      const interval = setInterval(refreshProjectIntelligence, 120000); // Refresh every 2 minutes
      return () => clearInterval(interval);
    }
  }, [mounted, refreshProjectIntelligence]);

  if (!mounted) return null;

  const getActionIcon = (action: string) => {
    switch (action) {
      case "focus":
        return <Target className="w-3 h-3 text-primary" />;
      case "resume":
        return <Zap className="w-3 h-3 text-orange-400" />;
      case "maintain":
        return <CheckCircle2 className="w-3 h-3 text-green-400" />;
      case "defer":
        return <Clock className="w-3 h-3 text-muted-foreground" />;
      case "review":
        return <AlertCircle className="w-3 h-3 text-yellow-400" />;
      default:
        return <AlertTriangle className="w-3 h-3" />;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-400";
    if (score >= 60) return "text-primary";
    if (score >= 40) return "text-yellow-400";
    return "text-red-400";
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case "focus":
        return "bg-primary/10 border-primary/20";
      case "resume":
        return "bg-orange-500/10 border-orange-500/20";
      case "maintain":
        return "bg-green-500/10 border-green-500/20";
      case "defer":
        return "bg-border";
      case "review":
        return "bg-yellow-500/10 border-yellow-500/20";
      default:
        return "bg-popover border-border";
    }
  };

  const nextFocus = Array.from(projectIntelligence.values())
    .sort((a, b) => b.scores.priority - a.scores.priority)[0];

  return (
    <div className="flex flex-col h-full overflow-hidden text-foreground">
      {/* Header */}
      <div className="flex items-center justify-between mb-2 shrink-0">
        <div className="flex items-center space-x-2">
          <Lightbulb className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold tracking-tight text-foreground">Project Intelligence</h2>
        </div>
        <button
          onClick={() => refreshProjectIntelligence()}
          className="text-muted-foreground hover:text-foreground transition-colors p-1"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-primary" : ""}`} />
        </button>
      </div>

      <ScrollArea className="flex-1 -mx-2 px-2">
        <div className="space-y-2 pb-2">
          {/* Next Focus Section */}
          {nextFocus && (
            <div className="p-2 border border-primary/20 bg-primary/5 rounded space-y-1 shrink-0">
              <div className="flex items-center justify-between">
                <span className="text-[8px] font-bold text-muted-foreground uppercase">Next Focus</span>
                <Badge className="text-[7px] bg-primary/20 text-primary">{nextFocus.scores.priority}%</Badge>
              </div>
              <div className="text-xs font-semibold text-foreground truncate">{nextFocus.projectName}</div>
              <div className="flex items-start gap-1.5 p-1.5 bg-popover rounded border border-border text-[7.5px]">
                {getActionIcon(nextFocus.recommendation.action)}
                <div className="flex-1">
                  <div className="font-semibold text-foreground capitalize">{nextFocus.recommendation.action}</div>
                  <div className="text-muted-foreground line-clamp-2">{nextFocus.recommendation.suggestedNextStep}</div>
                </div>
              </div>
            </div>
          )}

          {/* Project Groupings */}
          {projectGroupings.length > 0 && (
            <>
              <div className="text-[8px] font-bold text-muted-foreground uppercase px-1 sticky top-0 bg-background/80">
                Groupings
              </div>
              {projectGroupings.map((group) => (
                <div key={group.label} className="p-1.5 border border-border bg-card rounded space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[8px] font-semibold text-foreground">{group.label}</span>
                    <Badge variant="outline" className="text-[7px] bg-popover">
                      {group.projectIds.length}
                    </Badge>
                  </div>
                  <div className="space-y-0.5">
                    {group.recommendedOrder.slice(0, 3).map((projectId) => {
                      const pi = projectIntelligence.get(projectId);
                      if (!pi) return null;
                      return (
                        <div key={projectId} className="flex items-center justify-between text-[7px] p-1 bg-popover rounded border border-border/50">
                          <span className="font-mono text-muted-foreground truncate flex-1">{pi.projectName}</span>
                          <div className="flex items-center gap-1 shrink-0">
                            <div className={`text-[10px] font-bold ${getScoreColor(pi.scores.priority)}`}>
                              {pi.scores.priority}
                            </div>
                            {getActionIcon(pi.recommendation.action)}
                          </div>
                        </div>
                      );
                    })}
                    {group.projectIds.length > 3 && (
                      <div className="text-[7px] text-muted-foreground px-1 py-0.5">
                        +{group.projectIds.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </>
          )}

          {/* Individual Project Cards */}
          {projectIntelligence.size > 0 && (
            <>
              <div className="text-[8px] font-bold text-muted-foreground uppercase px-1 sticky top-0 bg-background/80">
                All Projects
              </div>
              {Array.from(projectIntelligence.values())
                .sort((a, b) => b.scores.priority - a.scores.priority)
                .slice(0, 5)
                .map((pi) => (
                  <div key={pi.projectId} className={`p-1.5 border rounded space-y-1 text-[7px] ${getActionColor(pi.recommendation.action)}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 flex-1 min-w-0">
                        {getActionIcon(pi.recommendation.action)}
                        <span className="font-semibold text-foreground truncate">{pi.projectName}</span>
                      </div>
                      <div className={`font-bold ${getScoreColor(pi.scores.priority)}`}>
                        {pi.scores.priority}%
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-0.5 text-muted-foreground">
                      <div className="text-center">
                        <div className="font-bold text-foreground">{pi.scores.health}</div>
                        <div>Health</div>
                      </div>
                      <div className="text-center">
                        <div className="font-bold text-foreground">{pi.scores.urgency}</div>
                        <div>Urgent</div>
                      </div>
                      <div className="text-center">
                        <div className="font-bold text-foreground">{pi.scores.momentum}</div>
                        <div>Moment</div>
                      </div>
                      <div className="text-center">
                        <div className="font-bold text-foreground">{pi.scores.stalenessDays}d</div>
                        <div>Stale</div>
                      </div>
                    </div>
                    {pi.riskFactors.length > 0 && (
                      <div className="flex flex-wrap gap-0.5">
                        {pi.riskFactors.slice(0, 2).map((risk) => (
                          <Badge key={risk} variant="outline" className="text-[6px] bg-red-500/5 text-red-400 border-red-500/20">
                            {risk}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
