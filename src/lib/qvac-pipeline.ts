/**
 * QVAC Pipeline — Real Implementation using @qvac/sdk
 *
 * Architecture notes:
 * - STAGE 1 (Transcription + Translation): Uses WHISPER_LARGE_V3_TURBO with
 *   task="translate" — Whisper natively transcribes AND translates any language
 *   to English in a single pass. This is the correct approach for field dialects
 *   (Burmese, Sudanese Arabic, Indonesian, etc.) that have no dedicated NMT model
 *   in the QVAC catalog. WHISPER_Q8_0 is used for broader language support.
 *
 * - STAGE 2 (OCR): Uses OCR_RECOGNIZER_PARSEQ + OCR_DETECTOR_DB_MOBILENET_V3_LARGE
 *   in DocTR mode for robust document text extraction.
 *
 * - STAGE 3 (LLM Entity Extraction): Uses LLAMA_3_2_1B_INST_Q4_0 locally to
 *   extract structured incident data from the translated testimony + document text.
 *
 * All model downloads are cached locally via the QVAC distributed registry.
 * First-run latency is expected (~1–5 min per model). Subsequent calls are instant.
 *
 * Node.js >= 22.17 is required by @qvac/sdk.
 */

import { createRequire } from 'module';

// TACTICAL POLYFILL: Rescue require.addon from Turbopack's isolation
// This must run before any @qvac modules are imported
if (typeof global !== 'undefined') {
  const nativeReq = createRequire(import.meta.url);
  if (!(global as any).require) (global as any).require = nativeReq;
  if (!(global as any).require.addon) {
    (global as any).require.addon = (path: string) => nativeReq(path);
  }
}

import {
  loadModel,
  transcribe,
  ocr,
  completion,
  unloadModel,
  WHISPER_LARGE_V3_TURBO,
  OCR_DETECTOR_DB_MOBILENET_V3_LARGE,
  OCR_RECOGNIZER_PARSEQ,
  LLAMA_3_2_1B_INST_Q4_0,
} from '@qvac/sdk';

import type { StructuredReport } from './types';
import sharp from 'sharp';
import { Readable } from 'stream';
import { randomBytes } from 'crypto';

function debugLog(runId: string, hypothesisId: string, location: string, message: string, data: Record<string, unknown>) {
  // #region agent log
  fetch('http://127.0.0.1:7285/ingest/7d3689ba-e0bb-4445-b1c6-22b2be5799a6',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'377cbf'},body:JSON.stringify({sessionId:'377cbf',runId,hypothesisId,location,message,data,timestamp:Date.now()})}).catch(()=>{});
  // #endregion
}

/** Replace placeholder LLM ids (INC-XXXX) with cryptographic server id */
function coerceIncidentId(fromLlm: unknown): string {
  const raw = fromLlm == null ? '' : String(fromLlm).trim();
  if (!raw || /^AUTO$/i.test(raw)) return `INC-${randomBytes(5).toString('hex').toUpperCase()}`;
  let id = raw.toUpperCase();
  if (!/^INC-/i.test(id)) id = `INC-${raw.replace(/^INC-?/i, '')}`;
  const tail = id.slice(4).replace(/[^A-Z0-9_-]/gi, '');
  const looksPlaceholder =
    tail.length === 0 ||
    /^AUTO$/i.test(tail) ||
    /^[X_-]+$/i.test(tail) ||
    /^0+$/i.test(tail.replace(/-/g, '')) ||
    tail.length <= 3;
  if (looksPlaceholder) id = `INC-${randomBytes(5).toString('hex').toUpperCase()}`;
  else id = `INC-${tail.slice(0, 40)}`;
  return id;
}

function coerceConfidence(v: unknown, fallback = 0.75): number {
  if (typeof v === 'number' && Number.isFinite(v)) return Math.min(1, Math.max(0, v));
  if (typeof v === 'string') {
    const m = v.match(/([\d.]+)/);
    if (m) {
      const parsed = parseFloat(m[1]);
      if (Number.isFinite(parsed)) {
        const n = parsed > 1 && parsed <= 100 ? parsed / 100 : parsed;
        return Math.min(1, Math.max(0, n));
      }
    }
  }
  return fallback;
}

/**
 * Normalize any image buffer to JPEG.
 * The QVAC OCR addon only accepts files with JPEG/PNG/BMP magic bytes.
 * Browser uploads may be WEBP, HEIC, AVIF, TIFF, etc., so we convert first.
 */
async function normalizeImageForOcr(input: Buffer): Promise<Buffer> {
  // DB_MOBILENET_V3_LARGE OCR detector requires:
  //   1. JPEG or PNG format (detected by magic bytes, not filename extension)
  //   2. Dimensions that are multiples of 32, max 1024px on each side
  // We convert any format (WEBP, HEIC, AVIF, TIFF, etc.) to JPEG
  // and resize to fit within 1024x1024 with aspect ratio preserved.
  // Padding ensures both dims are exact multiples of 32.
  const TARGET = 1024;
  const MULTIPLE = 32;

  return sharp(input)
    .resize(TARGET, TARGET, {
      fit: 'inside',      // maintain aspect ratio without cropping
      withoutEnlargement: true,
    })
    .grayscale()
    .normalize()
    .sharpen(1) // slightly less aggressive sharpening to avoid OCR noise
    .extend({
      // Pad width/height up to next multiple of MULTIPLE
      top: 0,
      left: 0,
      right: 0,  // will be recalculated below via separate call
      bottom: 0,
    })
    .jpeg({ quality: 90 })
    .toBuffer()
    .then(async (buf) => {
      // Get actual dimensions after resize, then pad to multiples of 32
      const meta = await sharp(buf).metadata();
      const w = meta.width ?? TARGET;
      const h = meta.height ?? TARGET;
      const paddedW = Math.ceil(w / MULTIPLE) * MULTIPLE;
      const paddedH = Math.ceil(h / MULTIPLE) * MULTIPLE;
      if (paddedW === w && paddedH === h) return buf;
      return sharp(buf)
        .extend({
          top: 0,
          left: 0,
          right: paddedW - w,
          bottom: paddedH - h,
          background: { r: 0, g: 0, b: 0 },
        })
        .jpeg({ quality: 90 })
        .toBuffer();
    });
}

// ─── Singleton model handles ────────────────────────────────────────────────
let whisperModelId: string | null = null;
let ocrModelId: string | null = null;
let llamaModelId: string | null = null;

/**
 * Load Whisper Large v3 Turbo with translation task.
 * This model handles any spoken language → English text in one pass.
 */
async function ensureWhisper(): Promise<string> {
  if (!whisperModelId) {
    console.log('[QVAC] Loading Whisper Large v3 Turbo...');
    // Runtime evidence: detect_language:true causes model activation failure.
    // Keep language=auto but disable detect_language to preserve stable startup.
    whisperModelId = await loadModel({
      modelSrc: WHISPER_LARGE_V3_TURBO,
      modelType: 'whispercpp-transcription',
      modelConfig: {
        translate: true,
        language: 'auto',
        detect_language: false,
        strategy: 'beam_search',
      },
    });
    debugLog(`qvac-whisper-${Date.now().toString(36)}`, 'H6', 'src/lib/qvac-pipeline.ts:122', 'Whisper model loaded', {
      modelId: whisperModelId,
      config: { translate: true, language: 'auto', detect_language: false, strategy: 'beam_search' },
    });
    console.log('[QVAC] Whisper loaded:', whisperModelId);
  }
  return whisperModelId;
}

/**
 * Load OCR pipeline.
 * Uses OCR_DETECTOR_DB_MOBILENET_V3_LARGE + OCR_RECOGNIZER_PARSEQ in DocTR mode.
 */
async function ensureOcr(): Promise<string> {
  if (!ocrModelId) {
    console.log('[QVAC] Loading OCR pipeline...');
    ocrModelId = await loadModel({
      modelSrc: OCR_RECOGNIZER_PARSEQ,
      modelType: 'onnx-ocr',
      modelConfig: {
        pipelineMode: 'doctr',
        detectorModelSrc: OCR_DETECTOR_DB_MOBILENET_V3_LARGE,
      },
    });
    debugLog(`qvac-ocrmodel-${Date.now().toString(36)}`, 'H7', 'src/lib/qvac-pipeline.ts:145', 'OCR model loaded', {
      modelId: ocrModelId,
      detector: 'OCR_DETECTOR_DB_MOBILENET_V3_LARGE',
      recognizer: 'OCR_RECOGNIZER_PARSEQ',
    });
    console.log('[QVAC] OCR loaded:', ocrModelId);
  }
  return ocrModelId;
}

/**
 * Load LLaMA 3.2 1B for entity extraction.
 */
async function ensureLlama(): Promise<string> {
  if (!llamaModelId) {
    console.log('[QVAC] Loading LLaMA 3.2 1B...');
    llamaModelId = await loadModel({
      modelSrc: LLAMA_3_2_1B_INST_Q4_0,
      modelType: 'llamacpp-completion',
      modelConfig: { ctx_size: 4096 },
    });
    console.log('[QVAC] LLaMA loaded:', llamaModelId);
  }
  return llamaModelId;
}

// ─── Stage 1: Transcription + Translation (single Whisper pass) ───────────

/**
 * Transcribes AND translates audio to English using WhisperCPP.
 * task="translate" handles all source languages natively.
 * No secondary NMT step needed — Whisper covers 99 languages.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';

export async function runTranscription(audioBuffer: Buffer, fileName?: string, mimeType?: string): Promise<{
  text: string;
  language: string;
  durationMs: number;
}> {
  const runId = `qvac-transcribe-${Date.now().toString(36)}`;
  const start = Date.now();
  const modelId = await ensureWhisper();
  debugLog(runId, 'H6', 'src/lib/qvac-pipeline.ts:177', 'Transcription starting', {
    modelId,
    audioBytes: audioBuffer.length,
  });

  // Write audio buffer to a temporary file
  const tempPath = path.join(os.tmpdir(), `qvac_audio_${Date.now()}_${Math.random().toString(36).slice(2)}.webm`);
  fs.writeFileSync(tempPath, audioBuffer);

  try {
    debugLog(runId, 'H8', 'src/lib/qvac-pipeline.ts:194', 'Transcription using temp file input', {
      mimeType: mimeType ?? null,
      fileName: fileName ?? null,
      audioBytes: audioBuffer.length,
      tempPath,
    });

    // Pass the filePath to the SDK. The QVAC Bare Worker will decode it internally.
    const text = await transcribe({
      modelId,
      audioChunk: tempPath, // Pass the string directly. The SDK wrapper handles `{ type: 'filePath', value: tempPath }`.
    });

    debugLog(runId, 'H6', 'src/lib/qvac-pipeline.ts:186', 'Transcription finished', {
      textLength: text.length,
    });

    return {
      text: text.trim(),
      language: 'auto-detected',
      durationMs: Date.now() - start,
    };
  } finally {
    // Always clean up the temporary file
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }
  }
}

/**
 * Stub for the translation stage.
 * Since Whisper task="translate" already outputs English, this is a pass-through.
 * The pipeline visualizer still shows it as a discrete stage for transparency.
 */
export async function runTranslation(text: string): Promise<{
  translatedText: string;
  durationMs: number;
}> {
  // Whisper already translated — pass through
  return { translatedText: text, durationMs: 0 };
}

// ─── Stage 2: OCR ────────────────────────────────────────────────────────────

/**
 * Extracts text from document images using local PP-OCR via @qvac/sdk.
 * Uses detector + recognizer model pair.
 */
export async function runOcr(imageBuffer: Buffer): Promise<{
  rawText: string;
  durationMs: number;
}> {
  const runId = `qvac-ocr-${Date.now().toString(36)}`;
  const start = Date.now();
  const modelId = await ensureOcr();

  // Normalize to JPEG — OCR addon only accepts JPEG/PNG/BMP by magic bytes
  const normalizedBuffer = await normalizeImageForOcr(imageBuffer);
  const normalizedMeta = await sharp(normalizedBuffer).metadata();
  debugLog(runId, 'H7', 'src/lib/qvac-pipeline.ts:226', 'OCR normalized image metadata', {
    modelId,
    width: normalizedMeta.width ?? null,
    height: normalizedMeta.height ?? null,
    format: normalizedMeta.format ?? null,
    bytes: normalizedBuffer.length,
  });

  const { blocks, stats } = ocr({
    modelId,
    image: normalizedBuffer,
  });

  const resolvedBlocks = await blocks;
  debugLog(runId, 'H7', 'src/lib/qvac-pipeline.ts:240', 'OCR blocks resolved', {
    blockCount: resolvedBlocks.length,
  });

  // Order blocks by spatial position when bbox exists (improves reading order).
  const orderedBlocks = (() => {
    const blocksAny = resolvedBlocks as Array<Record<string, unknown>>;
    const sample = blocksAny[0];
    const hasBbox = Boolean(sample && 'bbox' in sample);
    if (!hasBbox) return resolvedBlocks;

    const getXY = (b: Record<string, unknown>) => {
      const bb = b.bbox;
      // Common shapes:
      // - Array [x1, y1, x2, y2]
      // - Object { x, y, w, h } or { x, y }
      if (Array.isArray(bb) && bb.length >= 2 && typeof bb[0] === 'number' && typeof bb[1] === 'number') {
        return { x: bb[0] as number, y: bb[1] as number };
      }
      if (bb && typeof bb === 'object') {
        const bbObj = bb as Record<string, unknown>;
        const x = typeof bbObj.x === 'number' ? (bbObj.x as number) : 0;
        const y = typeof bbObj.y === 'number' ? (bbObj.y as number) : 0;
        return { x, y };
      }
      return { x: 0, y: 0 };
    };

    return [...resolvedBlocks].sort((a, b) => {
      const ax = getXY(a as Record<string, unknown>);
      const bx = getXY(b as Record<string, unknown>);
      return ax.y - bx.y || ax.x - bx.x;
    });
  })();

  const CONF_THRESHOLD = 0.2;
  const numericConfidenceBlocks = orderedBlocks.filter((b) => typeof b.confidence === 'number');
  const keptBlocks = orderedBlocks.filter((b) =>
    typeof b.confidence === 'number' ? (b.confidence as number) >= CONF_THRESHOLD : true
  );

  const confidenceValues = numericConfidenceBlocks.map((b) => b.confidence as number);
  const confMin = confidenceValues.length ? Math.min(...confidenceValues) : null;
  const confMax = confidenceValues.length ? Math.max(...confidenceValues) : null;
  const confAvg = confidenceValues.length ? confidenceValues.reduce((a, v) => a + v, 0) / confidenceValues.length : null;

  debugLog(runId, 'H9', 'src/lib/qvac-pipeline.ts:246', 'OCR confidence stats', {
    totalBlocks: resolvedBlocks.length,
    numericConfidenceBlocks: numericConfidenceBlocks.length,
    confMin,
    confMax,
    confAvg,
    confThreshold: CONF_THRESHOLD,
    keptBlocks: keptBlocks.length,
  });

  const rawText = keptBlocks.map((b) => b.text).join('\n').trim();
  const cleanedText = cleanOcrText(rawText);
  debugLog(runId, 'H9', 'src/lib/qvac-pipeline.ts:273', 'OCR text cleaned', {
    rawLength: rawText.length,
    cleanedLength: cleanedText.length,
  });
  const resolvedStats = await stats;

  return {
    rawText: cleanedText || '[No text detected in document image]',
    durationMs: resolvedStats?.totalTime ?? (Date.now() - start),
  };
}

function cleanOcrText(raw: string): string {
  if (!raw) return '';
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/(.)\1{4,}/g, '$1$1$1'))
    .filter((line) => {
      const alnum = (line.match(/[A-Za-z0-9@._:/-]/g) ?? []).length;
      return line.length >= 2 && alnum / line.length >= 0.25;
    });

  const seen = new Set<string>();
  const deduped: string[] = [];
  for (const line of lines) {
    const key = line.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!key || seen.has(key)) continue;
    seen.add(key);
    deduped.push(line);
  }
  return deduped.join('\n').slice(0, 4000);
}

// ─── Stage 3: LLM Entity Extraction ─────────────────────────────────────────

/**
 * Uses local LLaMA 3.2 1B to extract structured incident data.
 * Output is validated and coerced into the StructuredReport type.
 */
export async function runEntityExtraction(
  englishTestimony: string,
  documentText: string
): Promise<{
  report: StructuredReport;
  durationMs: number;
}> {
  const start = Date.now();
  const modelId = await ensureLlama();

  const systemPrompt = `You are a forensic intelligence analyst extracting structured data from field evidence.
Return ONLY a valid JSON object with EXACTLY these fields:
- incidentId: string (temporary token only — use literal "AUTO" ; server assigns final id)
- timestamp: string (ISO 8601 format)
- location: string (infer from context or write "Unknown")
- perpetrators: string[] — only names CLEARLY grounded in testimony or OCR; otherwise []
- victims: string[] — only parties CLEARLY grounded; otherwise []
- testimony: string (MUST be exactly "INPUT_TESTIMONY" ; server will replace with provided testimony)
- documentText: string (MUST be exactly "INPUT_DOCUMENT_TEXT" ; server will replace with provided document text)
- documentSummaryEn: string — 2–4 sentences in plain English summarizing DOCUMENT TEXT for jurors (Whisper translate does NOT read OCR — this replaces that). Empty string "" if document text missing or unreadable gibberish
- keywords: string[] (3-10 tags)
- severity: "low" | "medium" | "high" | "critical"
- confidence: number (0.0 to 1.0 — use decimal e.g. 0.72 not percentages)

Do NOT invent historical facts beyond what OCR/testimony imply. Do NOT output placeholder ids like INC-XXXX.

Do NOT include any text outside the JSON object.`;

  const userPrompt = `TESTIMONY (English):
${englishTestimony.substring(0, 2000)}

DOCUMENT TEXT (OCR):
${documentText.substring(0, 3500)}

JSON:`;

  const run = completion({
    modelId,
    history: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    stream: false,
  });

  const result = await run.final;
  const rawContent = result.contentText ?? '{}';
  debugLog(`qvac-llm-${Date.now().toString(36)}`, 'H12', 'src/lib/qvac-pipeline.ts:394', 'LLM raw output metadata', {
    rawContentLength: rawContent.length,
    hasCodeFence: rawContent.includes('```'),
    hasOpenBrace: rawContent.includes('{'),
    hasCloseBrace: rawContent.includes('}'),
    beginsWithBrace: rawContent.trim().startsWith('{'),
    endsWithBrace: rawContent.trim().endsWith('}'),
  });


  let report: StructuredReport;
  try {
    // Strip markdown code fences if present
    const cleaned = rawContent
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();

    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    const jsonCandidate =
      firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace
        ? cleaned.slice(firstBrace, lastBrace + 1)
        : cleaned;

    const parsed = JSON.parse(jsonCandidate);

    const summaryEnRaw = parsed.documentSummaryEn == null ? '' : String(parsed.documentSummaryEn).trim();

    report = {
      incidentId: coerceIncidentId(parsed.incidentId),
      timestamp: String(parsed.timestamp ?? new Date().toISOString()),
      location: String(parsed.location ?? 'Unknown'),
      perpetrators: Array.isArray(parsed.perpetrators) ? parsed.perpetrators.map(String) : [],
      victims: Array.isArray(parsed.victims) ? parsed.victims.map(String) : [],
      testimony: englishTestimony,
      documentText,
      documentSummaryEn: summaryEnRaw,
      keywords: Array.isArray(parsed.keywords) ? parsed.keywords.map(String) : [],
      severity: ['low', 'medium', 'high', 'critical'].includes(parsed.severity)
        ? (parsed.severity as StructuredReport['severity'])
        : 'medium',
      confidence: coerceConfidence(parsed.confidence),
    };

    debugLog(`qvac-llm-${Date.now().toString(36)}`, 'H12', 'src/lib/qvac-pipeline.ts:440', 'LLM JSON parse success', {
      incidentIdPrefix: report.incidentId.slice(0, 7),
      severity: report.severity,
      confidence: report.confidence,
    });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.warn('[QVAC/LLM] Output was not valid JSON — using fallback structure. Raw:', rawContent.substring(0, 200));
    report = {
      incidentId: coerceIncidentId(null),
      timestamp: new Date().toISOString(),
      location: 'Unknown — LLM parse error',
      perpetrators: [],
      victims: [],
      testimony: englishTestimony,
      documentText,
      documentSummaryEn: '',
      keywords: [],
      severity: 'medium',
      confidence: 0.5,
    };

    debugLog(`qvac-llm-${Date.now().toString(36)}`, 'H12', 'src/lib/qvac-pipeline.ts:468', 'LLM JSON parse failed', {
      rawTrimStartsWithBrace: rawContent.trim().startsWith('{'),
      rawTrimEndsWithBrace: rawContent.trim().endsWith('}'),
      hasAnyBrace: rawContent.trim().includes('{') || rawContent.trim().includes('}'),
      errorMessage: errMsg,
    });
  }

  return { report, durationMs: Date.now() - start };
}

/**
 * Gracefully unloads all models from GPU/RAM.
 * Call on server shutdown to free resources.
 */
export async function unloadAllModels(): Promise<void> {
  const ids = [whisperModelId, ocrModelId, llamaModelId].filter(Boolean) as string[];
  await Promise.all(ids.map((id) => unloadModel({ modelId: id })));
  whisperModelId = null;
  ocrModelId = null;
  llamaModelId = null;
  console.log('[QVAC] All models unloaded.');
}
