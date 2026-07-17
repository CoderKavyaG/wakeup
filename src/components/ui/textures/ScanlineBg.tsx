import React from "react";

export function ScanlineBg() {
  return (
    <div 
      className="absolute inset-0 pointer-events-none opacity-[0.015] z-0"
      style={{
        backgroundImage: "repeating-linear-gradient(0deg, var(--text-primary) 0px, var(--text-primary) 1px, transparent 1px, transparent 4px)",
        backgroundSize: "100% 4px",
      }}
    />
  );
}
