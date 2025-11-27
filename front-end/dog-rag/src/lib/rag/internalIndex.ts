/**
 * Internal corpus indexing: DogWeekSummary and DogWeekText
 */

import { prisma } from '../weeklySummary/weeklySummary';
import { generateEmbeddings, getEmbeddingDimension } from './embedding';
import { chunkTextWithMetadata } from './chunking';
import { getDbPool } from '../db';

/**
 * Index weekly summary for a dog
 */
export async function indexWeeklySummary(params: {
  dogId: number;
  weekStart: Date;
  weekEnd: Date;
}): Promise<{ documentId: bigint; chunksCount: number }> {
  const { dogId, weekStart, weekEnd } = params;

  // Fetch dog profile
  const dogProfile = await prisma.dogProfile.findUnique({
    where: { id: dogId },
    select: { dogName: true },
  });

  if (!dogProfile) {
    throw new Error(`Dog profile with id ${dogId} not found`);
  }

  // Fetch weekly summary
  const summary = await prisma.dogWeekSummary.findFirst({
    where: {
      dogId,
      weekStart,
      weekEnd,
    },
  });

  if (!summary || !summary.summaryText) {
    throw new Error(`No weekly summary found for dog ${dogId}, week ${weekStart.toISOString()} - ${weekEnd.toISOString()}`);
  }

  // Build document text
  const weekStartStr = weekStart.toISOString().split('T')[0];
  const weekEndStr = weekEnd.toISOString().split('T')[0];
  const documentText = `Dog: ${dogProfile.dogName}
Period: ${weekStartStr} ~ ${weekEndStr}
${summary.summaryText}`;

  // Create or find document
  const sourcePath = `dog_state_weekly_summary:${dogId}:${weekStartStr}:${weekEndStr}`;
  let document = await prisma.document.findFirst({
    where: { sourcePath },
  });

  if (!document) {
    document = await prisma.document.create({
      data: {
        title: `Weekly Summary - ${dogProfile.dogName} (${weekStartStr} ~ ${weekEndStr})`,
        sourcePath,
      },
    });
  }

  // Delete existing chunks for this document
  const pool = getDbPool();
  await pool.query('DELETE FROM chunks WHERE document_id = $1', [document.id.toString()]);

  // Chunk the text
  const chunks = chunkTextWithMetadata(documentText, {
    corpus: 'dog_internal',
    sourceType: 'dog_state_weekly_summary',
    dogId,
    dogName: dogProfile.dogName,
    weekStart: weekStartStr,
    weekEnd: weekEndStr,
    type: 'weekly_summary',
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
    
    // Convert embedding to pgvector format: [0.1, 0.2, ...] -> '[0.1,0.2,...]'
    const embeddingVector = `[${embedding.join(',')}]`;

    // Use dimension as a constant in the SQL query (not as a parameter)
    await pool.query(
      `INSERT INTO chunks (document_id, content, embedding, metadata, created_at)
       VALUES ($1, $2, $3::vector(${dimension}), $4::jsonb, NOW())`,
      [
        document.id.toString(),
        chunk.content,
        embeddingVector,
        JSON.stringify(chunk.metadata || {}),
      ]
    );
  }

  return { documentId: document.id, chunksCount: chunks.length };
}

/**
 * Index weekly text entries for a dog
 */
export async function indexWeeklyTexts(params: {
  dogId: number;
  weekStart: Date;
  weekEnd: Date;
}): Promise<{ documentId: bigint; chunksCount: number }> {
  const { dogId, weekStart, weekEnd } = params;

  // Fetch dog profile
  const dogProfile = await prisma.dogProfile.findUnique({
    where: { id: dogId },
    select: { dogName: true },
  });

  if (!dogProfile) {
    throw new Error(`Dog profile with id ${dogId} not found`);
  }

  // Fetch weekly texts
  const weekTexts = await prisma.dogWeekText.findMany({
    where: {
      dogId,
      weekStart,
      weekEnd,
    },
    orderBy: {
      eventAt: 'asc',
    },
  });

  if (weekTexts.length === 0) {
    return { documentId: BigInt(0), chunksCount: 0 };
  }

  // Create or find document for this week's texts
  const weekStartStr = weekStart.toISOString().split('T')[0];
  const weekEndStr = weekEnd.toISOString().split('T')[0];
  const sourcePath = `dog_state_week_text:${dogId}:${weekStartStr}:${weekEndStr}`;
  
  let document = await prisma.document.findFirst({
    where: { sourcePath },
  });

  if (!document) {
    document = await prisma.document.create({
      data: {
        title: `Weekly Texts - ${dogProfile.dogName} (${weekStartStr} ~ ${weekEndStr})`,
        sourcePath,
      },
    });
  }

  // Delete existing chunks for this document
  const pool = getDbPool();
  await pool.query('DELETE FROM chunks WHERE document_id = $1', [document.id.toString()]);

  // Build chunks from week texts
  const chunks: Array<{ content: string; metadata: Record<string, any> }> = [];

  for (const text of weekTexts) {
    const eventDate = text.eventAt.toISOString().split('T')[0];
    const content = `Dog: ${dogProfile.dogName}
Date: ${eventDate}
Category: ${text.category}
${text.content}`;

    chunks.push({
      content,
      metadata: {
        corpus: 'dog_internal',
        sourceType: 'dog_state_week_text',
        dogId,
        dogName: dogProfile.dogName,
        weekStart: weekStartStr,
        weekEnd: weekEndStr,
        category: text.category,
        eventAt: eventDate,
        sourceTable: text.sourceTable,
        sourceId: text.sourceId,
        title: text.title || null,
      },
    });
  }

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
 * Index all internal data for a dog within a date range
 */
export async function indexInternalCorpus(params: {
  dogId: number;
  startDate: Date;
  endDate: Date;
}): Promise<{ totalChunks: number; weeksIndexed: number }> {
  const { dogId, startDate, endDate } = params;

  // Find all weeks that overlap with the date range
  // A week overlaps if: weekStart <= endDate AND weekEnd >= startDate
  const summaries = await prisma.dogWeekSummary.findMany({
    where: {
      dogId,
      AND: [
        {
          weekStart: {
            lte: endDate,
          },
        },
        {
          weekEnd: {
            gte: startDate,
          },
        },
      ],
    },
    orderBy: {
      weekStart: 'asc',
    },
  });

  let totalChunks = 0;
  let weeksIndexed = 0;

  for (const summary of summaries) {
    try {
      // Index weekly summary
      const summaryResult = await indexWeeklySummary({
        dogId,
        weekStart: summary.weekStart,
        weekEnd: summary.weekEnd,
      });

      // Index weekly texts
      const textsResult = await indexWeeklyTexts({
        dogId,
        weekStart: summary.weekStart,
        weekEnd: summary.weekEnd,
      });

      totalChunks += summaryResult.chunksCount + textsResult.chunksCount;
      if (summaryResult.chunksCount > 0 || textsResult.chunksCount > 0) {
        weeksIndexed++;
      }
    } catch (error) {
      console.error(`Error indexing week ${summary.weekStart.toISOString()}:`, error);
    }
  }

  return { totalChunks, weeksIndexed };
}

