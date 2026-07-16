import { extractTextFromHtml } from './chunking';
import { safeFetchText, UnsafeUrlError } from './url-guard';

export async function scrapeUrl(
  url: string
): Promise<{ title: string; content: string }> {
  let html: string;
  try {
    const result = await safeFetchText(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; AetherLearn/1.0; +https://aetherlearn.local)',
        Accept: 'text/html,application/xhtml+xml',
      },
    });
    html = result.html;
  } catch (error) {
    if (error instanceof UnsafeUrlError) {
      // Re-throw with the same message but keep the type info available
      // to callers that want to distinguish "blocked" from "network failure".
      throw error;
    }
    throw new Error(
      `Failed to fetch URL: ${error instanceof Error ? error.message : 'unknown error'}`
    );
  }

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
