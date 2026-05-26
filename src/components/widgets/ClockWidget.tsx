"use client";

import React, { useState, useEffect } from "react";
import { Clock } from "lucide-react";
import { useTaskStore } from "@/store/useTaskStore";

export function ClockWidget() {
  const [now, setNow] = useState(new Date());
  const [usTimezone, setUsTimezone] = useState<'America/New_York' | 'America/Los_Angeles'>('America/New_York');
  const tasks = useTaskStore(state => state.tasks);

  useEffect(() => {
    const savedTz = localStorage.getItem("CLOCK_US_TZ");
    if (savedTz === 'America/Los_Angeles') setUsTimezone(savedTz);

    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleToggle = () => {
    const newTz = usTimezone === 'America/New_York' ? 'America/Los_Angeles' : 'America/New_York';
    setUsTimezone(newTz);
    localStorage.setItem("CLOCK_US_TZ", newTz);
  };

  // Formatters
  const istTimeFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  
  const istDateFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  });

  const nyTimeFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const sfTimeFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  
  // Calculate if US city is nighttime (roughly 8 PM to 6 AM)
  const isNightTime = (tz: string) => {
    const hourFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour: "numeric",
      hour12: false,
    });
    const hour = parseInt(hourFormatter.format(now));
    return hour >= 22 || hour < 7;
  };

  const nyTime = nyTimeFormatter.format(now);
  const sfTime = sfTimeFormatter.format(now);
  const isNyNight = isNightTime("America/New_York");
  const isSfNight = isNightTime("America/Los_Angeles");

  // Get current week (Mon - Sun) based on IST
  const getWeekDays = () => {
    // Create a date object that represents the current time in IST
    const istString = now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
    const d = new Date(istString);
    const currentDay = d.getDay() === 0 ? 7 : d.getDay(); // 1 (Mon) to 7 (Sun)
    
    // Start of the week (Monday)
    const startOfWeek = new Date(d);
    startOfWeek.setDate(d.getDate() - currentDay + 1);
    
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      days.push(date);
    }
    return days;
  };

  const weekDays = getWeekDays();
  const currentIstDay = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Kolkata"})).getDate();

  // Check tasks due on a specific date string (YYYY-MM-DD in local time)
  const hasTaskDue = (dateObj: Date) => {
    // Format dateObj to YYYY-MM-DD
    const yyyy = dateObj.getFullYear();
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
    const dd = String(dateObj.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;
    
    return tasks.some(t => !t.completed && t.dueDate && t.dueDate.startsWith(dateStr));
  };

  return (
    <div className="flex flex-col h-full bg-[#0f0f11] text-white">
      {/* HEADER */}
      <div className="px-4 py-3 shrink-0 flex items-center gap-2 bg-[#0f0f11]">
        <Clock className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold tracking-tight">Clock & Time</h3>
      </div>

      <div className="flex-1 flex flex-col justify-between p-4 overflow-y-auto custom-scrollbar border-t border-border/40">
        {/* TOP SECTION: IST Time */}
        <div className="flex flex-col items-center justify-center mb-6 mt-2 shrink-0">
          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-mono tracking-tighter font-light text-white/90">
              {istTimeFormatter.format(now)}
            </span>
            <span className="text-xs font-bold text-primary tracking-widest uppercase">IST</span>
          </div>
          <span className="text-xs text-muted-foreground mt-1 font-medium">
            {istDateFormatter.format(now)}
          </span>
        </div>

        {/* MIDDLE SECTION: World Times */}
        <div className="bg-[#161618] rounded-lg p-3 mb-6 border border-white/5 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-1.5">
              <Clock className="w-3 h-3" /> World
            </span>
            <button 
              onClick={handleToggle}
              className="text-[9px] uppercase tracking-wider text-muted-foreground hover:text-white font-bold px-1.5 py-0.5 rounded border border-white/10 hover:border-white/30 transition-colors"
            >
              Toggle US
            </button>
          </div>
          
          <div className="flex flex-col gap-2.5">
            {usTimezone === 'America/New_York' ? (
              <>
                <div className={`flex justify-between items-center text-xs font-mono ${isNyNight ? 'text-white/30' : 'text-white/80'}`}>
                  <span>🌐 New York</span>
                  <span>{nyTime}</span>
                </div>
                <div className={`flex justify-between items-center text-xs font-mono ${isSfNight ? 'text-white/30' : 'text-white/80'}`}>
                  <span>🌐 San Francisco</span>
                  <span>{sfTime}</span>
                </div>
              </>
            ) : (
              <>
                <div className={`flex justify-between items-center text-xs font-mono ${isSfNight ? 'text-white/30' : 'text-white/80'}`}>
                  <span>🌐 San Francisco</span>
                  <span>{sfTime}</span>
                </div>
                <div className={`flex justify-between items-center text-xs font-mono ${isNyNight ? 'text-white/30' : 'text-white/80'}`}>
                  <span>🌐 New York</span>
                  <span>{nyTime}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* BOTTOM SECTION: Calendar strip */}
        <div className="flex justify-between items-center mt-auto px-1 shrink-0 pt-2 border-t border-white/5">
          {weekDays.map((d, i) => {
            const dayName = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getDay()].substring(0, 1);
            const isToday = d.getDate() === currentIstDay;
            const hasTask = hasTaskDue(d);
            return (
              <div key={i} className="flex flex-col items-center gap-1.5">
                <span className={`text-[9px] font-bold ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>
                  {dayName}
                </span>
                <div className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-medium relative ${isToday ? 'bg-white text-black' : 'text-white/60'}`}>
                  {d.getDate()}
                  {hasTask && (
                    <div className="absolute -bottom-2 w-1 h-1 rounded-full bg-primary" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
