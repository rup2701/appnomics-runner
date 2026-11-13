// Usage: node scripts/hash-password.mjs <password>. Prints scrypt:<salt>:<hash> and nothing else. The sign-in check (src/lib/auth.ts) uses the same settings.
import { randomBytes, scryptSync } from "node:crypto";

const password = process.argv[2];
if (!password) { console.error("Usage: node scripts/hash-password.mjs <password>"); process.exit(1); }
const salt = randomBytes(16);
console.log(`scrypt:${salt.toString("hex")}:${scryptSync(password, salt, 64).toString("hex")}`);
