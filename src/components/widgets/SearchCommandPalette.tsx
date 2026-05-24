"use client";

import React, { useEffect, useState } from "react";
import { useSearchStore, SearchResultType } from "@/store/useSearchStore";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search,
  FolderOpen,
  CheckSquare,
  FileText,
  Link as LinkIcon,
  GitBranch,
  Clock,
  TrendingUp,
  X,
} from "lucide-react";

const resultTypeIcons: Record<SearchResultType, React.ReactNode> = {
  project: <FolderOpen className="w-4 h-4" />,
  task: <CheckSquare className="w-4 h-4" />,
  note: <FileText className="w-4 h-4" />,
  url: <LinkIcon className="w-4 h-4" />,
  github: <GitBranch className="w-4 h-4" />,
};

export function SearchCommandPalette() {
  const {
    query,
    filters,
    results,
    loading,
    isOpen,
    recentSearches,
    setQuery,
    search,
    clearSearch,
    openSearch,
    closeSearch,
    clearRecentSearches,
  } = useSearchStore();

  const [inputValue, setInputValue] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K or Ctrl+K to open
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        openSearch();
      }

      // Escape to close
      if (e.key === "Escape") {
        closeSearch();
      }

      // Arrow keys for navigation
      if (isOpen) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setSelectedIndex((prev) => (prev + 1) % results.length);
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          setSelectedIndex((prev) => (prev - 1 + results.length) % results.length);
        } else if (e.key === "Enter" && results.length > 0) {
          e.preventDefault();
          handleSelectResult(results[selectedIndex]);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, results, selectedIndex, openSearch, closeSearch]);

  const handleInputChange = (value: string) => {
    setInputValue(value);
    setSelectedIndex(0);
    if (value.trim()) {
      search(value, filters);
    } else {
      clearSearch();
    }
  };

  const handleSelectResult = (result: any) => {
    // This would navigate or open the result
    console.log("Selected:", result);
    closeSearch();
  };

  const getRelevanceColor = (score: number) => {
    if (score >= 80) return "text-green-400";
    if (score >= 60) return "text-primary";
    if (score >= 40) return "text-yellow-400";
    return "text-muted-foreground";
  };

  return (
    <Dialog open={isOpen} onOpenChange={closeSearch}>
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden bg-[#0f0f11] border-white/10">
        <div className="flex items-center border-b border-white/10 px-3 py-2">
          <Search className="w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search projects, tasks, notes... (Cmd+K)"
            value={inputValue}
            onChange={(e) => handleInputChange(e.target.value)}
            autoFocus
            className="border-0 bg-transparent px-2 focus-visible:ring-0 text-foreground placeholder:text-muted-foreground"
          />
          <button
            onClick={() => {
              setInputValue("");
              clearSearch();
            }}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <ScrollArea className="max-h-96">
          {/* Recent Searches */}
          {inputValue.trim() === "" && recentSearches.length > 0 && (
            <div className="p-3 border-b border-white/10">
              <div className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                Recent Searches
              </div>
              <div className="flex flex-wrap gap-2">
                {recentSearches.map((recent) => (
                  <button
                    key={recent}
                    onClick={() => handleInputChange(recent)}
                    className="px-2 py-1 text-xs bg-[#0f0f11] border border-white/10 rounded hover:bg-[#0f0f11] transition-colors text-foreground"
                  >
                    {recent}
                  </button>
                ))}
              </div>
              {recentSearches.length > 0 && (
                <button
                  onClick={clearRecentSearches}
                  className="text-[10px] text-muted-foreground hover:text-foreground mt-2 transition-colors"
                >
                  Clear recent
                </button>
              )}
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="p-4 text-center text-muted-foreground text-sm">
              Searching...
            </div>
          )}

          {/* Results */}
          {!loading && results.length > 0 && (
            <div className="p-2">
              <div className="text-[10px] font-semibold text-muted-foreground uppercase px-2 py-1">
                Results ({results.length})
              </div>
              <div className="space-y-1">
                {results.map((result, idx) => (
                  <button
                    key={result.id}
                    onClick={() => handleSelectResult(result)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`w-full text-left p-2 rounded transition-colors border ${
                      selectedIndex === idx
                        ? "bg-primary/10 border-primary/20"
                        : "border-transparent hover:bg-[#0f0f11]"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <div className="text-muted-foreground mt-0.5">
                        {resultTypeIcons[result.type]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground truncate">
                            {result.title}
                          </span>
                          <Badge
                            variant="outline"
                            className={`text-[10px] shrink-0 ${getRelevanceColor(result.relevanceScore)} bg-[#0f0f11]`}
                          >
                            {Math.round(result.relevanceScore)}%
                          </Badge>
                        </div>
                        {result.description && (
                          <div className="text-xs text-muted-foreground truncate mt-0.5">
                            {result.description}
                          </div>
                        )}
                        {result.metadata && (
                          <div className="flex items-center gap-1 mt-1">
                            {result.metadata.tags?.map((tag) => (
                              <Badge
                                key={tag}
                                variant="outline"
                                className="text-[8px] bg-[#0f0f11]"
                              >
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* No Results */}
          {!loading && inputValue.trim() !== "" && results.length === 0 && (
            <div className="p-8 text-center">
              <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
              <p className="text-sm text-muted-foreground">No results found</p>
              <p className="text-xs text-muted-foreground mt-1">
                Try different keywords or filters
              </p>
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="border-t border-white/10 px-3 py-2 text-[10px] text-muted-foreground flex items-center justify-between">
          <div>
            <kbd className="px-1 bg-[#0f0f11] border border-white/10 rounded text-[9px]">
              ↑↓
            </kbd>{" "}
            <span>to navigate</span>
            <kbd className="px-1 bg-[#0f0f11] border border-white/10 rounded text-[9px] ml-2">
              ⏎
            </kbd>{" "}
            <span>to select</span>
            <kbd className="px-1 bg-[#0f0f11] border border-white/10 rounded text-[9px] ml-2">
              esc
            </kbd>{" "}
            <span>to close</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
