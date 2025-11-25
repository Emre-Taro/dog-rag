import { buildWeeklySummaryForDog } from './weeklySummary'
import { buildDogWeekText } from '../weeklyText/dogWeekText'

/**
 * Calculate all weeks within a date range.
 * Each week starts on Monday and ends on Sunday.
 */
export function calculateWeeksInRange(startDate: Date, endDate: Date): Array<{ weekStart: Date; weekEnd: Date }> {
  const weeks: Array<{ weekStart: Date; weekEnd: Date }> = []
  
  // Normalize dates to start of day
  const start = new Date(startDate)
  start.setHours(0, 0, 0, 0)
  
  const end = new Date(endDate)
  end.setHours(23, 59, 59, 999)
  
  // Find the Monday of the week containing startDate
  const currentWeekStart = new Date(start)
  const dayOfWeek = currentWeekStart.getDay() // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  currentWeekStart.setDate(currentWeekStart.getDate() + daysToMonday)
  currentWeekStart.setHours(0, 0, 0, 0)
  
  // Generate weeks until we exceed endDate
  let weekStart = new Date(currentWeekStart)
  
  while (weekStart <= end) {
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 6) // Sunday (6 days after Monday)
    weekEnd.setHours(23, 59, 59, 999)
    
    // Only include weeks that overlap with the requested range
    if (weekEnd >= start && weekStart <= end) {
      weeks.push({
        weekStart: new Date(weekStart),
        weekEnd: new Date(weekEnd),
      })
    }
    
    // Move to next week (Monday)
    weekStart.setDate(weekStart.getDate() + 7)
  }
  
  return weeks
}

/**
 * Build weekly summary and text data for a single week.
 * This function generates both summary and text data simultaneously.
 */
export async function buildWeeklyDataForWeek(params: {
  dogId: number
  weekStart: Date
  weekEnd: Date
}): Promise<{
  weeklyJson: import('./weeklySummary').WeeklyDogJson
  summary: import('../../../generated/prisma/client').DogWeekSummary
  weekTexts: import('../../../generated/prisma/client').DogWeekText[]
  summaryText: string
  timelineJson: import('../weeklyText/dogWeekText').WeekTextTimeline
}> {
  const { dogId, weekStart, weekEnd } = params

  // Normalize dates
  const normalizedWeekStart = new Date(weekStart)
  normalizedWeekStart.setHours(0, 0, 0, 0)
  
  const normalizedWeekEnd = new Date(weekEnd)
  normalizedWeekEnd.setHours(23, 59, 59, 999)

  // Build both summary and text data in parallel
  const [summaryResult, textResult] = await Promise.all([
    buildWeeklySummaryForDog({
      dogId,
      weekStart: normalizedWeekStart,
      weekEnd: normalizedWeekEnd,
    }),
    buildDogWeekText({
      dogId,
      weekStart: normalizedWeekStart,
      weekEnd: normalizedWeekEnd,
    }),
  ])

  return {
    weeklyJson: summaryResult.weeklyJson,
    summary: summaryResult.summary,
    weekTexts: textResult.weekTexts,
    summaryText: summaryResult.summaryText,
    timelineJson: textResult.timelineJson,
  }
}

/**
 * Build weekly summary and text data for multiple weeks within a date range.
 * This function processes all weeks in the range and returns aggregated results.
 */
export async function buildWeeklyDataForRange(params: {
  dogId: number
  startDate: Date
  endDate: Date
}): Promise<{
  weeks: Array<{
    weekStart: string // ISO date string (YYYY-MM-DD)
    weekEnd: string // ISO date string (YYYY-MM-DD)
    weeklyJson: import('./weeklySummary').WeeklyDogJson
    summary: import('../../../generated/prisma/client').DogWeekSummary
    weekTexts: import('../../../generated/prisma/client').DogWeekText[]
    summaryText: string
    timelineJson: import('../weeklyText/dogWeekText').WeekTextTimeline
  }>
}> {
  const { dogId, startDate, endDate } = params

  // Calculate all weeks in the range
  const weeks = calculateWeeksInRange(startDate, endDate)

  // Build data for all weeks in parallel
  const weekData = await Promise.all(
    weeks.map(async ({ weekStart, weekEnd }) => {
      const data = await buildWeeklyDataForWeek({
        dogId,
        weekStart,
        weekEnd,
      })

      return {
        weekStart: weekStart.toISOString().split('T')[0], // YYYY-MM-DD
        weekEnd: weekEnd.toISOString().split('T')[0], // YYYY-MM-DD
        ...data,
      }
    })
  )

  return {
    weeks: weekData,
  }
}

