import React from "react";

export function VerticalStripes() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 select-none">
      {/* Grid of vertical lines/slats */}
      <div className="absolute inset-0 grid grid-cols-8 sm:grid-cols-16 md:grid-cols-24 opacity-[0.04]">
        {Array.from({ length: 24 }).map((_, i) => (
          <div key={i} className="h-full border-r border-dashed border-white/30" />
        ))}
      </div>

      {/* Soft color accents matching the palette at the edges */}
      <div 
        className="absolute w-[50vw] h-[50vw] md:w-[35vw] md:h-[35vw] rounded-full blur-[120px] opacity-30 bg-[radial-gradient(circle,rgba(151,194,236,0.3)_0%,transparent_70%)]"
        style={{
          left: "-10%",
          bottom: "-5%",
        }}
      />
      <div 
        className="absolute w-[40vw] h-[40vw] rounded-full blur-[130px] opacity-25 bg-[radial-gradient(circle,rgba(214,208,194,0.2)_0%,transparent_75%)]"
        style={{
          right: "5%",
          top: "10%",
        }}
      />
    </div>
  );
}
