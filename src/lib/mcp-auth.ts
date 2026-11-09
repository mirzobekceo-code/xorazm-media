import "server-only";
import crypto from "node:crypto";

/** Connector manzilidagi maxfiy kalitni tekshiradi (MCP_SECRET, kamida 24 belgi). */
export function mcpAuthorized(key: string): boolean {
  const secret = process.env.MCP_SECRET ?? "";
  if (secret.length < 24) return false;
  const a = Buffer.from(key), b = Buffer.from(secret);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
