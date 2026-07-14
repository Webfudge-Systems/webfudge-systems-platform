/**
 * SHA-256 hex digest via Web Crypto — available in Node 18+, browsers, and
 * edge runtimes, keeping this package framework-agnostic.
 */
export async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value)
  const digest = await globalThis.crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}
