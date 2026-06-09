# DevOS — Agent Context File
# For: Cursor, GitHub Copilot, Gemini Code Assist, Windsurf, and other AI coding tools
# Same content as CLAUDE.md — maintained in sync
# DO NOT COMMIT

## Project
DevOS (repo: wakeup) — a personal developer OS built by Kavya (India, student dev).
Electron + Next.js 14 + TailwindCSS v4 + Prisma/PostgreSQL + Zustand + Groq AI.
Local Express agent on port 3131. Single-user desktop app, potential future SaaS.

## Stack Quick Reference
- Next.js App Router, React 19, TypeScript strict mode
- TailwindCSS v4 (no config file, use CSS vars, @theme in globals.css)
- Prisma + local PostgreSQL
- Zustand for all state (no React Query, no Context API)
- Groq llama-3.3-70b-versatile (fast/free) + OpenRouter fallback
- react-grid-layout for widget grid
- Framer Motion for all animations
- lucide-react for icons only

## What NOT to do
- No terminal widget (removed)
- No left sidebar (removed)
- No clock widget (replaced by AmbientBar)
- No individual widget data fetching on mount (use /api/bootstrap)
- No TailwindCSS v3 patterns
- No OpenAI SDK (use `ai` package)
- No blocking AI calls in UI

## Auth pattern
Every API route starts with:
  const session = await auth()
  if (!session?.user?.id) return Response.json({ error: 'unauthorized' }, { status: 401 })
  const userId = session.user.id

## Color system
background: #0f0f11
borders: border-white/[0.05] or border-white/10
text-primary: text-white
text-secondary: text-white/60
text-tertiary: text-white/30
accent: purple-500 / purple-400
success: green-400
warning: amber-400
danger: red-400

## See CLAUDE.md for full context