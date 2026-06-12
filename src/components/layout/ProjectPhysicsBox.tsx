"use client";

import React, { useRef, useEffect, useState } from "react";
import { Project } from "@/store/useProjectStore";

const PHASES = [
  { id: 'launched', label: 'Launched' },
  { id: 'in_development', label: 'In Development' },
  { id: 'sketching', label: 'Sketching' },
  { id: 'idea', label: 'Idea Phase' },
];

interface PhysicsBubble {
  id: string;
  name: string;
  phase: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  isDragging: boolean;
}

interface ProjectPhysicsBoxProps {
  projects: Project[];
  searchQuery: string;
  onSelectProject: (id: string) => void;
  curatedLaunched: string[];
  curatedInDev: string[];
  curatedSketching: string[];
  curatedIdea: string[];
  onMoveProjectPhase: (projectId: string, newPhase: string) => void;
  onHideProject: (projectId: string, phase: string) => void;
}

export default function ProjectPhysicsBox({
  projects,
  searchQuery,
  onSelectProject,
  curatedLaunched,
  curatedInDev,
  curatedSketching,
  curatedIdea,
  onMoveProjectPhase,
  onHideProject,
}: ProjectPhysicsBoxProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const projectsRef = useRef<Project[]>(projects);

  useEffect(() => {
    projectsRef.current = projects;
  }, [projects]);


  // Maintain physics state in a ref to avoid React lag on the animation frame loop
  const stateRef = useRef<{
    bubbles: PhysicsBubble[];
    draggedId: string | null;
    hoveredId: string | null;
    isOverClose: boolean;
    mouse: { x: number; y: number };
    dragOffset: { x: number; y: number };
    prevDragMouse: { x: number; y: number };
    dimensions: { width: number; height: number };
  }>({
    bubbles: [],
    draggedId: null,
    hoveredId: null,
    isOverClose: false,
    mouse: { x: -1000, y: -1000 },
    dragOffset: { x: 0, y: 0 },
    prevDragMouse: { x: 0, y: 0 },
    dimensions: { width: 800, height: 500 },
  });

  // Load / Sync project database list to physics particles
  useEffect(() => {
    const state = stateRef.current;
    
    // Filter projects matching search and curation
    const activeCuratedList = projects.filter((p) => {
      // Must be curated in its phase
      const isCurated =
        (p.phase === "launched" && curatedLaunched.includes(p.id)) ||
        (p.phase === "in_development" && curatedInDev.includes(p.id)) ||
        (p.phase === "sketching" && curatedSketching.includes(p.id)) ||
        (p.phase === "idea" && curatedIdea.includes(p.id));

      if (!isCurated) return false;

      if (searchQuery) {
        const match = `${p.name} ${p.description || ""} ${(p.tags || []).join(" ")}`.toLowerCase();
        return match.includes(searchQuery.toLowerCase());
      }
      return true;
    });

    const gap = 16;
    const colWidth = Math.max(100, (state.dimensions.width - 3 * gap) / 4);

    // Sync state.bubbles with activeCuratedList
    const newBubbles: PhysicsBubble[] = [];
    activeCuratedList.forEach((proj) => {
      const existing = state.bubbles.find((b) => b.id === proj.id);
      
      const colIdx = PHASES.findIndex((ph) => ph.id === proj.phase);
      const colLeft = colIdx >= 0 ? colIdx * (colWidth + gap) : 0;
      const targetCenter = colLeft + colWidth / 2;

      let infoBonus = 0;
      if (proj.description) infoBonus += 8;
      if (proj.tags && proj.tags.length > 0) infoBonus += proj.tags.length * 3;
      if (proj.githubUrl || proj.liveUrl) infoBonus += 5;

      const baseRadius = 42 + Math.min(15, proj.name.length * 1.2) + Math.min(20, infoBonus);

      if (existing) {
        // Update name, radius, phase in case it shifted
        existing.name = proj.name;
        existing.radius = baseRadius;
        
        if (existing.phase !== proj.phase && !existing.isDragging) {
          // If phase changed externally, teleport particle to top center of new column
          existing.phase = proj.phase;
          existing.x = targetCenter + (Math.random() - 0.5) * 10;
          existing.y = baseRadius + 10;
          existing.vx = 0;
          existing.vy = 0;
        }
        newBubbles.push(existing);
      } else {
        // Spawn new particle at top center of column
        newBubbles.push({
          id: proj.id,
          name: proj.name,
          phase: proj.phase,
          x: targetCenter + (Math.random() - 0.5) * 10,
          y: baseRadius + 15,
          vx: 0,
          vy: 0,
          radius: baseRadius,
          isDragging: false,
        });
      }
    });

    state.bubbles = newBubbles;
  }, [projects, searchQuery, curatedLaunched, curatedInDev, curatedSketching, curatedIdea]);

  // Handle Canvas Resizing
  useEffect(() => {
    const handleResize = () => {
      const container = containerRef.current;
      const canvas = canvasRef.current;
      if (!container || !canvas) return;

      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;

      // Update ref dimensions
      stateRef.current.dimensions = { width: rect.width, height: rect.height };

      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;

      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.resetTransform();
        ctx.scale(dpr, dpr);
      }
    };

    handleResize();

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Main Physics loop
  useEffect(() => {
    let animId: number;
    
    const gravity = 0.25;
    const bounce = 0.45;
    const friction = 0.96;
    const gap = 16;

    const loop = () => {
      const state = stateRef.current;
      const canvas = canvasRef.current;
      if (!canvas) {
        animId = requestAnimationFrame(loop);
        return;
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        animId = requestAnimationFrame(loop);
        return;
      }

      const width = state.dimensions.width;
      const height = state.dimensions.height;
      const colWidth = Math.max(100, (width - 3 * gap) / 4);

      ctx.clearRect(0, 0, width, height);

      // 1. UPDATE PHYSICS VELOCITY & POSITION
      state.bubbles.forEach((b) => {
        if (b.isDragging) {
          // Grabbing velocity calculation
          b.vx = (state.mouse.x - state.prevDragMouse.x) * 0.7;
          b.vy = (state.mouse.y - state.prevDragMouse.y) * 0.7;
        } else {
          // Standard gravity + damping
          b.vy += gravity;
          b.vx *= 0.99;
          b.vy *= 0.99;

          b.x += b.vx;
          b.y += b.vy;

          // Wall / boundaries check based on its column phase index
          const colIdx = PHASES.findIndex((ph) => ph.id === b.phase);
          if (colIdx >= 0) {
            const colLeft = colIdx * (colWidth + gap);
            const colRight = colLeft + colWidth;

            // Constrain left/right boundary
            if (b.x - b.radius < colLeft) {
              b.x = colLeft + b.radius;
              b.vx = -b.vx * bounce;
            } else if (b.x + b.radius > colRight) {
              b.x = colRight - b.radius;
              b.vx = -b.vx * bounce;
            }

            // Bottom floor collision
            if (b.y + b.radius > height) {
              b.y = height - b.radius;
              b.vy = -b.vy * bounce;
              b.vx *= friction;
            }

            // Top ceiling collision
            if (b.y - b.radius < 0) {
              b.y = b.radius;
              b.vy = -b.vy * bounce;
            }
          }
        }
      });

      state.prevDragMouse = { ...state.mouse };

      // 2. BUBBLE TO BUBBLE COLLISIONS
      for (let i = 0; i < state.bubbles.length; i++) {
        for (let j = i + 1; j < state.bubbles.length; j++) {
          const bi = state.bubbles[i];
          const bj = state.bubbles[j];

          // Collide only if they are in the same phase column
          if (bi.phase !== bj.phase) continue;

          const dx = bj.x - bi.x;
          const dy = bj.y - bi.y;
          const distance = Math.hypot(dx, dy);
          const minDist = bi.radius + bj.radius;

          if (distance < minDist) {
            const overlap = minDist - distance;
            const nx = dx / (distance || 1);
            const ny = dy / (distance || 1);

            // Displace bubbles equally out of overlap
            bi.x -= nx * overlap * 0.5;
            bi.y -= ny * overlap * 0.5;
            bj.x += nx * overlap * 0.5;
            bj.y += ny * overlap * 0.5;

            // Elastic bounce resolution
            const rvx = bi.vx - bj.vx;
            const rvy = bi.vy - bj.vy;
            const velAlongNormal = rvx * nx + rvy * ny;

            if (velAlongNormal > 0) {
              const impulse = (1 + 0.3) * velAlongNormal / 2;
              bi.vx -= impulse * nx;
              bi.vy -= impulse * ny;
              bj.vx += impulse * nx;
              bj.vy += impulse * ny;
            }
          }
        }
      }

      // 3. RENDER ALL PARTICLES
      state.bubbles.forEach((p) => {
        const isHovered = state.hoveredId === p.id;

        // Base & stroke colors according to active project phase
        let baseColor = "rgba(255, 255, 255, 0.03)";
        let strokeColor = "rgba(255, 255, 255, 0.08)";
        let accentGlow = "rgba(255, 255, 255, 0.02)";

        if (p.phase === "launched") {
          baseColor = "rgba(74, 222, 128, 0.04)";
          strokeColor = "rgba(74, 222, 128, 0.2)";
          accentGlow = "rgba(74, 222, 128, 0.03)";
        } else if (p.phase === "in_development") {
          baseColor = "rgba(96, 165, 250, 0.04)";
          strokeColor = "rgba(96, 165, 250, 0.2)";
          accentGlow = "rgba(96, 165, 250, 0.03)";
        } else if (p.phase === "sketching") {
          baseColor = "rgba(251, 191, 36, 0.04)";
          strokeColor = "rgba(251, 191, 36, 0.2)";
          accentGlow = "rgba(251, 191, 36, 0.03)";
        }

        if (isHovered) {
          baseColor = baseColor.replace("0.04", "0.08").replace("0.02", "0.06");
          strokeColor = strokeColor.replace("0.2", "0.5").replace("0.08", "0.35");
          accentGlow = accentGlow.replace("0.03", "0.08");
        }

        // Draw shadow glow if hovered
        if (isHovered) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius + 6, 0, 2 * Math.PI);
          ctx.fillStyle = accentGlow;
          ctx.fill();
        }

        // Main bubble path
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, 2 * Math.PI);
        ctx.fillStyle = baseColor;
        ctx.fill();

        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = isHovered ? 1.5 : 1;
        ctx.stroke();

        // Render project name text centered (support wrapping)
        ctx.fillStyle = isHovered ? "rgba(255, 255, 255, 0.95)" : "rgba(255, 255, 255, 0.65)";
        ctx.font = "600 11px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        const words = p.name.split(" ");
        let lines: string[] = [];
        let currentLine = words[0] || "";
        for (let i = 1; i < words.length; i++) {
          const testLine = currentLine + " " + words[i];
          const metrics = ctx.measureText(testLine);
          if (metrics.width > p.radius * 1.5) {
            lines.push(currentLine);
            currentLine = words[i];
          } else {
            currentLine = testLine;
          }
        }
        lines.push(currentLine);

        if (lines.length > 3) {
          lines = lines.slice(0, 2);
          lines[1] += "...";
        }

        const lineHeight = 14;
        const startY = p.y - ((lines.length - 1) * lineHeight) / 2;
        lines.forEach((line, idx) => {
          ctx.fillText(line, p.x, startY + idx * lineHeight);
        });

        // Hover close "x" button top right
        if (isHovered) {
          const angle = -Math.PI / 4;
          const cx = p.x + p.radius * Math.cos(angle);
          const cy = p.y + p.radius * Math.sin(angle);
          const btnRad = 9;

          ctx.beginPath();
          ctx.arc(cx, cy, btnRad, 0, 2 * Math.PI);
          ctx.fillStyle = state.isOverClose ? "rgba(239, 68, 68, 0.85)" : "rgba(255, 255, 255, 0.12)";
          ctx.strokeStyle = state.isOverClose ? "#ef4444" : "rgba(255, 255, 255, 0.25)";
          ctx.lineWidth = 1;
          ctx.fill();
          ctx.stroke();

          // draw cross lines
          ctx.beginPath();
          const crs = 3;
          ctx.moveTo(cx - crs, cy - crs);
          ctx.lineTo(cx + crs, cy + crs);
          ctx.moveTo(cx + crs, cy - crs);
          ctx.lineTo(cx - crs, cy + crs);
          ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      });

      // 4. UPDATE TOOLTIP POSITION AND CONTENT
      const tooltip = tooltipRef.current;
      if (tooltip) {
        if (state.hoveredId && !state.isOverClose) {
          const bubble = state.bubbles.find((b) => b.id === state.hoveredId);
          const proj = projectsRef.current.find((p) => p.id === state.hoveredId);
          if (bubble && proj) {
            tooltip.style.display = "block";
            tooltip.style.left = `${bubble.x}px`;
            tooltip.style.top = `${bubble.y - bubble.radius - 12}px`;
            
            // Set content
            const titleEl = tooltip.querySelector(".tooltip-title");
            if (titleEl) titleEl.textContent = proj.name;

            const typeEl = tooltip.querySelector(".tooltip-type");
            if (typeEl) typeEl.textContent = proj.type || "code";

            const descEl = tooltip.querySelector(".tooltip-desc") as HTMLParagraphElement;
            if (descEl) {
              if (proj.description) {
                descEl.textContent = proj.description;
                descEl.style.display = "-webkit-box";
              } else {
                descEl.style.display = "none";
              }
            }

            const priorityEl = tooltip.querySelector(".tooltip-priority");
            if (priorityEl) priorityEl.textContent = proj.priority || "medium";
          } else {
            tooltip.style.display = "none";
          }
        } else {
          tooltip.style.display = "none";
        }
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, []);

  // Helper: Get localized mouse position
  const getPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  // Pointer move updates dragging positions & hover checks
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getPos(e);
    const state = stateRef.current;
    state.mouse = pos;

    const canvas = canvasRef.current;

    if (state.draggedId) {
      const bubble = state.bubbles.find((b) => b.id === state.draggedId);
      if (bubble) {
        bubble.x = pos.x - state.dragOffset.x;
        bubble.y = pos.y - state.dragOffset.y;
      }
      if (canvas) {
        canvas.style.cursor = "grabbing";
      }
      return;
    }

    // Hover check
    let foundHoveredId: string | null = null;
    let overClose = false;

    // Check in reverse order so top-drawn element is picked first
    for (let i = state.bubbles.length - 1; i >= 0; i--) {
      const b = state.bubbles[i];
      const dist = Math.hypot(b.x - pos.x, b.y - pos.y);
      if (dist < b.radius) {
        foundHoveredId = b.id;

        // check top right close button
        const angle = -Math.PI / 4;
        const cx = b.x + b.radius * Math.cos(angle);
        const cy = b.y + b.radius * Math.sin(angle);
        const btnDist = Math.hypot(cx - pos.x, cy - pos.y);
        if (btnDist < 12) {
          overClose = true;
        }
        break;
      }
    }

    state.hoveredId = foundHoveredId;
    state.isOverClose = overClose;

    if (canvas) {
      if (overClose) {
        canvas.style.cursor = "pointer";
      } else if (foundHoveredId) {
        canvas.style.cursor = "grab";
      } else {
        canvas.style.cursor = "default";
      }
    }
  };

  // Pointer click triggers select, drag, or delete hide
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getPos(e);
    const state = stateRef.current;

    if (state.hoveredId) {
      const bubble = state.bubbles.find((b) => b.id === state.hoveredId);
      if (!bubble) return;

      if (state.isOverClose) {
        // Delete / Hide project from board
        onHideProject(bubble.id, bubble.phase);
        state.hoveredId = null;
        state.isOverClose = false;
      } else {
        // Select or start drag
        bubble.isDragging = true;
        state.draggedId = bubble.id;
        state.dragOffset = {
          x: pos.x - bubble.x,
          y: pos.y - bubble.y,
        };
        state.prevDragMouse = { ...pos };
      }
    }
  };

  // Pointer release triggers phase shifts
  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const state = stateRef.current;
    if (!state.draggedId) return;

    const bubble = state.bubbles.find((b) => b.id === state.draggedId);
    if (bubble) {
      bubble.isDragging = false;
      
      // Calculate dropped column zone
      const width = state.dimensions.width;
      const gap = 16;
      const colWidth = Math.max(100, (width - 3 * gap) / 4);
      
      // Find closest column index
      let targetColIdx = Math.floor(bubble.x / (colWidth + gap));
      targetColIdx = Math.max(0, Math.min(3, targetColIdx));

      const currentColIdx = PHASES.findIndex((ph) => ph.id === bubble.phase);
      const targetPhaseId = PHASES[targetColIdx].id;

      if (targetColIdx !== currentColIdx) {
        // Drop trigger column shift!
        onMoveProjectPhase(bubble.id, targetPhaseId);
      }
    }

    state.draggedId = null;
  };

  // Double click to open project
  const handleCanvasDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getPos(e);
    const state = stateRef.current;
    
    for (let i = state.bubbles.length - 1; i >= 0; i--) {
      const b = state.bubbles[i];
      const dist = Math.hypot(b.x - pos.x, b.y - pos.y);
      if (dist < b.radius) {
        onSelectProject(b.id);
        break;
      }
    }
  };

  const handleMouseLeave = () => {
    const state = stateRef.current;
    if (state.draggedId) {
      const bubble = state.bubbles.find((b) => b.id === state.draggedId);
      if (bubble) bubble.isDragging = false;
      state.draggedId = null;
    }
    state.hoveredId = null;
    state.isOverClose = false;
    state.mouse = { x: -1000, y: -1000 };
  };

  return (
    <div ref={containerRef} className="absolute inset-0 top-[50px] bottom-0 left-0 right-0 z-10 select-none">
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onDoubleClick={handleCanvasDoubleClick}
        onMouseLeave={handleMouseLeave}
        className="w-full h-full bg-transparent"
      />

      {/* High performance overlay tooltip */}
      <div
        ref={tooltipRef}
        className="absolute z-20 pointer-events-none transform -translate-x-1/2 -translate-y-full flex flex-col items-center gap-1"
        style={{ display: "none", left: 0, top: 0 }}
      >
        <div className="bg-[#121217]/95 backdrop-blur-md border border-white/[0.08] px-3.5 py-2.5 rounded-xl shadow-2xl w-[220px] text-left">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="tooltip-title text-[11px] font-bold text-white truncate max-w-[130px]">
              Project
            </span>
            <span className="tooltip-type text-[9px] uppercase font-bold font-mono tracking-wider px-1.5 py-0.5 rounded border border-white/[0.06] bg-white/[0.02] text-white/50">
              type
            </span>
          </div>
          
          <p className="tooltip-desc text-[10px] text-white/60 line-clamp-2 leading-relaxed mb-2" style={{ display: "none" }}>
            description
          </p>

          <div className="flex items-center gap-2 pt-1.5 border-t border-white/[0.04] text-[9px] text-white/40">
            <span>
              Priority: <span className="tooltip-priority text-white/60 capitalize">medium</span>
            </span>
            <span>•</span>
            <span className="text-purple-400 font-medium">Double-click to view</span>
          </div>
        </div>
        
        {/* Small arrow pointing down */}
        <div className="w-1.5 h-1.5 bg-[#121217] border-r border-b border-white/[0.08] rotate-45 -mt-1" />
      </div>
    </div>
  );
}
