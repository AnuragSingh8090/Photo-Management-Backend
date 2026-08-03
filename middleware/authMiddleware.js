import jwt from 'jsonwebtoken';
import { validateAndGetKey } from '../utils/keyStorage.js';
import { getJwtSecret, getAlgorithm } from '../utils/secretsConfig.js';

export const verifyToken = (req, res, next) => {
  const token = req.cookies.authToken;

  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }

  try {
    const jwtSecret = getJwtSecret();
    const algorithm = getAlgorithm();
    const decoded = jwt.verify(token, jwtSecret, { algorithms: [algorithm] });
    
    // Strict concurrency check: Is the key used to generate this session STILL the active key?
    if (!decoded.keyId || !validateAndGetKey(decoded.keyId)) {
      throw new Error('Session invalidated due to new key generation');
    }

    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};
