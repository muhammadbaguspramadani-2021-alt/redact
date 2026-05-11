'use client';

export function ScanlineOverlay() {
  return (
    <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
      {/* Simple Scanline Pattern (Static) */}
      <div className="absolute inset-0 bg-scanlines opacity-[0.05]" />
      
      {/* Moving Scan Line (Thinner and simpler) */}
      <div className="scan-line" />
      
      {/* Corner Shadows */}
      <div className="absolute inset-0 shadow-[inset_0_0_120px_rgba(0,0,0,0.5)]" />
    </div>
  );
}
