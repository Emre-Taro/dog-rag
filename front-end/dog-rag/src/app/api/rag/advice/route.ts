/**
 * RAG Advice API
 * POST /api/rag/advice
 * 
 * Searches both internal dog state and external advice documents separately,
 * then generates an answer using an LLM.
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { searchBothCorpora } from '@/lib/rag/search';
import { prisma } from '@/lib/weeklySummary/weeklySummary';

interface RequestBody {
  dogId: number;
  lookbackDays?: number;
  question: string;
  topKInternal?: number;
  topKExternal?: number;
}

export async function POST(req: Request) {
  try {
    // Authentication
    const auth = await requireAuth(req);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse request body
    const body: RequestBody = await req.json();
    const { dogId, lookbackDays = 30, question, topKInternal = 5, topKExternal = 5 } = body;

    if (!dogId || !question) {
      return NextResponse.json(
        { success: false, error: 'dogId and question are required' },
        { status: 400 }
      );
    }

    // Verify dog belongs to user
    const dogProfile = await prisma.dogProfile.findUnique({
      where: { id: dogId },
      select: { ownerId: true, dogName: true },
    });

    if (!dogProfile) {
      return NextResponse.json(
        { success: false, error: 'Dog profile not found' },
        { status: 404 }
      );
    }

    if (dogProfile.ownerId !== auth.userId) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    // Search both corpora
    const { internal, external } = await searchBothCorpora({
      query: question,
      dogId,
      topKInternal,
      topKExternal,
    });

    // Format contexts for LLM
    // Filter out contexts that contain only "no data" or "0" values
    const meaningfulInternal = internal.filter(result => {
      const content = result.content.toLowerCase();
      // Exclude chunks that only mention "no records", "0g", "0 minutes", etc.
      const hasNoData = /no (records?|data|logs?|walk|sleep|meal)/i.test(content) ||
                       /\b0\s*(g|minutes?|hours?|km)\b/i.test(content) ||
                       /insufficient|could not be evaluated|could not be assessed/i.test(content);
      return !hasNoData || content.length > 200; // Keep if it has substantial content despite "no data" mentions
    });

    const internalContext = meaningfulInternal.length > 0
      ? meaningfulInternal.map((result, idx) => `[Internal Context ${idx + 1}]\n${result.content}`).join('\n\n')
      : 'No relevant internal data found.';

    const externalContext = external.length > 0
      ? external.map((result, idx) => `[External Advice ${idx + 1}]\n${result.content}`).join('\n\n')
      : 'No relevant external advice found.';

    // Save user message to database (optional - continue even if it fails)
    let userMessageId: number | null = null;
    try {
      const userMessage = await (prisma as any).ragMessage.create({
        data: {
          userId: auth.userId,
          dogId: dogId,
          role: 'user',
          content: question,
          timestamp: new Date(),
        },
      });
      userMessageId = userMessage.id;
    } catch (dbError) {
      console.warn('Failed to save user message to database. Make sure migration is applied:', dbError);
      // Continue even if saving fails - table might not exist yet
    }

    // Generate answer using LLM
    let answer: string;
    try {
      answer = await generateAnswer({
        question,
        dogName: dogProfile.dogName,
        internalContext,
        externalContext,
      });
    } catch (error) {
      // If LLM generation fails, try to save error message
      try {
        await (prisma as any).ragMessage.create({
          data: {
            userId: auth.userId,
            dogId: dogId,
            role: 'assistant',
            content: `Error: ${error instanceof Error ? error.message : 'Failed to generate answer'}`,
            timestamp: new Date(),
          },
        });
      } catch (dbError) {
        console.warn('Failed to save error message to database:', dbError);
      }
      throw error;
    }

    // Save assistant message to database (optional - continue even if it fails)
    let assistantMessageId: number | null = null;
    try {
      const assistantMessage = await (prisma as any).ragMessage.create({
        data: {
          userId: auth.userId,
          dogId: dogId,
          role: 'assistant',
          content: answer,
          timestamp: new Date(),
        },
      });
      assistantMessageId = assistantMessage.id;
    } catch (dbError) {
      console.warn('Failed to save assistant message to database. Make sure migration is applied:', dbError);
      // Continue even if saving fails - table might not exist yet
    }

    return NextResponse.json({
      success: true,
      answer,
      messageIds: userMessageId && assistantMessageId ? {
        user: userMessageId,
        assistant: assistantMessageId,
      } : undefined,
      contexts: {
        internal: {
          count: internal.length,
          results: internal.map(r => ({
            content: r.content.substring(0, 200) + (r.content.length > 200 ? '...' : ''),
            score: r.score,
            metadata: r.metadata,
          })),
        },
        external: {
          count: external.length,
          results: external.map(r => ({
            content: r.content.substring(0, 200) + (r.content.length > 200 ? '...' : ''),
            score: r.score,
            metadata: r.metadata,
          })),
        },
      },
    });
  } catch (error) {
    console.error('Error in RAG advice API:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate advice',
      },
      { status: 500 }
    );
  }
}

/**
 * Generate answer using LLM
 */
async function generateAnswer(params: {
  question: string;
  dogName: string;
  internalContext: string;
  externalContext: string;
}): Promise<string> {
  const { question, dogName, internalContext, externalContext } = params;

  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  const LLM_MODEL = process.env.LLM_MODEL || 'gpt-4o-mini';
  const OPENAI_API_URL = process.env.OPENAI_API_URL || 'https://api.openai.com/v1/chat/completions';

  if (!OPENAI_API_KEY) {
    return 'LLM API is not configured. The following contexts were retrieved:\n\n[Internal Data]\n' + 
           internalContext.substring(0, 500) + '\n\n[External Advice]\n' + 
           externalContext.substring(0, 500);
  }

  const systemPrompt = `You are a helpful assistant providing advice about dog care and health.
You have access to two types of information:
1. Internal data: Specific information about ${dogName}'s recent activities, health records, and weekly summaries.
2. External advice: General dog care advice and best practices.

When answering questions, use both sources of information. Reference the internal data for specific information about ${dogName}, and use external advice for general guidance and best practices.

Answer in English unless the user explicitly asks in another language.`;

  const userPrompt = `Question: ${question}

=== Internal Data (${dogName}'s Recent State) ===
${internalContext}

=== External Advice (General Dog Care) ===
${externalContext}

Please provide a helpful answer in English based on both the internal data about ${dogName} and the external advice.`;

  try {
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: LLM_MODEL,
        stream: false,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.5,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`LLM API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || "couldn't generate answer";
  } catch (error) {
    console.error('Error calling LLM:', error);
    throw error;
  }
}

