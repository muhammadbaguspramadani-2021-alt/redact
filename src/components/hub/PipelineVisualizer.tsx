'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Loader2, Clock, AlertCircle } from 'lucide-react';
import type { PipelineEvent, StageStatus } from '@/lib/types';

interface PipelineVisualizerProps {
  events: PipelineEvent[];
  isRunning: boolean;
}

const STAGE_ORDER: PipelineEvent['stage'][] = ['transcription', 'translation', 'ocr', 'llm', 'crypto'];

const STAGE_META: Record<PipelineEvent['stage'], { label: string; module: string; color: string }> = {
  transcription: { label: 'WHISPER_TRANSCRIPTION', module: '@qvac/sdk (whisper)', color: 'text-blue-400' },
  translation:   { label: 'NMT_TRANSLATION',       module: '@qvac/sdk (translate)', color: 'text-purple-400' },
  ocr:           { label: 'OCR_EXTRACTION',         module: '@qvac/sdk (ocr)', color: 'text-amber-400' },
  llm:           { label: 'LLM_ENTITY_EXTRACT',     module: '@qvac/sdk (llm)', color: 'text-emerald-400' },
  crypto:        { label: 'AES256_LOCKDOWN',         module: 'node:crypto (local)', color: 'text-highlight' },
};

function StatusIcon({ status }: { status: StageStatus }) {
  if (status === 'complete') return <CheckCircle2 size={16} className="text-emerald-500" />;
  if (status === 'running')  return <Loader2 size={16} className="text-accent animate-spin" />;
  if (status === 'error')    return <AlertCircle size={16} className="text-danger" />;
  return <Clock size={16} className="text-gray-600" />;
}

export function PipelineVisualizer({ events, isRunning }: PipelineVisualizerProps) {
  const eventMap = new Map(events.map(e => [e.stage, e]));

  const getStatus = (stage: PipelineEvent['stage']): StageStatus => {
    const e = eventMap.get(stage);
    if (e) return e.status;
    // Find stage index, determine if it should be running next
    const idx = STAGE_ORDER.indexOf(stage);
    const lastCompleted = events.filter(e => e.status === 'complete').length;
    if (isRunning && idx === lastCompleted) return 'running';
    return 'idle';
  };

  const hasPipelineError = events.some((e) => e.status === 'error');

  if (!isRunning && events.length === 0) {
    return (
      <div className="glass tech-border p-6 space-y-4 hover:shadow-[0_0_20px_rgba(64,138,113,0.15)] transition-shadow duration-500 rounded-sm">
        <div className="text-[9px] font-black text-accent tracking-[0.4em] uppercase border-b border-accent/20 pb-4">{'// PIPELINE_STATUS'}</div>
        <div className="flex flex-col items-center justify-center py-8 space-y-4 opacity-30">
          <div className="w-8 h-8 border-2 border-dashed border-accent/30 flex items-center justify-center">
            <div className="w-2 h-2 bg-accent/50" />
          </div>
          <p className="text-[11px] text-gray-500 font-mono tracking-widest uppercase text-center">Awaiting Evidence Input</p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass tech-border p-6 space-y-4 hover:shadow-[0_0_20px_rgba(64,138,113,0.15)] transition-shadow duration-500 rounded-sm">
      <div className="flex items-center justify-between border-b border-accent/20 pb-4">
        <div className="text-[9px] font-black text-accent tracking-[0.4em] uppercase">{'// PIPELINE_STATUS'}</div>
        {isRunning && (
          <div className="flex items-center gap-2 text-[9px] font-mono text-accent animate-pulse">
            <Loader2 size={10} className="animate-spin" />
            PROCESSING
          </div>
        )}
        {!isRunning && events.length > 0 && (
          hasPipelineError ? (
            <div className="flex items-center gap-2 text-[9px] font-mono text-amber-400">
              <AlertCircle size={10} />
              FINISHED_WITH_ERRORS
            </div>
          ) : (
            <div className="flex items-center gap-2 text-[9px] font-mono text-emerald-500">
              <CheckCircle2 size={10} />
              ALL_STAGES_OK
            </div>
          )
        )}
      </div>

      <div className="space-y-2 font-mono">
        {STAGE_ORDER.map((stage, i) => {
          const event = eventMap.get(stage);
          const status = getStatus(stage);
          const meta = STAGE_META[stage];
          const isActive = status === 'running';
          const isDone = status === 'complete';
          const isFailed = status === 'error';

          return (
            <motion.div
              key={stage}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: status === 'idle' ? 0.4 : 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`relative p-3 border transition-all duration-500 ${
                isActive ? 'border-accent/50 bg-accent/10 shadow-[0_0_15px_rgba(64,138,113,0.2)]' :
                isFailed ? 'border-danger/40 bg-danger/5 hover:bg-danger/10' :
                isDone   ? 'border-accent/20 bg-void/40 hover:bg-accent/5' :
                           'border-white/5'
              } rounded-sm group`}
            >
              {/* Active scanning line */}
              {isActive && (
                <motion.div
                  animate={{ left: ['0%', '100%'] }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                  className="absolute top-0 w-12 h-full bg-gradient-to-r from-transparent via-accent/20 to-transparent pointer-events-none"
                />
              )}

              <div className="flex items-center gap-3">
                <StatusIcon status={status} />
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-[10px] font-black uppercase tracking-widest ${isDone ? meta.color : isActive ? 'text-accent' : 'text-gray-600'}`}>
                      {meta.label}
                    </span>
                    {event?.durationMs && (
                      <span className="text-[9px] text-gray-600 shrink-0">
                        {event.durationMs}ms
                      </span>
                    )}
                  </div>
                  
                  <div className="text-[9px] text-gray-600 truncate">{meta.module}</div>
                  
                  <AnimatePresence>
                    {event?.output && (isDone || isFailed) && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className={`mt-2 text-[10px] leading-relaxed break-all border-l-2 pl-2 ${
                          isFailed ? 'text-danger/90 border-danger/40' : 'text-gray-400 border-accent/30'
                        }`}
                      >
                        {event.output}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
