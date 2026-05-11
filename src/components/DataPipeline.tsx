'use client';
import { motion } from 'framer-motion';
import { FileText, Mic, Languages, Search, Binary, ArrowRight } from 'lucide-react';

export function DataPipeline() {
  const steps = [
    { icon: Mic, label: 'Audio', color: 'text-blue-400', detail: 'Whisper_V3' },
    { icon: FileText, label: 'OCR', color: 'text-amber-400', detail: 'ONNX_RT' },
    { icon: Languages, label: 'Translate', color: 'text-purple-400', detail: 'NMT_Node' },
    { icon: Search, label: 'Extract', color: 'text-emerald-400', detail: 'Llama_LLM' },
    { icon: Binary, label: 'Anchor', color: 'text-highlight', detail: 'Solana_TX' },
  ];

  return (
    <div className="w-full py-20 px-4 relative">
      {/* Background Pipeline Path */}
      <div className="absolute top-1/2 left-0 w-full h-[1px] bg-accent/10 -translate-y-1/2 hidden md:block" />
      
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-12 md:gap-4 relative">
        {steps.map((step, i) => (
          <div key={i} className="relative z-10 flex flex-col items-center group w-full md:w-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              whileInView={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ 
                delay: i * 0.15,
                type: "spring",
                stiffness: 100,
                damping: 15
              }}
              whileHover={{ scale: 1.1 }}
              className={`w-20 h-20 rounded-xl glass tech-border flex items-center justify-center ${step.color} group-hover:neon-border transition-all duration-500 bg-void/80 shadow-2xl relative cursor-help`}
            >
              <step.icon size={28} strokeWidth={1.5} />
              
              {/* Dynamic Aura */}
              <motion.div
                animate={{ 
                  scale: [1, 1.4, 1],
                  opacity: [0.2, 0, 0.2] 
                }}
                transition={{ repeat: Infinity, duration: 3, delay: i * 0.5 }}
                className="absolute inset-0 rounded-xl bg-current opacity-10 blur-md"
              />

              {/* Step Number */}
              <div className="absolute -top-2 -right-2 w-5 h-5 bg-black border border-accent/30 flex items-center justify-center text-[8px] font-black text-accent">
                0{i + 1}
              </div>
            </motion.div>
            
            <div className="mt-6 flex flex-col items-center gap-1">
              <motion.span 
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                transition={{ delay: i * 0.15 + 0.3 }}
                className="text-[11px] font-black uppercase tracking-[0.2em] text-white group-hover:text-highlight transition-colors"
              >
                {step.label}
              </motion.span>
              <motion.span 
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 0.4 }}
                transition={{ delay: i * 0.15 + 0.4 }}
                className="text-[9px] font-mono text-accent uppercase tracking-widest"
              >
                {step.detail}
              </motion.span>
            </div>
            
            {/* Animated Connector Arrow (Desktop) */}
            {i < steps.length - 1 && (
              <div className="absolute top-10 -right-[50%] w-full flex justify-center items-center pointer-events-none hidden md:flex">
                <motion.div
                  animate={{ 
                    x: [-10, 10, -10],
                    opacity: [0.2, 0.5, 0.2]
                  }}
                  transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                >
                  <ArrowRight size={16} className="text-accent/30" />
                </motion.div>
                
                {/* Flowing Pulse */}
                <motion.div
                  animate={{ 
                    left: ["0%", "100%"],
                    opacity: [0, 1, 0]
                  }}
                  transition={{ 
                    repeat: Infinity, 
                    duration: 1.5, 
                    ease: "linear",
                    delay: i * 0.5 
                  }}
                  className="absolute w-20 h-[1px] bg-gradient-to-r from-transparent via-highlight to-transparent"
                  style={{ top: '0%' }}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
