import mammoth from 'mammoth';

const MAX_FILE_BYTES = 10 * 1024 * 1024;

export function validateFileSize(size: number, maxBytes = MAX_FILE_BYTES): void {
  if (size > maxBytes) {
    throw new Error(`File too large. Maximum size is ${maxBytes / (1024 * 1024)}MB`);
  }
}

export async function extractTextFromFile(
  buffer: Buffer,
  filename: string
): Promise<string> {
  const lower = filename.toLowerCase();

  if (lower.endsWith('.txt')) {
    return buffer.toString('utf-8');
  }

  if (lower.endsWith('.pdf')) {
    try {
      const pdfParse = (await import('pdf-parse')).default;
      const data = await pdfParse(buffer);
      const text = data.text?.trim();
      if (!text) throw new Error('No text extracted from PDF');
      return text;
    } catch (error) {
      throw new Error(
        `PDF extraction failed: ${error instanceof Error ? error.message : 'unknown'}`
      );
    }
  }

  if (lower.endsWith('.docx')) {
    try {
      const result = await mammoth.extractRawText({ buffer });
      const text = result.value?.trim();
      if (!text) throw new Error('No text extracted from DOCX');
      return text;
    } catch (error) {
      throw new Error(
        `DOCX extraction failed: ${error instanceof Error ? error.message : 'unknown'}`
      );
    }
  }

  throw new Error('Unsupported format. Use PDF, TXT, or DOCX.');
}

export const ALLOWED_FILE_EXTENSIONS = ['.pdf', '.txt', '.docx'];

export const ALLOWED_AUDIO_EXTENSIONS = [
  '.mp3',
  '.mp4',
  '.wav',
  '.m4a',
  '.webm',
];

export const MAX_AUDIO_BYTES = 25 * 1024 * 1024;
