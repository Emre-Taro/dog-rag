/**
 * External corpus indexing: Dog advice documents (.tsx files)
 */

import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { prisma } from '../weeklySummary/weeklySummary';
import { generateEmbeddings, getEmbeddingDimension } from './embedding';
import { chunkTextWithMetadata } from './chunking';
import { getDbPool } from '../db';

/**
 * Extract text content from .tsx file (strip JSX, imports, etc.)
 */
function extractTextFromTSX(content: string): string {
  // Remove imports
  let text = content.replace(/^import\s+.*?from\s+['"].*?['"];?\s*$/gm, '');
  
  // Remove JSX tags but keep text content
  text = text.replace(/<[^>]+>/g, ' ');
  
  // Remove export statements
  text = text.replace(/^export\s+(default\s+)?(function|const|class)\s+.*?\{/gm, '');
  
  // Remove function/const declarations
  text = text.replace(/^(function|const|let|var)\s+\w+\s*[=:].*?\{/gm, '');
  
  // Remove remaining braces and brackets
  text = text.replace(/[{}[\]]/g, ' ');
  
  // Clean up whitespace
  text = text.replace(/\s+/g, ' ').trim();
  
  return text;
}

/**
 * Extract text content from .txt or .md file (keep as-is, just clean up)
 */
function extractTextFromPlainText(content: string): string {
  // For plain text files, just clean up excessive whitespace
  let text = content;
  
  // Normalize line breaks
  text = text.replace(/\r\n/g, '\n');
  text = text.replace(/\r/g, '\n');
  
  // Clean up excessive blank lines (more than 2 consecutive)
  text = text.replace(/\n{3,}/g, '\n\n');
  
  // Trim
  text = text.trim();
  
  return text;
}

/**
 * Infer topic from filename
 */
function inferTopicFromFilename(filename: string): string | null {
  // Remove extension
  const name = filename.replace(/\.(tsx|ts|md|txt)$/i, '');
  
  // Try to extract topic from common patterns
  const patterns = [
    /(?:^|[-_])(health|feeding|training|exercise|behavior|grooming|care|nutrition|safety)/i,
  ];
  
  for (const pattern of patterns) {
    const match = name.match(pattern);
    if (match) {
      return match[1].toLowerCase();
    }
  }
  
  return null;
}

/**
 * Index a single external document file
 */
export async function indexExternalDocument(params: {
  filePath: string;
  content: string;
  fileName: string;
}): Promise<{ documentId: bigint; chunksCount: number }> {
  const { filePath, content, fileName } = params;

  // Extract text content based on file extension
  const ext = fileName.toLowerCase().split('.').pop() || '';
  let text: string;
  
  if (ext === 'tsx' || ext === 'ts') {
    text = extractTextFromTSX(content);
  } else {
    // For .txt, .md, .mdx, etc.
    text = extractTextFromPlainText(content);
  }

  if (text.length === 0) {
    throw new Error(`No text content extracted from ${fileName}`);
  }

  // Infer topic
  const topic = inferTopicFromFilename(fileName);

  // Create or find document
  // Determine source type based on file extension
  const sourceType = (ext === 'tsx' || ext === 'ts') 
    ? 'external_advice_tsx' 
    : 'external_advice_document';
  
  const sourcePath = `${sourceType}:${filePath}`;
  let document = await prisma.document.findFirst({
    where: { sourcePath },
  });

  if (!document) {
    document = await prisma.document.create({
      data: {
        title: fileName,
        sourcePath,
      },
    });
  }

  // Delete existing chunks for this document
  const pool = getDbPool();
  await pool.query('DELETE FROM chunks WHERE document_id = $1', [document.id.toString()]);

  // Chunk the text
  const chunks = chunkTextWithMetadata(text, {
    corpus: 'dog_external',
    sourceType,
    path: filePath,
    fileName,
    topic: topic || null,
  });

  if (chunks.length === 0) {
    return { documentId: document.id, chunksCount: 0 };
  }

  // Generate embeddings
  const texts = chunks.map(chunk => chunk.content);
  const embeddings = await generateEmbeddings(texts);

  // Insert chunks with embeddings
  const dimension = getEmbeddingDimension();
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const embedding = embeddings[i];
    
    const embeddingVector = `[${embedding.join(',')}]`;

    // Use dimension as a constant in the SQL query (not as a parameter)
    await pool.query(
      `INSERT INTO chunks (document_id, content, embedding, metadata, created_at)
       VALUES ($1, $2, $3::vector(${dimension}), $4::jsonb, NOW())`,
      [
        document.id.toString(),
        chunk.content,
        embeddingVector,
        JSON.stringify(chunk.metadata),
      ]
    );
  }

  return { documentId: document.id, chunksCount: chunks.length };
}

/**
 * Index all external documents from directories
 */
export async function indexExternalCorpus(params: {
  directories?: string[];
}): Promise<{ totalChunks: number; filesIndexed: number; results: Array<{ filePath: string; success: boolean; chunksCount: number; error?: string }> }> {
  // Default directory: src/data/documents (supports .txt, .md, .mdx files)
  const defaultDirectories = [
    join(process.cwd(), 'src', 'data', 'documents'),
  ];
  const directories = params.directories || defaultDirectories;

  const results: Array<{ filePath: string; success: boolean; chunksCount: number; error?: string }> = [];
  let totalChunks = 0;
  let filesIndexed = 0;

  // Process each directory
  for (const directory of directories) {
    try {
      // Read directory
      const files = await readdir(directory);
      // Support .tsx, .ts, .txt, .md, .mdx files
      const supportedFiles = files.filter(file => {
        const ext = file.toLowerCase().split('.').pop();
        return ext === 'tsx' || ext === 'ts' || ext === 'txt' || ext === 'md' || ext === 'mdx';
      });

      for (const fileName of supportedFiles) {
        const filePath = join(directory, fileName);
      
      try {
        const content = await readFile(filePath, 'utf-8');
        const result = await indexExternalDocument({
          filePath,
          content,
          fileName,
        });

        totalChunks += result.chunksCount;
        filesIndexed++;
        results.push({
          filePath,
          success: true,
          chunksCount: result.chunksCount,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        results.push({
          filePath,
          success: false,
          chunksCount: 0,
          error: errorMessage,
        });
        }
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        console.warn(`Directory ${directory} does not exist. Skipping...`);
        // Directory doesn't exist, skip it
        continue;
      }
      // For other errors, log and continue with next directory
      console.error(`Error processing directory ${directory}:`, error);
    }
  }

  return { totalChunks, filesIndexed, results };
}

