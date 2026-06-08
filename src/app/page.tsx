"use client";

import React, { useEffect } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { GridWorkspace } from "@/components/layout/GridWorkspace";
import { useBootstrapStore } from "@/store/useBootstrapStore";

export default function Home() {
  useEffect(() => {
    // Single bootstrap call replaces individual fetchTasks/fetchNotes/fetchProjects/fetchUrls/fetchLayout
    useBootstrapStore.getState().bootstrap();
  }, []);

  return (
    <DashboardShell>
      <GridWorkspace />
    </DashboardShell>
  );
}
