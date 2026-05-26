import { extractTextFromHtml } from './chunking';

export async function scrapeUrl(
  url: string
): Promise<{ title: string; content: string }> {
  const response = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (compatible; AetherLearn/1.0; +https://aetherlearn.local)',
      Accept: 'text/html,application/xhtml+xml',
    },
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch URL: ${response.status}`);
  }

  const html = await response.text();

  let title = 'Untitled';
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (titleMatch?.[1]) {
    title = (await extractTextFromHtml(titleMatch[1])).slice(0, 200);
  } else {
    const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    if (h1Match?.[1]) {
      title = (await extractTextFromHtml(h1Match[1])).slice(0, 200);
    }
  }

  const content = await extractTextFromHtml(html);
  if (!content || content.length < 50) {
    throw new Error('Could not extract meaningful content from URL');
  }

  return { title, content };
}
