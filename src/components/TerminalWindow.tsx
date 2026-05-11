'use client';
import { motion } from 'framer-motion';
import { Terminal as TerminalIcon, Circle } from 'lucide-react';

interface TerminalWindowProps {
  title: string;
  lines: string[];
  className?: string;
  delay?: number;
}

export function TerminalWindow({ title, lines, className = "", delay = 0 }: TerminalWindowProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileInView={{
        opacity: [1, 0.95, 1],
        transition: { duration: 0.1, repeat: Infinity, repeatDelay: 4 }
      }}
      transition={{ delay, duration: 0.8, ease: "easeOut" }}
      className={`glass tech-border flex flex-col font-mono text-[10px] md:text-xs shadow-2xl ${className}`}
    >
      <div className="bg-accent/10 border-b border-accent/20 px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TerminalIcon size={12} className="text-accent animate-pulse" />
          <span className="text-highlight font-bold tracking-[0.1em] uppercase opacity-80">{title}</span>
        </div>
        <div className="flex gap-1.5">
          <Circle size={8} className="fill-red-500/30 text-red-500/50" />
          <Circle size={8} className="fill-yellow-500/30 text-yellow-500/50" />
          <Circle size={8} className="fill-accent/30 text-accent/50" />
        </div>
      </div>
      
      <div className="p-5 space-y-2 text-gray-400 bg-void/40 flex-1 overflow-y-auto max-h-[250px] relative">
        <div className="absolute inset-0 bg-scanlines opacity-[0.03] pointer-events-none" />
        {lines.map((line, i) => (
          <motion.div 
            initial={{ opacity: 0, x: -5 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: delay + 0.5 + (i * 0.1) }}
            key={i} 
            className="flex gap-2"
          >
            <span className="text-accent opacity-40 select-none">{">"}</span>
            <span className={`
              ${line.includes('✓') || line.includes('SUCCESS') ? 'text-highlight font-bold' : ''}
              ${line.includes('ERROR') || line.includes('WARNING') || line.includes('PENDING') ? 'text-amber-400/80' : ''}
              ${line.includes('0x') ? 'text-accent/80' : ''}
            `}>
              {line}
            </span>
          </motion.div>
        ))}
        <motion.span
          animate={{ opacity: [1, 0] }}
          transition={{ repeat: Infinity, duration: 0.6, ease: "easeInOut" }}
          className="inline-block w-2 h-3 bg-accent/60 ml-1 align-middle shadow-[0_0_8px_var(--color-accent)]"
        />
      </div>
      
      {/* Corner accents */}
      <div className="absolute top-0 right-10 w-4 h-[1px] bg-accent/20" />
      <div className="absolute bottom-0 left-10 w-4 h-[1px] bg-accent/20" />
    </motion.div>
  );
}
