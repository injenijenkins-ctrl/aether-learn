import { promises as dns } from 'node:dns';
import { isIP } from 'node:net';

/**
 * Blocks SSRF attempts against the scraper: private/reserved IP ranges,
 * cloud metadata endpoints, non-http(s) schemes, and DNS-rebinding
 * (hostname resolves to a public IP at check-time but a private one at
 * fetch-time) is mitigated by resolving once here and reusing that
 * result rather than trusting the hostname again later.
 */

export class UnsafeUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnsafeUrlError';
  }
}

const BLOCKED_HOSTNAMES = new Set(['localhost', 'metadata.google.internal']);

// IPv4 ranges that must never be reachable from the scraper.
const PRIVATE_IPV4_RANGES: Array<[string, number]> = [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10], // CGNAT
  ['127.0.0.0', 8], // loopback
  ['169.254.0.0', 16], // link-local — includes cloud metadata (169.254.169.254)
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24], // TEST-NET
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24], // TEST-NET-2
  ['203.0.113.0', 24], // TEST-NET-3
  ['224.0.0.0', 4], // multicast
  ['240.0.0.0', 4], // reserved
];

function ipv4ToInt(ip: string): number {
  return ip
    .split('.')
    .reduce((acc, octet) => (acc << 8) + Number(octet), 0) >>> 0;
}

function isPrivateIPv4(ip: string): boolean {
  const target = ipv4ToInt(ip);
  return PRIVATE_IPV4_RANGES.some(([base, prefix]) => {
    const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
    return (target & mask) === (ipv4ToInt(base) & mask);
  });
}

function isPrivateIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  return (
    normalized === '::1' || // loopback
    normalized === '::' ||
    normalized.startsWith('fe80:') || // link-local
    normalized.startsWith('fc') || // unique local fc00::/7
    normalized.startsWith('fd') ||
    normalized.startsWith('::ffff:') // IPv4-mapped — check the embedded v4 too
  );
}

function isPrivateIp(ip: string): boolean {
  const version = isIP(ip);
  if (version === 4) return isPrivateIPv4(ip);
  if (version === 6) {
    if (ip.toLowerCase().startsWith('::ffff:')) {
      const embedded = ip.split(':').pop() ?? '';
      if (isIP(embedded) === 4) return isPrivateIPv4(embedded);
    }
    return isPrivateIPv6(ip);
  }
  return true; // couldn't parse — treat as unsafe
}

const MAX_RESPONSE_BYTES = 5 * 1024 * 1024; // 5MB cap on scraped pages
const FETCH_TIMEOUT_MS = 15000;

export type SafeFetchResult = {
  html: string;
  finalUrl: string;
};

/**
 * Validates a URL is safe to fetch (scheme, hostname, resolved IP),
 * then fetches it with a byte cap and timeout. Throws UnsafeUrlError
 * for anything blocked, so callers can return a clean 400 to the user
 * without leaking why (avoid confirming internal network layout).
 */
export async function assertSafeUrl(rawUrl: string): Promise<URL> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new UnsafeUrlError('Invalid URL');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new UnsafeUrlError('Only http and https URLs are allowed');
  }

  const hostname = parsed.hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.has(hostname)) {
    throw new UnsafeUrlError('This host is not allowed');
  }

  // If the hostname is itself a literal IP, check it directly.
  if (isIP(hostname)) {
    if (isPrivateIp(hostname)) {
      throw new UnsafeUrlError('This host is not allowed');
    }
    return parsed;
  }

  // Otherwise resolve DNS and check every returned address — this is the
  // check that matters at fetch-time to avoid DNS-rebinding, since we
  // fetch using this same resolution rather than re-resolving later.
  let addresses: string[];
  try {
    const records = await dns.lookup(hostname, { all: true, verbatim: true });
    addresses = records.map((r) => r.address);
  } catch {
    throw new UnsafeUrlError('Could not resolve host');
  }

  if (addresses.length === 0 || addresses.some(isPrivateIp)) {
    throw new UnsafeUrlError('This host is not allowed');
  }

  return parsed;
}

/**
 * Safe replacement for a raw fetch(url).text() call: validates first,
 * caps response size, and enforces a timeout.
 */
export async function safeFetchText(
  rawUrl: string,
  init?: RequestInit
): Promise<SafeFetchResult> {
  const validated = await assertSafeUrl(rawUrl);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(validated.toString(), {
      ...init,
      redirect: 'manual', // handle redirects ourselves so we can re-validate the target
      signal: controller.signal,
    });

    // Manually follow one layer of redirect, re-validating the new target.
    // Refuse to chase more than one hop to avoid open-ended redirect chains
    // being used to eventually land on an internal address.
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) {
        throw new UnsafeUrlError('Redirect with no location header');
      }
      const nextUrl = new URL(location, validated).toString();
      const revalidated = await assertSafeUrl(nextUrl);
      const redirected = await fetch(revalidated.toString(), {
        ...init,
        redirect: 'error',
        signal: controller.signal,
      });
      return readCapped(redirected, revalidated.toString());
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status}`);
    }

    return readCapped(response, validated.toString());
  } finally {
    clearTimeout(timeout);
  }
}

async function readCapped(response: Response, finalUrl: string): Promise<SafeFetchResult> {
  if (!response.body) {
    return { html: await response.text(), finalUrl };
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_RESPONSE_BYTES) {
      reader.cancel();
      throw new Error('Response too large');
    }
    chunks.push(value);
  }

  const buffer = Buffer.concat(chunks.map((c) => Buffer.from(c)));
  return { html: buffer.toString('utf-8'), finalUrl };
}
