import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const keysFile = path.join(__dirname, '../secrets/keys.json');

export const getKeys = () => {
  if (!fs.existsSync(keysFile)) {
    return {};
  }
  try {
    const data = fs.readFileSync(keysFile, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    return {};
  }
};
export const clearAllKeys = () => {
  const dir = path.dirname(keysFile);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(keysFile, JSON.stringify({}, null, 2));
};

export const saveKey = (key, durationMs) => {
  // Clear old keys by creating a fresh object
  const keys = {};
  keys[key] = {
    durationMs,
    createdAt: Date.now()
  };
  
  const dir = path.dirname(keysFile);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(keysFile, JSON.stringify(keys, null, 2));
};

export const validateAndGetKey = (key) => {
  const keys = getKeys();
  if (keys[key]) {
    const keyData = keys[key];
    const expiresAt = keyData.createdAt + keyData.durationMs;
    const remainingMs = expiresAt - Date.now();
    
    // If the key has already expired, delete it and return null
    if (remainingMs <= 0) {
      delete keys[key];
      fs.writeFileSync(keysFile, JSON.stringify(keys, null, 2));
      return null;
    }
    
    // Return the actual remaining duration from creation date
    return remainingMs;
  }
  return null;
};
