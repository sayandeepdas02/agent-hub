import { createHash, randomBytes } from "crypto";

export function generateApiKey(): { key: string; hash: string } {
  const raw = `ahk_${randomBytes(24).toString("hex")}`;
  const hash = hashApiKey(raw);
  return { key: raw, hash };
}

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}
