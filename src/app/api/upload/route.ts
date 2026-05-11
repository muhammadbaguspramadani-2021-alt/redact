import { NextRequest, NextResponse } from 'next/server';
import type { KeyEnvelope } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

function debugLog(runId: string, hypothesisId: string, location: string, message: string, data: Record<string, unknown>) {
  // #region agent log
  fetch('http://127.0.0.1:7285/ingest/7d3689ba-e0bb-4445-b1c6-22b2be5799a6',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'377cbf'},body:JSON.stringify({sessionId:'377cbf',runId,hypothesisId,location,message,data,timestamp:Date.now()})}).catch(()=>{});
  // #endregion
}

export async function POST(req: NextRequest) {
  const runId = `upload-${Date.now().toString(36)}`;
  try {
    const { id, hash, ciphertext, envelope } = (await req.json()) as {
      id?: string;
      hash?: string;
      ciphertext?: string;
      envelope?: KeyEnvelope;
    };

    if (!id || !hash || !ciphertext || !envelope) {
      debugLog(runId, 'H2', 'src/app/api/upload/route.ts:25', 'Upload rejected missing fields', {
        hasId: Boolean(id),
        hasHash: Boolean(hash),
        hasCiphertext: Boolean(ciphertext),
        hasEnvelope: Boolean(envelope),
      });
      return NextResponse.json({ success: false, error: 'id, hash, ciphertext, envelope required.' } as any, { status: 400 });
    }

    const secureDropUrl = process.env.SECURE_DROP_URL;
    const secureDropToken = process.env.SECURE_DROP_TOKEN;

    if (!secureDropUrl) {
      const allowSkip = process.env.ALLOW_UPLOAD_SKIP === 'true';
      debugLog(runId, 'H2', 'src/app/api/upload/route.ts:37', 'Secure drop URL missing', {
        allowSkip,
      });
      if (!allowSkip) {
        return NextResponse.json({
          success: false,
          error: 'SECURE_DROP_URL environment variable not set. Add it to .env.local to enable uploads.',
        } as any, { status: 503 });
      }

      return NextResponse.json({
        success: true,
        uploadId: `local-${id}`,
        dropUrl: null,
      });
    }

    const payload = {
      id,
      hash,
      ciphertext,
      envelope,
      createdAt: new Date().toISOString(),
      schema: 'redact-secure-drop-v1',
    };

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (secureDropToken) headers.Authorization = `Bearer ${secureDropToken}`;

    let res: Response;
    try {
      res = await fetch(secureDropUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
    } catch (err) {
      const allowSkip = process.env.ALLOW_UPLOAD_SKIP === 'true';
      if (allowSkip) {
        console.warn(`[/api/upload] Secure Drop unreachable at ${secureDropUrl}, skipping as ALLOW_UPLOAD_SKIP=true`);
        return NextResponse.json({
          success: true,
          uploadId: `local-fallback-${id}`,
          dropUrl: null,
          skipped: true,
        });
      }
      throw err; // rethrow to be caught by the outer handler
    }

    debugLog(runId, 'H2', 'src/app/api/upload/route.ts:86', 'Secure drop responded', {
      status: res.status,
      ok: res.ok,
    });

    const text = await res.text();
    let parsed: any = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = null;
    }

    if (!res.ok) {
      return NextResponse.json({
        success: false,
        error: parsed?.error ?? text ?? 'Secure drop upload failed.',
      } as any, { status: 502 });
    }

    return NextResponse.json({
      success: true,
      uploadId: parsed?.id ?? parsed?.cid ?? parsed?.hash ?? null,
      dropUrl: parsed?.url ?? parsed?.downloadUrl ?? null,
    });
  } catch (err) {
    debugLog(runId, 'H2', 'src/app/api/upload/route.ts:91', 'Upload route threw error', {
      error: err instanceof Error ? err.message : 'Unknown',
    });
    console.error('[/api/upload] Error:', err);
    return NextResponse.json({
      success: false,
      error: err instanceof Error ? err.message : 'Upload failed.',
    } as any, { status: 500 });
  }
}
