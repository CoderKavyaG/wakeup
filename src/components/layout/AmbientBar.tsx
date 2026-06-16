'use client'
import { useEffect, useState } from 'react'
import { useBootstrapStore } from '@/store/useBootstrapStore'
import { useTaskStore } from '@/store/useTaskStore'

export default function AmbientBar() {
  const [time, setTime] = useState({ ist: '', ny: '', sf: '', date: '', day: '' })
  const derived = useBootstrapStore(s => s.derived)
  const tasks = useTaskStore(s => s.tasks)

  useEffect(() => {
    const update = () => {
      const now = new Date()
      const ist = now.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false })
      const ny = now.toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit', hour12: true })
      const sf = now.toLocaleTimeString('en-US', { timeZone: 'America/Los_Angeles', hour: '2-digit', minute: '2-digit', hour12: true })
      const date = now.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
      const day = now.toLocaleDateString('en-IN', { weekday: 'long' })
      setTime({ ist, ny, sf, date, day })
    }
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [])

  const todayTaskCount = derived?.todayTasks.length ?? 0
  const overdueCount = derived?.totalOverdue ?? 0
  const staleCount = derived?.totalStale ?? 0
  const vercel = useBootstrapStore(s => s.vercel)
  const failedDeploy = vercel?.deployments?.find((dep: any) => {
    const projectDeps = vercel.deployments.filter((d: any) => d.name === dep.name)
    const latestDep = projectDeps.reduce((latest: any, current: any) => {
      if (!latest) return current
      const latestTime = new Date(latest.created).getTime()
      const currentTime = new Date(current.created).getTime()
      return currentTime > latestTime ? current : latest
    }, null)
    
    const isLatest = latestDep === dep
    if (!isLatest) return false
    
    const state = dep.state?.toUpperCase()
    return state === "ERROR" || state === "FAILED"
  })
  return (
    <div className="w-full h-10 flex items-center justify-between px-4 border-b border-white/[0.04] bg-[#0a0a0f] select-none shrink-0 z-30">

      {/* Left: time cluster */}
      <div className="flex items-center gap-5">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-mono text-white font-medium">{time.ist}</span>
          <span className="text-[10px] text-white/30 font-mono">IST</span>
        </div>
        <div className="w-px h-3 bg-white/10" />
        <span className="text-xs text-white/40 font-mono">{time.day}, {time.date}</span>
        <div className="w-px h-3 bg-white/10" />
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-white/25 font-mono">NY {time.ny}</span>
          <span className="text-[11px] text-white/25 font-mono">SF {time.sf}</span>
        </div>
      </div>

      {/* Right: live signals */}
      <div className="flex items-center gap-3">
        {failedDeploy && (
          <span className="text-[11px] text-red-400/85 flex items-center gap-1 font-mono uppercase font-bold bg-red-400/10 px-2 py-0.5 rounded border border-red-500/20" title={`Failed deployment for ${failedDeploy.name}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse inline-block" />
            deploy failed: {failedDeploy.name}
          </span>
        )}
        {overdueCount > 0 && (
          <span className="text-[11px] text-red-400/80 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" />
            {overdueCount} overdue
          </span>
        )}
        {todayTaskCount > 0 && (
          <span className="text-[11px] text-white/40 flex items-center gap-1">
            {todayTaskCount} today
          </span>
        )}
        {staleCount > 0 && (
          <span className="text-[11px] text-amber-400/60 flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-amber-400 inline-block" />
            {staleCount} stale
          </span>
        )}
        {/* Session briefing summary if active */}
        <SessionBriefingInline />
      </div>

    </div>
  )
}

// Inline version of the session briefing — just the typewriter text, no separate bar
function SessionBriefingInline() {
  const [show, setShow] = useState(false);
  const [briefText, setBriefText] = useState("");
  const [displayedBrief, setDisplayedBrief] = useState("");
  const [insights, setInsights] = useState<any[]>([]);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    const lastVisit = localStorage.getItem("devos_last_visit");
    const now = Date.now();
    const gap = lastVisit ? now - parseInt(lastVisit) : Infinity;

    const initializeBriefing = async () => {
      try {
        if (gap > 7200000) {
          // Refresh insights in DB if more than 2 hours
          await fetch("/api/intelligence", { method: "POST" });
        }
        
        // Fetch current active, unread insights
        const res = await fetch("/api/intelligence");
        if (res.ok) {
          const data = await res.json();
          setInsights(data);
          
          const dailyBrief = data.find((i: any) => i.type === "daily_brief");
          if (dailyBrief) {
            setBriefText(dailyBrief.content);
            setShow(true);
            
            // Set 60 seconds auto-fade timer
            const fadeTimer = setTimeout(() => {
              setIsFading(true);
              setTimeout(() => {
                setShow(false);
              }, 1000); // Allow fade animation to complete
            }, 60000);

            return () => clearTimeout(fadeTimer);
          }
        }
      } catch (err) {
        console.error("Failed to compile session briefing inline", err);
      }
    };

    initializeBriefing();
  }, []);

  // Typewriter effect
  useEffect(() => {
    if (!briefText || !show) return;
    
    let i = 0;
    setDisplayedBrief("");
    
    const timer = setInterval(() => {
      setDisplayedBrief((prev) => prev + briefText.charAt(i));
      i++;
      if (i >= briefText.length) {
        clearInterval(timer);
      }
    }, 20);

    return () => clearInterval(timer);
  }, [briefText, show]);

  const handleDismiss = async () => {
    localStorage.setItem("devos_last_visit", Date.now().toString());
    setIsFading(true);
    setTimeout(() => {
      setShow(false);
    }, 500);

    // Mark all as read
    try {
      await Promise.all(
        insights.map((insight: any) =>
          fetch(`/api/intelligence/${insight.id}`, { method: "PATCH" })
        )
      );
    } catch (e) {
      console.error(e);
    }
  };

  if (!show || !displayedBrief) return null;

  return (
    <div className={`flex items-center gap-2 max-w-xl transition-opacity duration-1000 ${isFading ? 'opacity-0' : 'opacity-100'}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
      <span className="text-[11px] text-amber-300 font-sans truncate" title={briefText}>
        {displayedBrief}
        {displayedBrief.length < briefText.length && (
          <span className="inline-block w-1 h-3 bg-amber-500 ml-0.5 animate-pulse align-middle" />
        )}
      </span>
      <button 
        onClick={handleDismiss} 
        className="text-white/30 hover:text-white/70 transition-colors shrink-0 ml-1 cursor-pointer"
        title="Dismiss briefing"
      >
        <span className="text-xs font-bold font-mono">×</span>
      </button>
    </div>
  );
}
