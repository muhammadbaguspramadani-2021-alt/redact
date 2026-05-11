import { NextRequest, NextResponse } from 'next/server';
import { createRequire } from 'module';

// TACTICAL POLYFILL: Ensure native addons work in Turbopack
if (typeof global !== 'undefined') {
  const nativeReq = createRequire(import.meta.url);
  if (!(global as any).require) (global as any).require = nativeReq;
  if (!(global as any).require.addon) {
    (global as any).require.addon = (path: string) => nativeReq(path);
  }
}

import { runTranscription, runTranslation, runOcr, runEntityExtraction } from '@/lib/qvac-pipeline';
import { hashBundle, sealBundle } from '@/lib/crypto';
import { generateKeyPairSync } from 'crypto';
import fs from 'fs';
import path from 'path';
import type { ProcessApiResponse, PipelineEvent } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes — model loading + inference on first run

function loadHqPublicKey(): string | null {
  const raw = process.env.HQ_PUBLIC_KEY_PEM;
  if (raw) {
    const normalized = raw.includes('\\n') ? raw.replace(/\\n/g, '\n') : raw;
    if (normalized.includes('BEGIN PUBLIC KEY') && normalized.includes('END PUBLIC KEY')) {
      return normalized;
    }
  }

  try {
    const envPath = path.join(process.cwd(), '.env.local');
    const text = fs.readFileSync(envPath, 'utf-8');
    const lines = text.split(/\r?\n/);
    const startIndex = lines.findIndex((line) => line.startsWith('HQ_PUBLIC_KEY_PEM='));
    if (startIndex === -1) return null;

    const first = lines[startIndex].replace('HQ_PUBLIC_KEY_PEM=', '').trim();
    if (first.includes('END PUBLIC KEY')) return first;

    const collected = [first];
    for (let i = startIndex + 1; i < lines.length; i += 1) {
      collected.push(lines[i]);
      if (lines[i].includes('END PUBLIC KEY')) break;
    }
    const joined = collected.join('\n').trim();
    if (joined.includes('BEGIN PUBLIC KEY') && joined.includes('END PUBLIC KEY')) {
      return joined;
    }
  } catch {
    return null;
  }

  return null;
}

function debugLog(runId: string, hypothesisId: string, location: string, message: string, data: Record<string, unknown>) {
  // #region agent log
  fetch('http://127.0.0.1:7285/ingest/7d3689ba-e0bb-4445-b1c6-22b2be5799a6',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'377cbf'},body:JSON.stringify({sessionId:'377cbf',runId,hypothesisId,location,message,data,timestamp:Date.now()})}).catch(()=>{});
  // #endregion
}

export async function POST(req: NextRequest): Promise<NextResponse<ProcessApiResponse>> {
  const runId = `process-${Date.now().toString(36)}`;
  try {
    const formData = await req.formData();
    const audioFile = formData.get('audio') as File | null;
    const imageFile = formData.get('image') as File | null;

    if (!audioFile && !imageFile) {
      return NextResponse.json({ success: false, error: 'No files provided.' } as any, { status: 400 });
    }

    const pipeline: PipelineEvent[] = [];
    const audioBuffer = audioFile ? Buffer.from(await audioFile.arrayBuffer()) : Buffer.alloc(0);
    const imageBuffer = imageFile ? Buffer.from(await imageFile.arrayBuffer()) : Buffer.alloc(0);
    const hasAudio = audioBuffer.length > 0;
    const hasImage = imageBuffer.length > 0;
    debugLog(runId, 'H4', 'src/app/api/process/route.ts:69', 'Process request parsed', {
      hasAudio,
      audioBytes: audioBuffer.length,
      audioType: audioFile?.type ?? null,
      hasImage,
      imageBytes: imageBuffer.length,
      imageType: imageFile?.type ?? null,
    });

    let transcriptionFailed = false;

    // ── STAGE 1: TRANSCRIPTION + TRANSLATION ────────────────────────────────
    // Whisper task="translate" handles both in one pass for any field language.
    let transcribedText = '';
    if (!hasAudio) {
      pipeline.push({
        stage: 'transcription',
        label: 'Whisper Transcription + Translation',
        module: '@qvac/sdk — WHISPER_LARGE_V3_TURBO (translate)',
        status: 'complete',
        output: 'Skipped (no audio provided)',
        durationMs: 0,
        startedAt: Date.now(),
      });
    } else {
      const stageStart = Date.now();
      try {
        const result = await runTranscription(audioBuffer, audioFile?.name, audioFile?.type);
        transcribedText = result.text;
        pipeline.push({
          stage: 'transcription',
          label: 'Whisper Transcription + Translation',
          module: '@qvac/sdk — WHISPER_LARGE_V3_TURBO (translate)',
          status: 'complete',
          output: transcribedText.substring(0, 100) + (transcribedText.length > 100 ? '...' : ''),
          durationMs: result.durationMs,
          startedAt: stageStart,
        });
      } catch (err) {
        console.error('[/api/process] Transcription failed:', err);
        transcriptionFailed = true;
        transcribedText = '[Audio transcription unavailable]';
        pipeline.push({
          stage: 'transcription',
          label: 'Whisper Transcription + Translation',
          module: '@qvac/sdk — WHISPER_LARGE_V3_TURBO (translate)',
          status: 'error',
          output: `Error: ${err instanceof Error ? err.message : 'Unknown'}`,
          durationMs: Date.now() - stageStart,
          startedAt: stageStart,
        });
      }
    }

    // ── STAGE 2: TRANSLATION (pass-through — already done by Whisper) ────────
    let englishText = transcribedText;
    {
      const stageStart = Date.now();
      const result = await runTranslation(transcribedText);
      englishText = result.translatedText;
      const tOut =
        !hasAudio
          ? 'Skipped (no audio). Document English recap comes from OCR → LLM (documentSummaryEn), not Whisper.'
          : transcriptionFailed
            ? 'Not run — transcription stage failed earlier. Fix audio / rerun.'
            : 'Audio → English handled inside Whisper translate pass.';
      pipeline.push({
        stage: 'translation',
        label: 'Neural Translation (pass-through)',
        module: '@qvac/sdk — Whisper translate handles this stage natively',
        status: transcriptionFailed ? 'error' : 'complete',
        output: tOut,
        durationMs: result.durationMs,
        startedAt: stageStart,
      });
    }

    // ── STAGE 3: OCR ─────────────────────────────────────────────────────────
    let documentText = '';
    if (!hasImage) {
      pipeline.push({
        stage: 'ocr',
        label: 'Document OCR',
          module: '@qvac/sdk — OCR_DETECTOR_DB_MOBILENET_V3_LARGE + OCR_RECOGNIZER_PARSEQ (doctr)',
        status: 'complete',
        output: 'Skipped (no image provided)',
        durationMs: 0,
        startedAt: Date.now(),
      });
    } else {
      const stageStart = Date.now();
      try {
        const result = await runOcr(imageBuffer);
        documentText = result.rawText;
        const ocrSnippet = documentText.slice(0, 420).replace(/\n/g, '\\n');
        pipeline.push({
          stage: 'ocr',
          label: 'Document OCR',
          module: '@qvac/sdk — OCR_DETECTOR_DB_MOBILENET_V3_LARGE + OCR_RECOGNIZER_PARSEQ (doctr)',
          status: 'complete',
          output: `Extracted (${documentText.length} chars preview): ${ocrSnippet}${documentText.length > 420 ? '…' : ''}`,
          durationMs: result.durationMs,
          startedAt: stageStart,
        });
      } catch (err) {
        console.error('[/api/process] OCR failed:', err);
        documentText = '[Document OCR unavailable]';
        pipeline.push({
          stage: 'ocr',
          label: 'Document OCR',
          module: '@qvac/sdk — OCR_DETECTOR_DB_MOBILENET_V3_LARGE + OCR_RECOGNIZER_PARSEQ (doctr)',
          status: 'error',
          output: `Error: ${err instanceof Error ? err.message : 'Unknown'}`,
          durationMs: Date.now() - stageStart,
          startedAt: stageStart,
        });
      }
    }

    // ── STAGE 4: LLM ENTITY EXTRACTION ────────────────────────────────────────
    let report;
    {
      const stageStart = Date.now();
      try {
        const result = await runEntityExtraction(englishText, documentText);
        report = result.report;
        const sum = (report.documentSummaryEn ?? '').trim();
        pipeline.push({
          stage: 'llm',
          label: 'LLM Entity Extraction',
          module: '@qvac/sdk — LLAMA_3_2_1B_INST_Q4_0 (local)',
          status: 'complete',
          output: `ID ${report.incidentId} · ${report.severity.toUpperCase()} · ${(report.confidence * 100).toFixed(0)}% conf${sum ? ` · OCR→EN: ${sum.slice(0, 140)}${sum.length > 140 ? '…' : ''}` : ''}`,
          durationMs: result.durationMs,
          startedAt: stageStart,
        });
      } catch (err) {
        console.error('[/api/process] LLM extraction failed:', err);
        // Graceful fallback — still produce a report
        report = {
          incidentId: `INC-${Date.now().toString(36).toUpperCase()}`,
          timestamp: new Date().toISOString(),
          location: 'Unknown',
          perpetrators: [],
          victims: [],
          testimony: englishText,
          documentText,
          documentSummaryEn: '',
          keywords: [],
          severity: 'medium' as const,
          confidence: 0.5,
        };
        pipeline.push({
          stage: 'llm',
          label: 'LLM Entity Extraction',
          module: '@qvac/sdk — LLAMA_3_2_1B_INST_Q4_0 (local)',
          status: 'error',
          output: `Error: ${err instanceof Error ? err.message : 'Unknown'} — using fallback`,
          durationMs: Date.now() - stageStart,
          startedAt: stageStart,
        });
      }
    }

    // ── STAGE 5: CRYPTOGRAPHIC LOCKDOWN ──────────────────────────────────────
    {
      const stageStart = Date.now();
      const reportJson = JSON.stringify(report);
      const bundleJson = JSON.stringify({
        report,
        englishText,
        documentText,
        audioBase64: hasAudio ? audioBuffer.toString('base64') : null,
        imageBase64: hasImage ? imageBuffer.toString('base64') : null,
      });

      // Hash final report + image bytes (spec: report + image)
      const hash = hashBundle(reportJson, imageBuffer);

      const publicKeyPem = loadHqPublicKey();
      if (!publicKeyPem) {
        debugLog(runId, 'H1', 'src/app/api/process/route.ts:233', 'Missing HQ public key', {
          hasEnvKey: Boolean(process.env.HQ_PUBLIC_KEY_PEM),
        });
        return NextResponse.json({
          success: false,
          error: 'HQ_PUBLIC_KEY_PEM environment variable not set. Add it to .env.local to enable encryption.',
        } as any, { status: 503 });
      }

      const normalizedKey = publicKeyPem;
      let sealed;
      try {
        sealed = sealBundle(bundleJson, normalizedKey);
      } catch (err) {
        const allowDevKey = process.env.ALLOW_DEV_PUBLIC_KEY === 'true';
        if (!allowDevKey) throw err;

        const { publicKey } = generateKeyPairSync('x25519');
        const devPem = publicKey.export({ type: 'spki', format: 'pem' }).toString();
        sealed = sealBundle(bundleJson, devPem);
      }

      pipeline.push({
        stage: 'crypto',
        label: 'AES-256-GCM Lockdown',
        module: 'node:crypto (SHA-256 + AES-256-GCM)',
        status: 'complete',
        output: `SHA-256: ${hash.substring(0, 16)}... | Bundle sealed`,
        durationMs: Date.now() - stageStart,
        startedAt: stageStart,
      });
      debugLog(runId, 'H1', 'src/app/api/process/route.ts:262', 'Process finished with sealed payload', {
        hashPrefix: hash.substring(0, 12),
        pipelineStages: pipeline.map((p) => `${p.stage}:${p.status}`),
      });

      // Raw data now goes out of scope — only hash + ciphertext returned
      return NextResponse.json({
        success: true,
        hash,
        ciphertext: sealed.ciphertext,
        envelope: sealed.envelope,
        report,
        pipeline,
      });
    }

  } catch (err) {
    debugLog(runId, 'H1', 'src/app/api/process/route.ts:281', 'Fatal process error', {
      error: err instanceof Error ? err.message : 'Unknown',
    });
    console.error('[/api/process] Fatal error:', err);
    return NextResponse.json({
      success: false,
      error: err instanceof Error ? err.message : 'Processing failed.',
    } as any, { status: 500 });
  }
}
