import express from 'express';
import jwt from 'jsonwebtoken';
import { generateKeyString, validateAndGetKey, clearAllKeys, registerKey, decryptKeyString } from '../utils/keyStorage.js';
import { getJwtSecret, getPrivateKey, getAlgorithm } from '../utils/secretsConfig.js';

const router = express.Router();

router.post('/login', (req, res) => {
  const { key } = req.body;

  if (!key || typeof key !== 'string') {
    return res.status(401).json({ success: false, message: 'Invalid key' });
  }

  // Decrypt the self-contained key — this works on ANY system with the same privateKey
  // If decryption fails, the key is invalid or tampered
  const keyData = decryptKeyString(key);
  if (!keyData) {
    return res.status(401).json({ success: false, message: 'Invalid key' });
  }

  // Validate the key and get remaining duration
  const remainingMs = validateAndGetKey(key);
  if (!remainingMs) {
    return res.status(401).json({ success: false, message: 'Key expired or invalid' });
  }

  const expiresInMs = remainingMs;
  const jwtExpiresIn = Math.floor(remainingMs / 1000);
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
    
    // Validate the original key is still active
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

  clearAllKeys();

  return res.json({ 
    success: true, 
    message: 'All keys and active sessions have been instantly expired and terminated.'
  });
});

// Generate a new key — automatically invalidates any previous key on this system
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

  // Generate a self-contained encrypted key (carries durationMs + createdAt inside it)
  const generatedKey = generateKeyString(expiresInMs);

  // Register on this system (wipes old keys — only one at a time)
  registerKey(generatedKey);

  return res.json({ 
    success: true, 
    message: `this token is valid for ${value} ${unitStr} From the time of first use`,
    key: generatedKey
  });
});

export default router;
