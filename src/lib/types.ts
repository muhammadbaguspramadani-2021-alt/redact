// Shared types for the Redact platform

export type PipelineStage = 'transcription' | 'translation' | 'ocr' | 'llm' | 'crypto';

export type StageStatus = 'idle' | 'running' | 'complete' | 'error';

export interface PipelineEvent {
  stage: PipelineStage;
  label: string;
  module: string;
  status: StageStatus;
  output?: string;
  durationMs?: number;
  startedAt?: number;
}

export interface StructuredReport {
  incidentId: string;
  timestamp: string;
  location: string;
  perpetrators: string[];
  victims: string[];
  testimony: string;
  /** Raw OCR output (normalized lines before LLM recap). */
  documentText: string;
  /** Jury-readable English recap of OCR + context (LLM — not verbatim OCR). Empty if absent. */
  documentSummaryEn?: string;
  keywords: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
}

export interface KeyEnvelope {
  algo: 'x25519-hkdf-sha256-aes-256-gcm';
  ephemeralPublicKey: string;
  salt: string;
  iv: string;
  tag: string;
  wrappedKey: string;
}

export interface UploadStatus {
  status: 'pending' | 'uploaded' | 'failed';
  id?: string;
  url?: string;
  error?: string;
  uploadedAt?: number;
}

export interface EvidencePayload {
  id: string;
  createdAt: number;
  hash: string;
  ciphertext: string;
  envelope: KeyEnvelope;
  report: StructuredReport;
  status: 'pending' | 'anchored' | 'failed';
  upload?: UploadStatus;
  txId?: string;
  slot?: number;
}

export interface ProcessApiResponse {
  success: boolean;
  hash: string;
  ciphertext: string;
  envelope: KeyEnvelope;
  report: StructuredReport;
  pipeline: PipelineEvent[];
  error?: string;
}

export interface AnchorApiResponse {
  success: boolean;
  txId: string;
  slot: number;
  hash: string;
  confirmedAt: number;
  explorerUrl: string;
  error?: string;
}
