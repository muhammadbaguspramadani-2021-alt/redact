// Crypto utilities for Redact
// All operations run locally via Node.js built-in 'crypto' module
// NO external crypto services are used

import {
  createHash,
  createCipheriv,
  createDecipheriv,
  createPublicKey,
  diffieHellman,
  generateKeyPairSync,
  hkdfSync,
  randomBytes,
} from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 12;  // 96 bits for GCM
const TAG_LENGTH = 16;

export interface KeyEnvelope {
  algo: 'x25519-hkdf-sha256-aes-256-gcm';
  ephemeralPublicKey: string; // base64 DER (SPKI)
  salt: string;               // base64
  iv: string;                 // base64
  tag: string;                // base64
  wrappedKey: string;         // base64
}

export interface SealedBundle {
  ciphertext: string; // base64: [IV (12)] + [AuthTag (16)] + [Ciphertext]
  envelope: KeyEnvelope;
}

function parsePublicKey(input: string) {
  try {
    return createPublicKey(input);
  } catch (pemError) {
    try {
      const der = Buffer.from(input, 'base64');
      return createPublicKey({ key: der, format: 'der', type: 'spki' });
    } catch {
      throw pemError;
    }
  }
}

/**
 * Computes a SHA-256 hash of a Buffer or string.
 * Used to generate the evidence fingerprint before encryption.
 */
export function sha256(data: Buffer | string): string {
  return createHash('sha256')
    .update(data)
    .digest('hex');
}

/**
 * Derives a deterministic 32-byte key from a passphrase.
 * In production, this would use a KDF (PBKDF2 or Argon2).
 */
function deriveKey(passphrase: string): Buffer {
  return createHash('sha256').update(passphrase).digest();
}

/**
 * Encrypts data using AES-256-GCM.
 * Returns a base64-encoded ciphertext with IV and auth tag prepended.
 * Format: [IV (12 bytes)] + [AuthTag (16 bytes)] + [Ciphertext]
 */
export function encrypt(plaintext: string | Buffer, passphrase: string): string {
  const key = deriveKey(passphrase);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  
  const data = typeof plaintext === 'string' ? Buffer.from(plaintext, 'utf-8') : plaintext;
  const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Combine: IV + AuthTag + Ciphertext
  const combined = Buffer.concat([iv, authTag, encrypted]);
  return combined.toString('base64');
}

/**
 * Encrypts a bundle with a random key, then wraps that key with HQ public key.
 * This keeps payload local-only while enabling HQ decryption.
 */
export function sealBundle(plaintext: string | Buffer, recipientPublicKeyPem: string): SealedBundle {
  const data = typeof plaintext === 'string' ? Buffer.from(plaintext, 'utf-8') : plaintext;
  const bundleKey = randomBytes(KEY_LENGTH);

  const dataIv = randomBytes(IV_LENGTH);
  const dataCipher = createCipheriv(ALGORITHM, bundleKey, dataIv);
  const dataEncrypted = Buffer.concat([dataCipher.update(data), dataCipher.final()]);
  const dataTag = dataCipher.getAuthTag();
  const ciphertext = Buffer.concat([dataIv, dataTag, dataEncrypted]).toString('base64');

  const publicKey = parsePublicKey(recipientPublicKeyPem.trim());
  const { publicKey: ephPublicKey, privateKey: ephPrivateKey } = generateKeyPairSync('x25519');
  const sharedSecret = diffieHellman({ privateKey: ephPrivateKey, publicKey });

  const salt = randomBytes(16);
  const wrapKey = Buffer.from(
    hkdfSync('sha256', sharedSecret, salt, Buffer.from('redact-key-wrap'), KEY_LENGTH)
  );
  const wrapIv = randomBytes(IV_LENGTH);
  const wrapCipher = createCipheriv(ALGORITHM, wrapKey, wrapIv);
  const wrappedKey = Buffer.concat([wrapCipher.update(bundleKey), wrapCipher.final()]);
  const wrapTag = wrapCipher.getAuthTag();

  const envelope: KeyEnvelope = {
    algo: 'x25519-hkdf-sha256-aes-256-gcm',
    ephemeralPublicKey: ephPublicKey.export({ type: 'spki', format: 'der' }).toString('base64'),
    salt: salt.toString('base64'),
    iv: wrapIv.toString('base64'),
    tag: wrapTag.toString('base64'),
    wrappedKey: wrappedKey.toString('base64'),
  };

  return { ciphertext, envelope };
}

/**
 * Decrypts AES-256-GCM ciphertext (base64).
 */
export function decrypt(ciphertextBase64: string, passphrase: string): Buffer {
  const key = deriveKey(passphrase);
  const combined = Buffer.from(ciphertextBase64, 'base64');
  
  const iv = combined.subarray(0, IV_LENGTH);
  const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const ciphertext = combined.subarray(IV_LENGTH + TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

/**
 * Generates a random encryption key. Used for one-time bundle keys.
 */
export function generateKey(): string {
  return randomBytes(KEY_LENGTH).toString('hex');
}

/**
 * Computes SHA-256 of multiple Buffers concatenated together.
 * Used to hash the full evidence bundle (audio + image + report).
 */
export function hashBundle(...chunks: (Buffer | string)[]): string {
  const hash = createHash('sha256');
  for (const chunk of chunks) {
    hash.update(chunk);
  }
  return hash.digest('hex');
}
