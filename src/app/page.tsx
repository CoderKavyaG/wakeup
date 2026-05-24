"use client";

import React from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { GridWorkspace } from "@/components/layout/GridWorkspace";

export default function Home() {
  return (
    <DashboardShell>
      <GridWorkspace />
    </DashboardShell>
  );
}
