'use client';
import { motion } from 'framer-motion';
import { Target, AlertCircle } from 'lucide-react';

export function WorldMap() {
  const points = [
    { x: 78, y: 48, label: 'MYANMAR', status: 'BLACKOUT', threat: 'HIGH' },
    { x: 55, y: 52, label: 'SUDAN', status: 'CRITICAL', threat: 'EXTREME' },
    { x: 52, y: 42, label: 'GAZA', status: 'BLACKOUT', threat: 'CRITICAL' },
  ];

  return (
    <div className="relative w-full h-full min-h-[500px] flex items-center justify-center bg-dot-grid opacity-40">
      <div className="absolute inset-0 bg-gradient-radial from-transparent to-void opacity-60" />
      
      <svg viewBox="0 0 100 60" className="w-full h-auto max-w-5xl opacity-30 select-none">
        <path
          d="M10,20 Q20,10 30,15 T50,10 T70,20 T90,15 T95,30 T85,45 T60,50 T30,45 T10,35 Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.15"
          strokeDasharray="1 1"
          className="text-accent"
        />
        {points.map((pt, i) => (
          <motion.g
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 + i * 0.5 }}
          >
            <circle cx={pt.x} cy={pt.y} r="0.4" fill="var(--color-danger)" className="animate-pulse" />
            <circle cx={pt.x} cy={pt.y} r="3" fill="var(--color-danger)" opacity="0.05" />
            
            <foreignObject x={pt.x + 1} y={pt.y - 2} width="20" height="10">
              <div className="flex flex-col font-mono">
                <div className="text-[1.5px] text-highlight font-black tracking-widest">{pt.label}</div>
                <div className="flex items-center gap-[0.5px]">
                   <div className="w-[1px] h-[1px] bg-danger animate-ping rounded-full" />
                   <div className="text-[1px] text-danger font-bold uppercase">{pt.status}</div>
                </div>
              </div>
            </foreignObject>
          </motion.g>
        ))}
      </svg>
      
      {/* Side Info Panel */}
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        whileInView={{ opacity: 1, x: 0 }}
        className="absolute top-12 left-12 space-y-6 glass tech-border p-4 hidden lg:block"
      >
        <div className="flex items-center gap-3 border-b border-accent/20 pb-3">
          <Target className="text-accent" size={18} />
          <span className="text-[10px] font-black tracking-[0.3em] text-white">GLOBAL_INTEL_FEED</span>
        </div>
        <div className="space-y-4">
          {points.map((pt, i) => (
            <div key={i} className="flex justify-between items-center gap-12">
              <div className="flex flex-col">
                <span className="text-[10px] text-highlight font-bold uppercase tracking-tighter">{pt.label}</span>
                <span className="text-[8px] text-gray-500 font-mono">COORD: {pt.x}.0N / {pt.y}.0E</span>
              </div>
              <div className={`text-[9px] font-black px-2 py-0.5 border ${pt.threat === 'EXTREME' ? 'border-red-500 text-red-500 bg-red-500/10' : 'border-amber-500 text-amber-500 bg-amber-500/10'}`}>
                {pt.threat}
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      <div className="absolute bottom-12 right-12 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-danger shadow-[0_0_10px_var(--color-danger)] animate-pulse" />
          <span className="text-[10px] text-gray-300 font-black tracking-[0.2em] uppercase">High Frequency Blackout</span>
        </div>
        <div className="flex items-center gap-3 opacity-50">
          <div className="w-2 h-2 bg-accent" />
          <span className="text-[10px] text-gray-400 font-black tracking-[0.2em] uppercase">Verified Air-Gapped: 14</span>
        </div>
      </div>
    </div>
  );
}
