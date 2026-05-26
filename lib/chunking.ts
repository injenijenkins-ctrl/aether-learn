export function chunkText(
  text: string,
  chunkSize = 2000,
  overlapSize = 200
): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.slice(start, end));
    if (end >= text.length) break;
    start = end - overlapSize;
  }

  return chunks;
}

const ENTITY_MAP: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&nbsp;': ' ',
};

function decodeEntitiesManual(text: string): string {
  return text.replace(/&(?:#(\d+)|#x([0-9a-fA-F]+)|(\w+));/g, (match, dec, hex, named) => {
    if (dec) return String.fromCharCode(parseInt(dec, 10));
    if (hex) return String.fromCharCode(parseInt(hex, 16));
    if (named && ENTITY_MAP[`&${named};`]) return ENTITY_MAP[`&${named};`];
    return match;
  });
}

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

export async function extractTextFromHtml(html: string): Promise<string> {
  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '');

  try {
    const { JSDOM } = await import('jsdom');
    const dom = new JSDOM(`<!DOCTYPE html><body>${text}</body>`);
    text = dom.window.document.body.textContent || text;
  } catch {
    text = text.replace(/<[^>]+>/g, ' ');
    text = decodeEntitiesManual(text);
  }

  text = text.replace(/<[^>]+>/g, ' ');
  text = decodeEntitiesManual(text);
  return normalizeWhitespace(text);
}
