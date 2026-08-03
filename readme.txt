ROUTES:
http://localhost:5000/auth/generatetoken/1MIN/SastaHacker
use this route to create new key (old key is automatically deleted)

http://localhost:5000/auth/generatetoken/expireall/SastaHacker
use this route to expire all keys immediately


SECRETS CONFIG:
All secrets are in: secrets/config.json
  - jwtSecret   : The secret used to sign/verify JWT tokens
  - privateKey  : The secret used for HMAC key signing + AES encryption of key data
  - algorithm   : The JWT signing algorithm (e.g. HS256)

KEY STORAGE:
keys.json stores ONLY ONE key at a time as an encrypted blob.
  - Generating a new key automatically deletes the old one
  - The key data (duration, timestamps) is AES-256-GCM encrypted
  - If someone manually edits the encrypted string, the key becomes invalid
  - No separate test keys — just one key at a time

TO MAKE TOKENS WORK ACROSS SYSTEMS:
  1. Copy secrets/config.json to the other system
  2. Both systems must have the SAME config.json for tokens to work
