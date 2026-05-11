'use client';

// Client-side vault using IndexedDB for persistence.
// All data stored here is already encrypted (ciphertext only).
// Raw evidence NEVER reaches the client.

import type { EvidencePayload } from './types';

const DB_NAME = 'redact-vault';
const DB_VERSION = 1;
const STORE_NAME = 'payloads';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbRequest<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Save an encrypted payload to the local vault */
export async function savePayload(payload: EvidencePayload): Promise<void> {
  const normalized: EvidencePayload = {
    ...payload,
    upload: payload.upload ?? { status: 'pending' },
  };
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  await idbRequest(tx.objectStore(STORE_NAME).put(normalized));
}

/** Get all payloads (sorted newest first) */
export async function getAllPayloads(): Promise<EvidencePayload[]> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const all = await idbRequest<EvidencePayload[]>(tx.objectStore(STORE_NAME).getAll());
  return all.sort((a, b) => b.createdAt - a.createdAt);
}

/** Get one vault entry by incident id */
export async function getPayload(id: string): Promise<EvidencePayload | null> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const row = await idbRequest<EvidencePayload | undefined>(tx.objectStore(STORE_NAME).get(id));
  return row ?? null;
}

/** Get only payloads that haven't been anchored yet */
export async function getPendingPayloads(): Promise<EvidencePayload[]> {
  const all = await getAllPayloads();
  return all.filter(p => p.status === 'pending');
}

/** Mark a payload as anchored with a TxID */
export async function markAnchored(id: string, txId: string, slot: number): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  const payload = await idbRequest<EvidencePayload>(store.get(id));
  if (payload) {
    payload.status = 'anchored';
    payload.txId = txId;
    payload.slot = slot;
    await idbRequest(store.put(payload));
  }
}

/** Mark a payload as uploaded to secure drop */
export async function markUploaded(id: string, upload: { id?: string; url?: string }): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  const payload = await idbRequest<EvidencePayload>(store.get(id));
  if (payload) {
    payload.upload = {
      status: 'uploaded',
      id: upload.id,
      url: upload.url,
      uploadedAt: Date.now(),
    };
    await idbRequest(store.put(payload));
  }
}

/** Mark a payload upload failure */
export async function markUploadFailed(id: string, error: string): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  const payload = await idbRequest<EvidencePayload>(store.get(id));
  if (payload) {
    payload.upload = {
      status: 'failed',
      error,
    };
    await idbRequest(store.put(payload));
  }
}

/** Get count of payloads by status */
export async function getVaultStats(): Promise<{ pending: number; anchored: number; total: number }> {
  const all = await getAllPayloads();
  const pending = all.filter(p => p.status === 'pending').length;
  const anchored = all.filter(p => p.status === 'anchored').length;
  return { pending, anchored, total: all.length };
}
