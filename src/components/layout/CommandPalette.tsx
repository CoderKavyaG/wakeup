"use client";

import React, { useState, useEffect, useRef } from "react";
import { useProjectStore } from "@/store/useProjectStore";
import { useTaskStore } from "@/store/useTaskStore";
import { useNoteStore } from "@/store/useNoteStore";
import { useUrlStore } from "@/store/useUrlStore";
import { useLayoutStore } from "@/store/useLayoutStore";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, 
  Terminal, 
  CheckSquare, 
  FileText, 
  Folder, 
  Link as LinkIcon, 
  GitPullRequest, 
  Cpu, 
  Layers,
  ArrowRight,
  Clipboard
} from "lucide-react";

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { projects } = useProjectStore();
  const { tasks, addTask, toggleTask } = useTaskStore();
  const { notes, addNote } = useNoteStore();
  const { urls } = useUrlStore();
  const { setLayouts, resetLayout, widgets } = useLayoutStore();

  // Keyboard shortcut listener for Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
        setQuery("");
        setSelectedIndex(0);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Autofocus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Define static commands
  const commands = [
    {
      id: "cmd-sync",
      title: "Sync GitHub Repositories",
      category: "Automation",
      icon: <GitPullRequest className="w-4 h-4 text-green-400" />,
      action: async () => {
        const username = localStorage.getItem("GITHUB_USERNAME") || "coderkavyag";
        const savedToken = localStorage.getItem("GITHUB_TOKEN");
        const headers: HeadersInit = {};
        if (savedToken) {
          headers["Authorization"] = `Bearer ${savedToken}`;
        }
        await fetch(`/api/github?username=${username}&refresh=true`, { headers });
        alert("GitHub cache refreshed successfully!");
      }
    },
    {
      id: "cmd-create-task",
      title: "Create Task...",
      category: "Actions",
      icon: <CheckSquare className="w-4 h-4 text-yellow-400" />,
      action: () => {
        const title = prompt("Enter task title:");
        if (title) {
          addTask({ title, priority: "medium" });
        }
      }
    },
    {
      id: "cmd-create-note",
      title: "Dump Brain Thought...",
      category: "Actions",
      icon: <FileText className="w-4 h-4 text-purple-400" />,
      action: () => {
        const content = prompt("Enter note content:");
        if (content) {
          addNote(content);
        }
      }
    },
    {
      id: "cmd-mode-deep",
      title: "Switch to: Deep Work Mode",
      category: "Environment Profiles",
      icon: <Cpu className="w-4 h-4 text-primary" />,
      action: () => {
        // Rearrange to prioritize tasks and notes
        const currentLayouts = { ...useLayoutStore.getState().layouts };
        if (currentLayouts.lg) {
          currentLayouts.lg = currentLayouts.lg.map((l, index) => {
            if (l.i.includes("tasks")) return { ...l, x: 0, y: 0, w: 6, h: 4 };
            if (l.i.includes("notes")) return { ...l, x: 6, y: 0, w: 6, h: 4 };
            return { ...l, y: l.y + 4 };
          });
          setLayouts(currentLayouts);
        }
      }
    },
    {
      id: "cmd-mode-dsa",
      title: "Switch to: DSA Coding Mode",
      category: "Environment Profiles",
      icon: <Terminal className="w-4 h-4 text-orange-400" />,
      action: () => {
        // Rearrange to prioritize resource links and system health
        const currentLayouts = { ...useLayoutStore.getState().layouts };
        if (currentLayouts.lg) {
          currentLayouts.lg = currentLayouts.lg.map((l) => {
            if (l.i.includes("urls")) return { ...l, x: 0, y: 0, w: 8, h: 4 };
            if (l.i.includes("health")) return { ...l, x: 8, y: 0, w: 4, h: 4 };
            return { ...l, y: l.y + 4 };
          });
          setLayouts(currentLayouts);
        }
      }
    },
    {
      id: "cmd-reset",
      title: "Reset Dashboard Layout",
      category: "Workspace",
      icon: <Layers className="w-4 h-4 text-rose-400" />,
      action: () => {
        resetLayout();
      }
    }
  ];

  // Perform indexing/filtering for Unified Search
  const getFilteredItems = () => {
    const list: any[] = [];

    // 1. Matches from static commands
    commands.forEach((c) => {
      if (c.title.toLowerCase().includes(query.toLowerCase()) || c.category.toLowerCase().includes(query.toLowerCase())) {
        list.push({ ...c, type: "command" });
      }
    });

    // 2. Matches from Projects
    projects.forEach((p) => {
      if (p.name.toLowerCase().includes(query.toLowerCase()) || p.description.toLowerCase().includes(query.toLowerCase())) {
        list.push({
          id: `proj-${p.id}`,
          title: `Project: ${p.name}`,
          subtitle: p.description,
          category: "Projects",
          icon: <Folder className="w-4 h-4 text-green-400" />,
          action: () => {
            if (p.githubUrl) window.open(p.githubUrl, "_blank");
          }
        });
      }
    });

    // 3. Matches from Tasks
    tasks.forEach((t) => {
      if (t.title.toLowerCase().includes(query.toLowerCase())) {
        list.push({
          id: `task-${t.id}`,
          title: `Task: ${t.title}`,
          subtitle: t.completed ? "Completed" : `Priority: ${t.priority}`,
          category: "Tasks",
          icon: <CheckSquare className={`w-4 h-4 ${t.completed ? "text-muted-foreground/60" : "text-yellow-400"}`} />,
          action: () => {
            toggleTask(t.id);
          }
        });
      }
    });

    // 4. Matches from Brain Dump Notes
    notes.forEach((n) => {
      if (n.content.toLowerCase().includes(query.toLowerCase())) {
        list.push({
          id: `note-${n.id}`,
          title: n.content.substring(0, 60) + (n.content.length > 60 ? "..." : ""),
          subtitle: "Copy thought to clipboard",
          category: "Brain Dumps",
          icon: <FileText className="w-4 h-4 text-purple-400" />,
          action: () => {
            navigator.clipboard.writeText(n.content);
            alert("Thought copied to clipboard!");
          }
        });
      }
    });

    // 5. Matches from Resource URLs
    urls.forEach((u) => {
      if (u.label.toLowerCase().includes(query.toLowerCase()) || u.url.toLowerCase().includes(query.toLowerCase())) {
        list.push({
          id: `url-${u.id}`,
          title: `Link: ${u.label}`,
          subtitle: u.url,
          category: "Resources / Bookmarks",
          icon: <LinkIcon className="w-4 h-4 text-blue-400" />,
          action: () => {
            window.open(u.url, "_blank");
          }
        });
      }
    });

    return list;
  };

  const filteredItems = getFilteredItems();

  // Keyboard navigation for active item
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % filteredItems.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % filteredItems.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        filteredItems[selectedIndex].action();
        setIsOpen(false);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  return (
    <>
      {/* Floating Shortcut Toast/Indicator in top right header */}
      <div className="absolute top-6 right-6 z-10 flex items-center bg-card/65 backdrop-blur-md border border-border/80 rounded-lg px-2.5 py-1.5 shadow-sm text-[10px] text-muted-foreground gap-1.5 font-mono select-none">
        <span>Cockpit Command</span>
        <kbd className="bg-muted px-1.5 py-0.5 rounded border border-border/85 font-semibold text-[9px]">Ctrl+K</kbd>
      </div>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 bg-background/70 backdrop-blur-md z-50 flex items-start justify-center pt-[15vh]">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              ref={containerRef}
              className="bg-popover border border-border/80 shadow-2xl rounded-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[55vh]"
              onKeyDown={handleKeyDown}
            >
              {/* Search Header */}
              <div className="flex items-center px-4 border-b border-border/60 py-3 gap-3 shrink-0 bg-muted/20">
                <Search className="w-4 h-4 text-muted-foreground" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setSelectedIndex(0);
                  }}
                  placeholder="Fuzzy search anything or type commands..."
                  className="w-full bg-transparent border-0 outline-none placeholder:text-muted-foreground text-sm py-1 font-sans text-foreground"
                />
                <kbd className="text-[9px] text-muted-foreground bg-muted border border-border/80 px-1.5 py-0.5 rounded font-mono shrink-0 select-none shadow-sm">
                  ESC
                </kbd>
              </div>

              {/* Scrollable Results list */}
              <div className="flex-1 overflow-y-auto p-2 space-y-3.5">
                {filteredItems.length === 0 ? (
                  <div className="p-8 text-center text-xs text-muted-foreground">
                    No results found for query &ldquo;{query}&rdquo;
                  </div>
                ) : (
                  // Group items dynamically by Category
                  Object.entries(
                    filteredItems.reduce((acc: any, item) => {
                      if (!acc[item.category]) acc[item.category] = [];
                      acc[item.category].push(item);
                      return acc;
                    }, {})
                  ).map(([category, items]: any) => (
                    <div key={category} className="space-y-1">
                      <span className="text-[9px] uppercase font-bold text-muted-foreground/60 tracking-wider px-3 select-none">
                        {category}
                      </span>
                      <div className="space-y-0.5">
                        {items.map((item: any) => {
                          const itemIndex = filteredItems.findIndex((x) => x.id === item.id);
                          const isSelected = itemIndex === selectedIndex;
                          return (
                            <div
                              key={item.id}
                              onClick={() => {
                                item.action();
                                setIsOpen(false);
                              }}
                              className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs cursor-pointer select-none transition-all ${
                                isSelected
                                  ? "bg-primary/10 border border-primary/20 text-primary font-medium shadow-sm"
                                  : "text-foreground hover:bg-muted/40 border border-transparent"
                              }`}
                            >
                              <div className="flex items-center space-x-3 min-w-0">
                                <div className="shrink-0">{item.icon}</div>
                                <div className="min-w-0">
                                  <span className="truncate block font-medium leading-none">
                                    {item.title}
                                  </span>
                                  {item.subtitle && (
                                    <span className="text-[10px] text-muted-foreground/80 truncate block mt-1 leading-none font-normal">
                                      {item.subtitle}
                                    </span>
                                  )}
                                </div>
                              </div>
                              {isSelected && (
                                <motion.div 
                                  initial={{ opacity: 0, x: -5 }} 
                                  animate={{ opacity: 1, x: 0 }} 
                                  className="text-[9px] font-mono text-primary flex items-center gap-1 select-none"
                                >
                                  <span>Execute</span>
                                  <kbd className="bg-primary/20 border border-primary/30 px-1 py-0.5 rounded text-[8px]">
                                    ↵
                                  </kbd>
                                </motion.div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
