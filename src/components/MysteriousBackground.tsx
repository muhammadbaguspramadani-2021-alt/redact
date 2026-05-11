'use client';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function MysteriousBackground() {
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; size: number; duration: number }[]>([]);

  useEffect(() => {
    // Reduced particle count for performance
    const newParticles = Array.from({ length: 12 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 1.5 + 1,
      duration: Math.random() * 15 + 10,
    }));
    setParticles(newParticles);
  }, []);

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-void">
      {/* 1. Base Noise Layer (Reduced opacity) */}
      <div className="absolute inset-0 bg-noise opacity-[0.02]" />
      
      {/* 2. Static Gradient (Instead of moving/blurred) */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(64,138,113,0.1),transparent_70%)]" />
      
      {/* 3. The Grid (Simplified) */}
      <div className="absolute inset-0 bg-grid opacity-[0.05]" />
      
      {/* 4. Dot Grid Overlay */}
      <div className="absolute inset-0 bg-dot-grid opacity-[0.05]" />

      {/* 5. Floating Data Particles (Simplified animation) */}
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ opacity: 0, x: `${p.x}%`, y: `${p.y}%` }}
          animate={{
            opacity: [0, 0.2, 0],
            y: [`${p.y}%`, `${p.y - 5}%`],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            ease: "linear",
          }}
          className="absolute w-1 h-1 bg-highlight rounded-full"
          style={{ width: p.size, height: p.size, willChange: 'transform, opacity' }}
        />
      ))}

      {/* 6. Static Radar Pings (No random delay for stability) */}
      <RadarPing x={20} y={30} delay={0} />
      <RadarPing x={80} y={60} delay={2} />

      {/* 7. Vignette */}
      <div className="absolute inset-0 shadow-[inset_0_0_100px_rgba(0,0,0,0.6)]" />
    </div>
  );
}

function RadarPing({ x, y, delay }: { x: number; y: number; delay: number }) {
  return (
    <div 
      className="absolute" 
      style={{ left: `${x}%`, top: `${y}%`, willChange: 'transform' }}
    >
      <div className="radar-ping" style={{ animationDelay: `${delay}s` }} />
    </div>
  );
}
