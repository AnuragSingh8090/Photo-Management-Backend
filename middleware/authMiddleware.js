import jwt from 'jsonwebtoken';
import { validateAndGetKey } from '../utils/keyStorage.js';

const SECRET_KEY = process.env.JWT_SECRET || 'photo-manager-secret-key-123';

export const verifyToken = (req, res, next) => {
  const token = req.cookies.authToken;

  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    
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
