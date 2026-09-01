import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getKey(): Buffer {
  // Use explicit ENCRYPTION_KEY if set, otherwise derive from DATABASE_URL (dev fallback).
  // In production, set ENCRYPTION_KEY to a 32-byte base64 or hex string.
  const raw = process.env.ENCRYPTION_KEY || process.env.DATABASE_URL || "fallback-dev-encryption-key-please-set-ENCRYPTION_KEY";
  // Derive 32-byte key via SHA-256
  return crypto.createHash("sha256").update(raw).digest();
}

export function encryptToken(token: string): string {
  if (!token) return token;
  // If no ENCRYPTION_KEY and no DATABASE_URL, store plain with marker to avoid crash in edge runtime
  // But we still attempt encryption with derived key.
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
    const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
    const authTag = cipher.getAuthTag();
    // Format: iv:authTag:encrypted (all base64)
    return `${iv.toString("base64")}:${authTag.toString("base64")}:${encrypted.toString("base64")}`;
  } catch {
    // Fallback to plain if crypto fails (e.g. edge runtime without node crypto)
    return token;
  }
}

export function decryptToken(encrypted: string | null | undefined): string | null {
  if (!encrypted) return null;
  // Detect plain token (GitHub PATs start with ghp_, github_pat_, gh_, etc.) - no colons with base64 structure
  // Encrypted format has exactly 2 colons.
  const parts = encrypted.split(":");
  if (parts.length !== 3) {
    // Assume plain token stored before encryption was added
    return encrypted;
  }
  try {
    const [ivB64, authTagB64, dataB64] = parts as [string, string, string];
    const iv = Buffer.from(ivB64!, "base64");
    const authTag = Buffer.from(authTagB64!, "base64");
    const encryptedData = Buffer.from(dataB64!, "base64");
    // Validate lengths
    if (iv.length !== IV_LENGTH || authTag.length !== AUTH_TAG_LENGTH) {
      return encrypted;
    }
    const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(encryptedData), decipher.final()]);
    return decrypted.toString("utf8");
  } catch {
    // If decryption fails (e.g. key rotated), return original as fallback
    return encrypted;
  }
}
