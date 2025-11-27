
import 'dotenv/config'
import { PrismaClient } from '../../../generated/prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { formatWeeklySummaryText } from './summaryText'

// PostgreSQL connection pool
// Enable SSL for AWS RDS connections
const connectionString = process.env.DATABASE_URL || '';
const poolConfig: any = {
  connectionString,
};

// If connecting to AWS RDS, enable SSL
if (connectionString.includes('rds.amazonaws.com') || connectionString.includes('amazonaws.com')) {
  // If SSL is not already specified in the connection string, add it
  if (!connectionString.includes('sslmode=') && !connectionString.includes('ssl=')) {
    poolConfig.ssl = {
      rejectUnauthorized: false, // AWS RDS uses self-signed certificates
    };
  }
}

const pool = new Pool(poolConfig)

// Create Prisma adapter
const adapter = new PrismaPg(pool)

// Singleton pattern for PrismaClient
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter, // This is the key part
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Type definitions
export type WeeklyDogJson = {
  dogId: number;
  period: {
    start: string; // "YYYY-MM-DD"
    end: string;   // "YYYY-MM-DD"
  };
  summary: {
    avgOneFreqDay: number | null;
    avgTwoFreqDay: number | null;
    toiletFailRate: number | null;
    avgFood: number | null;          // per day, grams
    avgWalkMinutes: number | null;   // per day, minutes
    avgWalkDistance: number | null;  // per day, km
    avgSleepHour: number | null;     // per day, hours
    barkNightCount: number | null;
  };
  notes: string[];
  rawSignals: {
    toilet: import('../../../generated/prisma/client').ToiletLog[];
    food: import('../../../generated/prisma/client').FoodLog[];
    walk: import('../../../generated/prisma/client').WalkLog[];
    sleep: import('../../../generated/prisma/client').SleepLog[];
    play: import('../../../generated/prisma/client').PlayLog[];
    bark: import('../../../generated/prisma/client').BarkLog[];
    custom: import('../../../generated/prisma/client').CustomLog[];
    dogNotes: import('../../../generated/prisma/client').DogNote[];
  };
};

/**
 * Builds a weekly summary for a dog by aggregating logs from the specified week.
 * Upserts the result into DogWeekSummary table.
 */
export async function buildWeeklySummaryForDog(params: {
  dogId: number;
  weekStart: Date;
  weekEnd: Date;
}): Promise<{
  weeklyJson: WeeklyDogJson;
  summary: import('../../../generated/prisma/client').DogWeekSummary;
  weekTexts: import('../../../generated/prisma/client').DogWeekText[];
  summaryText: string;
}> {
  const { dogId, weekStart, weekEnd } = params;

  // Get dog name
  const dogProfile = await prisma.dogProfile.findUnique({
    where: { id: dogId },
    select: { dogName: true },
  });

  if (!dogProfile) {
    throw new Error(`Dog profile with id ${dogId} not found`);
  }

  // Ensure weekEnd is at end of day (23:59:59.999)
  const weekEndInclusive = new Date(weekEnd);
  weekEndInclusive.setHours(23, 59, 59, 999);

  // Fetch all logs within the week range
  const [toiletLogs, foodLogs, walkLogs, sleepLogs, playLogs, barkLogs, customLogs, dogNotes] = await Promise.all([
    // ToiletLogs
    prisma.toiletLog.findMany({
      where: {
        dogId,
        time: {
          gte: weekStart,
          lte: weekEndInclusive,
        },
      },
      orderBy: { time: 'asc' },
    }),
    // FoodLogs
    prisma.foodLog.findMany({
      where: {
        dogId,
        time: {
          gte: weekStart,
          lte: weekEndInclusive,
        },
      },
      orderBy: { time: 'asc' },
    }),
    // WalkLogs - include logs where startedAt is in range OR (startedAt is null and createdAt is in range)
    prisma.walkLog.findMany({
      where: {
        dogId,
        OR: [
          {
            startedAt: {
              gte: weekStart,
              lte: weekEndInclusive,
            },
          },
          {
            startedAt: null,
            createdAt: {
              gte: weekStart,
              lte: weekEndInclusive,
            },
          },
        ],
      },
      orderBy: { createdAt: 'asc' },
    }),
    // SleepLogs - include logs where startedAt is in range OR (startedAt is null and createdAt is in range)
    prisma.sleepLog.findMany({
      where: {
        dogId,
        OR: [
          {
            startedAt: {
              gte: weekStart,
              lte: weekEndInclusive,
            },
          },
          {
            startedAt: null,
            createdAt: {
              gte: weekStart,
              lte: weekEndInclusive,
            },
          },
        ],
      },
      orderBy: { createdAt: 'asc' },
    }),
    // PlayLogs - include logs where startedAt is in range OR (startedAt is null and createdAt is in range)
    prisma.playLog.findMany({
      where: {
        dogId,
        OR: [
          {
            startedAt: {
              gte: weekStart,
              lte: weekEndInclusive,
            },
          },
          {
            startedAt: null,
            createdAt: {
              gte: weekStart,
              lte: weekEndInclusive,
            },
          },
        ],
      },
      orderBy: { createdAt: 'asc' },
    }),
    // BarkLogs
    prisma.barkLog.findMany({
      where: {
        dogId,
        time: {
          gte: weekStart,
          lte: weekEndInclusive,
        },
      },
      orderBy: { time: 'asc' },
    }),
    // CustomLogs
    prisma.customLog.findMany({
      where: {
        dogId,
        loggedAt: {
          gte: weekStart,
          lte: weekEndInclusive,
        },
      },
      orderBy: { loggedAt: 'asc' },
    }),
    // DogNotes
    prisma.dogNote.findMany({
      where: {
        dogId,
        date: {
          gte: weekStart,
          lte: weekEndInclusive,
        },
      },
      orderBy: { date: 'asc' },
    }),
  ]);

  // Calculate number of days in the week
  const daysDiff = Math.ceil((weekEndInclusive.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const numDays = Math.max(1, daysDiff); // Ensure at least 1 day

  // Calculate avgOneFreqDay and avgTwoFreqDay
  // Count occurrences per day, then average
  const oneCountsByDay = new Map<string, number>();
  const twoCountsByDay = new Map<string, number>();

  toiletLogs.forEach((log: import('../../../generated/prisma/client').ToiletLog) => {
    const dayKey = log.time.toISOString().split('T')[0]; // YYYY-MM-DD
    if (log.type === 'ONE' || log.type === 'BOTH') {
      oneCountsByDay.set(dayKey, (oneCountsByDay.get(dayKey) || 0) + 1);
    }
    if (log.type === 'TWO' || log.type === 'BOTH') {
      twoCountsByDay.set(dayKey, (twoCountsByDay.get(dayKey) || 0) + 1);
    }
  });

  const avgOneFreqDay = oneCountsByDay.size > 0
    ? Array.from(oneCountsByDay.values()).reduce((sum, count) => sum + count, 0) / oneCountsByDay.size
    : null;
  const avgTwoFreqDay = twoCountsByDay.size > 0
    ? Array.from(twoCountsByDay.values()).reduce((sum, count) => sum + count, 0) / twoCountsByDay.size
    : null;

  // Calculate toiletFailRate (percentage of failed attempts)
  const totalToiletAttempts = toiletLogs.length;
  const failedToiletAttempts = toiletLogs.filter((log: import('../../../generated/prisma/client').ToiletLog) => !log.success).length;
  const toiletFailRate = totalToiletAttempts > 0
    ? (failedToiletAttempts / totalToiletAttempts) * 100
    : null;

  // Calculate avgFood (average grams per day)
  const totalFoodGrams = foodLogs.reduce((sum: number, log: import('../../../generated/prisma/client').FoodLog) => sum + (log.amountGrams || 0), 0);
  const avgFood = numDays > 0 ? totalFoodGrams / numDays : null;

  // Calculate avgWalkMinutes (average minutes per day)
  const totalWalkMinutes = walkLogs.reduce((sum: number, log: import('../../../generated/prisma/client').WalkLog) => sum + log.minutes, 0);
  const avgWalkMinutes = numDays > 0 ? totalWalkMinutes / numDays : null;

  // Calculate avgWalkDistance (average km per day)
  const totalWalkDistance = walkLogs.reduce((sum: number, log: import('../../../generated/prisma/client').WalkLog) => sum + (log.distanceKm || 0), 0);
  const avgWalkDistance = numDays > 0 ? totalWalkDistance / numDays : null;

  // Calculate avgSleepHour (average hours per day, convert from minutes)
  const totalSleepMinutes = sleepLogs.reduce((sum: number, log: import('../../../generated/prisma/client').SleepLog) => sum + log.durationMinutes, 0);
  const avgSleepHour = numDays > 0 ? totalSleepMinutes / (numDays * 60) : null; // Convert to hours

  // Calculate barkNightCount (count of barks during NIGHT or MIDNIGHT period)
  const barkNightCount = barkLogs.filter(
    (log: import('../../../generated/prisma/client').BarkLog) => log.period === 'NIGHT' || log.period === 'MIDNIGHT'
  ).length;

  // Collect notes
  const notes = dogNotes.map((note: import('../../../generated/prisma/client').DogNote) => note.comment);

  // Format dates as YYYY-MM-DD
  const formatDate = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  // Build the weekly JSON object
  const weeklyJson: WeeklyDogJson = {
    dogId,
    period: {
      start: formatDate(weekStart),
      end: formatDate(weekEnd),
    },
    summary: {
      avgOneFreqDay: avgOneFreqDay !== null ? Math.round(avgOneFreqDay * 100) / 100 : null,
      avgTwoFreqDay: avgTwoFreqDay !== null ? Math.round(avgTwoFreqDay * 100) / 100 : null,
      toiletFailRate: toiletFailRate !== null ? Math.round(toiletFailRate * 100) / 100 : null,
      avgFood: avgFood !== null ? Math.round(avgFood) : null,
      avgWalkMinutes: avgWalkMinutes !== null ? Math.round(avgWalkMinutes) : null,
      avgWalkDistance: avgWalkDistance !== null ? avgWalkDistance : null,
      avgSleepHour: avgSleepHour !== null ? Math.round(avgSleepHour * 100) / 100 : null,
      barkNightCount,
    },
    notes,
    rawSignals: {
      toilet: toiletLogs,
      food: foodLogs,
      walk: walkLogs,
      sleep: sleepLogs,
      play: playLogs,
      bark: barkLogs,
      custom: customLogs,
      dogNotes: dogNotes,
    },
  };

  // Generate natural language summary text
  const summaryText = formatWeeklySummaryText(dogProfile.dogName, weeklyJson);

  // Upsert DogWeekSummary
  const summary = await prisma.dogWeekSummary.upsert({
    where: {
      uq_dog_week: {
        dogId,
        weekStart,
        weekEnd,
      },
    },
    create: {
      dogId,
      weekStart,
      weekEnd,
      avgOneFreqDay: avgOneFreqDay !== null ? Math.round(avgOneFreqDay) : null,
      avgTwoFreqDay: avgTwoFreqDay !== null ? Math.round(avgTwoFreqDay) : null,
      toiletFailRate: toiletFailRate !== null ? toiletFailRate : null,
      avgFood: avgFood !== null ? Math.round(avgFood) : null,
      avgWalkMinutes: avgWalkMinutes !== null ? Math.round(avgWalkMinutes) : null,
      avgWalkDistance: avgWalkDistance !== null ? avgWalkDistance : null,
      avgSleepHour: avgSleepHour !== null ? Math.round(avgSleepHour) : null,
      barkNightCount,
      summaryJson: weeklyJson as any, // Prisma Json type
      summaryText: summaryText, // Natural language summary text
      updatedAt: new Date(),
    },
    update: {
      avgOneFreqDay: avgOneFreqDay !== null ? Math.round(avgOneFreqDay) : null,
      avgTwoFreqDay: avgTwoFreqDay !== null ? Math.round(avgTwoFreqDay) : null,
      toiletFailRate: toiletFailRate !== null ? toiletFailRate : null,
      avgFood: avgFood !== null ? Math.round(avgFood) : null,
      avgWalkMinutes: avgWalkMinutes !== null ? Math.round(avgWalkMinutes) : null,
      avgWalkDistance: avgWalkDistance !== null ? avgWalkDistance : null,
      avgSleepHour: avgSleepHour !== null ? Math.round(avgSleepHour) : null,
      barkNightCount,
      summaryJson: weeklyJson as any, // Prisma Json type
      summaryText: summaryText, // Natural language summary text
      updatedAt: new Date(),
    },
  });

  // Build DogWeekText entries from logs with comments/content
  // First, delete existing DogWeekText entries for this week (to regenerate)
  await prisma.dogWeekText.deleteMany({
    where: {
      dogId,
      weekStart,
      weekEnd,
    },
  });

  // Collect all text entries with their timestamps
  type TextEntry = {
    eventAt: Date;
    category: string;
    sourceTable: string;
    sourceId: number | null;
    title: string | null;
    content: string;
    metadataJson?: any;
  };

  const textEntries: TextEntry[] = [];

  // ToiletLog entries
  toiletLogs.forEach((log: import('../../../generated/prisma/client').ToiletLog) => {
    if (log.comment) {
      textEntries.push({
        eventAt: log.time,
        category: 'toilet',
        sourceTable: 'ToiletLog',
        sourceId: log.id,
        title: null,
        content: log.comment,
        metadataJson: {
          type: log.type,
          success: log.success,
          health: log.health,
        },
      });
    }
  });

  // FoodLog entries
  foodLogs.forEach((log: import('../../../generated/prisma/client').FoodLog) => {
    if (log.comment) {
      textEntries.push({
        eventAt: log.time,
        category: 'food',
        sourceTable: 'FoodLog',
        sourceId: log.id,
        title: null,
        content: log.comment,
        metadataJson: {
          mealType: log.mealType,
          amountGrams: log.amountGrams,
          eatenAmount: log.eatenAmount,
        },
      });
    }
  });

  // WalkLog entries
  walkLogs.forEach((log: import('../../../generated/prisma/client').WalkLog) => {
    if (log.comment) {
      textEntries.push({
        eventAt: log.startedAt || log.createdAt,
        category: 'walk',
        sourceTable: 'WalkLog',
        sourceId: log.id,
        title: null,
        content: log.comment,
        metadataJson: {
          minutes: log.minutes,
          distanceKm: log.distanceKm,
          weather: log.weather,
        },
      });
    }
  });

  // SleepLog entries
  sleepLogs.forEach((log: import('../../../generated/prisma/client').SleepLog) => {
    if (log.comment) {
      textEntries.push({
        eventAt: log.startedAt || log.createdAt,
        category: 'sleep',
        sourceTable: 'SleepLog',
        sourceId: log.id,
        title: null,
        content: log.comment,
        metadataJson: {
          durationMinutes: log.durationMinutes,
        },
      });
    }
  });

  // PlayLog entries
  playLogs.forEach((log: import('../../../generated/prisma/client').PlayLog) => {
    if (log.comment) {
      textEntries.push({
        eventAt: log.startedAt || log.createdAt,
        category: 'play',
        sourceTable: 'PlayLog',
        sourceId: log.id,
        title: null,
        content: log.comment,
        metadataJson: {
          minutes: log.minutes,
          playType: log.playType,
        },
      });
    }
  });

  // BarkLog entries (use before/after if comment field doesn't exist)
  barkLogs.forEach((log: import('../../../generated/prisma/client').BarkLog) => {
    const content = log.before || log.after;
    if (content) {
      textEntries.push({
        eventAt: log.time,
        category: 'bark',
        sourceTable: 'BarkLog',
        sourceId: log.id,
        title: null,
        content: content,
        metadataJson: {
          period: log.period,
          difficulty: log.difficulty,
          before: log.before,
          after: log.after,
        },
      });
    }
  });

  // CustomLog entries (title and content)
  customLogs.forEach((log: import('../../../generated/prisma/client').CustomLog) => {
    textEntries.push({
      eventAt: log.loggedAt,
      category: 'custom',
      sourceTable: 'CustomLog',
      sourceId: log.id,
      title: log.title,
      content: log.content,
    });
  });

  // DogNote entries
  dogNotes.forEach((note: import('../../../generated/prisma/client').DogNote) => {
    textEntries.push({
      eventAt: note.date,
      category: 'note',
      sourceTable: 'DogNote',
      sourceId: note.id,
      title: null,
      content: note.comment,
      metadataJson: {
        noteType: note.noteType,
      },
    });
  });

  // Sort by eventAt (chronological order)
  textEntries.sort((a, b) => a.eventAt.getTime() - b.eventAt.getTime());

  // Create DogWeekText entries
  const weekTexts = await Promise.all(
    textEntries.map((entry) =>
      prisma.dogWeekText.create({
        data: {
          dogId,
          weekStart,
          weekEnd,
          eventAt: entry.eventAt,
          category: entry.category,
          sourceTable: entry.sourceTable,
          sourceId: entry.sourceId,
          title: entry.title,
          content: entry.content,
          metadataJson: entry.metadataJson ? (entry.metadataJson as any) : null,
        },
      })
    )
  );

  return {
    weeklyJson,
    summary,
    weekTexts,
    summaryText,
  };
}
