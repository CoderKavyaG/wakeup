"use client";

import React, { useEffect, useState } from "react";
import { useMissionControlStore, WorkflowInsight } from "@/store/useMissionControlStore";
import { useCognitiveStore } from "@/store/useCognitiveStore";
import { useProjectStore } from "@/store/useProjectStore";
import { useTaskStore } from "@/store/useTaskStore";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertCircle,
  Zap,
  Target,
  TrendingUp,
  RefreshCw,
  Lightbulb,
  Focus,
  BarChart3,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Brain,
  Send,
} from "lucide-react";

export function MissionControlWidget() {
  const { insights, context, recommendations, systemHealth, loading, refreshIntelligence } =
    useMissionControlStore();
  const { briefing, loading: briefingLoading, generateBriefing } = useCognitiveStore();
  const { projects } = useProjectStore();
  const { tasks } = useTaskStore();
  const [mounted, setMounted] = useState(false);
  const [commandInput, setCommandInput] = useState("");
  const [commandResult, setCommandResult] = useState("");
  const [commandLoading, setCommandLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      refreshIntelligence();
      generateBriefing(); // Generate briefing on load
      const interval = setInterval(refreshIntelligence, 60000); // Refresh every minute
      return () => clearInterval(interval);
    }
  }, [mounted, refreshIntelligence, generateBriefing]);

  if (!mounted) return null;

  const handleCommand = async () => {
    if (!commandInput.trim()) return;
    
    setCommandLoading(true);
    try {
      const response = await fetch("/api/commands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: commandInput }),
      });
      const data = await response.json();
      setCommandResult(data.result || "No result");
      setCommandInput("");
    } catch (err) {
      setCommandResult("Command failed");
    } finally {
      setCommandLoading(false);
    }
  };

  const getPhaseIcon = (phase: string) => {
    switch (phase) {
      case "planning":
        return <Target className="w-3.5 h-3.5" />;
      case "active-coding":
        return <Zap className="w-3.5 h-3.5" />;
      case "review":
        return <AlertCircle className="w-3.5 h-3.5" />;
      case "deployment":
        return <TrendingUp className="w-3.5 h-3.5" />;
      default:
        return <Clock className="w-3.5 h-3.5" />;
    }
  };

  const getInsightIcon = (category: string) => {
    switch (category) {
      case "alert":
        return <AlertTriangle className="w-3.5 h-3.5 text-red-400" />;
      case "opportunity":
        return <Lightbulb className="w-3.5 h-3.5 text-primary" />;
      case "focus":
        return <Focus className="w-3.5 h-3.5 text-primary" />;
      case "momentum":
        return <TrendingUp className="w-3.5 h-3.5 text-green-400" />;
      default:
        return <BarChart3 className="w-3.5 h-3.5 text-muted-foreground" />;
    }
  };

  const getInsightColor = (category: string) => {
    switch (category) {
      case "alert":
        return "bg-red-500/10 border-red-500/20";
      case "opportunity":
        return "bg-primary/5 border-primary/20";
      case "focus":
        return "bg-primary/10 border-primary/20";
      case "momentum":
        return "bg-green-500/10 border-green-500/20";
      default:
        return "bg-popover border-border";
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden text-foreground">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 shrink-0">
        <div className="flex items-center space-x-2">
          <BarChart3 className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold tracking-tight text-foreground">Intelligence</h2>
        </div>
        <button
          onClick={() => refreshIntelligence()}
          className="text-muted-foreground hover:text-foreground transition-colors p-1"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-primary" : ""}`} />
        </button>
      </div>

      {/* Current Phase & Metrics */}
      <div className="grid grid-cols-2 gap-2 mb-3 shrink-0">
        {/* Phase */}
        <div className="p-2 border border-border bg-card rounded flex items-center gap-2">
          <div className="text-primary">{getPhaseIcon(context.currentPhase)}</div>
          <div className="min-w-0">
            <div className="text-[8px] font-bold text-muted-foreground uppercase">Phase</div>
            <div className="text-xs font-mono text-foreground truncate capitalize">
              {context.currentPhase}
            </div>
          </div>
        </div>

        {/* Focus Score */}
        <div className="p-2 border border-border bg-card rounded flex items-center gap-2">
          <div className="text-primary">
            <Focus className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <div className="text-[8px] font-bold text-muted-foreground uppercase">Focus</div>
            <div className="text-xs font-mono text-foreground">{context.focusScore}%</div>
          </div>
        </div>

        {/* Velocity */}
        <div className="p-2 border border-border bg-card rounded flex items-center gap-2">
          <div className="text-primary">
            <TrendingUp className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <div className="text-[8px] font-bold text-muted-foreground uppercase">Velocity</div>
            <div className="text-xs font-mono text-foreground">
              {systemHealth.estimatedVelocity}/h
            </div>
          </div>
        </div>

        {/* Streak */}
        <div className="p-2 border border-border bg-card rounded flex items-center gap-2">
          <div className="text-primary">
            <CheckCircle2 className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <div className="text-[8px] font-bold text-muted-foreground uppercase">Streak</div>
            <div className="text-xs font-mono text-foreground">{systemHealth.codeCommitStreak}d</div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="bg-card border border-border rounded p-2 mb-3 shrink-0 text-[8px]">
        <div className="grid grid-cols-4 gap-2 text-center text-muted-foreground">
          <div>
            <div className="font-bold text-foreground text-sm">{systemHealth.activeProjects}</div>
            <div className="uppercase font-semibold">Active</div>
          </div>
          <div>
            <div className="font-bold text-foreground text-sm">
              {tasks.filter((t) => !t.completed).length}
            </div>
            <div className="uppercase font-semibold">Pending</div>
          </div>
          <div>
            <div className="font-bold text-foreground text-sm">{systemHealth.capturedNotes}</div>
            <div className="uppercase font-semibold">Notes</div>
          </div>
          <div>
            <div className="font-bold text-foreground text-sm">{systemHealth.completedTodayTasks}</div>
            <div className="uppercase font-semibold">Done</div>
          </div>
        </div>
      </div>

      {/* Insights Feed */}
      <div className="flex-1 overflow-y-auto space-y-1.5 pb-2">
        <div className="text-[8px] font-bold text-muted-foreground uppercase px-1 py-1 sticky top-0 bg-background/80 backdrop-blur">
          Insights
        </div>

        {/* Daily Briefing */}
        {briefing && (
          <div className="space-y-1">
            {briefing.staleWarnings.length > 0 && (
              <div className="p-1.5 border border-yellow-500/20 bg-yellow-500/5 rounded text-[7.5px]">
                <div className="font-semibold text-foreground flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Stale
                </div>
                <div className="text-muted-foreground text-[7px] mt-0.5">{briefing.staleWarnings[0]}</div>
              </div>
            )}
            {briefing.momentumInsights.length > 0 && (
              <div className="p-1.5 border border-green-500/20 bg-green-500/5 rounded text-[7.5px]">
                <div className="font-semibold text-foreground flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  Momentum
                </div>
                <div className="text-muted-foreground text-[7px] mt-0.5">{briefing.momentumInsights[0]}</div>
              </div>
            )}
            {briefing.unfinishedAlerts.length > 0 && (
              <div className="p-1.5 border border-red-500/20 bg-red-500/5 rounded text-[7.5px]">
                <div className="font-semibold text-foreground flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Overdue
                </div>
                <div className="text-muted-foreground text-[7px] mt-0.5">{briefing.unfinishedAlerts[0]}</div>
              </div>
            )}
          </div>
        )}

        {insights.length === 0 ? (
          <div className="text-center py-6 text-[9px] text-muted-foreground">
            All systems nominal
          </div>
        ) : (
          insights.map((insight) => (
            <div
              key={insight.id}
              className={`p-2 border rounded text-[8px] space-y-1 ${getInsightColor(
                insight.category
              )}`}
            >
              <div className="flex items-start gap-1.5">
                {getInsightIcon(insight.category)}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-foreground leading-tight">
                    {insight.title}
                  </div>
                  <p className="text-muted-foreground leading-tight">{insight.description}</p>
                  {insight.actionable && (
                    <div className="mt-1">
                      <Badge className="text-[7px] bg-primary/20 text-primary border-primary/30">
                        Actionable
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Command Input */}
      <div className="mt-2 pt-2 border-t border-border space-y-1.5">
        <div className="flex items-center gap-1">
          <Brain className="w-3 h-3 text-primary" />
          <span className="text-[7px] font-semibold text-muted-foreground uppercase">Command</span>
        </div>
        <div className="flex gap-1">
          <Input
            placeholder="What should I work on?"
            value={commandInput}
            onChange={(e) => setCommandInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCommand()}
            className="h-6 text-[10px] px-2 bg-card border-border text-foreground placeholder:text-muted-foreground/50"
          />
          <Button
            size="sm"
            onClick={handleCommand}
            disabled={commandLoading || !commandInput.trim()}
            className="h-6 w-6 p-0"
          >
            <Send className="w-3 h-3" />
          </Button>
        </div>
        {commandResult && (
          <div className="p-1.5 bg-popover border border-border rounded text-[8px] text-foreground max-h-12 overflow-y-auto">
            {commandResult}
          </div>
        )}
      </div>

      {/* Recommendations Footer */}
      {(recommendations.nextAction || recommendations.focusRecommendation) && (
        <div className="mt-2 pt-2 border-t border-border space-y-1 text-[8px]">
          {recommendations.nextAction && (
            <div className="p-1.5 bg-primary/5 border border-primary/20 rounded flex items-start gap-1">
              <Zap className="w-3 h-3 text-primary mt-0.5 shrink-0" />
              <div>
                <div className="font-semibold text-foreground">Next</div>
                <div className="text-muted-foreground">{recommendations.nextAction}</div>
              </div>
            </div>
          )}
          {recommendations.focusRecommendation && (
            <div className="p-1.5 bg-primary/5 border border-primary/20 rounded flex items-start gap-1">
              <Focus className="w-3 h-3 text-primary mt-0.5 shrink-0" />
              <div className="text-muted-foreground leading-tight">
                {recommendations.focusRecommendation}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
