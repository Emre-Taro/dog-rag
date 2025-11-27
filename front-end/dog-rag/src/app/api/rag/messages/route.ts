/**
 * RAG Messages API
 * GET /api/rag/messages
 * 
 * Retrieve chat message history for a specific dog
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/weeklySummary/weeklySummary';

export async function GET(req: Request) {
  try {
    // Authentication
    const auth = await requireAuth(req);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const dogIdParam = searchParams.get('dogId');
    const limitParam = searchParams.get('limit');

    if (!dogIdParam) {
      return NextResponse.json(
        { success: false, error: 'dogId is required' },
        { status: 400 }
      );
    }

    const dogId = parseInt(dogIdParam);
    const limit = limitParam ? parseInt(limitParam) : 100; // Default to 100 messages

    if (isNaN(dogId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid dogId' },
        { status: 400 }
      );
    }

    // Verify dog belongs to user
    const dogProfile = await prisma.dogProfile.findUnique({
      where: { id: dogId },
      select: { ownerId: true },
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

    // Fetch messages for this dog, ordered by timestamp
    let messages: any[] = [];
    try {
      messages = await (prisma as any).ragMessage.findMany({
        where: {
          userId: auth.userId,
          dogId: dogId,
        },
        orderBy: {
          timestamp: 'asc',
        },
        take: limit,
        select: {
          id: true,
          role: true,
          content: true,
          timestamp: true,
          dogId: true,
          evaluation: true,
        },
      });
    } catch (dbError) {
      console.warn('Failed to fetch messages from database. Table might not exist yet:', dbError);
      // Return empty array if table doesn't exist
      messages = [];
    }

    // Transform to match RagMessage type format
    const formattedMessages = messages.map((msg: any) => ({
      id: msg.id.toString(),
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp,
      dogId: msg.dogId.toString(),
      evaluation: msg.evaluation || undefined,
    }));

    return NextResponse.json({
      success: true,
      messages: formattedMessages,
      count: formattedMessages.length,
    });
  } catch (error) {
    console.error('Error fetching RAG messages:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch messages',
      },
      { status: 500 }
    );
  }
}

