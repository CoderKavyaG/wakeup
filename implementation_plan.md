# Project OS — Visual Gravity Redesign Implementation Plan

This plan details the visual and engineering redesign of the Project OS Command Center. We are replacing the standard grid/curation list with a dynamic, canvas-based **2D gravity physics box** where projects are simulated as interactive bubbles. 

---

## User Review Required

> [!IMPORTANT]
> **Gravity Physics Interaction**: Projects are rendered as glowing circle bubbles with their names centered inside. Users can grab, drag, and throw bubbles.
> Dropping or throwing a bubble into a different column lane will dynamically update that project's phase in the database and local storage curation lists.

> [!NOTE]
> **UI Layout Simplifications**:
> - The 4 stats cards at the top of the dashboard are removed.
> - The top "Manage Board" action button is removed. Curation list removal is handled via hover "x" buttons on the individual canvas bubbles.
> - The left projects sidebar is hidden on the main dashboard and will only appear when a project detail view is opened.
> - A direct "+" inline button is added to each column header to create a project prefilled with that column's phase.

---

## Proposed Changes

### 1. Project Form Prefilling

#### [MODIFY] [ProjectOS.tsx](file:///c:/Users/Kavya/Projects/wakeup/src/components/layout/ProjectOS.tsx)
- Extend `ProjectFormModalProps` to support `defaultPhase?: "launched" | "in_development" | "sketching" | "idea"`.
- If `defaultPhase` is passed during creation, set the state `phase` to `defaultPhase`.

### 2. Layout Adjustments

#### [MODIFY] [ProjectOS.tsx](file:///c:/Users/Kavya/Projects/wakeup/src/components/layout/ProjectOS.tsx)
- **Hide left sidebar on Dashboard**: Change layout rendering to only render the sidebar `<div className="w-60 border-r...">` when `selectedProjectId` is NOT null. When null, the right main panel expands to fill the entire overlay.
- **Column Headers**: Add a "+" button in the header of each column. Clicking this button sets `createModalOpen = true` and sets `selectedDefaultPhase` to that column's phase.
- **Remove Header Actions**: Remove the "Manage Board" button from the top banner.
- **Remove Stats Row**: Delete the stats container rendering (`Curated Projects`, `Code Engines`, etc.).

### 3. Canvas Physics Implementation

#### [NEW] [ProjectPhysicsBox.tsx](file:///c:/Users/Kavya/Projects/wakeup/src/components/layout/ProjectPhysicsBox.tsx)
Create a new subcomponent for the canvas physics box:
- **Canvas initialization**: Sized dynamically to fill the parent lanes container.
- **Verlet Physics Loop**:
  - Gravitational force `vy += gravity` pulls bubbles down.
  - Wall boundaries check: constrained to individual column widths calculated as `colWidth = (canvasWidth - 3 * gap) / 4`.
  - Column boundaries: Column $i$ spans `[colLeft, colRight]` with appropriate gap margins.
  - Particle-particle collision resolution: Elastic bounces when bubbles hit other bubbles in the same lane.
- **Grab and Throw Mechanics**:
  - Track pointer position on the canvas.
  - On pointer down: select bubble under cursor. If clicked top-right close boundary, trigger curation hide action.
  - On pointer drag: follow mouse, track velocity vector `(vx, vy)`. Divider walls are ignored during drag so bubbles move continuously.
  - On pointer up: release bubble with velocity, check which column $j$ it was dropped in. If different, trigger DB/Zustand phase update.
- **Rendering details**:
  - Draw circles with smooth colors matching their phase theme:
    - Launched: `#4ade80` (green)
    - In Development: `#60a5fa` (blue)
    - Sketching: `#fbbf24` (amber)
    - Idea Phase: `#ffffff` (white/opacity)
  - Text: center project name inside circle, wrap/truncate text if needed.
  - Hover: render a subtle outline glow and a hover close "x" button at the top right of the hovered circle.

---

## Verification Plan

### Automated
```bash
npx tsc --noEmit          # Verify compile stability
```

### Manual
1. Open Project OS.
2. Verify stats cards are gone, and sidebar is hidden when on the main board view.
3. Observe project bubbles falling with gravity and bouncing off columns' walls and each other.
4. Click and drag a bubble, throw it around, and drop it into another column zone. Verify its phase updates in the background.
5. Click a "+" icon next to "Sketching" -> verify the new project form is prefilled with "Sketching".
6. Hover over a bubble -> verify close "x" button appears. Click it -> verify project is hidden from the board.
7. Click a bubble name -> verify Project detail view opens, and sidebar slides in.
