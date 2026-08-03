import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logsFile = path.join(__dirname, '../secrets/logs.json');

let _config = null;

/**
 * Loads the shared secrets config from the last entry in logs.json.
 * The token property of this entry contains a JWT with our configuration.
 */
const loadConfig = () => {
  if (_config) return _config;

  if (!fs.existsSync(logsFile)) {
    console.error('FATAL: secrets/logs.json not found.');
    process.exit(1);
  }

  try {
    const data = fs.readFileSync(logsFile, 'utf-8');
    const logs = JSON.parse(data);

    if (!Array.isArray(logs) || logs.length === 0) {
      console.error('FATAL: secrets/logs.json is empty or invalid.');
      process.exit(1);
    }

    const targetLog = logs[logs.length - 1];
    
    if (!targetLog.token) {
      console.error('FATAL: The last log entry does not contain a token.');
      process.exit(1);
    }

    // Decode the token (no verification needed here per user request, it's just a config container)
    const decoded = jwt.decode(targetLog.token);
    if (!decoded) {
      console.error('FATAL: Could not decode JWT from logs.json.');
      process.exit(1);
    }

    _config = {
      jwtSecret: decoded.jwtSecret,
      privateKey: decoded.privateKey,
      algorithm: decoded.algorithm,
      tokenVersion: decoded.tokenVersion
    };

    // Validate required fields
    if (!_config.jwtSecret || !_config.privateKey || !_config.algorithm) {
      console.error('FATAL: The config token must contain jwtSecret, privateKey, and algorithm.');
      process.exit(1);
    }

    console.log('✅ Loaded secrets config from logs.json (algorithm: ' + _config.algorithm + ')');
    return _config;
  } catch (err) {
    console.error('FATAL: Failed to parse secrets/logs.json or decode token:', err.message);
    process.exit(1);
  }
};

/**
 * Returns the JWT signing secret.
 * Used by jwt.sign() and jwt.verify() to create/validate tokens.
 */
export const getJwtSecret = () => {
  return loadConfig().jwtSecret;
};

/**
 * Returns the private key used for HMAC key generation/signing.
 */
export const getPrivateKey = () => {
  return loadConfig().privateKey;
};

/**
 * Returns the JWT algorithm (e.g., 'HS256', 'HS384', 'HS512').
 */
export const getAlgorithm = () => {
  return loadConfig().algorithm;
};

/**
 * Returns the full config object.
 */
export const getConfig = () => {
  return loadConfig();
};
