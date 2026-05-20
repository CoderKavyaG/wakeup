"use client";

import React, { useState } from "react";
import { useNoteStore } from "@/store/useNoteStore";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { FileText, Plus, Trash2, Calendar } from "lucide-react";

export function NotesWidget() {
  const { notes, addNote, deleteNote } = useNoteStore();
  const [content, setContent] = useState("");

  const handleSave = () => {
    if (!content.trim()) return;
    addNote(content.trim());
    setContent("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSave();
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 shrink-0">
        <div className="flex items-center space-x-2">
          <FileText className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold tracking-tight text-foreground">Brain Dump</h2>
        </div>
      </div>

      {/* Input / Fast Capture Flow */}
      <div className="relative mb-3 shrink-0">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Dump your thoughts... (Ctrl+Enter to save)"
          className="bg-popover border-border text-foreground placeholder:text-muted-foreground min-h-[75px] pr-12 focus:ring-1 focus:ring-primary/50 text-xs resize-none"
        />
        <Button
          onClick={handleSave}
          disabled={!content.trim()}
          size="icon"
          className="absolute bottom-2 right-2 w-8 h-8 rounded-lg bg-primary hover:bg-primary/90 text-white transition-all disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {/* Past Notes List */}
      <ScrollArea className="flex-1 -mx-2 px-2">
        <div className="space-y-3 pb-2">
          {notes.length === 0 ? (
            <div className="text-center py-8 text-xs text-muted-foreground">
              Your brain is empty. Jot something down.
            </div>
          ) : (
            notes.map((note) => (
              <div
                key={note.id}
                className="group relative p-3 rounded-lg border border-border/80 bg-popover/40 hover:border-primary/20 transition-all duration-200"
              >
                <p className="text-xs text-foreground whitespace-pre-wrap break-words pr-6">
                  {note.content}
                </p>
                <div className="flex items-center space-x-1.5 mt-2.5 text-[9px] text-muted-foreground/60">
                  <Calendar className="w-2.5 h-2.5" />
                  <span>{new Date(note.createdAt).toLocaleString()}</span>
                </div>

                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => deleteNote(note.id)}
                  className="absolute top-2 right-2 w-6 h-6 rounded-md opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

