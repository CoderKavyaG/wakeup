"use client";

import React, { useState, useEffect } from "react";
import { useUrlStore, ResourceUrl } from "@/store/useUrlStore";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Link2, Search, Copy, Loader2, GripVertical, Trash2, Check, Plus, Briefcase, User, MessageSquare, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// Default seeds
const DEFAULT_LINKS: Omit<ResourceUrl, "id">[] = [
  { label: "GitHub", url: "https://github.com/coderkavyag", category: "github" },
];

interface SortableLinkItemProps {
  url: ResourceUrl;
  onCopy: (e: React.MouseEvent, text: string) => void;
  copiedId: string | null;
  onDelete: (e: React.MouseEvent, id: string) => void;
}

function SortableLinkItem({ url, onCopy, copiedId, onDelete }: SortableLinkItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: url.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
  };

  let domain = "";
  try { domain = new URL(url.url).hostname; } catch {}

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={`group relative flex items-center gap-2 p-1.5 border border-white/10 bg-[#1a1a1d] rounded hover:bg-white/5 transition-colors ${isDragging ? 'opacity-50' : ''}`}
    >
      <div 
        {...attributes} 
        {...listeners} 
        className="cursor-grab text-white/20 hover:text-white/80 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
        onClick={e => e.preventDefault()}
      >
        <GripVertical className="w-3 h-3" />
      </div>
      
      <button 
        onClick={(e) => onCopy(e, url.url)}
        className="w-3.5 h-3.5 rounded-sm shrink-0 overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
        title="Copy URL"
      >
        <img 
          src={`https://www.google.com/s2/favicons?domain=${domain}&sz=16`} 
          alt="favicon" 
          className="w-full h-full"
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />
      </button>
      
      <a href={url.url} target="_blank" rel="noopener noreferrer" className="flex-1 text-xs text-foreground/90 hover:text-foreground truncate font-medium min-w-0" title={`${url.label} • ${url.url}`}>
        {url.label}
      </a>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 pr-1">
        <button 
          onClick={(e) => onCopy(e, url.url)}
          className="text-muted-foreground hover:text-foreground"
          title="Copy URL"
        >
          {copiedId === url.url ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
        </button>
        <button 
          onClick={(e) => onDelete(e, url.id)}
          className="text-muted-foreground hover:text-destructive ml-0.5"
          title="Delete URL"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

export function QuickLinksWidget() {
  const { urls, addUrl, deleteUrl, reorderUrls, fetchUrls, loading } = useUrlStore();
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [newUrlInput, setNewUrlInput] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [hasSeeded, setHasSeeded] = useState(false);

  useEffect(() => {
    // Seed on first load if empty
    if (!loading && urls.length === 0 && !hasSeeded) {
      setHasSeeded(true);
      const seed = async () => {
        for (const link of DEFAULT_LINKS) {
          await addUrl(link);
        }
      };
      seed();
    }

    // Migration for github link
    if (!loading && urls.length > 0) {
      const oldGithub = urls.find(u => u.url === "https://github.com/coderkavya");
      if (oldGithub) {
        deleteUrl(oldGithub.id);
        addUrl({ label: "GitHub", url: "https://github.com/coderkavyag", category: "github" });
      }
    }
  }, [urls, loading, hasSeeded, addUrl, deleteUrl]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = urls.findIndex((u) => u.id === active.id);
      const newIndex = urls.findIndex((u) => u.id === over.id);
      reorderUrls(arrayMove(urls, oldIndex, newIndex));
    }
  };

  const handleCopy = (e: React.MouseEvent, text: string) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleQuickCopy = (e: React.MouseEvent, text: string, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    deleteUrl(id);
  };

  const guessCategory = (urlStr: string): any => {
    const lower = urlStr.toLowerCase();
    if (lower.includes("github.com")) return "github";
    if (lower.includes("docs") || lower.includes("developer")) return "docs";
    return "other";
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrlInput.trim()) return;

    const rawUrl = newUrlInput.trim();
    const validUrl = rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`;
    setIsAdding(true);
    
    try {
      const res = await fetch(`/api/urls/meta?url=${encodeURIComponent(validUrl)}`);
      let title = validUrl;
      if (res.ok) {
        const data = await res.json();
        if (data.title) title = data.title;
      }
      
      await addUrl({
        url: validUrl,
        label: title,
        category: guessCategory(validUrl)
      });
      setNewUrlInput("");
    } catch (err) {
      // Fallback
      await addUrl({ url: validUrl, label: validUrl, category: guessCategory(validUrl) });
      setNewUrlInput("");
    } finally {
      setIsAdding(false);
    }
  };

  const displayedUrls = isSearchActive && searchQuery
    ? urls.filter(u => u.label.toLowerCase().includes(searchQuery.toLowerCase()) || u.url.toLowerCase().includes(searchQuery.toLowerCase()))
    : urls;

  return (
    <div className="flex flex-col h-full text-foreground bg-[#0f0f11] rounded-xl overflow-hidden divide-y divide-border/40 border border-border/40">
      {/* Header */}
      <div className="px-3 py-2 flex items-center justify-between shrink-0 bg-[#0f0f11] h-10">
        {isSearchActive ? (
          <div className="flex-1 flex items-center gap-2">
            <Search className="w-3 h-3 text-muted-foreground shrink-0" />
            <Input 
              autoFocus
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search links..."
              className="h-6 text-[11px] bg-transparent border-0 focus-visible:ring-0 p-0 shadow-none placeholder:text-muted-foreground/50 w-full"
            />
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link2 className="w-3.5 h-3.5 text-foreground/80" />
            <h3 className="text-xs font-semibold tracking-tight text-foreground/90">Links</h3>
          </div>
        )}
        <button 
          onClick={() => {
            setIsSearchActive(!isSearchActive);
            if (isSearchActive) setSearchQuery("");
          }}
          className={`p-1 rounded hover:bg-white/5 transition-colors shrink-0 ml-2 ${isSearchActive ? 'text-foreground' : 'text-muted-foreground'}`}
        >
          {isSearchActive ? <X className="w-3.5 h-3.5" /> : <Search className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Quick Copy Action Bar */}
      <div className="px-2 py-2 shrink-0 bg-[#141416] flex justify-between gap-1 border-b border-border/40">
        <button
          onClick={(e) => handleQuickCopy(e, "https://coderkavyag.me", "portfolio")}
          title="Copy Portfolio Link"
          className="flex-1 flex items-center justify-center gap-1.5 h-7 rounded-md bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground transition-all text-[10px] font-medium border border-white/5"
        >
          {copiedId === "portfolio" ? <Check className="w-3 h-3 text-green-400" /> : <Briefcase className="w-3 h-3" />}
          <span>Portfolio</span>
        </button>
        <button
          onClick={(e) => handleQuickCopy(e, "https://linkedin.com/in/coderkavyag", "linkedin")}
          title="Copy LinkedIn Link"
          className="flex-1 flex items-center justify-center gap-1.5 h-7 rounded-md bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground transition-all text-[10px] font-medium border border-white/5"
        >
          {copiedId === "linkedin" ? <Check className="w-3 h-3 text-green-400" /> : <User className="w-3 h-3" />}
          <span>LinkedIn</span>
        </button>
        <button
          onClick={(e) => handleQuickCopy(e, "https://x.com/coderkavyag", "twitter")}
          title="Copy X (Twitter) Link"
          className="flex-1 flex items-center justify-center gap-1.5 h-7 rounded-md bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground transition-all text-[10px] font-medium border border-white/5"
        >
          {copiedId === "twitter" ? <Check className="w-3 h-3 text-green-400" /> : <MessageSquare className="w-3 h-3" />}
          <span>Twitter</span>
        </button>
      </div>

      <ScrollArea className="flex-1 min-h-0 w-full overflow-y-auto custom-scrollbar p-2">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={displayedUrls.map(u => u.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-2 gap-1.5">
              {displayedUrls.map(u => (
                <SortableLinkItem 
                  key={u.id} 
                  url={u} 
                  onCopy={handleCopy} 
                  copiedId={copiedId}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </ScrollArea>

      {/* Add Row */}
      <div className="p-3 shrink-0 bg-[#0f0f11] relative border-t border-border/40">
        <form onSubmit={handleAddSubmit} className="relative flex items-center group">
          <div className="absolute left-3 text-muted-foreground group-focus-within:text-foreground transition-colors">
            <Link2 className="w-3.5 h-3.5" />
          </div>
          <Input 
            value={newUrlInput}
            onChange={e => setNewUrlInput(e.target.value)}
            disabled={isAdding}
            placeholder="Paste URL..."
            className="h-9 pl-9 pr-10 text-[11px] bg-[#141416] border border-white/10 rounded-lg focus-visible:ring-1 focus-visible:ring-white/20 placeholder:text-muted-foreground/60 w-full transition-all"
          />
          <div className="absolute right-1">
            <button
              type="submit"
              disabled={isAdding || !newUrlInput.trim()}
              className="w-7 h-7 rounded-md flex items-center justify-center bg-white/10 hover:bg-white/20 text-foreground disabled:opacity-50 disabled:hover:bg-white/10 transition-all shadow-sm border border-white/5"
            >
              {isAdding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            </button>
          </div>
        </form>
      </div>

      {/* Copy Toast */}
      <AnimatePresence>
        {copiedId && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            className="absolute bottom-14 left-1/2 -translate-x-1/2 bg-green-500/90 text-white px-3 py-1.5 rounded-full text-[10px] font-bold shadow-lg pointer-events-none z-50 flex items-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5" /> Link Copied!
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
