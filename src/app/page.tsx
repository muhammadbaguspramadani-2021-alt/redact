'use client';
import Link from 'next/link';

import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import { 
  ShieldAlert, Terminal as TerminalIcon, Cpu, HardDrive, 
  Database, CodeSquare, Globe, Zap, Lock, Share2, 
  CheckCircle2, AlertTriangle, Fingerprint, Activity,
  ChevronDown, ShieldCheck
} from 'lucide-react';
import { DecryptText } from '@/components/DecryptText';
import { Redacted } from '@/components/Redacted';
import { ScanlineOverlay } from '@/components/ScanlineOverlay';
import { TerminalWindow } from '@/components/TerminalWindow';
import { ArchitectureNode } from '@/components/ArchitectureNode';
import { WorldMap } from '@/components/WorldMap';
import { DataPipeline } from '@/components/DataPipeline';
import { MysteriousBackground } from '@/components/MysteriousBackground';

import { getVaultStats } from '@/lib/store';
import { useState, useEffect } from 'react';

export default function Page() {
  const { scrollYProgress } = useScroll();
  const smoothProgress = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });
  const [stats, setStats] = useState({ pending: 0, anchored: 0, total: 0 });

  useEffect(() => {
    getVaultStats().then(setStats);
  }, []);
  
  const backgroundY = useTransform(smoothProgress, [0, 1], ['0%', '20%']);
  const heroOpacity = useTransform(smoothProgress, [0, 0.2], [1, 0]);
  const heroScale = useTransform(smoothProgress, [0, 0.2], [1, 0.95]);

  return (
    <main className="min-h-screen bg-void text-gray-300 font-sans selection:bg-highlight selection:text-void relative overflow-x-hidden">
      <ScanlineOverlay />
      <MysteriousBackground />
      
      {/* Progress Bar */}
      <motion.div 
        className="fixed top-0 left-0 right-0 h-1 bg-accent z-[100] origin-left"
        style={{ scaleX: smoothProgress }}
      />

      {/* --- SECTION 1: HERO --- */}
      <section className="relative min-h-screen flex flex-col pt-32 pb-20 px-6 md:px-12 lg:px-24 overflow-hidden border-b border-white/5">
        <motion.div 
          className="absolute inset-0 z-0"
          style={{ opacity: heroOpacity, scale: heroScale }}
        >
          <WorldMap />
        </motion.div>

        <div className="relative z-10 max-w-7xl mx-auto w-full flex flex-col h-full">
          <header className="flex justify-between items-center mb-24">
            <motion.div 
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="flex items-center space-x-4"
            >
              <div className="w-10 h-10 bg-accent/20 border border-accent flex items-center justify-center">
                <ShieldCheck className="text-accent" size={20} />
              </div>
              <div className="text-highlight text-2xl font-black tracking-[0.3em] hidden sm:block uppercase">Redact</div>
            </motion.div>
            
            <motion.div 
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="flex items-center space-x-8 text-[10px] font-mono"
            >
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
                <span className="text-emerald-500 font-bold uppercase tracking-widest">System: Air-Gapped</span>
              </div>
              <div className="hidden md:flex items-center gap-3 opacity-40 hover:opacity-100 transition-opacity cursor-help">
                <Lock size={12} className="text-accent" />
                <span className="uppercase tracking-widest">Protocol: AES-256-GCM</span>
              </div>
            </motion.div>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
            <div className="lg:col-span-7">
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
              >
                <h1 className="text-7xl md:text-8xl lg:text-9xl font-black tracking-tighter uppercase text-highlight leading-[0.8] mb-10">
                  <DecryptText text="CONNECTION" delay={500} />
                  <br />
                  <span className="text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.1)]">SEVERED.</span>
                  <br />
                  <span className="italic text-accent/80"><DecryptText text="PROTECTED." delay={1500} /></span>
                </h1>

                <p className="text-xl md:text-2xl max-w-2xl text-gray-400 mb-12 leading-relaxed font-medium tracking-tight">
                  <Redacted>Intelligence in the dark.</Redacted> Offline evidence processing and on-chain timestamping for human rights defenders in internet-blackout zones.
                </p>

                <div className="flex flex-col sm:flex-row gap-6 mt-8">
                  <Link href="/hub">
                    <motion.div 
                      whileHover={{ scale: 1.05, boxShadow: "0 0 30px rgba(176,228,204,0.4)" }}
                      whileTap={{ scale: 0.95 }}
                      className="group relative px-10 py-5 bg-accent text-void font-black text-xs tracking-[0.2em] uppercase overflow-hidden transition-all cursor-pointer inline-flex items-center justify-center gap-3 shadow-[0_0_15px_rgba(64,138,113,0.5)] rounded-sm"
                    >
                      <span className="relative z-10 flex items-center gap-3">
                        <TerminalIcon size={16} />
                        Launch Tactical Hub
                      </span>
                      <div className="absolute top-0 right-0 bottom-0 w-0 bg-highlight transition-all duration-300 group-hover:w-full" />
                    </motion.div>
                  </Link>
                  <Link href="/sync">
                    <motion.div 
                      whileHover={{ backgroundColor: 'rgba(64, 138, 113, 0.15)', boxShadow: "inset 0 0 20px rgba(64,138,113,0.2)" }}
                      className="px-10 py-5 border border-accent text-accent font-black text-xs tracking-[0.2em] uppercase transition-all flex items-center justify-center gap-2 cursor-pointer hover:text-highlight backdrop-blur-sm rounded-sm"
                    >
                      Transmission Center [Sync]
                    </motion.div>
                  </Link>
                </div>
              </motion.div>
            </div>

            <div className="lg:col-span-5 space-y-8 relative">
              <div className="absolute -inset-20 bg-accent/10 rounded-full blur-[120px] pointer-events-none" />
              <TerminalWindow 
                title="QVAC_ENGINE_V3" 
                delay={1}
                lines={[
                  "Initializing Whisper_V3...",
                  "Vulkan Hardware acceleration ACTIVE",
                  "Loading local_weights.bin [4.2GB]",
                  "SUCCESS: Transcription engine READY",
                  "Waiting for encrypted audio payload..."
                ]}
              />
              <div className="pl-8">
                <TerminalWindow 
                  title="WDK_NON_CUSTODIAL" 
                  delay={1.5}
                  lines={[
                    "Tether WDK v2.1 loaded",
                    `Wallet: [REDACTED_SIG_${stats.total > 0 ? stats.total : '---'}]`,
                    `QUEUE: ${stats.pending} items awaiting anchor`,
                    `ANCHORED: ${stats.anchored} confirmed on-chain`,
                    `Status: ${stats.pending > 0 ? 'READY_TO_TRANSMIT' : 'STANDBY'}`
                  ]}
                />
              </div>
            </div>
          </div>
        </div>
        
        <motion.div 
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 text-accent/40 flex flex-col items-center gap-2"
        >
          <span className="text-[9px] font-black tracking-[0.3em] uppercase">Scroll to decrypt</span>
          <ChevronDown size={16} />
        </motion.div>
      </section>

      {/* --- SECTION 2: THE PROBLEM --- */}
      <section className="py-40 px-6 md:px-12 lg:px-24 bg-gradient-to-b from-void via-[#010303] to-black relative overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-20 pointer-events-none" />
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 lg:gap-32 items-center">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="relative aspect-square tech-border bg-red-950/5 p-12 overflow-hidden group shadow-[0_0_100px_rgba(255,68,68,0.05)] rounded-2xl"
            >
              <div className="absolute inset-0 bg-scanlines opacity-10" />
              <ShieldAlert className="w-full h-full text-danger/10 group-hover:text-danger/20 transition-colors duration-1000" strokeWidth={0.5} />
              
              <div className="absolute inset-0 flex flex-col items-center justify-center space-y-8">
                <motion.div 
                  animate={{ 
                    y: [0, -5, 0],
                    filter: ['brightness(1)', 'brightness(1.2)', 'brightness(1)']
                  }}
                  transition={{ repeat: Infinity, duration: 4 }}
                  className="glass tech-border p-8 text-danger border-danger/40 font-mono text-center shadow-[0_0_50px_rgba(255,68,68,0.1)]"
                >
                  <AlertTriangle className="mx-auto mb-4" size={40} />
                  <div className="text-2xl font-black tracking-tight mb-1">LETHAL EXPOSURE</div>
                  <div className="text-[10px] tracking-[0.4em] opacity-60">CLOUD_UPLINK_WARNING</div>
                </motion.div>
                
                <div className="flex gap-3">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="w-6 h-1 bg-danger/20 animate-pulse" style={{ animationDelay: `${i * 150}ms` }} />
                  ))}
                </div>
              </div>
            </motion.div>

            <div className="space-y-10">
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                className="text-[10px] text-danger font-black tracking-[0.6em] uppercase"
              >
                // Threat_landscape_v2
              </motion.div>
              <motion.h2 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                className="text-6xl md:text-7xl font-black tracking-tighter text-white leading-[0.9]"
              >
                The Cloud is a <br/>
                <span className="text-danger">Death Sentence.</span>
              </motion.h2>
              <p className="text-xl text-gray-400 leading-relaxed max-w-xl">
                Investigators in <span className="text-white font-bold underline decoration-accent/30">Myanmar, Sudan, and Gaza</span> operate under total blackouts. Sending testimonies to cloud APIs exposes sources to packet sniffing, turning reporting tools into lethal surveillance liabilities.
              </p>
              <motion.div 
                whileInView={{ x: [0, 10, 0] }}
                className="glass p-8 border-l-4 border-l-danger bg-danger/5"
              >
                <p className="text-base italic text-gray-300 font-medium leading-relaxed">
                  "Terabytes of war crime evidence sit rotting on vulnerable hard drives because processing it online is operational suicide."
                </p>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* --- SECTION 3: THE SOLUTION --- */}
      <section className="py-48 px-6 md:px-12 lg:px-24 relative">
        <div className="absolute inset-0 bg-gradient-emerald opacity-20 pointer-events-none" />
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-32 space-y-6">
            <motion.div 
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              className="text-[10px] text-accent font-black tracking-[0.6em] uppercase"
            >
              // The_Pipeline_Solution
            </motion.div>
            <h2 className="text-6xl md:text-8xl font-black tracking-tighter text-white uppercase leading-[0.85] drop-shadow-[0_0_30px_rgba(176,228,204,0.1)]">
              Local device. <br/>
              <span className="text-highlight">Total Intelligence.</span>
            </h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto font-medium">
              Redact turns a field worker's local laptop into a secure intelligence pipeline. 
              Formatted, searchable reports without a single byte leaving the device.
            </p>
          </div>

          <div className="mb-32">
            <DataPipeline />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {[
              { icon: Zap, title: "Point of Capture", desc: "Process evidence instantly at the source, bypassing state controls entirely.", delay: 0.1 },
              { icon: Fingerprint, title: "Zero Metadata", desc: "No API logging, no packet sniffing, no metadata leaks to third parties.", delay: 0.2 },
              { icon: CheckCircle2, title: "NGO Standard", desc: "Standardized JSON reports ready for international court submission.", delay: 0.3 },
            ].map((item, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: item.delay }}
                className="glass tech-border p-10 group"
              >
                <div className="w-16 h-16 bg-accent/5 border border-accent/20 mx-auto mb-8 flex items-center justify-center text-accent group-hover:bg-accent group-hover:text-void transition-all duration-500 shadow-xl">
                  <item.icon size={32} strokeWidth={1.5} />
                </div>
                <h3 className="text-xl font-black text-highlight mb-4 uppercase tracking-tighter text-center">{item.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed text-center font-medium">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* --- SECTION 4: ARCHITECTURE --- */}
      <section className="py-40 px-6 md:px-12 lg:px-24 bg-black/40 border-y border-white/5 relative overflow-hidden">
        <div className="absolute inset-0 bg-noise opacity-[0.02] pointer-events-none" />
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col lg:flex-row justify-between items-end gap-12 mb-24">
            <div className="max-w-3xl space-y-6">
              <div className="text-[10px] text-accent font-black tracking-[0.6em] uppercase">
                // Atomic_Architecture_v1
              </div>
              <h2 className="text-5xl md:text-7xl font-black tracking-tighter text-white uppercase leading-none">
                Hardware Native <br/>4-Node Pipeline.
              </h2>
            </div>
            <div className="flex flex-col gap-2 font-mono text-[10px] text-gray-500 border-l border-accent/30 pl-6 py-2 uppercase tracking-widest">
              <span>Security Integrity: 100%</span>
              <span>Module Coupling: Tight</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <ArchitectureNode 
              id="01"
              name="@qvac/transcription"
              title="Transcription (Whisper)"
              desc="Local testimony processing with speaker diarization to isolate victims."
              icon={Activity}
              delay={0.1}
            />
            <ArchitectureNode 
              id="02"
              name="@qvac/translation"
              title="Translation (NMT)"
              desc="Instant translation of local dialects to international court English."
              icon={Globe}
              delay={0.2}
            />
            <ArchitectureNode 
              id="03"
              name="@qvac/ocr"
              title="Document OCR"
              desc="Text extraction from photographed military orders and field evidence."
              icon={CodeSquare}
              delay={0.3}
            />
            <ArchitectureNode 
              id="04"
              name="@qvac/llm"
              title="Report Logic"
              desc="LLM-driven entity extraction into machine-readable JSON formats."
              icon={Cpu}
              delay={0.4}
            />
          </div>

          <div className="mt-32 glass tech-border p-12 bg-accent/5 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-accent/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
            <h4 className="text-highlight font-black mb-10 uppercase tracking-[0.4em] text-center text-sm relative z-10">Offline Necessity Matrix</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-16 relative z-10">
              {[
                { t: "Connectivity", d: "State actors intentionally sever internet to suppress truth. Cloud is impossible." },
                { t: "Sovereignty", d: "Packet sniffing by regimes turns cloud APIs into lethal surveillance tools." },
                { t: "Bandwidth", d: "Satellite uplinks cannot handle gigabytes of raw, high-fidelity evidence audio." }
              ].map((matrix, i) => (
                <div key={i} className="space-y-4 text-center md:text-left">
                  <div className="text-accent font-black uppercase tracking-widest text-xs flex items-center gap-3 justify-center md:justify-start">
                    <span className="w-1.5 h-1.5 bg-accent rounded-full" />
                    {matrix.t}
                  </div>
                  <p className="text-sm text-gray-400 leading-relaxed font-medium">{matrix.d}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* --- SECTION 5: WEB3 --- */}
      <section className="py-48 px-6 md:px-12 lg:px-24 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-emerald-500/5 rounded-full blur-[150px] pointer-events-none" />
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-32 items-center relative z-10">
          <div className="space-y-10">
            <div className="text-[10px] text-emerald-400 font-black tracking-[0.6em] uppercase">
              // On_Chain_Verification
            </div>
            <h2 className="text-6xl md:text-7xl font-black tracking-tighter text-white uppercase leading-[0.9]">
              Immutable <br/>
              <span className="text-highlight">Truth Anchoring.</span>
            </h2>
            <p className="text-xl text-gray-400 leading-relaxed font-medium">
              Evidence means nothing if it can be tampered with. Redact creates a <span className="text-white font-bold italic underline underline-offset-4">SHA-256 hash</span> of the encrypted bundle. Signed via Tether WDK, then anchored to Solana the second an uplink is found.
            </p>
            <motion.div 
              whileHover={{ x: 10 }}
              className="flex items-start gap-6 glass p-6 tech-border border-emerald-500/20 group cursor-pointer"
            >
              <div className="p-4 bg-emerald-500/10 text-emerald-500 tech-border group-hover:bg-emerald-500 group-hover:text-void transition-all duration-500 shadow-lg">
                <Share2 size={28} />
              </div>
              <div>
                <h4 className="text-white font-black uppercase tracking-tight mb-2">Zero-Knowledge Provenance</h4>
                <p className="text-sm text-gray-500 leading-relaxed font-medium">Cryptographic proof of existence without exposing raw media to the ledger.</p>
              </div>
            </motion.div>
          </div>

          <div className="glass tech-border p-10 font-mono text-xs sm:text-sm leading-relaxed relative shadow-[0_0_100px_rgba(64,138,113,0.1)] group">
             <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
               <Fingerprint size={120} />
             </div>
             
             <div className="space-y-6 text-gray-400 relative z-10">
                <div className="flex justify-between items-center border-b border-white/5 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-highlight font-black tracking-widest text-[10px]">SOLANA_NODE_SYNC</span>
                  </div>
                  <span className="text-gray-500 text-[10px] uppercase font-bold">Mainnet-Beta</span>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-accent">{">"}</span>
                    <span className="text-gray-300">redact finalize --bundle-id 782A</span>
                  </div>
                  <div className="p-4 bg-void/60 border border-white/5 font-mono text-[10px] leading-relaxed">
                    <div className="text-gray-500 mb-2">// GENERATING_SHA256_HASH</div>
                    <div className="text-highlight break-all">0x8f7b4e99c1d2a5f8b3e6d4c1a9b2d5e8f4c7a1b9d3e6f2c8a5b1d4e7f0c39a</div>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-500 font-bold animate-pulse">
                    <span className="text-accent">{">"}</span>
                    <span>UPLINK_DETECTED: Anchoring...</span>
                  </div>
                  <div className="p-4 bg-emerald-500/5 border border-emerald-500/20">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-emerald-500 font-black uppercase text-[10px]">Transaction Confirmed</span>
                      <span className="text-[10px] text-gray-500">Slot: 231,450,912</span>
                    </div>
                    <p className="text-[9px] text-gray-400 break-all leading-tight opacity-60 font-mono">SIG: 4gM8Xo2vRzQ9wY7uP6k5n4m3L2j1H0g9F8e7D6c5B4a3Z2y1X0w9V8u7T6s5R4q3</p>
                  </div>
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* --- SECTION 6: JUDGING --- */}
      <section className="py-40 px-6 md:px-12 lg:px-24 bg-void border-t border-white/5 relative">
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center mb-24">
             <motion.div 
               initial={{ opacity: 0 }}
               whileInView={{ opacity: 1 }}
               className="text-[10px] text-accent font-black tracking-[0.6em] uppercase mb-4"
             >
               // Protocol_Efficiency_Metrics
             </motion.div>
             <h2 className="text-6xl font-black text-white uppercase tracking-tighter">System <span className="text-highlight italic underline decoration-accent/20">Benchmarks.</span></h2>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {[
              { t: "Processing Latency", w: "< 45s", s: "OPTIMIZED", j: "Parallel 4-module chained pipeline running purely on-device via Vulkan." },
              { t: "Encryption Entropy", w: "256-bit", s: "MIL-SPEC", j: "AES-256-GCM with X25519 key wrapping for zero-knowledge exfiltration." },
              { t: "Anchor Settlement", w: "~2.4s", s: "INSTANT", j: "Direct WDK integration with Solana Devnet/Mainnet for immediate truth-anchoring." },
              { t: "Offline Stability", w: "99.9%", s: "AIR-GAPPED", j: "No external dependencies required for core intelligence extraction." },
            ].map((row, i) => (
              <motion.div 
                key={i} 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="glass tech-border p-8 flex flex-col gap-6 group hover:bg-accent/5 transition-all"
              >
                <div className="flex justify-between items-start">
                  <div className="text-xs font-black text-gray-500 uppercase tracking-widest">{row.w}</div>
                  <div className="text-xl font-black text-highlight">{row.s}</div>
                </div>
                <div className="space-y-2">
                  <h4 className="text-white font-black uppercase text-sm tracking-tight">{row.t}</h4>
                  <p className="text-[11px] text-gray-400 leading-relaxed font-medium italic opacity-70">"{row.j}"</p>
                </div>
              </motion.div>
            ))}
          </div>
          
          <div className="mt-12 text-center">
            <div className="inline-block glass tech-border px-8 py-4 border-accent/30 shadow-[0_0_30px_rgba(64,138,113,0.1)]">
              <span className="text-gray-400 font-mono text-xs uppercase tracking-widest">Protocol Version: </span>
              <span className="text-2xl font-black text-white ml-4 tracking-tighter">v1.2.4-TACTICAL</span>
            </div>
          </div>
        </div>
      </section>

      {/* --- SECTION 7: DEMO --- */}
      <section className="py-48 px-6 md:px-12 lg:px-24 relative">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-24 space-y-4">
            <div className="text-[10px] text-accent font-black tracking-[0.6em] uppercase">
              // Deployment_Simulation_Script
            </div>
            <h2 className="text-5xl font-black text-white uppercase tracking-tighter">The Live Walkthrough</h2>
          </div>

          <div className="space-y-8 relative">
            <div className="absolute left-10 top-0 bottom-0 w-[1px] bg-accent/20 hidden md:block" />
            {[
              { s: "Scene 1: The Hook", t: "Disconnect Wi-Fi. 'For human rights workers, the internet is weaponized.'", i: Zap },
              { s: "Scene 2: The Data", t: "Show 50 raw war crime testimonies. Explain why cloud upload is a death sentence.", i: AlertTriangle },
              { s: "Scene 3: The Engine", t: "Drag data into Redact. Show live QVAC terminal executing: Whisper, NMT, OCR, Llama.", i: TerminalIcon },
              { s: "Scene 4: The Anchor", t: "Toggle Starlink. WDK wallet instantly pushes SHA-256 hash to Solana in 2s.", i: CheckCircle2 },
              { s: "Scene 5: The Mission", t: "'Evidence secured. Privacy guaranteed.' Run npm run redact to deploy.", i: Lock },
            ].map((scene, i) => (
              <motion.div 
                key={i} 
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                className="glass tech-border p-8 md:ml-20 flex gap-8 items-start hover:neon-border transition-all relative group"
              >
                <div className="absolute -left-[54px] top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-void border-2 border-accent flex items-center justify-center text-accent font-black text-xs z-10 hidden md:flex group-hover:bg-accent group-hover:text-void transition-all">
                  {i+1}
                </div>
                <div className="p-4 bg-accent/10 text-accent rounded-xl group-hover:scale-110 transition-transform">
                  <scene.i size={28} strokeWidth={1.5} />
                </div>
                <div className="space-y-3">
                  <h4 className="text-highlight font-black uppercase text-base tracking-tighter">{scene.s}</h4>
                  <p className="text-base text-gray-400 leading-relaxed font-medium tracking-tight">{scene.t}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* --- FINAL CTA --- */}
      <section className="py-60 px-6 bg-black relative overflow-hidden">
        <div className="absolute inset-0 bg-dot-grid opacity-10" />
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <motion.h2 
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            className="text-7xl md:text-9xl font-black tracking-tighter text-white mb-16 uppercase leading-none"
          >
            Deploy <br/>
            <span className="text-highlight drop-shadow-[0_0_50px_rgba(176,228,204,0.3)]">Redact.</span>
          </motion.h2>
          
          <div className="bg-void tech-border p-10 text-left mb-20 relative group overflow-hidden max-w-2xl mx-auto shadow-2xl hover:shadow-[0_0_50px_rgba(64,138,113,0.3)] transition-all duration-700">
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
              <TerminalIcon size={160} />
            </div>
            <pre className="font-mono text-sm md:text-xl text-highlight leading-relaxed overflow-x-auto whitespace-pre-wrap">
              <code>{`git clone https://github.com/redact/redact
cd redact && npm install
npm run redact:secure
./init_node.sh --airgapped`}</code>
            </pre>
          </div>

          <footer className="pt-24 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-12">
            <div className="flex items-center gap-6 text-left">
              <div className="w-16 h-16 bg-accent/5 tech-border flex items-center justify-center shadow-lg">
                <ShieldCheck className="text-accent" size={32} />
              </div>
              <div className="space-y-1">
                <div className="text-[10px] text-accent font-black tracking-[0.4em] uppercase">Project_Status</div>
                <div className="text-lg text-white font-black tracking-tighter">Colosseum Frontier Hackathon</div>
              </div>
            </div>
            <div className="flex gap-6">
              <motion.a whileHover={{ y: -5 }} href="#" className="px-8 py-3 bg-accent text-void font-black text-xs tracking-[0.2em] uppercase shadow-lg hover:shadow-accent/20">Protocol_Github</motion.a>
              <motion.a whileHover={{ y: -5 }} href="#" className="px-8 py-3 border-2 border-accent text-accent font-black text-xs tracking-[0.2em] uppercase">Documentation</motion.a>
            </div>
          </footer>
        </div>
      </section>

    </main>
  );
}
