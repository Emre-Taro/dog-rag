/**
 * RAG search utilities for querying both internal and external corpora
 */

import { getDbPool } from '../db';
import { generateEmbeddings, getEmbeddingDimension } from './embedding';

export interface SearchResult {
  content: string;
  metadata: Record<string, any>;
  score: number;
}

/**
 * Search chunks using vector similarity
 */
export async function searchChunks(params: {
  queryEmbedding: number[];
  corpus: 'dog_internal' | 'dog_external';
  dogId?: number; // Required for internal corpus
  limit?: number;
}): Promise<SearchResult[]> {
  const { queryEmbedding, corpus, dogId, limit = 10 } = params;

  if (corpus === 'dog_internal' && !dogId) {
    throw new Error('dogId is required for internal corpus search');
  }

  const pool = getDbPool();
  const dimension = getEmbeddingDimension();

  // Convert embedding to pgvector format
  const embeddingVector = `[${queryEmbedding.join(',')}]`;

  // Build query
  // Use dimension as a constant in the SQL query (not as a parameter)
  let query = `
    SELECT 
      c.content,
      c.metadata,
      1 - (c.embedding <=> $1::vector(${dimension})) as similarity_score
    FROM chunks c
    WHERE c.metadata->>'corpus' = $2
  `;

  const paramsArray: any[] = [embeddingVector, corpus];
  let paramIndex = 3;

  if (corpus === 'dog_internal' && dogId) {
    query += ` AND c.metadata->>'dogId' = $${paramIndex}`;
    paramsArray.push(dogId.toString());
    paramIndex++;
  }

  query += `
    ORDER BY c.embedding <=> $1::vector(${dimension})
    LIMIT $${paramIndex}
  `;
  paramsArray.push(limit);

  const result = await pool.query(query, paramsArray);

  return result.rows.map(row => ({
    content: row.content,
    metadata: row.metadata || {},
    score: parseFloat(row.similarity_score) || 0,
  }));
}

/**
 * Search both corpora separately
 */
export async function searchBothCorpora(params: {
  query: string;
  dogId: number;
  topKInternal?: number;
  topKExternal?: number;
}): Promise<{
  internal: SearchResult[];
  external: SearchResult[];
}> {
  const { query, dogId, topKInternal = 5, topKExternal = 5 } = params;

  // Generate query embedding
  const embeddings = await generateEmbeddings([query]);
  const queryEmbedding = embeddings[0];

  // Search both corpora in parallel
  const [internal, external] = await Promise.all([
    searchChunks({
      queryEmbedding,
      corpus: 'dog_internal',
      dogId,
      limit: topKInternal,
    }),
    searchChunks({
      queryEmbedding,
      corpus: 'dog_external',
      limit: topKExternal,
    }),
  ]);

  return { internal, external };
}

