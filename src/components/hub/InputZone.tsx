'use client';

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Square, Camera, Upload, X, FileAudio, FileImage, AlertTriangle } from 'lucide-react';

interface InputZoneProps {
  onSubmit: (audio: File | null, image: File | null) => void;
  isProcessing: boolean;
}

function encodeWav(audioBuffer: AudioBuffer): ArrayBuffer {
  const numChannels = Math.min(2, audioBuffer.numberOfChannels);
  const sampleRate = audioBuffer.sampleRate;
  const numSamples = audioBuffer.length;
  const dataLength = numSamples * numChannels * 2;
  const buffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(buffer);

  const writeString = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i += 1) {
      view.setUint8(offset + i, value.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * 2, true);
  view.setUint16(32, numChannels * 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, dataLength, true);

  let offset = 44;
  for (let i = 0; i < numSamples; i += 1) {
    for (let ch = 0; ch < numChannels; ch += 1) {
      const sample = audioBuffer.getChannelData(ch)[i];
      const clamped = Math.max(-1, Math.min(1, sample));
      const int16 = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
      view.setInt16(offset, int16, true);
      offset += 2;
    }
  }
  return buffer;
}

async function convertToWavFile(sourceBlob: Blob): Promise<File> {
  const arrayBuffer = await sourceBlob.arrayBuffer();
  const Ctor = typeof window !== 'undefined'
    ? (window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)
    : AudioContext;
  if (!Ctor) throw new Error('AudioContext unavailable');
  const audioCtx = new Ctor();
  try {
    const decoded = await audioCtx.decodeAudioData(arrayBuffer.slice(0));
    const wavBuffer = encodeWav(decoded);
    return new File([wavBuffer], 'testimony.wav', { type: 'audio/wav' });
  } finally {
    await audioCtx.close();
  }
}

export function InputZone({ onSubmit, isProcessing }: InputZoneProps) {
  const [audioBlob, setAudioBlob] = useState<File | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      chunksRef.current = [];
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        // #region agent log
        fetch('http://127.0.0.1:7285/ingest/7d3689ba-e0bb-4445-b1c6-22b2be5799a6',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'377cbf'},body:JSON.stringify({sessionId:'377cbf',runId:`rec-${Date.now().toString(36)}`,hypothesisId:'H10',location:'src/components/hub/InputZone.tsx:40',message:'Recorder stopped, converting blob to wav',data:{blobType:blob.type,blobSize:blob.size},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
        convertToWavFile(blob)
          .then((wavFile) => {
            // #region agent log
            fetch('http://127.0.0.1:7285/ingest/7d3689ba-e0bb-4445-b1c6-22b2be5799a6',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'377cbf'},body:JSON.stringify({sessionId:'377cbf',runId:`rec-${Date.now().toString(36)}`,hypothesisId:'H11',location:'src/components/hub/InputZone.tsx:47',message:'WAV conversion success',data:{wavType:wavFile.type,wavSize:wavFile.size,fileName:wavFile.name},timestamp:Date.now()})}).catch(()=>{});
            // #endregion
            setAudioBlob(wavFile);
          })
          .catch((err) => {
            // #region agent log
            fetch('http://127.0.0.1:7285/ingest/7d3689ba-e0bb-4445-b1c6-22b2be5799a6',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'377cbf'},body:JSON.stringify({sessionId:'377cbf',runId:`rec-${Date.now().toString(36)}`,hypothesisId:'H10',location:'src/components/hub/InputZone.tsx:53',message:'WAV conversion failed, fallback original blob',data:{error:err instanceof Error?err.message:'Unknown'},timestamp:Date.now()})}).catch(()=>{});
            // #endregion
            setAudioBlob(new File([blob], 'testimony.webm', { type: 'audio/webm' }));
          })
          .finally(() => {
            stream.getTracks().forEach(t => t.stop());
          });
      };

      recorder.start(250);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingDuration(0);

      timerRef.current = setInterval(() => setRecordingDuration(d => d + 1), 1000);
    } catch {
      setError('Microphone access denied. Enable permissions and retry.');
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = () => {
    if (!audioBlob && !imageFile) {
      setError('Provide at least one input: audio or image.');
      return;
    }
    onSubmit(audioBlob, imageFile);
  };

  const formatDuration = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 border-b border-accent/20 pb-4">
        <div className="text-[9px] font-black text-accent tracking-[0.4em] uppercase">{'// INPUT_ZONE'}</div>
      </div>

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-center gap-3 p-4 bg-danger/10 border border-danger/30 text-danger text-xs font-mono"
          >
            <AlertTriangle size={14} />
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Audio Capture */}
      <div className="glass tech-border p-5 space-y-4 hover:shadow-[0_0_20px_rgba(64,138,113,0.15)] transition-shadow duration-500 rounded-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mic size={16} className="text-accent" />
            <span className="text-xs font-black text-highlight uppercase tracking-widest">Audio Testimony</span>
          </div>
          {audioBlob && (
            <button onClick={() => { setAudioBlob(null); setRecordingDuration(0); }} className="text-gray-500 hover:text-danger transition-colors">
              <X size={14} />
            </button>
          )}
        </div>

        {!audioBlob ? (
          <div className="flex flex-col items-center gap-4 py-4">
            {isRecording ? (
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <motion.div
                    animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0.1, 0.5] }}
                    transition={{ repeat: Infinity, duration: 1.2 }}
                    className="absolute inset-0 rounded-full bg-danger"
                  />
                  <button
                    onClick={stopRecording}
                    className="relative w-20 h-20 rounded-full bg-danger flex items-center justify-center shadow-[0_0_40px_rgba(255,68,68,0.4)]"
                  >
                    <Square size={24} className="text-white fill-white" />
                  </button>
                </div>
                <div className="flex items-center gap-3 font-mono text-sm text-danger">
                  <div className="w-2 h-2 rounded-full bg-danger animate-pulse" />
                  RECORDING — {formatDuration(recordingDuration)}
                </div>
                {/* Fake waveform */}
                <div className="flex items-center gap-1 h-8">
                  {Array.from({ length: 20 }).map((_, i) => (
                    <motion.div
                      key={i}
                      animate={{ height: [4, 8 + ((i * 17) % 20), 4] }}
                      transition={{ repeat: Infinity, duration: 0.52 + ((i % 5) * 0.06), delay: i * 0.05 }}
                      className="w-1 bg-danger/60 rounded-full"
                    />
                  ))}
                </div>
              </div>
            ) : (
              <button
                onClick={startRecording}
                className="group flex flex-col items-center gap-3 py-6 px-10 border-2 border-dashed border-accent/30 hover:border-accent hover:shadow-[0_0_30px_rgba(64,138,113,0.2)] transition-all text-accent hover:bg-accent/10 rounded-sm"
              >
                <Mic size={32} strokeWidth={1.5} className="group-hover:scale-110 transition-transform" />
                <span className="text-xs font-black tracking-widest uppercase">Hold to Record</span>
              </button>
            )}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-4 p-4 bg-accent/5 border border-accent/20"
          >
            <FileAudio size={20} className="text-accent" />
            <div className="flex-1 font-mono text-xs">
              <div className="text-highlight font-bold">audio_testimony.webm</div>
              <div className="text-gray-500">{(audioBlob.size / 1024).toFixed(1)} KB · {formatDuration(recordingDuration)}</div>
            </div>
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
          </motion.div>
        )}
      </div>

      {/* Image Capture */}
      <div className="glass tech-border p-5 space-y-4 hover:shadow-[0_0_20px_rgba(64,138,113,0.15)] transition-shadow duration-500 rounded-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera size={16} className="text-accent" />
            <span className="text-xs font-black text-highlight uppercase tracking-widest">Document Photo</span>
          </div>
          {imageFile && (
            <button onClick={() => { setImageFile(null); setImagePreview(null); }} className="text-gray-500 hover:text-danger transition-colors">
              <X size={14} />
            </button>
          )}
        </div>

        {!imagePreview ? (
          <button
            onClick={() => imageInputRef.current?.click()}
            className="w-full group flex flex-col items-center gap-3 py-10 border-2 border-dashed border-accent/30 hover:border-accent hover:shadow-[0_0_30px_rgba(64,138,113,0.2)] transition-all text-accent hover:bg-accent/10 rounded-sm"
          >
            <Upload size={24} strokeWidth={1.5} className="group-hover:-translate-y-1 transition-transform" />
            <span className="text-xs font-black tracking-widest uppercase">Capture / Upload Document</span>
            <span className="text-[10px] text-gray-500 group-hover:text-gray-400 transition-colors">Military orders, ID cards, evidence photos</span>
          </button>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imagePreview} alt="Evidence document" className="w-full max-h-40 object-cover border border-accent/30" />
            <div className="absolute bottom-0 left-0 right-0 bg-void/90 p-2 flex items-center gap-2">
              <FileImage size={12} className="text-accent" />
              <span className="font-mono text-[10px] text-gray-400 truncate">{imageFile?.name}</span>
            </div>
          </motion.div>
        )}

        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleImageChange}
        />
      </div>

      {/* Submit */}
      <motion.button
        onClick={handleSubmit}
        disabled={isProcessing || (!audioBlob && !imageFile)}
        whileHover={{ scale: isProcessing ? 1 : 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="w-full py-5 bg-accent text-void font-black text-sm tracking-[0.3em] uppercase disabled:opacity-40 disabled:cursor-not-allowed hover:bg-highlight hover:shadow-[0_0_30px_rgba(176,228,204,0.4)] transition-all relative overflow-hidden group rounded-sm shadow-[0_0_15px_rgba(64,138,113,0.3)]"
      >
        <span className="relative z-10">
          {isProcessing ? '// PIPELINE_RUNNING...' : '// BEGIN PROCESSING'}
        </span>
        {!isProcessing && (
          <div className="absolute inset-0 bg-highlight/20 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-500" />
        )}
      </motion.button>
    </div>
  );
}
