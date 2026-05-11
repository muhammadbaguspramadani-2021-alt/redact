'use client';
import { motion } from 'framer-motion';
import { LucideIcon, Cpu } from 'lucide-react';

interface ArchitectureNodeProps {
  id: string;
  name: string;
  title: string;
  desc: string;
  icon: LucideIcon;
  delay?: number;
}

export function ArchitectureNode({ id, name, title, desc, icon: Icon, delay = 0 }: ArchitectureNodeProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.6 }}
      whileHover={{ y: -5, scale: 1.02 }}
      className="glass tech-border p-6 group transition-all duration-500"
    >
      {/* Module ID Badge */}
      <div className="absolute top-0 right-0 bg-accent/20 border-l border-b border-accent/30 px-2 py-0.5 text-[9px] font-black text-highlight/60 tracking-widest">
        MOD_{id}
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="p-3 bg-accent/10 border border-accent/20 text-accent group-hover:text-highlight group-hover:bg-accent/20 transition-all duration-300">
              <Icon size={24} strokeWidth={1.5} />
            </div>
            {/* Animated Ring */}
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
              className="absolute -inset-1 border border-dashed border-accent/20 rounded-sm pointer-events-none"
            />
          </div>
          <div className="flex flex-col">
            <div className="text-[9px] text-accent font-black tracking-[0.2em] uppercase opacity-70 mb-1">{name}</div>
            <h4 className="text-white font-bold text-sm tracking-tight group-hover:text-highlight transition-colors">{title}</h4>
          </div>
        </div>

        <p className="text-xs text-gray-400 leading-relaxed min-h-[48px]">
          {desc}
        </p>
        
        <div className="pt-4 border-t border-accent/10 flex justify-between items-center">
          <div className="flex gap-1.5 items-center">
             <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
             <span className="text-[9px] text-emerald-500/80 font-bold uppercase tracking-widest">Active</span>
          </div>
          <div className="flex items-center gap-1 opacity-30 group-hover:opacity-100 transition-opacity">
            <Cpu size={10} className="text-accent" />
            <span className="text-[8px] text-gray-500 font-mono">NODE_OPTIMIZED</span>
          </div>
        </div>
      </div>

      {/* Decorative corners */}
      <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-accent/10" />
    </motion.div>
  );
}
