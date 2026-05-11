'use client';

import { useState, useEffect } from 'react';
import { ShieldCheck, WifiOff, Database } from 'lucide-react';
import { InputZone } from '@/components/hub/InputZone';
import { PipelineVisualizer } from '@/components/hub/PipelineVisualizer';
import { OutputVault } from '@/components/hub/OutputVault';
import { savePayload, getPayload } from '@/lib/store';
import type { EvidencePayload, PipelineEvent, ProcessApiResponse } from '@/lib/types';
import Link from 'next/link';
import { ScanlineOverlay } from '@/components/ScanlineOverlay';
import { MysteriousBackground } from '@/components/MysteriousBackground';

export default function HubPage() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [pipelineEvents, setPipelineEvents] = useState<PipelineEvent[]>([]);
  const [currentPayload, setCurrentPayload] = useState<EvidencePayload | null>(null);
  const [queued, setQueued] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (audio: File | null, image: File | null) => {
    const runId = `hub-${Date.now().toString(36)}`;
    setIsProcessing(true);
    setError(null);
    setPipelineEvents([]);
    setCurrentPayload(null);
    setQueued(false);

    try {
      // #region agent log
      fetch('http://127.0.0.1:7285/ingest/7d3689ba-e0bb-4445-b1c6-22b2be5799a6',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'377cbf'},body:JSON.stringify({sessionId:'377cbf',runId,hypothesisId:'H4',location:'src/app/hub/page.tsx:29',message:'Submitting process request',data:{hasAudio:!!audio,audioSize:audio?.size??0,audioType:audio?.type??null,audioName:audio?.name??null,hasImage:!!image,imageSize:image?.size??0,imageType:image?.type??null},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      const form = new FormData();
      if (audio) form.append('audio', audio);
      if (image) form.append('image', image);

      const res = await fetch('/api/process', { method: 'POST', body: form });
      const data: ProcessApiResponse = await res.json();
      // #region agent log
      fetch('http://127.0.0.1:7285/ingest/7d3689ba-e0bb-4445-b1c6-22b2be5799a6',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'377cbf'},body:JSON.stringify({sessionId:'377cbf',runId,hypothesisId:'H1',location:'src/app/hub/page.tsx:37',message:'Process response received',data:{ok:res.ok,success:data.success,error:data.success?null:data.error,pipelineCount:data.success?data.pipeline.length:0},timestamp:Date.now()})}).catch(()=>{});
      // #endregion

      if (!data.success) throw new Error(data.error || 'Processing failed.');

      setPipelineEvents(data.pipeline);

      const payload: EvidencePayload = {
        id: data.report.incidentId,
        createdAt: Date.now(),
        hash: data.hash,
        ciphertext: data.ciphertext,
        envelope: data.envelope,
        report: data.report,
        status: 'pending',
        upload: { status: 'pending' },
      };
      setCurrentPayload(payload);
    } catch (err) {
      // #region agent log
      fetch('http://127.0.0.1:7285/ingest/7d3689ba-e0bb-4445-b1c6-22b2be5799a6',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'377cbf'},body:JSON.stringify({sessionId:'377cbf',runId,hypothesisId:'H1',location:'src/app/hub/page.tsx:55',message:'Process submission failed in client',data:{error:err instanceof Error?err.message:'Unknown error'},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      setError(err instanceof Error ? err.message : 'Unknown error.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleQueue = async (payload: EvidencePayload) => {
    await savePayload(payload);
    setQueued(true);
  };

  useEffect(() => {
    if (!queued || !currentPayload?.id) return;
    const id = currentPayload.id;
    const tick = async () => {
      const latest = await getPayload(id);
      if (!latest) return;
      setCurrentPayload((prev) => {
        if (!prev || prev.id !== id) return prev;
        if (latest.txId === prev.txId && latest.upload?.status === prev.upload?.status && latest.status === prev.status) {
          return prev;
        }
        return latest;
      });
    };
    void tick();
    const iv = window.setInterval(() => void tick(), 2800);
    return () => window.clearInterval(iv);
  }, [queued, currentPayload?.id]);

  return (
    <div className="min-h-screen bg-void font-sans text-gray-300 relative overflow-x-hidden">
      <ScanlineOverlay />
      <MysteriousBackground />
      {/* Mobile-first Nav */}
      <nav className="sticky top-0 z-50 bg-void/80 backdrop-blur-md border-b border-accent/20 px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <ShieldCheck size={20} className="text-accent" />
          <span className="font-black text-highlight tracking-[0.2em] uppercase text-sm">Redact</span>
        </Link>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-[10px] font-mono">
            <WifiOff size={12} className="text-danger" />
            <span className="text-danger uppercase tracking-widest">Air-Gapped</span>
          </div>
          <Link href="/sync" className="flex items-center gap-1.5 px-3 py-1.5 border border-accent/30 text-accent text-[10px] font-black tracking-widest uppercase hover:bg-accent/10 transition-all">
            <Database size={12} />
            Sync
          </Link>
        </div>
      </nav>

      {/* Header */}
      <div className="px-6 md:px-12 pt-16 pb-12 border-b border-accent/10 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-accent/5 to-transparent pointer-events-none" />
        <div className="max-w-7xl mx-auto relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="text-[9px] text-accent font-black tracking-[0.6em] uppercase mb-3 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse" />
              {'// Field_Dashboard'}
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-white uppercase drop-shadow-[0_0_20px_rgba(176,228,204,0.1)] mb-2">Tactical Hub</h1>
            <p className="text-xs text-gray-400 font-mono">Offline · Local Processing · Zero Exfiltration</p>
          </div>
          <div className="flex gap-2">
            <div className="px-4 py-2 bg-void border border-accent/20 flex flex-col items-center">
              <span className="text-[9px] text-gray-500 uppercase tracking-widest font-mono">Security</span>
              <span className="text-emerald-500 font-black text-xs">MAXIMUM</span>
            </div>
            <div className="px-4 py-2 bg-void border border-accent/20 flex flex-col items-center">
              <span className="text-[9px] text-gray-500 uppercase tracking-widest font-mono">Network</span>
              <span className="text-danger font-black text-xs">SEVERED</span>
            </div>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="max-w-7xl mx-auto px-6 mt-6">
          <div className="p-4 bg-danger/10 border border-danger/30 text-danger text-xs font-mono shadow-[0_0_20px_rgba(255,68,68,0.15)]">
            ERROR: {error}
          </div>
        </div>
      )}

      {/* Main Content Dashboard Layout */}
      <div className="px-6 md:px-12 py-10 max-w-7xl mx-auto relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-start">
          {/* Column 1: Input (Left Panel) */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <InputZone onSubmit={handleSubmit} isProcessing={isProcessing} />
          </div>
          
          {/* Column 2: Pipeline & Output (Right Panel) */}
          <div className="lg:col-span-7 flex flex-col gap-8">
            <div className="sticky top-28 space-y-8">
              <PipelineVisualizer events={pipelineEvents} isRunning={isProcessing} />
              
              <div className="relative">
                {/* Visual connecting line between pipeline and output */}
                <div className="absolute -top-8 left-8 w-px h-8 bg-gradient-to-b from-accent/30 to-accent/5" />
                <OutputVault payload={currentPayload} onQueue={handleQueue} queued={queued} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom safe area */}
      <div className="h-16" />
    </div>
  );
}
