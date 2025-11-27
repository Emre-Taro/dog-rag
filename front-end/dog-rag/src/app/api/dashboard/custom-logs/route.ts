/**
 * GET /api/dashboard/custom-logs
 * Get CustomLog entries (important notes/events)
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/weeklySummary/weeklySummary';

export async function GET(req: Request) {
  try {
    const auth = await requireAuth(req);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const dogIdParam = searchParams.get('dog_id');
    const daysParam = searchParams.get('days');

    if (!dogIdParam) {
      return NextResponse.json(
        { success: false, error: 'dog_id is required' },
        { status: 400 }
      );
    }

    const dogId = parseInt(dogIdParam);
    const days = parseInt(daysParam || '30');

    // Verify dog belongs to user
    const dogProfile = await prisma.dogProfile.findUnique({
      where: { id: dogId },
      select: { ownerId: true },
    });

    if (!dogProfile || dogProfile.ownerId !== auth.userId) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    // Calculate date range
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    // Fetch CustomLogs
    const customLogs = await prisma.customLog.findMany({
      where: {
        dogId,
        loggedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        id: true,
        title: true,
        content: true,
        loggedAt: true,
        createdAt: true,
      },
      orderBy: { loggedAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: {
        customLogs: customLogs.map(log => ({
          id: log.id,
          title: log.title,
          content: log.content,
          loggedAt: log.loggedAt.toISOString(),
          createdAt: log.createdAt.toISOString(),
        })),
      },
    });
  } catch (error) {
    console.error('Error fetching custom logs:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch custom logs',
      },
      { status: 500 }
    );
  }
}

