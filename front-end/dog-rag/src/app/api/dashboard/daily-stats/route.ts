/**
 * GET /api/dashboard/daily-stats
 * Get daily statistics: meals per day with grams, toilet frequency, sleep average, anomaly detections
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

    // 1. Get meal statistics (times per day and grams per meal)
    const foodLogs = await prisma.foodLog.findMany({
      where: {
        dogId,
        time: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        time: true,
        amountGrams: true,
        mealType: true,
      },
      orderBy: { time: 'asc' },
    });

    // Group meals by day
    const mealsByDay = new Map<string, { count: number; totalGrams: number; meals: Array<{ mealType: string; grams: number }> }>();
    foodLogs.forEach((log) => {
      const dateStr = log.time.toISOString().split('T')[0];
      if (!mealsByDay.has(dateStr)) {
        mealsByDay.set(dateStr, { count: 0, totalGrams: 0, meals: [] });
      }
      const dayData = mealsByDay.get(dateStr)!;
      dayData.count++;
      dayData.totalGrams += log.amountGrams || 0;
      dayData.meals.push({
        mealType: log.mealType,
        grams: log.amountGrams || 0,
      });
    });

    const avgMealsPerDay = mealsByDay.size > 0
      ? Array.from(mealsByDay.values()).reduce((sum, day) => sum + day.count, 0) / mealsByDay.size
      : 0;
    const avgGramsPerMeal = foodLogs.length > 0
      ? foodLogs.reduce((sum, log) => sum + (log.amountGrams || 0), 0) / foodLogs.length
      : 0;
    const totalGramsPerDay = mealsByDay.size > 0
      ? Array.from(mealsByDay.values()).reduce((sum, day) => sum + day.totalGrams, 0) / mealsByDay.size
      : 0;

    // 2. Get toilet frequency (ONE and TWO per day average)
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
        type: true,
      },
      orderBy: { time: 'asc' },
    });

    // Group by day
    const toiletByDay = new Map<string, { one: number; two: number }>();
    toiletLogs.forEach((log) => {
      const dateStr = log.time.toISOString().split('T')[0];
      if (!toiletByDay.has(dateStr)) {
        toiletByDay.set(dateStr, { one: 0, two: 0 });
      }
      const dayData = toiletByDay.get(dateStr)!;
      if (log.type === 'ONE' || log.type === 'BOTH') {
        dayData.one++;
      }
      if (log.type === 'TWO' || log.type === 'BOTH') {
        dayData.two++;
      }
    });

    const avgOnePerDay = toiletByDay.size > 0
      ? Array.from(toiletByDay.values()).reduce((sum, day) => sum + day.one, 0) / toiletByDay.size
      : 0;
    const avgTwoPerDay = toiletByDay.size > 0
      ? Array.from(toiletByDay.values()).reduce((sum, day) => sum + day.two, 0) / toiletByDay.size
      : 0;

    // 3. Get sleep average time (hours per day)
    const sleepLogs = await prisma.sleepLog.findMany({
      where: {
        dogId,
        OR: [
          {
            startedAt: {
              gte: startDate,
              lte: endDate,
            },
          },
          {
            startedAt: null,
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          },
        ],
      },
      select: {
        durationMinutes: true,
      },
    });

    const totalSleepMinutes = sleepLogs.reduce((sum, log) => sum + log.durationMinutes, 0);
    const avgSleepHoursPerDay = days > 0 ? (totalSleepMinutes / days) / 60 : 0;

    // 4. Get anomaly detections
    const barkLogs = await prisma.barkLog.findMany({
      where: {
        dogId,
        time: {
          gte: startDate,
          lte: endDate,
        },
        difficulty: {
          gte: 4,
        },
      },
      select: { id: true },
    });

    const failedToiletLogs = await prisma.toiletLog.findMany({
      where: {
        dogId,
        time: {
          gte: startDate,
          lte: endDate,
        },
        success: false,
      },
      select: { id: true },
    });

    const littleFoodLogs = await prisma.foodLog.findMany({
      where: {
        dogId,
        time: {
          gte: startDate,
          lte: endDate,
        },
        eatenAmount: 'LITTLE',
      },
      select: { id: true },
    });

    const anomalyCount = barkLogs.length + failedToiletLogs.length + littleFoodLogs.length;

    return NextResponse.json({
      success: true,
      data: {
        meals: {
          avgMealsPerDay: Math.round(avgMealsPerDay * 10) / 10,
          avgGramsPerMeal: Math.round(avgGramsPerMeal),
          avgGramsPerDay: Math.round(totalGramsPerDay),
          dailyMeals: Array.from(mealsByDay.entries()).map(([date, data]) => ({
            date,
            count: data.count,
            totalGrams: data.totalGrams,
            meals: data.meals,
          })),
        },
        toilet: {
          avgOnePerDay: Math.round(avgOnePerDay * 10) / 10,
          avgTwoPerDay: Math.round(avgTwoPerDay * 10) / 10,
        },
        sleep: {
          avgHoursPerDay: Math.round(avgSleepHoursPerDay * 10) / 10,
        },
        anomalies: {
          count: anomalyCount,
          details: {
            highDifficultyBarks: barkLogs.length,
            failedToilets: failedToiletLogs.length,
            littleFood: littleFoodLogs.length,
          },
        },
      },
    });
  } catch (error) {
    console.error('Error fetching daily stats:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch daily statistics',
      },
      { status: 500 }
    );
  }
}

