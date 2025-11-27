/**
 * GET /api/dashboard/visualization
 * Get visualization data for charts: toilet fail rate, bark at night, daily activity counts
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

    // Fetch ToiletLogs for fail rate calculation
    const toiletLogs = await prisma.toiletLog.findMany({
      where: {
        dogId,
        time: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        time: true,
        success: true,
      },
      orderBy: { time: 'asc' },
    });

    // Fetch BarkLogs for night barking count
    const barkLogs = await prisma.barkLog.findMany({
      where: {
        dogId,
        time: {
          gte: startDate,
          lte: endDate,
        },
        OR: [
          { period: 'NIGHT' },
          { period: 'MIDNIGHT' },
        ],
      },
      select: {
        time: true,
      },
      orderBy: { time: 'asc' },
    });

    // Calculate daily toilet fail rate
    const toiletFailRateByDay = new Map<string, { total: number; failed: number }>();
    toiletLogs.forEach((log) => {
      const date = log.time.toISOString().split('T')[0];
      if (!toiletFailRateByDay.has(date)) {
        toiletFailRateByDay.set(date, { total: 0, failed: 0 });
      }
      const dayData = toiletFailRateByDay.get(date)!;
      dayData.total++;
      if (!log.success) {
        dayData.failed++;
      }
    });

    const toiletFailRateData = Array.from(toiletFailRateByDay.entries())
      .map(([date, data]) => ({
        date,
        failRate: data.total > 0 ? (data.failed / data.total) * 100 : 0,
        total: data.total,
        failed: data.failed,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Calculate daily bark at night count
    const barkNightByDay = new Map<string, number>();
    barkLogs.forEach((log) => {
      const date = log.time.toISOString().split('T')[0];
      barkNightByDay.set(date, (barkNightByDay.get(date) || 0) + 1);
    });

    const barkNightData = Array.from(barkNightByDay.entries())
      .map(([date, count]) => ({
        date,
        count,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Get daily activity counts (total log entries per day) for heatmap
    const allLogs = await Promise.all([
      prisma.toiletLog.findMany({
        where: { dogId, time: { gte: startDate, lte: endDate } },
        select: { time: true, createdAt: true },
      }),
      prisma.foodLog.findMany({
        where: { dogId, time: { gte: startDate, lte: endDate } },
        select: { time: true, createdAt: true },
      }),
      prisma.walkLog.findMany({
        where: {
          dogId,
          OR: [
            { startedAt: { gte: startDate, lte: endDate } },
            { startedAt: null, createdAt: { gte: startDate, lte: endDate } },
          ],
        },
        select: { startedAt: true, createdAt: true },
      }),
      prisma.sleepLog.findMany({
        where: {
          dogId,
          OR: [
            { startedAt: { gte: startDate, lte: endDate } },
            { startedAt: null, createdAt: { gte: startDate, lte: endDate } },
          ],
        },
        select: { startedAt: true, createdAt: true },
      }),
      prisma.playLog.findMany({
        where: {
          dogId,
          OR: [
            { startedAt: { gte: startDate, lte: endDate } },
            { startedAt: null, createdAt: { gte: startDate, lte: endDate } },
          ],
        },
        select: { startedAt: true, createdAt: true },
      }),
      prisma.barkLog.findMany({
        where: { dogId, time: { gte: startDate, lte: endDate } },
        select: { time: true, createdAt: true },
      }),
      prisma.customLog.findMany({
        where: { dogId, loggedAt: { gte: startDate, lte: endDate } },
        select: { loggedAt: true, createdAt: true },
      }),
    ]);

    const dailyActivityCount = new Map<string, number>();
    
    // Process each log type
    allLogs[0].forEach(log => {
      const date = log.time.toISOString().split('T')[0];
      dailyActivityCount.set(date, (dailyActivityCount.get(date) || 0) + 1);
    });
    allLogs[1].forEach(log => {
      const date = log.time.toISOString().split('T')[0];
      dailyActivityCount.set(date, (dailyActivityCount.get(date) || 0) + 1);
    });
    allLogs[2].forEach(log => {
      const date = (log.startedAt || log.createdAt).toISOString().split('T')[0];
      dailyActivityCount.set(date, (dailyActivityCount.get(date) || 0) + 1);
    });
    allLogs[3].forEach(log => {
      const date = (log.startedAt || log.createdAt).toISOString().split('T')[0];
      dailyActivityCount.set(date, (dailyActivityCount.get(date) || 0) + 1);
    });
    allLogs[4].forEach(log => {
      const date = (log.startedAt || log.createdAt).toISOString().split('T')[0];
      dailyActivityCount.set(date, (dailyActivityCount.get(date) || 0) + 1);
    });
    allLogs[5].forEach(log => {
      const date = log.time.toISOString().split('T')[0];
      dailyActivityCount.set(date, (dailyActivityCount.get(date) || 0) + 1);
    });
    allLogs[6].forEach(log => {
      const date = log.loggedAt.toISOString().split('T')[0];
      dailyActivityCount.set(date, (dailyActivityCount.get(date) || 0) + 1);
    });

    // Generate all dates in range for heatmap
    const activityHeatmapData: Array<{ date: string; count: number }> = [];
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      activityHeatmapData.push({
        date: dateStr,
        count: dailyActivityCount.get(dateStr) || 0,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        toiletFailRate: toiletFailRateData,
        barkNight: barkNightData,
        activityHeatmap: activityHeatmapData,
      },
    });
  } catch (error) {
    console.error('Error fetching visualization data:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch visualization data',
      },
      { status: 500 }
    );
  }
}

