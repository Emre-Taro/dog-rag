/**
 * Embedding abstraction for RAG pipeline
 * Supports multiple embedding models (bge-m3, OpenAI, etc.)
 */

export interface EmbeddingProvider {
  /**
   * Generate embeddings for a list of texts
   * @param texts Array of text strings to embed
   * @returns Array of embedding vectors (each is an array of numbers)
   */
  generateEmbeddings(texts: string[]): Promise<number[][]>;
  
  /**
   * Get the dimension of embeddings produced by this provider
   */
  getDimension(): number;
}

/**
 * OpenAI embedding provider
 */
export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  private apiKey: string;
  private model: string;
  private dimension: number;

  constructor(apiKey?: string, model: string = 'text-embedding-3-small') {
    this.apiKey = apiKey || process.env.OPENAI_API_KEY || '';
    this.model = model;
    // Use 1024 dimensions to match database schema (vector(1024))
    // OpenAI text-embedding-3-small supports dimensions parameter
    this.dimension = 1024;
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    if (!this.apiKey) {
      throw new Error('OPENAI_API_KEY is not set');
    }

    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        input: texts,
        dimensions: this.dimension, // Specify dimensions to match database
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} ${error}`);
    }

    const data = await response.json();
    return data.data.map((item: any) => item.embedding);
  }

  getDimension(): number {
    return this.dimension;
  }
}

/**
 * BGE-M3 embedding provider (using local model or API)
 * For now, this is a placeholder that can be extended
 */
export class BGEM3EmbeddingProvider implements EmbeddingProvider {
  private dimension: number = 1024; // bge-m3 produces 1024-dimensional embeddings

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    // TODO: Implement bge-m3 embedding generation
    // This could use a local model via transformers.js or an API endpoint
    throw new Error('BGE-M3 embedding provider not yet implemented. Please use OpenAI provider.');
  }

  getDimension(): number {
    return this.dimension;
  }
}

/**
 * Get the default embedding provider based on environment variables
 */
export function getDefaultEmbeddingProvider(): EmbeddingProvider {
  const provider = process.env.EMBEDDING_PROVIDER || 'openai';
  
  if (provider === 'openai') {
    return new OpenAIEmbeddingProvider();
  } else if (provider === 'bge-m3') {
    return new BGEM3EmbeddingProvider();
  } else {
    throw new Error(`Unknown embedding provider: ${provider}`);
  }
}

/**
 * Generate embeddings using the default provider
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const provider = getDefaultEmbeddingProvider();
  return provider.generateEmbeddings(texts);
}

/**
 * Get the embedding dimension for the default provider
 */
export function getEmbeddingDimension(): number {
  const provider = getDefaultEmbeddingProvider();
  return provider.getDimension();
}

