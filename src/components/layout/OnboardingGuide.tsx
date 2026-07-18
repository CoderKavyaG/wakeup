"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useProjectStore } from "@/store/useProjectStore";
import { useTaskStore } from "@/store/useTaskStore";
import { useBootstrapStore } from "@/store/useBootstrapStore";
import { useLayoutStore } from "@/store/useLayoutStore";
import { Button } from "../ui/button";

interface Step {
  id: number;
  targetId: string | null;
  title: string;
  subtext: string;
  buttonText: string;
  action?: () => void;
  showSkip?: boolean;
}

export function OnboardingGuide() {
  const [currentStep, setCurrentStep] = useState(1);
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number; height: number } | null>(null);

  const projects = useProjectStore((s) => s.projects);
  const tasks = useTaskStore((s) => s.tasks);
  const loaded = useBootstrapStore((s) => s.loaded);
  const widgets = useLayoutStore((s) => s.widgets);

  // 1. Trigger logic: check if onboarded, and if user has 0 projects and 0 tasks
  useEffect(() => {
    if (!loaded) return;

    if (typeof window !== "undefined") {
      if (localStorage.getItem("wakeup_onboarded") === "true") {
        localStorage.setItem("devos_onboarded", "true");
        localStorage.removeItem("wakeup_onboarded");
      }
    }

    const onboarded = localStorage.getItem("devos_onboarded");
    const hasNoData = projects.length === 0 && tasks.length === 0;

    if (!onboarded && hasNoData) {
      setTimeout(() => {
        setVisible(true);
      }, 0);
    }
  }, [loaded, projects.length, tasks.length]);

  // Listen for the custom tour restart event from Cockpit Command
  useEffect(() => {
    const handleRestart = () => {
      setCurrentStep(1);
      setTimeout(() => {
        setVisible(true);
      }, 0);
    };
    window.addEventListener("restart_onboarding", handleRestart);
    return () => window.removeEventListener("restart_onboarding", handleRestart);
  }, []);

  const steps: Step[] = [
    {
      id: 1,
      targetId: null,
      title: "This is DevOS. Your personal developer OS.",
      subtext: "Not a dashboard. An operating system. Let's set it up in 2 minutes.",
      buttonText: "Let's go →",
      showSkip: true,
    },
    {
      id: 2,
      targetId: "cockpit-trigger",
      title: "This is the Cockpit. It's your command center.",
      subtext: "Press Cmd+K anytime to open it. Ask anything, add widgets, create tasks instantly.",
      buttonText: "Got it →",
      showSkip: true,
      action: () => {
        // Open Cockpit Command bar overlay
        const cockpitBtn = document.getElementById("cockpit-trigger");
        if (cockpitBtn) {
          cockpitBtn.click();
        }
      },
    },
    {
      id: 3,
      targetId: "projects-widget",
      title: "Add your first project",
      subtext: "Connect your GitHub to see all your repos here. Your projects become the brain of DevOS — health scores, commits, and infrastructure links.",
      buttonText: "Connect GitHub",
      showSkip: true,
      action: () => {
        // Close cockpit overlay if it is open
        const isCockpitVisible = !!document.querySelector('input[placeholder*="Ask anything"]');
        if (isCockpitVisible) {
          window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
        }
        // Open GitHub settings inside the GithubWidget
        setTimeout(() => {
          const githubSettingsBtn = document.getElementById("github-widget-settings-btn");
          if (githubSettingsBtn) {
            githubSettingsBtn.click();
          }
        }, 100);
      },
    },
    {
      id: 4,
      targetId: "machine-control-widget",
      title: "Set up your workspace",
      subtext: "DevOS can see your local machine. Paste any project folder path to track its git status, run npm scripts, and monitor ports.",
      buttonText: "Nice →",
      showSkip: true,
      action: () => {
        // Auto pre-fill with current workspace path
        const input = document.getElementById("machine-control-input") as HTMLInputElement;
        if (input) {
          input.value = "C:\\Users\\Kavya\\Projects\\wakeup";
          input.dispatchEvent(new Event("input", { bubbles: true }));
          input.dispatchEvent(new Event("change", { bubbles: true }));
        }
      },
    },
    {
      id: 5,
      targetId: "focus-panel-widget",
      title: "Brain dump something",
      subtext: "Type anything here. AI will figure out the rest. Tasks, ideas, bugs, notes — just type. Use @projectname to tag it to a project.",
      buttonText: "Done →",
      showSkip: true,
      action: () => {
        const textarea = document.getElementById("focus-panel-textarea");
        if (textarea) {
          (textarea as HTMLTextAreaElement).focus();
        }
      },
    },
    {
      id: 6,
      targetId: null,
      title: "You're in",
      subtext: "DevOS is ready. It learns as you work. The more you use it, the smarter it gets.",
      buttonText: "Start building →",
      showSkip: false,
    },
  ];

  const currentStepData = steps.find((s) => s.id === currentStep) || steps[0];

  // 2. Track spotlight element coordinates
  useEffect(() => {
    if (!visible || !currentStepData.targetId) {
      setTimeout(() => {
        setCoords(null);
      }, 0);
      return;
    }

    const updateCoords = () => {
      const el = document.getElementById(currentStepData.targetId!);
      if (el) {
        const rect = el.getBoundingClientRect();
        setCoords({
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        });
      } else {
        setCoords(null);
      }
    };

    updateCoords();

    // Attach listeners to update positions on window resize and scroll
    window.addEventListener("resize", updateCoords);
    window.addEventListener("scroll", updateCoords, true);

    const interval = setInterval(updateCoords, 400);

    return () => {
      window.removeEventListener("resize", updateCoords);
      window.removeEventListener("scroll", updateCoords, true);
      clearInterval(interval);
    };
  }, [currentStepData.targetId, visible]);

  // Run the action callback for a step when it mounts
  useEffect(() => {
    if (visible && currentStepData.action) {
      currentStepData.action();
    }
  }, [currentStep, visible, currentStepData]);

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = () => {
    localStorage.setItem("devos_onboarded", "true");
    setVisible(false);
  };

  const handleSkip = () => {
    // Escape cockpit if open
    const isCockpitVisible = !!document.querySelector('input[placeholder*="Ask anything"]');
    if (isCockpitVisible) {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    }
    handleComplete();
  };

  // Dynamically calculate overlay tooltip position
  const getCardStyle = () => {
    if (!coords) {
      return {
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%) scale(1)",
        position: "fixed" as const,
        zIndex: 102,
      };
    }

    const cardWidth = 360;
    const cardHeight = 220;
    const margin = 16;

    let top = coords.top + coords.height + margin;
    let left = coords.left + coords.width / 2 - cardWidth / 2;

    // Check bottom overflow
    if (top + cardHeight > window.innerHeight) {
      top = coords.top - cardHeight - margin;
    }

    // Bound coordinates
    top = Math.max(margin, Math.min(top, window.innerHeight - cardHeight - margin));
    left = Math.max(margin, Math.min(left, window.innerWidth - cardWidth - margin));

    return {
      top,
      left,
      width: cardWidth,
      position: "fixed" as const,
      zIndex: 102,
    };
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none select-none">
      {/* Dimmed backdrop layer */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] pointer-events-auto" />

      {/* Spotlight box shadow overlay */}
      <motion.div
        initial={false}
        animate={
          coords
            ? {
                top: coords.top - 8,
                left: coords.left - 8,
                width: coords.width + 16,
                height: coords.height + 16,
                borderRadius: 12,
                opacity: 1,
              }
            : {
                top: "50%",
                left: "50%",
                width: 0,
                height: 0,
                borderRadius: 0,
                opacity: 1,
              }
        }
        transition={{ type: "spring", stiffness: 260, damping: 30 }}
        className="fixed shadow-[0_0_0_9999px_rgba(10,10,15,0.82)] border-2 border-purple-500/30 pointer-events-none"
        style={{ zIndex: 101 }}
      />

      {/* Onboarding Dialog Card */}
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          style={getCardStyle()}
          className="bg-zinc-950/90 border border-white/10 rounded-2xl shadow-2xl p-5 flex flex-col gap-4 pointer-events-auto backdrop-blur-md"
        >
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[9px] uppercase font-bold text-purple-400 tracking-wider font-mono bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                Step {currentStep} of {steps.length}
              </span>
              {currentStepData.showSkip && (
                <button
                  onClick={handleSkip}
                  className="text-[10px] text-muted-foreground hover:text-white transition-colors uppercase font-mono cursor-pointer bg-transparent border-none outline-none"
                >
                  Skip setup
                </button>
              )}
            </div>
            <h2 className="text-sm font-bold text-white tracking-tight leading-snug mt-1">
              {currentStepData.title}
            </h2>
            <p className="text-xs text-white/60 leading-relaxed font-sans">
              {currentStepData.subtext}
            </p>
          </div>

          {/* Dynamic content for step 6 */}
          {currentStep === 6 && (
            <div className="grid grid-cols-3 gap-2 bg-black/30 border border-white/5 p-2 rounded-xl text-center">
              <div className="flex flex-col gap-0.5">
                <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider font-mono">Widgets</span>
                <span className="text-xs font-bold text-white font-mono">{widgets.length} active</span>
              </div>
              <div className="flex flex-col gap-0.5 border-x border-white/5">
                <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider font-mono">AI Model</span>
                <span className="text-xs font-bold text-purple-400 font-mono">Connected</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider font-mono">Host Agent</span>
                <span className="text-xs font-bold text-green-400 font-mono">Online</span>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between mt-1 pt-3 border-t border-white/5 shrink-0">
            {/* Step dots */}
            <div className="flex items-center gap-1.5 select-none">
              {steps.map((s) => (
                <div
                  key={s.id}
                  className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                    s.id === currentStep ? "bg-purple-500 scale-125 shadow-sm shadow-purple-500/50" : "bg-white/10"
                  }`}
                />
              ))}
            </div>

            <Button
              size="sm"
              onClick={handleNext}
              className="h-8 bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs px-4 rounded-lg cursor-pointer flex items-center gap-1.5"
            >
              {currentStepData.buttonText}
            </Button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
