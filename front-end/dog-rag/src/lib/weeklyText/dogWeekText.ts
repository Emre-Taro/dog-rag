import { prisma } from '../weeklySummary/weeklySummary'

// Type for text entries before saving to database
type TextEntry = {
  eventAt: Date
  category: string
  sourceTable: string
  sourceId: number | null
  title: string | null
  content: string
  metadataJson?: any
}

// Type for the JSON representation of the week's text timeline
export type WeekTextTimeline = {
  dogId: number
  weekStart: string // ISO date string
  weekEnd: string // ISO date string
  entries: Array<{
    id: number
    eventAt: string // ISO date string
    category: string
    sourceTable: string
    sourceId: number | null
    title: string | null
    content: string
    metadataJson: any | null
    createdAt: string // ISO date string
  }>
}

/**
 * Collects all textual signals from log tables for a given week,
 * stores them in DogWeekText table, and returns a JSON representation.
 */
export async function buildDogWeekText(params: {
  dogId: number
  weekStart: Date
  weekEnd: Date
}): Promise<{
  weekTexts: import('../../../generated/prisma/client').DogWeekText[]
  timelineJson: WeekTextTimeline
}> {
  const { dogId, weekStart, weekEnd } = params

  // Ensure weekEnd is at end of day (23:59:59.999)
  const weekEndInclusive = new Date(weekEnd)
  weekEndInclusive.setHours(23, 59, 59, 999)

  // Fetch all logs within the week range
  // Note: weekStart should be at start of day (00:00:00.000)
  const weekStartInclusive = new Date(weekStart)
  weekStartInclusive.setHours(0, 0, 0, 0)

  const [toiletLogs, foodLogs, walkLogs, sleepLogs, playLogs, barkLogs, customLogs, dogNotes] =
    await Promise.all([
      // ToiletLogs
      prisma.toiletLog.findMany({
        where: {
          dogId,
          time: {
            gte: weekStartInclusive,
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
            gte: weekStartInclusive,
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
                gte: weekStartInclusive,
                lte: weekEndInclusive,
              },
            },
            {
              startedAt: null,
              createdAt: {
                gte: weekStartInclusive,
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
                gte: weekStartInclusive,
                lte: weekEndInclusive,
              },
            },
            {
              startedAt: null,
              createdAt: {
                gte: weekStartInclusive,
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
                gte: weekStartInclusive,
                lte: weekEndInclusive,
              },
            },
            {
              startedAt: null,
              createdAt: {
                gte: weekStartInclusive,
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
            gte: weekStartInclusive,
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
            gte: weekStartInclusive,
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
            gte: weekStartInclusive,
            lte: weekEndInclusive,
          },
        },
        orderBy: { date: 'asc' },
      }),
    ])

  // Debug: Log counts
  console.log('[buildDogWeekText] Fetched logs:', {
    toiletLogs: toiletLogs.length,
    foodLogs: foodLogs.length,
    walkLogs: walkLogs.length,
    sleepLogs: sleepLogs.length,
    playLogs: playLogs.length,
    barkLogs: barkLogs.length,
    customLogs: customLogs.length,
    dogNotes: dogNotes.length,
  })

  // Collect all text entries with their timestamps
  const textEntries: TextEntry[] = []

  // ToiletLog entries (only if comment exists)
  toiletLogs.forEach((log) => {
    if (log.comment && log.comment.trim()) {
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
      })
    }
  })

  // FoodLog entries (only if comment exists)
  foodLogs.forEach((log) => {
    if (log.comment && log.comment.trim()) {
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
      })
    }
  })

  // WalkLog entries (only if comment exists)
  walkLogs.forEach((log) => {
    if (log.comment && log.comment.trim()) {
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
      })
    }
  })

  // SleepLog entries (only if comment exists)
  sleepLogs.forEach((log) => {
    if (log.comment && log.comment.trim()) {
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
      })
    }
  })

  // PlayLog entries (only if comment exists)
  playLogs.forEach((log) => {
    if (log.comment && log.comment.trim()) {
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
      })
    }
  })

  // BarkLog entries (use before/after if comment field doesn't exist)
  barkLogs.forEach((log) => {
    const content = log.before || log.after
    if (content && content.trim()) {
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
      })
    }
  })

  // CustomLog entries (always include - title and content are required)
  customLogs.forEach((log) => {
    if (log.content && log.content.trim()) {
      textEntries.push({
        eventAt: log.loggedAt,
        category: 'custom',
        sourceTable: 'CustomLog',
        sourceId: log.id,
        title: log.title,
        content: log.content,
      })
    }
  })

  // DogNote entries (always include - comment is required)
  dogNotes.forEach((note) => {
    if (note.comment && note.comment.trim()) {
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
      })
    }
  })

  // Debug: Log text entries count
  console.log('[buildDogWeekText] Text entries collected:', textEntries.length)

  // Sort by eventAt (chronological order)
  textEntries.sort((a, b) => a.eventAt.getTime() - b.eventAt.getTime())

  // Delete existing DogWeekText entries for this week (to regenerate)
  await prisma.dogWeekText.deleteMany({
    where: {
      dogId,
      weekStart,
      weekEnd,
    },
  })

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
  )

  // Build JSON representation of the timeline
  const timelineJson: WeekTextTimeline = {
    dogId,
    weekStart: weekStart.toISOString().split('T')[0], // YYYY-MM-DD format
    weekEnd: weekEnd.toISOString().split('T')[0], // YYYY-MM-DD format
    entries: weekTexts.map((entry) => ({
      id: entry.id,
      eventAt: entry.eventAt.toISOString(),
      category: entry.category,
      sourceTable: entry.sourceTable,
      sourceId: entry.sourceId,
      title: entry.title,
      content: entry.content,
      metadataJson: entry.metadataJson as any,
      createdAt: entry.createdAt.toISOString(),
    })),
  }

  return {
    weekTexts,
    timelineJson,
  }
}

