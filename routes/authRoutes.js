import express from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { saveKey, validateAndGetKey, clearAllKeys } from '../utils/keyStorage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logsFile = path.join(__dirname, '../secrets/logs.json');

const getDynamicSecret = () => {
  try {
    if (fs.existsSync(logsFile)) {
      const data = fs.readFileSync(logsFile, 'utf-8');
      const logs = JSON.parse(data);
      if (logs.length > 0) {
        const targetLog = logs[logs.length - 1]; 
        const decoded = jwt.decode(targetLog.token);
        if (decoded && decoded['Private Key']) {
          return decoded['Private Key'];
        }
      }
    }
  } catch (err) {
    console.error("Error extracting dynamic secret:", err);
  }
  return null;
};

const router = express.Router();
const SECRET_KEY = process.env.JWT_SECRET || 'photo-manager-secret-key-123';

router.post('/login', (req, res) => {
  const { key } = req.body;

  if (!key || typeof key !== 'string') {
    return res.status(401).json({ success: false, message: 'Invalid key' });
  }

  // Verify the cryptographic signature of the key
  const parts = key.split('-');
  if (parts.length !== 2) {
    return res.status(401).json({ success: false, message: 'Invalid key format or missing signature' });
  }
  const [baseKey, signature] = parts;
  
  const dynamicSecret = getDynamicSecret();
  if (!dynamicSecret) {
    return res.status(500).json({ success: false, message: 'Server configuration error' });
  }
  
  const expectedSignature = crypto.createHmac('sha256', dynamicSecret).update(baseKey).digest('hex').substring(0, 8).toUpperCase();
  
  if (signature !== expectedSignature) {
    return res.status(401).json({ success: false, message: 'Key cryptographic verification failed' });
  }

  let expiresInMs = 0;
  let jwtExpiresIn = '';

  // Check if it's a generated custom key
  const customDurationMs = validateAndGetKey(key);
  if (customDurationMs) {
    expiresInMs = customDurationMs;
    // Convert ms to seconds for jsonwebtoken format, or just pass number (ms -> s)
    jwtExpiresIn = Math.floor(customDurationMs / 1000); 
  } else {
    return res.status(401).json({ success: false, message: 'Invalid key' });
  }

  const expiresAt = Date.now() + expiresInMs;
  const token = jwt.sign({ role: 'admin', expiresAt, keyId: key }, SECRET_KEY, { expiresIn: jwtExpiresIn });

  // Set HTTP-only cookie
  res.cookie('authToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: expiresInMs
  });

  return res.json({ success: true, message: 'Logged in successfully', expiresAt });
});

router.get('/verify', (req, res) => {
  const token = req.cookies.authToken;
  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authenticated' });
  }

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    
    // Check if the key used to generate this token is still valid
    if (!decoded.keyId || !validateAndGetKey(decoded.keyId)) {
      throw new Error('Token key is no longer valid');
    }

    return res.json({ success: true, expiresAt: decoded.expiresAt });
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('authToken');
  res.json({ success: true, message: 'Logged out successfully' });
});

// Emergency route to expire all active sessions and keys instantly
router.get('/generatetoken/expireall/:key', (req, res) => {
  const { key } = req.params;

  const dynamicSecret = getDynamicSecret();
  if (!dynamicSecret || key !== dynamicSecret) {
    return res.status(401).json({ success: false, message: 'wrong key' });
  }

  // Erase all keys in the storage
  clearAllKeys();

  return res.json({ 
    success: true, 
    message: 'All keys and active sessions have been instantly expired and terminated.'
  });
});

// Secret backend route for generating custom tokens
// Example: /auth/generatetoken/7D/SastaHacker
router.get('/generatetoken/:duration/:key', (req, res) => {
  const { duration, key } = req.params;

  const dynamicSecret = getDynamicSecret();
  if (!dynamicSecret || key !== dynamicSecret) {
    return res.status(401).json({ success: false, message: 'wrong key' });
  }

  // Parse duration (e.g. 5DAY, 2HOUR, 3MON, 1YEAR, 2MIN)
  const match = duration.match(/^(\d+)([a-zA-Z]+)$/);
  if (!match) {
    return res.status(400).json({ success: false, message: 'Invalid duration format. Use formats like 2DAY, 3HOUR, 3MON, 1YEAR, 2MIN' });
  }

  const value = parseInt(match[1], 10);
  const unit = match[2].toUpperCase();

  let expiresInMs = 0;
  let unitStr = '';

  if (unit === 'MIN') {
    expiresInMs = value * 60 * 1000;
    unitStr = value === 1 ? 'Minute' : 'Minutes';
  } else if (unit === 'D' || unit === 'DAY') {
    expiresInMs = value * 24 * 60 * 60 * 1000;
    unitStr = value === 1 ? 'Day' : 'Days';
  } else if (unit === 'H' || unit === 'HR' || unit === 'HOUR') {
    expiresInMs = value * 60 * 60 * 1000;
    unitStr = value === 1 ? 'Hour' : 'Hours';
  } else if (unit === 'M' || unit === 'MON') {
    expiresInMs = value * 30 * 24 * 60 * 60 * 1000;
    unitStr = value === 1 ? 'Month' : 'Months';
  } else if (unit === 'Y' || unit === 'YEAR') {
    expiresInMs = value * 365 * 24 * 60 * 60 * 1000;
    unitStr = value === 1 ? 'Year' : 'Years';
  } else {
    return res.status(400).json({ success: false, message: 'Invalid unit. Use MIN, HOUR, DAY, MON, or YEAR.' });
  }

  // Generate a random 8-character base key and securely sign it
  const baseKey = crypto.randomBytes(4).toString('hex').toUpperCase();
  const signature = crypto.createHmac('sha256', dynamicSecret).update(baseKey).digest('hex').substring(0, 8).toUpperCase();
  const generatedKey = `${baseKey}-${signature}`;

  // Save the key and its duration
  saveKey(generatedKey, expiresInMs);

  return res.json({ 
    success: true, 
    message: `this token is valid for ${value} ${unitStr} From the time of first use`,
    key: generatedKey
  });
});

export default router;
