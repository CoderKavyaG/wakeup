"use client";

import React, { useState } from "react";
import { useUrlStore, ResourceUrl } from "@/store/useUrlStore";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Link, Clipboard, Check, Plus, Trash2, ExternalLink } from "lucide-react";

export function UrlManagerWidget() {
  const { urls, addUrl, deleteUrl } = useUrlStore();
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [category, setCategory] = useState<ResourceUrl["category"]>("docs");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim() || !url.trim()) return;

    let formattedUrl = url.trim();
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = `https://${formattedUrl}`;
    }

    addUrl({
      label: label.trim(),
      url: formattedUrl,
      category,
    });

    setLabel("");
    setUrl("");
    setCategory("docs");
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const filteredUrls = activeCategory === "all" 
    ? urls 
    : urls.filter(u => u.category === activeCategory);

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case "docs": return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      case "deployment": return "bg-green-500/10 text-green-400 border-green-500/20";
      case "github": return "bg-purple-500/10 text-purple-400 border-purple-500/20";
      default: return "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-center space-x-2">
          <Link className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold tracking-wider uppercase text-secondary-foreground">Resource Links</h2>
        </div>
      </div>

      {/* Quick Add Form */}
      <form onSubmit={handleAdd} className="grid grid-cols-1 gap-2 mb-4 shrink-0 bg-popover/20 border border-border/50 rounded-lg p-2.5">
        <div className="flex gap-2">
          <Input
            placeholder="Label..."
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="h-8 text-xs bg-popover border-border text-foreground placeholder:text-muted-foreground flex-1"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as any)}
            className="h-8 px-2 rounded-md bg-popover border border-border text-foreground text-[11px] focus:outline-none w-24 shrink-0"
          >
            <option value="docs">Docs</option>
            <option value="deployment">Deploy</option>
            <option value="github">GitHub</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="URL (e.g. google.com)"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="h-8 text-xs bg-popover border-border text-foreground placeholder:text-muted-foreground flex-1"
          />
          <Button type="submit" size="sm" className="h-8 bg-primary hover:bg-primary/95 text-white w-12 shrink-0">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </form>

      {/* Category Filter Tabs */}
      <div className="flex items-center space-x-1 mb-3 shrink-0 overflow-x-auto pb-1 -mx-1 px-1">
        {["all", "docs", "deployment", "github", "other"].map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-2 py-1 rounded text-[10px] font-semibold uppercase border transition-all duration-150 shrink-0 ${
              activeCategory === cat
                ? "bg-primary border-primary text-white"
                : "bg-popover/40 border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* URL List */}
      <ScrollArea className="flex-1 -mx-2 px-2">
        <div className="space-y-2 pb-2">
          {filteredUrls.length === 0 ? (
            <div className="text-center py-8 text-xs text-muted-foreground">
              No links stored in this category.
            </div>
          ) : (
            filteredUrls.map((item) => (
              <div
                key={item.id}
                className="group flex items-center justify-between p-2.5 rounded-lg border border-border/80 bg-popover/40 hover:border-primary/20 transition-all duration-200"
              >
                <div className="min-w-0 flex-1 mr-3">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-xs font-bold text-foreground truncate">{item.label}</span>
                    <Badge variant="outline" className={`text-[8px] uppercase px-1 py-0 border leading-none scale-90 origin-left ${getCategoryColor(item.category)}`}>
                      {item.category}
                    </Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate font-mono mt-0.5">{item.url}</p>
                </div>

                <div className="flex items-center space-x-1 shrink-0">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleCopy(item.id, item.url)}
                    className="w-7 h-7 rounded-md text-muted-foreground hover:text-foreground"
                  >
                    {copiedId === item.id ? (
                      <Check className="w-3.5 h-3.5 text-green-400" />
                    ) : (
                      <Clipboard className="w-3.5 h-3.5" />
                    )}
                  </Button>
                  <a href={item.url} target="_blank" rel="noopener noreferrer">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="w-7 h-7 rounded-md text-muted-foreground hover:text-foreground"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Button>
                  </a>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => deleteUrl(item.id)}
                    className="w-7 h-7 rounded-md text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
