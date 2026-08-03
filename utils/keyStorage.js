import fs from 'fs';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import { getPrivateKey } from './secretsConfig.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const keysFile = path.join(__dirname, '../secrets/keys.json');

// --- AES-256-GCM Encryption using privateKey from config ---

const deriveEncryptionKey = () => {
  // Derive a 32-byte AES key from the privateKey using SHA-256
  return crypto.createHash('sha256').update(getPrivateKey()).digest();
};

/**
 * Encrypts key data into a single tamper-proof string.
 * Format: iv:authTag:ciphertext (all hex)
 * If anyone edits this string manually, decryption will fail.
 */
const encryptKeyData = (data) => {
  const key = deriveEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
};

/**
 * Decrypts the encrypted key string back into data.
 * Returns null if tampered, corrupted, or invalid.
 */
const decryptKeyData = (encryptedStr) => {
  try {
    const parts = encryptedStr.split(':');
    if (parts.length !== 3) return null;

    const [ivHex, authTagHex, ciphertext] = parts;
    const key = deriveEncryptionKey();
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return JSON.parse(decrypted);
  } catch (err) {
    // Tampered, corrupted, or wrong key — treat as invalid
    return null;
  }
};

// --- File I/O ---

const readKeysFile = () => {
  if (!fs.existsSync(keysFile)) return {};
  try {
    return JSON.parse(fs.readFileSync(keysFile, 'utf-8'));
  } catch {
    return {};
  }
};

const writeKeysFile = (data) => {
  const dir = path.dirname(keysFile);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(keysFile, JSON.stringify(data, null, 2));
};

// --- Public API ---

/**
 * Wipe everything — no active keys remain.
 */
export const clearAllKeys = () => {
  writeKeysFile({});
};

/**
 * Save a new key. Automatically deletes ALL previous keys first —
 * only one key is ever valid at a time.
 * 
 * The stored value is an encrypted blob containing:
 *   { durationMs, createdAt, firstUsedAt }
 * If someone edits the blob manually, decryption will fail and the key becomes invalid.
 */
export const saveKey = (key, durationMs) => {
  const encrypted = encryptKeyData({
    durationMs,
    createdAt: Date.now(),
    firstUsedAt: null
  });

  // Only one key at a time — wipe everything, then save the new one
  writeKeysFile({ [key]: encrypted });
};

/**
 * Validate a key and return remaining milliseconds.
 * Returns null if the key doesn't exist, was tampered with, or has expired.
 * On first use, marks the firstUsedAt timestamp (encrypted) so the countdown starts.
 */
export const validateAndGetKey = (key) => {
  const keys = readKeysFile();

  if (!keys[key]) return null;

  const data = decryptKeyData(keys[key]);
  if (!data) {
    // Encrypted blob was tampered with — delete it
    delete keys[key];
    writeKeysFile(keys);
    return null;
  }

  // First use — mark timestamp and re-encrypt
  if (!data.firstUsedAt) {
    data.firstUsedAt = Date.now();
    keys[key] = encryptKeyData(data);
    writeKeysFile(keys);
  }

  const expiresAt = data.firstUsedAt + data.durationMs;
  const remainingMs = expiresAt - Date.now();

  if (remainingMs <= 0) {
    // Expired — remove it
    delete keys[key];
    writeKeysFile(keys);
    return null;
  }

  return remainingMs;
};
