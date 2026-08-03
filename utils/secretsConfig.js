import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const configFile = path.join(__dirname, '../secrets/config.json');

let _config = null;

/**
 * Loads the shared secrets config from secrets/config.json.
 * This config contains the JWT secret, private key, and algorithm.
 * Any system that shares the same config.json will produce and verify
 * identical tokens — making auth portable across machines.
 */
const loadConfig = () => {
  if (_config) return _config;

  if (!fs.existsSync(configFile)) {
    console.error('FATAL: secrets/config.json not found. Create it with jwtSecret, privateKey, and algorithm.');
    process.exit(1);
  }

  try {
    const data = fs.readFileSync(configFile, 'utf-8');
    _config = JSON.parse(data);

    // Validate required fields
    if (!_config.jwtSecret || !_config.privateKey || !_config.algorithm) {
      console.error('FATAL: secrets/config.json must contain jwtSecret, privateKey, and algorithm.');
      process.exit(1);
    }

    console.log('✅ Loaded shared secrets config (algorithm: ' + _config.algorithm + ')');
    return _config;
  } catch (err) {
    console.error('FATAL: Failed to parse secrets/config.json:', err.message);
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
 * This is the "dynamic secret" that was previously extracted from logs.json.
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
