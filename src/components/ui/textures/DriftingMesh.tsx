import React from "react";

export function DriftingMesh() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      <div 
        className="absolute w-[80vw] h-[80vw] md:w-[60vw] md:h-[60vw] rounded-full blur-[120px] bg-[radial-gradient(circle,var(--accent-glow)_0%,transparent_70%)] animate-drift opacity-60"
        style={{
          left: "20%",
          top: "10%",
        }}
      />
      <div 
        className="absolute w-[70vw] h-[70vw] md:w-[50vw] md:h-[50vw] rounded-full blur-[100px] bg-[radial-gradient(circle,rgba(124,92,252,0.15)_0%,transparent_75%)] animate-drift-reverse opacity-40"
        style={{
          right: "10%",
          bottom: "15%",
        }}
      />
    </div>
  );
}
