import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { buildWeeklyDataForRange } from '@/lib/weeklySummary/buildWeeklyData'
import { prisma } from '@/lib/weeklySummary/weeklySummary'

/**
 * GET /api/weekly-summary
 * 
 * Get weekly summary and text data for a dog within a specified date range.
 * 
 * Query parameters:
 * - dog_id (required): The dog ID
 * - days (optional): Number of days to look back from today (default: 30)
 * - start_date (optional): Start date in ISO format (YYYY-MM-DD)
 * - end_date (optional): End date in ISO format (YYYY-MM-DD)
 * 
 * If days is provided, it takes precedence over start_date/end_date.
 * If neither days nor dates are provided, defaults to 30 days.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)

    // Require authentication
    const auth = await requireAuth(req)
    if (!auth) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }
    const userId = auth.userId

    // Get dog_id from query params
    const dogIdParam = searchParams.get('dog_id')
    if (!dogIdParam) {
      return NextResponse.json(
        { success: false, error: 'dog_id parameter is required' },
        { status: 400 }
      )
    }
    const dogId = parseInt(dogIdParam)

    // Verify that the dog belongs to the user
    const dogProfile = await prisma.dogProfile.findUnique({
      where: { id: dogId },
      select: { ownerId: true },
    })

    if (!dogProfile) {
      return NextResponse.json(
        { success: false, error: 'Dog profile not found' },
        { status: 404 }
      )
    }

    if (dogProfile.ownerId !== userId) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      )
    }

    // Calculate date range
    let startDate: Date
    let endDate: Date

    const daysParam = searchParams.get('days')
    if (daysParam) {
      // Use days parameter
      const days = parseInt(daysParam)
      if (isNaN(days) || days < 1) {
        return NextResponse.json(
          { success: false, error: 'days parameter must be a positive number' },
          { status: 400 }
        )
      }

      endDate = new Date()
      endDate.setHours(23, 59, 59, 999)
      
      startDate = new Date()
      startDate.setDate(startDate.getDate() - (days - 1)) // Include today
      startDate.setHours(0, 0, 0, 0)
    } else {
      // Use start_date and end_date parameters
      const startDateParam = searchParams.get('start_date')
      const endDateParam = searchParams.get('end_date')

      if (startDateParam && endDateParam) {
        startDate = new Date(startDateParam)
        startDate.setHours(0, 0, 0, 0)
        
        endDate = new Date(endDateParam)
        endDate.setHours(23, 59, 59, 999)
      } else {
        // Default to 30 days
        endDate = new Date()
        endDate.setHours(23, 59, 59, 999)
        
        startDate = new Date()
        startDate.setDate(startDate.getDate() - 29) // 30 days including today
        startDate.setHours(0, 0, 0, 0)
      }
    }

    // Validate date range
    if (startDate > endDate) {
      return NextResponse.json(
        { success: false, error: 'start_date must be before end_date' },
        { status: 400 }
      )
    }

    // Build weekly data for the range
    const result = await buildWeeklyDataForRange({
      dogId,
      startDate,
      endDate,
    })

    return NextResponse.json({
      success: true,
      data: {
        dogId,
        dateRange: {
          start: startDate.toISOString().split('T')[0],
          end: endDate.toISOString().split('T')[0],
        },
        weeks: result.weeks,
      },
    })
  } catch (error) {
    console.error('Error fetching weekly summary:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch weekly summary',
      },
      { status: 500 }
    )
  }
}

