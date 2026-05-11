'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, ExternalLink, Loader2, CheckCircle2, AlertCircle, Clock, Hash, Lock, QrCode, X } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { getAllPayloads, markAnchored, markUploaded, markUploadFailed } from '@/lib/store';
import type { EvidencePayload, AnchorApiResponse } from '@/lib/types';
import Link from 'next/link';
import { ScanlineOverlay } from '@/components/ScanlineOverlay';
import { MysteriousBackground } from '@/components/MysteriousBackground';

function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(false);
  useEffect(() => {
    setIsOnline(navigator.onLine);
    const up = () => setIsOnline(true);
    const down = () => setIsOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down); };
  }, []);
  return isOnline;
}

interface AnchorState {
  payloadId: string;
  status: 'loading' | 'success' | 'error';
  phase?: 'upload' | 'anchor';
  txId?: string;
  slot?: number;
  explorerUrl?: string;
  error?: string;
}

export default function SyncPage() {
  const [payloads, setPayloads] = useState<EvidencePayload[]>([]);
  const [anchoring, setAnchoring] = useState<AnchorState | null>(null);
  const isOnline = useOnlineStatus();

  const loadPayloads = useCallback(async () => {
    const all = await getAllPayloads();
    setPayloads(all);
  }, []);

  useEffect(() => {
    loadPayloads();
  }, [loadPayloads]);

  const anchor = async (payload: EvidencePayload) => {
    let phase: 'upload' | 'anchor' = 'upload';
    setAnchoring({ payloadId: payload.id, status: 'loading', phase });
    try {
      let uploadWasNeeded = payload.upload?.status !== 'uploaded';
      if (uploadWasNeeded) {
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: payload.id,
            hash: payload.hash,
            ciphertext: payload.ciphertext,
            envelope: payload.envelope,
          }),
        });
        const uploadData = await uploadRes.json();
        if (!uploadData.success) throw new Error(uploadData.error || 'Upload failed.');

        await markUploaded(payload.id, { id: uploadData.uploadId, url: uploadData.dropUrl });
        await loadPayloads();
        uploadWasNeeded = false;
      }

      phase = 'anchor';
      setAnchoring({ payloadId: payload.id, status: 'loading', phase });
      const res = await fetch('/api/anchor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hash: payload.hash }),
      });
      const data: AnchorApiResponse = await res.json();
      if (!data.success) throw new Error(data.error);

      await markAnchored(payload.id, data.txId, data.slot);
      await loadPayloads();

      setAnchoring({
        payloadId: payload.id,
        status: 'success',
        phase,
        txId: data.txId,
        slot: data.slot,
        explorerUrl: data.explorerUrl,
      });
    } catch (err) {
      if (phase === 'upload') {
        await markUploadFailed(payload.id, err instanceof Error ? err.message : 'Upload failed.');
      }
      setAnchoring({
        payloadId: payload.id,
        status: 'error',
        phase,
        error: err instanceof Error ? err.message : 'Anchor failed.',
      });
    }
  };

  const pendingPayloads = payloads.filter(p => p.status === 'pending');
  const anchoredPayloads = payloads.filter(p => p.status === 'anchored');

  return (
    <div className="min-h-screen bg-void font-sans text-gray-300 relative overflow-x-hidden">
      <ScanlineOverlay />
      <MysteriousBackground />

      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-void/80 backdrop-blur-md border-b border-accent/20 px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <ShieldCheck size={20} className="text-accent" />
          <span className="font-black text-highlight tracking-[0.2em] uppercase text-sm">Redact</span>
        </Link>
        <Link href="/hub" className="px-3 py-1.5 border border-accent/30 text-accent text-[10px] font-black tracking-widest uppercase hover:bg-accent/10 transition-all">
          ← Hub
        </Link>
      </nav>

      {/* Header */}
      <div className="px-6 md:px-12 pt-16 pb-12 border-b border-accent/10 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-accent/5 to-transparent pointer-events-none" />
        <div className="max-w-7xl mx-auto relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="text-[9px] text-accent font-black tracking-[0.6em] uppercase mb-3 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse" />
              // Transmission_Center
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-white uppercase drop-shadow-[0_0_20px_rgba(176,228,204,0.1)] mb-2">Sync & Anchor</h1>
            <p className="text-xs text-gray-400 font-mono">Blockchain Anchoring · Starlink Integration</p>
          </div>

          {/* Network Status */}
          <div className={`flex items-center gap-3 px-6 py-4 border shadow-[0_0_20px_rgba(0,0,0,0.2)] ${isOnline ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-danger/50 bg-danger/10'}`}>
            <div className={`w-3 h-3 rounded-full shadow-[0_0_10px_currentColor] ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-danger'}`} />
            <div className="flex flex-col">
              <span className={`font-mono text-[9px] tracking-widest uppercase ${isOnline ? 'text-emerald-500/80' : 'text-danger/80'}`}>
                Uplink Status
              </span>
              <span className={`font-black text-sm uppercase ${isOnline ? 'text-emerald-400' : 'text-danger'}`}>
                {isOnline ? 'NETWORK CONNECTED' : 'OFFLINE'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 md:px-12 py-10 max-w-7xl mx-auto relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-start">
          
          {/* Left Column: Pending Payloads */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-[9px] font-black text-accent tracking-[0.4em] uppercase flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-accent" />
                  Pending_Anchor ({pendingPayloads.length})
                </h2>
              </div>
              {pendingPayloads.length === 0 ? (
                <div className="glass tech-border p-12 text-center opacity-40">
                  <Lock size={32} className="mx-auto mb-4 text-accent" strokeWidth={1} />
                  <p className="text-xs font-mono text-gray-500 uppercase tracking-widest">No pending payloads</p>
                </div>
              ) : (
                <div className="space-y-4">
              {pendingPayloads.map((payload) => {
                const isLoading = anchoring?.payloadId === payload.id && anchoring.status === 'loading';
                const uploadStatus = payload.upload?.status ?? 'pending';
                return (
                  <motion.div
                    key={payload.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass tech-border p-5 space-y-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 min-w-0">
                        <div className="font-mono text-xs font-black text-highlight">{payload.id}</div>
                        <div className="font-mono text-[10px] text-gray-500">{new Date(payload.createdAt).toLocaleString()}</div>
                      </div>
                      <div className="flex items-center gap-1.5 px-2 py-1 border border-amber-500/30 bg-amber-500/5">
                        <Clock size={10} className="text-amber-400" />
                        <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest">Pending</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 p-2 bg-void/60 border border-accent/10">
                      <Hash size={12} className="text-accent shrink-0" />
                      <span className="font-mono text-[9px] text-gray-400 truncate">{payload.hash.substring(0, 32)}...</span>
                    </div>

                    <div className="flex items-center gap-2 text-[9px] font-mono">
                      <span className="text-gray-500">Upload:</span>
                      <span className={`uppercase tracking-widest ${
                        uploadStatus === 'uploaded' ? 'text-emerald-500' :
                        uploadStatus === 'failed' ? 'text-danger' :
                        'text-amber-400'
                      }`}>
                        {uploadStatus}
                      </span>
                    </div>

                    <motion.button
                      onClick={() => anchor(payload)}
                      disabled={!isOnline || isLoading}
                      whileHover={{ scale: !isOnline ? 1 : 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full py-4 bg-accent text-void font-black text-sm tracking-[0.3em] uppercase disabled:opacity-40 disabled:cursor-not-allowed hover:bg-highlight transition-all flex items-center justify-center gap-3"
                    >
                      {isLoading ? (
                        <><Loader2 size={16} className="animate-spin" /> {anchoring?.phase === 'upload' ? 'UPLOADING...' : 'ANCHORING...'}</>
                      ) : (
                        '⬡ UPLOAD + ANCHOR'
                      )}
                    </motion.button>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Status & History */}
      <div className="lg:col-span-5 flex flex-col gap-8">
        <div className="sticky top-28 space-y-8">
          
          {/* Anchor Result */}
          <AnimatePresence>
            {anchoring && anchoring.status !== 'loading' && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`p-6 border shadow-[0_0_30px_rgba(0,0,0,0.2)] ${anchoring.status === 'success' ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-danger/40 bg-danger/10'}`}
              >
                {anchoring.status === 'success' ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 size={24} className="text-emerald-500" />
                      <div>
                        <div className="font-black text-white uppercase tracking-tight">EVIDENCE SECURED ON-CHAIN</div>
                        <div className="text-[10px] text-emerald-500 font-mono">Transaction confirmed on Solana</div>
                      </div>
                    </div>
                    <div className="space-y-2 font-mono text-xs p-3 bg-void/60 border border-emerald-500/20">
                      <div className="flex gap-3">
                        <span className="text-gray-500 w-12 shrink-0">Slot:</span>
                        <span className="text-emerald-400 font-bold">{anchoring.slot?.toLocaleString()}</span>
                      </div>
                      <div className="flex gap-3">
                        <span className="text-gray-500 w-12 shrink-0">TxID:</span>
                        <span className="text-emerald-400/80 break-all text-[9px]">{anchoring.txId}</span>
                      </div>
                    </div>
                    <a
                      href={anchoring.explorerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/40 text-emerald-500 text-xs font-black uppercase tracking-widest hover:bg-emerald-500 hover:text-void transition-all w-full justify-center"
                    >
                      <ExternalLink size={12} />
                      View on Solana Explorer
                    </a>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <AlertCircle size={20} className="text-danger" />
                    <div>
                      <div className="font-black text-danger uppercase">Anchor Failed</div>
                      <div className="text-xs text-gray-500 font-mono">{anchoring.error}</div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Anchored History */}
          {anchoredPayloads.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-[9px] font-black text-accent tracking-[0.4em] uppercase flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-accent opacity-50" />
                Anchored_History ({anchoredPayloads.length})
              </h2>
            <div className="space-y-3">
              {anchoredPayloads.map((payload) => (
                <div key={payload.id} className="glass tech-border p-4 space-y-2 opacity-60">
                  <div className="flex items-center justify-between">
                    <div className="font-mono text-[10px] text-gray-400">{payload.id}</div>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 size={10} className="text-emerald-500" />
                      <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Anchored</span>
                    </div>
                  </div>
                  {payload.txId && (
                    <a
                      href={`https://explorer.solana.com/tx/${payload.txId}?cluster=devnet`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-[9px] font-mono text-accent hover:text-highlight transition-colors"
                    >
                      <ExternalLink size={10} />
                      {payload.txId.substring(0, 20)}...
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  </div>

      <div className="h-16" />
    </div>
  );
}
