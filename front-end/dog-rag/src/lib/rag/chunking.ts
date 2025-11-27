/**
 * Text chunking utilities for RAG pipeline
 */

export interface Chunk {
  content: string;
  metadata?: Record<string, any>;
}

/**
 * Chunk text into smaller pieces
 * @param text The text to chunk
 * @param options Chunking options
 * @returns Array of text chunks
 */
export function chunkText(
  text: string,
  options: {
    maxChunkSize?: number; // Maximum characters per chunk
    overlap?: number; // Overlap between chunks (in characters)
  } = {}
): string[] {
  const { maxChunkSize = 800, overlap = 100 } = options;

  if (text.length <= maxChunkSize) {
    return [text];
  }

  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end = start + maxChunkSize;

    // If not at the end, try to break at a sentence boundary
    if (end < text.length) {
      // Look for sentence endings
      const sentenceEnd = text.lastIndexOf('.', end);
      const newlineEnd = text.lastIndexOf('\n', end);
      const breakPoint = Math.max(sentenceEnd, newlineEnd);

      if (breakPoint > start) {
        end = breakPoint + 1;
      }
    }

    chunks.push(text.slice(start, end).trim());
    start = end - overlap; // Overlap for context
  }

  return chunks.filter(chunk => chunk.length > 0);
}

/**
 * Chunk text with metadata
 */
export function chunkTextWithMetadata(
  text: string,
  baseMetadata: Record<string, any>,
  options: {
    maxChunkSize?: number;
    overlap?: number;
  } = {}
): Chunk[] {
  const chunks = chunkText(text, options);
  return chunks.map((content, index) => ({
    content,
    metadata: {
      ...baseMetadata,
      chunkIndex: index,
      totalChunks: chunks.length,
    },
  }));
}

