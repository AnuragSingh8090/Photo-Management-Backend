import express from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { saveKey, validateAndGetKey, clearAllKeys } from '../utils/keyStorage.js';
import { getJwtSecret, getPrivateKey, getAlgorithm } from '../utils/secretsConfig.js';

const router = express.Router();

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
  
  const privateKey = getPrivateKey();
  
  const expectedSignature = crypto.createHmac('sha256', privateKey).update(baseKey).digest('hex').substring(0, 8).toUpperCase();
  
  if (signature !== expectedSignature) {
    return res.status(401).json({ success: false, message: 'Key cryptographic verification failed' });
  }

  // Validate the key exists and get remaining duration
  const customDurationMs = validateAndGetKey(key);
  if (!customDurationMs) {
    return res.status(401).json({ success: false, message: 'Invalid key' });
  }

  const expiresInMs = customDurationMs;
  const jwtExpiresIn = Math.floor(customDurationMs / 1000);

  const expiresAt = Date.now() + expiresInMs;
  const jwtSecret = getJwtSecret();
  const algorithm = getAlgorithm();
  const token = jwt.sign({ role: 'admin', expiresAt, keyId: key }, jwtSecret, { algorithm, expiresIn: jwtExpiresIn });

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
    const jwtSecret = getJwtSecret();
    const algorithm = getAlgorithm();
    const decoded = jwt.verify(token, jwtSecret, { algorithms: [algorithm] });
    
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

  const privateKey = getPrivateKey();
  if (key !== privateKey) {
    return res.status(401).json({ success: false, message: 'wrong key' });
  }

  // Erase all keys in the storage
  clearAllKeys();

  return res.json({ 
    success: true, 
    message: 'All keys and active sessions have been instantly expired and terminated.'
  });
});

// Generate a new key — automatically invalidates any previous key
// Example: /auth/generatetoken/7D/SastaHacker  or  /auth/generatetoken/5MIN/SastaHacker
router.get('/generatetoken/:duration/:key', (req, res) => {
  const { duration, key } = req.params;

  const privateKey = getPrivateKey();
  if (key !== privateKey) {
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
  const signature = crypto.createHmac('sha256', privateKey).update(baseKey).digest('hex').substring(0, 8).toUpperCase();
  const generatedKey = `${baseKey}-${signature}`;

  // Save the key (automatically wipes all previous keys — only one key at a time)
  saveKey(generatedKey, expiresInMs);

  return res.json({ 
    success: true, 
    message: `this token is valid for ${value} ${unitStr} From the time of first use`,
    key: generatedKey
  });
});

export default router;
