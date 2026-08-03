ROUTES:
http://localhost:5000/auth/generatetoken/1MIN/SastaHacker
use this route to create new key (old key is automatically deleted)

http://localhost:5000/auth/generatetoken/expireall/SastaHacker
use this route to expire all keys immediately


HOW KEYS WORK:
The generated key is a self-contained encrypted string (e.g. "AeK3x_Bm2q5R...")
It carries the duration and creation time INSIDE itself, encrypted with privateKey.
Any system with the same logs.json configuration can decrypt and validate the key.
No need to copy keys.json between systems.

SECRETS CONFIG:
All secrets are centrally stored in a JWT token at the last entry of: secrets/logs.json
Inside the JWT, the application reads:
  - jwtSecret   : The secret used to sign/verify JWT tokens
  - privateKey  : Used for AES encryption of keys + HMAC operations
  - algorithm   : The JWT signing algorithm (e.g. HS256)

CROSS-SYSTEM USAGE:
  1. Both systems must have the SAME secrets/logs.json file
  2. Generate a key on System A → give the key string to someone
  3. They can login on System B using that same key string
  4. keys.json is local per-system (tracks firstUsedAt only), NOT needed to sync
