import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const projects = await prisma.project.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
    });

    const tasks = await prisma.task.findMany({
      where: { userId }
    });
    const notes = await prisma.note.findMany({
      where: {
        userId,
        NOT: {
          source: {
            in: ["cockpit_helpful", "cockpit_unhelpful"]
          }
        }
      }
    });

    // Analyze each project
    const projectIntelligence = projects.map((project) => {
      const now = Date.now();
      const projectLastUpdated = new Date(project.updatedAt).getTime();
      const stalenessDays = Math.floor((now - projectLastUpdated) / (1000 * 60 * 60 * 24));
      
      // Get project-related tasks
      const projectTasks = tasks.filter(
        (t) => t.title.includes(project.name) || t.title?.includes(project.name)
      );
      const pendingProjectTasks = projectTasks.filter((t) => !t.completed);
      const completedThisWeek = projectTasks.filter((t) => {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return t.completed && new Date(t.updatedAt) > weekAgo;
      }).length;

      // Get project-related notes
      const projectNotes = notes.filter(
        (n) => n.content?.includes(project.name) || n.content?.includes(project.githubUrl || "")
      );
      const recentNotes = projectNotes.filter((n) => {
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
        return new Date(n.createdAt) > threeDaysAgo;
      }).length;

      // Calculate scores
      const calculateHealthScore = () => {
        let score = 100;
        
        if (project.status === "completed") score = 50;
        if (project.status === "active") score = 85;
        if (project.status === "stale") score = 20;
        if (project.status === "planning") score = 70;
        
        // Reduce health based on staleness
        if (stalenessDays > 60) score -= 40;
        else if (stalenessDays > 30) score -= 25;
        else if (stalenessDays > 14) score -= 10;
        
        // Increase health if actively worked on
        if (stalenessDays < 1) score = Math.min(100, score + 15);
        
        // Reduce health if pending tasks are stuck
        if (pendingProjectTasks.length > 5) score -= 15;
        
        return Math.max(0, Math.min(100, score));
      };

      const calculatePriorityScore = () => {
        let score = 50;
        
        if (project.status === "active") score += 30;
        if (project.status === "stale") score += 20; // Stale projects need attention
        if (project.status === "planning") score += 10;
        
        // Increase if it has pending tasks
        if (pendingProjectTasks.length > 0) score += 15;
        
        // Increase if recently worked on
        if (stalenessDays < 3) score += 20;
        
        // Increase if has live URL (deployed, more user impact)
        if (project.liveUrl) score += 10;
        
        // Decrease if too many pending tasks (backlog)
        if (pendingProjectTasks.length > 8) score -= 15;
        
        return Math.max(0, Math.min(100, score));
      };

      const calculateUrgencyScore = () => {
        let score = 0;
        
        // High urgency if stale
        if (stalenessDays > 30) score += 40;
        else if (stalenessDays > 14) score += 20;
        
        // High urgency if status is "stale"
        if (project.status === "stale") score += 30;
        
        // Moderate urgency if has pending tasks
        if (pendingProjectTasks.length > 0) score += 20;
        
        // Very high urgency if has due date and it's approaching
        if (project.nextAction) score += 15;
        
        return Math.min(100, score);
      };

      const calculateMomentumScore = () => {
        let score = 0;
        
        // Recent activity = momentum
        if (stalenessDays === 0) score += 50;
        else if (stalenessDays < 3) score += 35;
        else if (stalenessDays < 7) score += 20;
        else if (stalenessDays < 14) score += 10;
        
        // Completed tasks this week = momentum
        score += Math.min(30, completedThisWeek * 10);
        
        // Recent notes = momentum
        score += Math.min(20, recentNotes * 5);
        
        return Math.min(100, score);
      };

      // Determine workflow phase
      const determineWorkflowPhase = (): "planning" | "active" | "review" | "maintenance" | "completed" => {
        if (project.status === "completed") return "completed";
        if (project.status === "stale") return "maintenance";
        if (pendingProjectTasks.length > 3 && stalenessDays < 7) return "active";
        if (stalenessDays < 1) return "active";
        if (project.status === "planning" || pendingProjectTasks.length > 0) return "planning";
        return "review";
      };

      // Generate recommendation
      const generateRecommendation = () => {
        const priority = calculatePriorityScore();
        const urgency = calculateUrgencyScore();
        const momentum = calculateMomentumScore();
        const phase = determineWorkflowPhase();
        
        let action: "focus" | "resume" | "maintain" | "defer" | "review" = "maintain";
        let reason = "";
        let suggestedNextStep = "";

        if (urgency > 60 && stalenessDays > 30) {
          action = "resume";
          reason = `Project hasn't been updated in ${stalenessDays} days. Time to resume active work.`;
          suggestedNextStep = "Review recent GitHub activity and PRs, then create focused issue";
        } else if (priority > 70 && momentum > 50) {
          action = "focus";
          reason = "High priority + strong momentum. Keep shipping!";
          suggestedNextStep = `Complete next: ${pendingProjectTasks[0]?.title || "review roadmap"}`;
        } else if (priority > 60 && momentum < 30) {
          action = "resume";
          reason = "Important project losing momentum. Time to refocus.";
          suggestedNextStep = "Break work into smaller chunks, commit daily";
        } else if (phase === "completed" || project.status === "completed") {
          action = "defer";
          reason = "Project is completed. Archive or maintain minimal overhead.";
          suggestedNextStep = "Document lessons learned, update README";
        } else if (pendingProjectTasks.length > 10) {
          action = "review";
          reason = "Large task backlog detected. Prioritization needed.";
          suggestedNextStep = "Review and prioritize top 5 tasks";
        } else {
          action = "maintain";
          reason = "Project is healthy. Maintain current pace.";
          suggestedNextStep = pendingProjectTasks.length > 0 
            ? `Next: ${pendingProjectTasks[0].title}`
            : "No pending tasks. Consider new features or tech debt";
        }

        return {
          action,
          reason,
          suggestedNextStep,
          estimatedTimeToComplete: phase === "active" ? "1-2 weeks" : "2-4 weeks",
        };
      };

      // Extract context clues
      const contextClues: string[] = [];
      if (stalenessDays === 0) contextClues.push("Updated today");
      if (pendingProjectTasks.length > 0) contextClues.push(`${pendingProjectTasks.length} pending task(s)`);
      if (project.liveUrl) contextClues.push("Live deployment");
      if (project.githubUrl) contextClues.push("GitHub tracked");
      if (recentNotes > 0) contextClues.push(`Recent work notes (${recentNotes})`);
      if (project.nextAction) contextClues.push(`Next: ${project.nextAction}`);

      // Risk factors
      const riskFactors: string[] = [];
      if (stalenessDays > 30) riskFactors.push("Stale - no recent updates");
      if (pendingProjectTasks.length > 8) riskFactors.push("High task backlog");
      if (!project.githubUrl) riskFactors.push("No GitHub tracking");
      if (project.status === "stale") riskFactors.push("Marked as stale");
      if (calculateMomentumScore() < 20) riskFactors.push("Momentum declining");

      const scores = {
        health: calculateHealthScore(),
        priority: calculatePriorityScore(),
        urgency: calculateUrgencyScore(),
        momentum: calculateMomentumScore(),
        stalenessDays,
      };

      return {
        projectId: project.id,
        projectName: project.name,
        scores,
        recommendation: generateRecommendation(),
        workflowPhase: determineWorkflowPhase(),
        contextClues,
        riskFactors,
      };
    });

    // Generate project groupings
    const generateGroupings = () => {
      const groupings = [];
      
      // Group 1: Focus Projects (High priority + active)
      const focusProjects = projectIntelligence.filter(
        (pi) => pi.scores.priority > 70 && pi.workflowPhase === "active"
      );
      if (focusProjects.length > 0) {
        groupings.push({
          label: "🎯 Primary Focus",
          description: "High-priority projects with active momentum",
          projectIds: focusProjects.map((p) => p.projectId),
          recommendedOrder: focusProjects
            .sort((a, b) => b.scores.priority - a.scores.priority)
            .map((p) => p.projectId),
          focusTime: Math.max(120, 480 / focusProjects.length),
        });
      }

      // Group 2: Stale Projects (Need attention)
      const staleProjects = projectIntelligence.filter(
        (pi) => pi.scores.stalenessDays > 30
      );
      if (staleProjects.length > 0) {
        groupings.push({
          label: "⚠️ Stale Projects",
          description: "Projects needing attention after extended inactivity",
          projectIds: staleProjects.map((p) => p.projectId),
          recommendedOrder: staleProjects
            .sort((a, b) => b.scores.urgency - a.scores.urgency)
            .map((p) => p.projectId),
          focusTime: 60,
        });
      }

      // Group 3: Maintenance Mode
      const maintenanceProjects = projectIntelligence.filter(
        (pi) => pi.workflowPhase === "maintenance" && pi.scores.stalenessDays <= 30
      );
      if (maintenanceProjects.length > 0) {
        groupings.push({
          label: "🔧 Maintenance",
          description: "Completed or low-priority projects requiring minimal work",
          projectIds: maintenanceProjects.map((p) => p.projectId),
          recommendedOrder: maintenanceProjects.map((p) => p.projectId),
          focusTime: 30,
        });
      }

      // Group 4: Planning
      const planningProjects = projectIntelligence.filter(
        (pi) => pi.workflowPhase === "planning" || pi.workflowPhase === "review"
      );
      if (planningProjects.length > 0) {
        groupings.push({
          label: "📋 Planning & Review",
          description: "Projects in planning or review phases",
          projectIds: planningProjects.map((p) => p.projectId),
          recommendedOrder: planningProjects.map((p) => p.projectId),
          focusTime: 45,
        });
      }

      return groupings;
    };

    return NextResponse.json({
      projectIntelligence,
      projectGroupings: generateGroupings(),
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "An error occurred";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
