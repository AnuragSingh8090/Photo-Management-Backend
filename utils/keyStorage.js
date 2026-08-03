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
  return crypto.createHash('sha256').update(getPrivateKey()).digest();
};

/**
 * Generate a self-contained encrypted key string.
 * The key itself carries all data (durationMs, createdAt) inside it.
 * Any system with the same privateKey can decrypt and validate this key.
 * 
 * Format: base64url(iv + authTag + ciphertext)
 */
export const generateKeyString = (durationMs) => {
  const payload = `${durationMs}|${Date.now()}`;
  const key = deriveEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  let encrypted = cipher.update(payload, 'utf8');
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Combine: iv(12) + authTag(16) + ciphertext → single base64url string
  const combined = Buffer.concat([iv, authTag, encrypted]);
  return combined.toString('base64url');
};

/**
 * Decrypt a self-contained key string and extract its data.
 * Returns { durationMs, createdAt } or null if invalid/tampered.
 */
export const decryptKeyString = (keyStr) => {
  try {
    const combined = Buffer.from(keyStr, 'base64url');
    if (combined.length < 29) return null; // minimum: iv(12) + authTag(16) + 1 byte

    const iv = combined.subarray(0, 12);
    const authTag = combined.subarray(12, 28);
    const ciphertext = combined.subarray(28);

    const key = deriveEncryptionKey();
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertext, null, 'utf8');
    decrypted += decipher.final('utf8');

    const [durationStr, createdStr] = decrypted.split('|');
    const durationMs = parseInt(durationStr, 10);
    const createdAt = parseInt(createdStr, 10);

    if (isNaN(durationMs) || isNaN(createdAt)) return null;

    return { durationMs, createdAt };
  } catch {
    return null;
  }
};

/**
 * Read the encrypted keys file. The file is valid JSON, but the actual
 * data is stored inside the 'encryptedData' property as an AES-256-GCM blob.
 */
const readKeysFile = () => {
  if (!fs.existsSync(keysFile)) return {};
  try {
    const fileContent = fs.readFileSync(keysFile, 'utf-8');
    const parsed = JSON.parse(fileContent);
    if (!parsed || !parsed.encryptedData) return {};

    const combined = Buffer.from(parsed.encryptedData, 'base64url');
    if (combined.length < 29) return {};

    const iv = combined.subarray(0, 12);
    const authTag = combined.subarray(12, 28);
    const ciphertext = combined.subarray(28);

    const encKey = deriveEncryptionKey();
    const decipher = crypto.createDecipheriv('aes-256-gcm', encKey, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertext, null, 'utf8');
    decrypted += decipher.final('utf8');

    return JSON.parse(decrypted);
  } catch {
    return {};
  }
};

/**
 * Write the keys data as a single encrypted blob inside a JSON object.
 */
const writeKeysFile = (data) => {
  const dir = path.dirname(keysFile);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const json = JSON.stringify(data);
  const encKey = deriveEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encKey, iv);

  let encrypted = cipher.update(json, 'utf8');
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  const authTag = cipher.getAuthTag();

  const combined = Buffer.concat([iv, authTag, encrypted]);
  
  // Save as a valid JSON file, keeping the data completely encrypted
  fs.writeFileSync(keysFile, JSON.stringify({ 
    encryptedData: combined.toString('base64url') 
  }, null, 2));
};

/**
 * Get a short hash of the key for use as keys.json identifier.
 */
const keyHash = (keyStr) => {
  return crypto.createHash('sha256').update(keyStr).digest('hex').substring(0, 16);
};

/**
 * Wipe all local sessions — no active keys on this system.
 */
export const clearAllKeys = () => {
  writeKeysFile({});
};

/**
 * Register a newly generated key on this system.
 * Wipes all previous keys — only one key active at a time per system.
 * Stores the key's createdAt so we can reject older keys.
 */
export const registerKey = (keyStr) => {
  const data = decryptKeyString(keyStr);
  writeKeysFile({
    _lastGeneratedAt: data ? data.createdAt : Date.now(),
    [keyHash(keyStr)]: { firstUsedAt: null }
  });
};

/**
 * Validate a self-contained key.
 * 1. Decrypts the key to extract durationMs + createdAt
 * 2. Looks up keys.json for firstUsedAt (creates entry if first time on this system)
 * 3. Checks expiry based on firstUsedAt + durationMs
 * 
 * Returns remaining milliseconds, or null if invalid/expired/tampered.
 */
export const validateAndGetKey = (keyStr) => {
  // Step 1: Decrypt the key (works on ANY system with same privateKey)
  const data = decryptKeyString(keyStr);
  if (!data) return null;

  const { durationMs, createdAt } = data;
  const hash = keyHash(keyStr);
  const keys = readKeysFile();

  // Step 2: Reject keys older than the last generated key on this system
  if (keys._lastGeneratedAt && createdAt < keys._lastGeneratedAt) {
    return null;
  }

  // Step 3: Check/create local session entry
  if (!keys[hash]) {
    // First time this key is seen on this system — register it and wipe old entries
    keys._lastGeneratedAt = createdAt;
    keys[hash] = { firstUsedAt: null };

    // Remove all other keys (only one key active at a time)
    for (const existingHash of Object.keys(keys)) {
      if (existingHash !== hash && existingHash !== '_lastGeneratedAt') delete keys[existingHash];
    }
  }

  const entry = keys[hash];

  // Step 4: Mark firstUsedAt on first use
  if (!entry.firstUsedAt) {
    entry.firstUsedAt = Date.now();
    writeKeysFile(keys);
  }

  // Step 5: Check expiry
  const expiresAt = entry.firstUsedAt + durationMs;
  const remainingMs = expiresAt - Date.now();

  if (remainingMs <= 0) {
    delete keys[hash];
    writeKeysFile(keys);
    return null;
  }

  return remainingMs;
};
