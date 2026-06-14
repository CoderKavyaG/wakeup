"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useProjectStore, Project } from "@/store/useProjectStore";
import { useProjectOSStore } from "@/store/useProjectOSStore";
import { 
  Search, 
  Folder, 
  Plus, 
  Pin, 
  Archive, 
  ExternalLink, 
  Trash2, 
  Lightbulb, 
  FlaskConical, 
  BookOpen, 
  Terminal, 
  ArrowRight,
  Sparkles,
  LogOut,
  RotateCcw
} from "lucide-react";
import { useLayoutStore } from "@/store/useLayoutStore";
import { signOut } from "next-auth/react";

export default function ProjectOSCommandPalette({ 
  onOpenCreateModal 
}: { 
  onOpenCreateModal?: () => void 
}) {
  const { 
    commandPaletteOpen, 
    closeCommandPalette, 
    selectedProjectId, 
    selectProject, 
    setPhase,
    close
  } = useProjectOSStore();
  const { projects, updateProject, deleteProject } = useProjectStore();
  const { loadSavedLayout } = useLayoutStore();
  
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedProject = projects.find(p => p.id === selectedProjectId) || null;

  // Auto-focus input on open
  useEffect(() => {
    if (commandPaletteOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [commandPaletteOpen]);

  // Reset index when query changes to prevent index out of bounds
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        closeCommandPalette();
      }
    }
    if (commandPaletteOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [commandPaletteOpen, closeCommandPalette]);

  // Command items construction
  const getCommandItems = () => {
    const items: Array<{
      id: string;
      title: string;
      subtitle?: string;
      category: string;
      icon: React.ReactNode;
      action: () => void;
    }> = [];

    // 1. Contextual Project Actions (if a project is selected)
    if (selectedProject) {
      items.push({
        id: "project-pin",
        title: selectedProject.pinned ? "Unpin Project" : "Pin Project",
        subtitle: `Toggle pin for ${selectedProject.name}`,
        category: `Current Project: ${selectedProject.name}`,
        icon: <Pin className="w-3.5 h-3.5 text-amber-400" />,
        action: () => {
          updateProject(selectedProject.id, { pinned: !selectedProject.pinned });
          closeCommandPalette();
        }
      });

      if (selectedProject.phase !== "launched") {
        items.push({
          id: "project-move-launched",
          title: "Promote to Launched",
          subtitle: "Mark this project as launched and complete",
          category: `Current Project: ${selectedProject.name}`,
          icon: <ArrowRight className="w-3.5 h-3.5 text-green-400" />,
          action: () => {
            updateProject(selectedProject.id, { phase: "launched" } as any);
            setPhase("launched");
            closeCommandPalette();
          }
        });
      }

      if (selectedProject.phase !== "in_development") {
        items.push({
          id: "project-move-indev",
          title: "Move to In Development",
          subtitle: "Mark this project as actively being built",
          category: `Current Project: ${selectedProject.name}`,
          icon: <ArrowRight className="w-3.5 h-3.5 text-purple-400" />,
          action: () => {
            updateProject(selectedProject.id, { phase: "in_development" } as any);
            setPhase("in_development");
            closeCommandPalette();
          }
        });
      }

      if (selectedProject.phase !== "sketching") {
        items.push({
          id: "project-move-sketching",
          title: "Move to Sketching",
          subtitle: "Move this project to sketching and prototyping phase",
          category: `Current Project: ${selectedProject.name}`,
          icon: <ArrowRight className="w-3.5 h-3.5 text-amber-400" />,
          action: () => {
            updateProject(selectedProject.id, { phase: "sketching" } as any);
            setPhase("sketching");
            closeCommandPalette();
          }
        });
      }

      if (selectedProject.phase !== "idea") {
        items.push({
          id: "project-move-idea",
          title: "Move to Idea Phase",
          subtitle: "Revert this project to idea vault",
          category: `Current Project: ${selectedProject.name}`,
          icon: <Lightbulb className="w-3.5 h-3.5 text-indigo-400" />,
          action: () => {
            updateProject(selectedProject.id, { phase: "idea" } as any);
            setPhase("idea");
            closeCommandPalette();
          }
        });
      }

      if (selectedProject.githubUrl) {
        items.push({
          id: "project-github",
          title: "Open GitHub Repository",
          subtitle: selectedProject.githubUrl,
          category: `Current Project: ${selectedProject.name}`,
          icon: <ExternalLink className="w-3.5 h-3.5 text-white/50" />,
          action: () => {
            window.open(selectedProject.githubUrl, "_blank");
            closeCommandPalette();
          }
        });
      }

      if (selectedProject.liveUrl) {
        items.push({
          id: "project-live",
          title: "Open Live Application",
          subtitle: selectedProject.liveUrl,
          category: `Current Project: ${selectedProject.name}`,
          icon: <ExternalLink className="w-3.5 h-3.5 text-green-400" />,
          action: () => {
            window.open(selectedProject.liveUrl, "_blank");
            closeCommandPalette();
          }
        });
      }

      items.push({
        id: "project-delete",
        title: "Delete Project",
        subtitle: "Permanently delete this project and all associated tasks",
        category: `Current Project: ${selectedProject.name}`,
        icon: <Trash2 className="w-3.5 h-3.5 text-red-400" />,
        action: () => {
          if (confirm(`Are you sure you want to delete ${selectedProject.name}?`)) {
            deleteProject(selectedProject.id);
            selectProject(null);
          }
          closeCommandPalette();
        }
      });
    }

    // 2. Navigation & Global Actions
    items.push({
      id: "nav-main-workspace",
      title: "Go to main workspace",
      subtitle: "Return to the project selection view",
      category: "Navigation",
      icon: <ArrowRight className="w-3.5 h-3.5 text-zinc-400" />,
      action: () => {
        selectProject(null);
        closeCommandPalette();
      }
    });

    items.push({
      id: "nav-launched",
      title: "View: Launched",
      subtitle: "Filter board to completed and shipped projects",
      category: "Regions",
      icon: <Sparkles className="w-3.5 h-3.5 text-emerald-400" />,
      action: () => {
        setPhase("launched");
        selectProject(null);
        closeCommandPalette();
      }
    });

    items.push({
      id: "nav-indev",
      title: "View: In Development",
      subtitle: "Filter board to active build cycles",
      category: "Regions",
      icon: <Terminal className="w-3.5 h-3.5 text-violet-400" />,
      action: () => {
        setPhase("in_development");
        selectProject(null);
        closeCommandPalette();
      }
    });

    items.push({
      id: "nav-sketching",
      title: "View: Sketching",
      subtitle: "Filter board to prototypes and experiments",
      category: "Regions",
      icon: <FlaskConical className="w-3.5 h-3.5 text-amber-400" />,
      action: () => {
        setPhase("sketching");
        selectProject(null);
        closeCommandPalette();
      }
    });

    items.push({
      id: "nav-idea",
      title: "View: Idea Phase",
      subtitle: "Filter board to product concepts",
      category: "Regions",
      icon: <Lightbulb className="w-3.5 h-3.5 text-slate-400" />,
      action: () => {
        setPhase("idea");
        selectProject(null);
        closeCommandPalette();
      }
    });
    items.push({
      id: "global-restore-layout",
      title: "Restore Layout",
      subtitle: "Restore your last saved workspace layout",
      category: "System",
      icon: <RotateCcw className="w-3.5 h-3.5 text-amber-400" />,
      action: () => {
        loadSavedLayout();
        closeCommandPalette();
      }
    });

    items.push({
      id: "global-signout",
      title: "Sign Out",
      subtitle: "Sign out of your DevOS session",
      category: "System",
      icon: <LogOut className="w-3.5 h-3.5 text-red-400" />,
      action: () => {
        signOut({ callbackUrl: "/login" });
        closeCommandPalette();
      }
    });

    // 3. Project Teleportation
    projects.forEach(p => {
      if (p.id !== selectedProjectId) {
        items.push({
          id: `teleport-${p.id}`,
          title: `Teleport to ${p.name}`,
          subtitle: p.description || p.status,
          category: "Project Switcher",
          icon: <Folder className="w-3.5 h-3.5 text-white/20" />,
          action: () => {
            selectProject(p.id);
            closeCommandPalette();
          }
        });
      }
    });

    // Filter by query
    if (!query) return items;
    return items.filter(i => 
      i.title.toLowerCase().includes(query.toLowerCase()) || 
      i.subtitle?.toLowerCase().includes(query.toLowerCase()) ||
      i.category.toLowerCase().includes(query.toLowerCase())
    );
  };

  const filteredItems = getCommandItems();

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!commandPaletteOpen) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % Math.max(1, filteredItems.length));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length));
      } else if (e.key === "Enter") {
        if (filteredItems[selectedIndex]) {
          filteredItems[selectedIndex].action();
        }
      } else if (e.key === "Escape") {
        closeCommandPalette();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [commandPaletteOpen, selectedIndex, filteredItems, closeCommandPalette]);

  if (!commandPaletteOpen) return null;

  return (
    <div className="fixed inset-0 z-100 flex items-start justify-center pt-[15vh] px-4 bg-black/60 backdrop-blur-md">
      <motion.div
        ref={containerRef}
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-lg bg-[#0f0f11] border border-white/8 rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[50vh]"
      >
        <div className="h-12 border-b border-white/6 flex items-center px-4 gap-3">
          <Search className="w-4 h-4 text-white/20" />
          <input
            ref={inputRef}
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search commands or projects..."
            className="flex-1 bg-transparent border-none outline-none text-sm text-white placeholder:text-white/20"
          />
          <div className="flex items-center gap-1.5">
            <kbd className="text-[10px] bg-white/6 border border-white/8 text-white/40 px-1.5 py-0.5 rounded font-mono select-none">
              ESC
            </kbd>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {filteredItems.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-xs text-white/20">No matching commands found.</p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredItems.map((item, index) => {
                const showCategory = index === 0 || filteredItems[index - 1].category !== item.category;
                return (
                  <React.Fragment key={item.id}>
                    {showCategory && (
                      <div className="px-3 pt-3 pb-1.5 text-[10px] uppercase tracking-widest font-bold text-white/20">
                        {item.category}
                      </div>
                    )}
                    <button
                      onClick={item.action}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-3 transition-colors ${
                        index === selectedIndex 
                          ? "bg-white/6 text-white" 
                          : "text-white/60 hover:bg-white/2"}`}
                    >
                      <div className={`p-1.5 rounded-md ${index === selectedIndex ? "bg-white/10" : "bg-white/5"}`}>
                        {item.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{item.title}</div>
                        {item.subtitle && (
                          <div className="text-[10px] opacity-60 truncate">{item.subtitle}</div>
                        )}
                      </div>
                      {index === selectedIndex && (
                        <ArrowRight className="w-3.5 h-3.5 text-white/40" />
                      )}
                    </button>
                  </React.Fragment>
                );
              })}
            </div>
          )}
        </div>

        <div className="h-8 border-t border-white/4 bg-white/1 px-4 flex items-center justify-between text-[9px] text-white/25 font-mono select-none">
          <div className="flex items-center gap-4">
            <span>↑↓ to navigate</span>
            <span>↵ to select</span>
          </div>
          <div>{filteredItems.length} results</div>
        </div>
      </motion.div>
    </div>
  );
}
