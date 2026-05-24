"use client";

import React, { useEffect } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { GridWorkspace } from "@/components/layout/GridWorkspace";
import { useLayoutStore } from "@/store/useLayoutStore";
import { useTaskStore } from "@/store/useTaskStore";
import { useNoteStore } from "@/store/useNoteStore";
import { useUrlStore } from "@/store/useUrlStore";
import { useProjectStore } from "@/store/useProjectStore";

export default function Home() {
  const fetchLayout = useLayoutStore((s) => s.fetchLayout);
  const fetchTasks = useTaskStore((s) => s.fetchTasks);
  const fetchNotes = useNoteStore((s) => s.fetchNotes);
  const fetchUrls = useUrlStore((s) => s.fetchUrls);
  const fetchProjects = useProjectStore((s) => s.fetchProjects);

  useEffect(() => {
    // Bootstrap data fetch from persistent PostgreSQL database
    fetchLayout();
    fetchTasks();
    fetchNotes();
    fetchUrls();
    fetchProjects();
  }, [fetchLayout, fetchTasks, fetchNotes, fetchUrls, fetchProjects]);

  return (
    <DashboardShell>
      <GridWorkspace />
    </DashboardShell>
  );
}
