/**
 * Redact — Secure Drop Server
 *
 * Receives encrypted ciphertext bundles from field agents (Redact app).
 * Stores them on disk. HQ can then download + decrypt with their private key.
 *
 * DEPLOYMENT on VPS (Ubuntu/Debian):
 *   1. Copy this folder to /opt/secure-drop on your VPS
 *   2. npm install
 *   3. Create a .env file:
 *        PORT=4000
 *        DROP_TOKEN=your-secret-bearer-token
 *        STORAGE_DIR=/var/lib/secure-drop/payloads
 *        MAX_PAYLOAD_MB=50
 *   4. Run with PM2:
 *        npm install -g pm2
 *        pm2 start server.js --name secure-drop
 *        pm2 save && pm2 startup
 *   5. Reverse-proxy with Nginx (optional but recommended):
 *        location /drop/ { proxy_pass http://127.0.0.1:4000/; }
 *
 * SECURITY:
 *   - All data stored is already AES-256-GCM encrypted by the field agent.
 *   - The server NEVER sees plaintext — only opaque ciphertext + envelope.
 *   - Bearer token auth prevents unauthorized uploads.
 *   - Files stored with UUID filenames (not predictable paths).
 *
 * ENDPOINTS:
 *   POST /   — Upload encrypted bundle
 *   GET  /list  — List all stored payload IDs + timestamps (admin)
 *   GET  /dl/:id — Download a payload by ID (admin)
 *   GET  /health — Health check
 */

'use strict';

const http = require('http');
const fs   = require('fs');
const path = require('path');
const crypto = require('crypto');

// ── Config ───────────────────────────────────────────────────────────────────
const PORT         = parseInt(process.env.PORT ?? '4000', 10);
const DROP_TOKEN   = process.env.DROP_TOKEN ?? '';          // empty = no auth (dev only)
const STORAGE_DIR  = process.env.STORAGE_DIR ?? path.join(__dirname, 'payloads');
const MAX_MB       = parseInt(process.env.MAX_PAYLOAD_MB ?? '50', 10);
const MAX_BYTES    = MAX_MB * 1024 * 1024;
const ADMIN_TOKEN  = process.env.ADMIN_TOKEN ?? DROP_TOKEN; // token for list/download

// ── Startup ──────────────────────────────────────────────────────────────────
if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
  console.log(`[secure-drop] Created storage dir: ${STORAGE_DIR}`);
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function uuid() {
  return crypto.randomUUID();
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', chunk => {
      size += chunk.length;
      if (size > MAX_BYTES) {
        req.destroy();
        reject(new Error(`Payload too large (max ${MAX_MB} MB)`));
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    req.on('error', reject);
  });
}

function sendJSON(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
    'Access-Control-Allow-Origin': '*',
  });
  res.end(payload);
}

function checkAuth(req, token) {
  if (!token) return true; // no token configured = open (dev only)
  const header = req.headers['authorization'] ?? '';
  return header === `Bearer ${token}`;
}

// ── Route: POST / — Upload encrypted bundle ──────────────────────────────────
async function handleUpload(req, res) {
  if (!checkAuth(req, DROP_TOKEN)) {
    return sendJSON(res, 401, { error: 'Unauthorized — invalid Bearer token' });
  }

  let raw;
  try {
    raw = await readBody(req);
  } catch (err) {
    return sendJSON(res, 413, { error: err.message });
  }

  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    return sendJSON(res, 400, { error: 'Invalid JSON body' });
  }

  // Validate required fields from Redact schema
  const { id, hash, ciphertext, envelope, schema } = body;
  if (!id || !hash || !ciphertext || !envelope) {
    return sendJSON(res, 400, { error: 'Missing required fields: id, hash, ciphertext, envelope' });
  }
  if (typeof hash !== 'string' || hash.length !== 64) {
    return sendJSON(res, 400, { error: 'hash must be a 64-char hex SHA-256 string' });
  }
  if (schema && schema !== 'redact-secure-drop-v1') {
    return sendJSON(res, 400, { error: `Unknown schema: ${schema}` });
  }

  // Store payload — UUID filename to avoid enumeration
  const fileId = uuid();
  const filePath = path.join(STORAGE_DIR, `${fileId}.json`);
  const record = {
    fileId,
    receivedAt: new Date().toISOString(),
    incidentId: id,
    hash,
    ciphertext,
    envelope,
    schema: schema ?? 'redact-secure-drop-v1',
  };

  try {
    fs.writeFileSync(filePath, JSON.stringify(record, null, 2), { mode: 0o600 });
  } catch (err) {
    console.error('[secure-drop] Failed to write payload:', err);
    return sendJSON(res, 500, { error: 'Storage error' });
  }

  console.log(`[secure-drop] ✅ Stored payload ${fileId} | incidentId: ${id} | hash: ${hash.substring(0, 16)}...`);

  return sendJSON(res, 200, {
    success: true,
    id: fileId,
    url: `/dl/${fileId}`,
    receivedAt: record.receivedAt,
  });
}

// ── Route: GET /list — List all payloads (admin) ─────────────────────────────
function handleList(req, res) {
  if (!checkAuth(req, ADMIN_TOKEN)) {
    return sendJSON(res, 401, { error: 'Unauthorized' });
  }

  const files = fs.readdirSync(STORAGE_DIR).filter(f => f.endsWith('.json'));
  const list = files.map(f => {
    try {
      const raw = fs.readFileSync(path.join(STORAGE_DIR, f), 'utf-8');
      const r = JSON.parse(raw);
      return {
        fileId: r.fileId,
        incidentId: r.incidentId,
        hash: r.hash,
        receivedAt: r.receivedAt,
        schema: r.schema,
      };
    } catch {
      return { fileId: f.replace('.json', ''), error: 'Corrupt record' };
    }
  });

  list.sort((a, b) => (b.receivedAt ?? '').localeCompare(a.receivedAt ?? ''));
  return sendJSON(res, 200, { total: list.length, payloads: list });
}

// ── Route: GET /dl/:id — Download a payload ───────────────────────────────────
function handleDownload(req, res, fileId) {
  if (!checkAuth(req, ADMIN_TOKEN)) {
    return sendJSON(res, 401, { error: 'Unauthorized' });
  }

  // Sanitize fileId — must be UUID format only
  if (!/^[0-9a-f-]{36}$/.test(fileId)) {
    return sendJSON(res, 400, { error: 'Invalid file ID' });
  }

  const filePath = path.join(STORAGE_DIR, `${fileId}.json`);
  if (!fs.existsSync(filePath)) {
    return sendJSON(res, 404, { error: 'Payload not found' });
  }

  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const payload = JSON.parse(raw);
    return sendJSON(res, 200, payload);
  } catch {
    return sendJSON(res, 500, { error: 'Failed to read payload' });
  }
}

// ── Route: GET /health ────────────────────────────────────────────────────────
function handleHealth(res) {
  const files = fs.readdirSync(STORAGE_DIR).filter(f => f.endsWith('.json')).length;
  return sendJSON(res, 200, {
    status: 'ok',
    service: 'redact-secure-drop',
    stored: files,
    storageDir: STORAGE_DIR,
    maxPayloadMb: MAX_MB,
    authEnabled: DROP_TOKEN.length > 0,
    timestamp: new Date().toISOString(),
  });
}

// ── Router ────────────────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  const url = req.url ?? '/';
  const method = req.method ?? 'GET';

  // CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    });
    return res.end();
  }

  try {
    if (method === 'POST' && url === '/') {
      return await handleUpload(req, res);
    }

    if (method === 'GET' && url === '/health') {
      return handleHealth(res);
    }

    if (method === 'GET' && url === '/list') {
      return handleList(req, res);
    }

    const dlMatch = url.match(/^\/dl\/([^/]+)$/);
    if (method === 'GET' && dlMatch) {
      return handleDownload(req, res, dlMatch[1]);
    }

    return sendJSON(res, 404, { error: 'Not found' });
  } catch (err) {
    console.error('[secure-drop] Unhandled error:', err);
    return sendJSON(res, 500, { error: 'Internal server error' });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🔒 Redact Secure Drop Server`);
  console.log(`   Listening on http://0.0.0.0:${PORT}`);
  console.log(`   Storage:    ${STORAGE_DIR}`);
  console.log(`   Max upload: ${MAX_MB} MB`);
  console.log(`   Auth:       ${DROP_TOKEN ? 'Bearer token enabled' : '⚠️  NO AUTH — dev mode only'}`);
  console.log(`\n   Endpoints:`);
  console.log(`     POST /         → Upload encrypted bundle`);
  console.log(`     GET  /health   → Health check`);
  console.log(`     GET  /list     → List all payloads (admin)`);
  console.log(`     GET  /dl/:id   → Download a payload (admin)\n`);
});

// ── Graceful shutdown ─────────────────────────────────────────────────────────
process.on('SIGTERM', () => {
  console.log('[secure-drop] SIGTERM received — shutting down gracefully');
  server.close(() => process.exit(0));
});
process.on('SIGINT', () => {
  console.log('[secure-drop] SIGINT received — shutting down');
  server.close(() => process.exit(0));
});
