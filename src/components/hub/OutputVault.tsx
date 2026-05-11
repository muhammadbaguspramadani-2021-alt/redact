'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Lock, CheckSquare, Copy, ChevronDown, ChevronUp, FileText, ExternalLink, ClipboardList } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import type { EvidencePayload } from '@/lib/types';

interface OutputVaultProps {
  payload: EvidencePayload | null;
  onQueue: (payload: EvidencePayload) => void;
  queued: boolean;
}

export function OutputVault({ payload, onQueue, queued }: OutputVaultProps) {
  const [showReport, setShowReport] = useState(false);
  const [showOcr, setShowOcr] = useState(true);
  const [showSummary, setShowSummary] = useState(true);
  const [copied, setCopied] = useState(false);

  const copyHash = async () => {
    if (!payload?.hash) return;
    await navigator.clipboard.writeText(payload.hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!payload) {
    return (
      <div className="glass tech-border p-6">
        <div className="text-[9px] font-black text-accent tracking-[0.4em] uppercase border-b border-accent/20 pb-4">{'// OUTPUT_VAULT'}</div>
        <div className="flex flex-col items-center justify-center py-12 space-y-4 opacity-30">
          <Lock size={32} strokeWidth={1} className="text-accent" />
          <p className="text-[11px] text-gray-500 font-mono tracking-widest uppercase text-center">Vault Empty</p>
        </div>
      </div>
    );
  }

  const explorerTx = payload.txId ? `https://explorer.solana.com/tx/${payload.txId}?cluster=devnet` : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass tech-border p-6 space-y-5 hover:shadow-[0_0_25px_rgba(176,228,204,0.15)] transition-all duration-700 rounded-sm relative overflow-hidden group"
    >
      <div className="absolute inset-0 bg-gradient-to-tr from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none" />
      <div className="flex items-center justify-between border-b border-accent/20 pb-4">
        <div className="text-[9px] font-black text-accent tracking-[0.4em] uppercase">{'// OUTPUT_VAULT'}</div>
        <div className="flex items-center gap-2 px-2 py-1 bg-emerald-500/10 border border-emerald-500/20">
          <Lock size={10} className="text-emerald-500" />
          <span className="text-[9px] font-black text-emerald-500 tracking-widest">ENCRYPTED</span>
        </div>
      </div>

      {/* Incident ID */}
      <div className="space-y-1">
        <div className="text-[9px] text-gray-500 font-mono uppercase tracking-widest">Incident ID</div>
        <div className="font-mono text-sm text-highlight font-black">{payload.report.incidentId}</div>
        <p className="text-[9px] text-gray-600 leading-relaxed">
          Server-assign stable id — never reuse LLM placeholders like INC-XXXX.
        </p>
      </div>

      {payload.txId && explorerTx && (
        <div className="space-y-2 p-3 bg-emerald-500/10 border border-emerald-500/25">
          <div className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Anchored · Solana</div>
          <a href={explorerTx} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[10px] font-mono text-emerald-400 hover:text-highlight break-all">
            <ExternalLink size={12} className="shrink-0" />
            Tx: {payload.txId}
          </a>
          {payload.slot && (
            <div className="text-[9px] font-mono text-emerald-500/60 mt-1">
              Slot: #{payload.slot.toLocaleString()}
            </div>
          )}
        </div>
      )}

      {payload.upload?.status === 'uploaded' && payload.upload.url && (
        <div className="text-[9px] font-mono text-gray-400">
          Secure drop:<a href={payload.upload.url} className="ml-2 text-accent hover:underline break-all">{payload.upload.url}</a>
        </div>
      )}

      {/* SHA-256 Hash */}
      <div className="space-y-2 relative z-10">
        <div className="text-[9px] text-gray-500 font-mono uppercase tracking-widest">SHA-256 Hash</div>
        <div className="flex items-center gap-2 p-3 bg-void/60 border border-accent/20 hover:border-accent/50 transition-colors group/hash">
          <span className="font-mono text-[10px] text-highlight break-all leading-relaxed flex-1">
            0x{payload.hash}
          </span>
          <button onClick={copyHash} className="shrink-0 text-gray-500 hover:text-accent transition-colors">
            {copied ? <CheckSquare size={14} className="text-emerald-500" /> : <Copy size={14} />}
          </button>
        </div>
        <div className="flex items-center gap-2 text-[9px] font-mono text-gray-500">
          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
          SHA-256 via node:crypto · AES-256-GCM bundle locked
        </div>
      </div>

      {/* Severity */}
      <div className="flex items-center gap-3">
        <span className="text-[9px] text-gray-500 font-mono uppercase tracking-widest">Severity:</span>
        <span className={`text-[10px] font-black px-2 py-0.5 uppercase tracking-widest ${
          payload.report.severity === 'critical' ? 'bg-danger/20 text-danger border border-danger/30' :
          payload.report.severity === 'high'     ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                                                   'bg-accent/20 text-accent border border-accent/30'
        }`}>
          {payload.report.severity}
        </span>
        <span className="text-[9px] text-gray-500 font-mono ml-auto">Confidence: {(payload.report.confidence * 100).toFixed(0)}%</span>
      </div>

      {/* OCR extract — verbatim model output */}
      <div className="border border-amber-500/30 bg-amber-500/5">
        <button
          type="button"
          onClick={() => setShowOcr((v) => !v)}
          className="w-full flex items-center justify-between p-3 text-[10px] font-black text-amber-200/90 hover:text-amber-100 font-mono uppercase tracking-widest"
        >
          <span className="flex items-center gap-2"><FileText size={12} />OCR_RAW (verbatim)</span>
          {showOcr ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        <AnimatePresence>
          {showOcr && (
            <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden border-t border-amber-500/15">
              <pre className="p-4 font-mono text-[10px] text-gray-200 whitespace-pre-wrap break-words leading-relaxed max-h-72 overflow-y-auto">
                {payload.report.documentText || '(no OCR text)'}
              </pre>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* English jury summary — LLM from OCR (not Whisper) */}
      <div className="border border-accent/25">
        <button
          type="button"
          onClick={() => setShowSummary((v) => !v)}
          className="w-full flex items-center justify-between p-3 text-[10px] font-black text-gray-300 hover:text-highlight font-mono uppercase tracking-widest"
        >
          <span className="flex items-center gap-2"><ClipboardList size={12} />Document · English recap (LLM)</span>
          {showSummary ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        <AnimatePresence>
          {showSummary && (
            <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden border-t border-accent/15">
              <p className="p-4 text-[11px] text-gray-200 leading-relaxed">
                {(payload.report.documentSummaryEn ?? '').trim() || '(no summary — OCR empty or model skipped)'}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Structured Report Expandable */}
      <div className="border border-accent/20">
        <button
          onClick={() => setShowReport(v => !v)}
          className="w-full flex items-center justify-between p-3 text-[10px] font-black text-gray-400 hover:text-highlight transition-colors font-mono uppercase tracking-widest"
        >
          <span>Structured JSON Report</span>
          {showReport ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        <AnimatePresence>
          {showReport && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <pre className="p-4 bg-void/60 font-mono text-[10px] text-gray-300 overflow-x-auto leading-relaxed border-t border-accent/20 max-h-60 overflow-y-auto">
                {JSON.stringify(payload.report, null, 2)}
              </pre>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Queue for Anchoring */}
      <motion.button
        onClick={() => onQueue(payload)}
        disabled={queued}
        whileHover={{ scale: queued ? 1 : 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={`w-full py-4 border-2 font-black text-xs tracking-[0.3em] uppercase transition-all flex items-center justify-center gap-3 relative z-10 rounded-sm ${
          queued 
            ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
            : 'border-accent text-accent hover:bg-accent hover:text-void hover:shadow-[0_0_30px_rgba(64,138,113,0.4)] disabled:opacity-50 disabled:cursor-not-allowed'
        }`}
      >
        {queued ? (
          <>
            <CheckSquare size={16} />
            QUEUED FOR ANCHORING
          </>
        ) : (
          <>
            <Lock size={16} />
            QUEUE FOR SOLANA ANCHOR
          </>
        )}
      </motion.button>

      {(queued || payload.status === 'anchored') && (
        <p className="text-[9px] text-gray-500 font-mono text-center leading-relaxed">
          {payload.txId ? (
            'On-chain memo recorded.'
          ) : (
            <>
              Queue writes vault locally.{' '}
              <Link href="/sync" className="text-accent hover:underline">Open Sync</Link>
              {' '}— env: <code className="text-accent/80">WDK_SEED_PHRASE</code>, upload{' '}
              <code className="text-accent/80">SECURE_DROP_URL</code> or{' '}
              <code className="text-accent/80">ALLOW_UPLOAD_SKIP=true</code>.
            </>
          )}
        </p>
      )}
    </motion.div>
  );
}
