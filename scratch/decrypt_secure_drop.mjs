
import {
  createDecipheriv,
  createPrivateKey,
  createPublicKey,
  diffieHellman,
  hkdfSync,
} from 'crypto';
import fs from 'fs';
import path from 'path';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

function decryptSecureDrop(payloadPath, privateKeyPath) {
  console.log(`Decrypting ${payloadPath} using ${privateKeyPath}...`);
  
  const payload = JSON.parse(fs.readFileSync(payloadPath, 'utf-8'));
  const privateKeyPem = fs.readFileSync(privateKeyPath, 'utf-8');
  
  const { ciphertext, envelope } = payload;
  const privateKey = createPrivateKey(privateKeyPem);
  
  // 1. Compute shared secret
  const ephPublicKey = createPublicKey({
    key: Buffer.from(envelope.ephemeralPublicKey, 'base64'),
    format: 'der',
    type: 'spki'
  });
  
  const sharedSecret = diffieHellman({
    privateKey,
    publicKey: ephPublicKey
  });
  
  // 2. Derive wrap key
  const salt = Buffer.from(envelope.salt, 'base64');
  const wrapKey = Buffer.from(
    hkdfSync('sha256', sharedSecret, salt, Buffer.from('redact-key-wrap'), KEY_LENGTH)
  );
  
  // 3. Decrypt bundle key
  const wrapIv = Buffer.from(envelope.iv, 'base64');
  const wrapTag = Buffer.from(envelope.tag, 'base64');
  const wrappedKey = Buffer.from(envelope.wrappedKey, 'base64');
  
  const wrapDecipher = createDecipheriv(ALGORITHM, wrapKey, wrapIv);
  wrapDecipher.setAuthTag(wrapTag);
  const bundleKey = Buffer.concat([wrapDecipher.update(wrappedKey), wrapDecipher.final()]);
  
  // 4. Decrypt main ciphertext
  const combined = Buffer.from(ciphertext, 'base64');
  const iv = combined.subarray(0, IV_LENGTH);
  const tag = combined.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const data = combined.subarray(IV_LENGTH + TAG_LENGTH);
  
  const decipher = createDecipheriv(ALGORITHM, bundleKey, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(data), decipher.final()]);
  
  return JSON.parse(plaintext.toString('utf-8'));
}

// Get the latest file from payloads
const payloadDir = './secure-drop/payloads';
const files = fs.readdirSync(payloadDir).filter(f => f.endsWith('.json'));
if (files.length === 0) {
  console.error('No payloads found in secure-drop/payloads');
  process.exit(1);
}

const latestFile = files.sort((a, b) => {
  return fs.statSync(path.join(payloadDir, b)).mtimeMs - fs.statSync(path.join(payloadDir, a)).mtimeMs;
})[0];

try {
  const result = decryptSecureDrop(path.join(payloadDir, latestFile), './private_key.pem');
  console.log('\n✅ DECRYPTION SUCCESSFUL\n');
  console.log('--- REPORT ---');
  console.log(JSON.stringify(result.report, null, 2));
  console.log('\n--- DOCUMENT TEXT ---');
  console.log(result.documentText);
  if (result.imageBase64) {
    console.log('\n[Image data present in bundle]');
  }
} catch (err) {
  console.error('Decryption failed:', err.message);
}
