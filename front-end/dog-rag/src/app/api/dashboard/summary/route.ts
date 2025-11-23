import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { ActivityRecord, HealthIndicator } from '@/types';
import { FIXED_USER_ID } from '@/lib/constants';

// GET /api/dashboard/summary - Get dashboard summary data (activity records and health indicators)
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    // TODO: Get user_id from authentication/session
    const userId = searchParams.get('user_id') ? parseInt(searchParams.get('user_id')!) : FIXED_USER_ID;
    const dogId = searchParams.get('dog_id') || null;
    const days = parseInt(searchParams.get('days') || '7');

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Build WHERE clause
    let whereClause = 'user_id = $1 AND created_at >= $2 AND created_at <= $3';
    const params: any[] = [userId, startDate, endDate];

    if (dogId) {
      whereClause += ' AND dog_id = $4';
      params.push(dogId);
    }

    // Get weekly activity records (grouped by day)
    const activityResult = await query(
      `SELECT 
        DATE(created_at) as date,
        COUNT(*) as count,
        json_object_agg(log_type, log_count) as types
      FROM (
        SELECT 
          created_at,
          log_type,
          COUNT(*) as log_count
        FROM dog_logs
        WHERE ${whereClause}
        GROUP BY DATE(created_at), log_type
      ) as daily_logs
      GROUP BY DATE(created_at)
      ORDER BY date ASC`,
      params
    );

    const activityRecords: ActivityRecord[] = activityResult.rows.map((row) => ({
      date: row.date.toISOString().split('T')[0],
      count: parseInt(row.count),
      types: typeof row.types === 'string' ? JSON.parse(row.types) : row.types || {},
    }));

    // Get health indicators (weight and temperature from logs)
    // Weight from food/consultation logs, temperature from consultation/health logs
    const healthResult = await query(
      `SELECT 
        DATE(created_at) as date,
        MAX(CASE WHEN log_type = 'consultation' AND log_data->>'weight' IS NOT NULL 
          THEN (log_data->>'weight')::numeric END) as weight,
        MAX(CASE WHEN log_type = 'consultation' AND log_data->>'temperature' IS NOT NULL 
          THEN (log_data->>'temperature')::numeric END) as temperature
      FROM dog_logs
      WHERE ${whereClause}
        AND (
          (log_type = 'consultation' AND (log_data->>'weight' IS NOT NULL OR log_data->>'temperature' IS NOT NULL))
        )
      GROUP BY DATE(created_at)
      ORDER BY date ASC`,
      params
    );

    const healthIndicators: HealthIndicator[] = healthResult.rows
      .filter((row) => row.weight || row.temperature)
      .map((row) => ({
        date: row.date.toISOString().split('T')[0],
        weight: row.weight ? parseFloat(row.weight) : undefined,
        temperature: row.temperature ? parseFloat(row.temperature) : undefined,
      }));

    return NextResponse.json({
      success: true,
      data: {
        activity_records: activityRecords,
        health_indicators: healthIndicators,
      },
    });
  } catch (error) {
    console.error('Error fetching dashboard summary:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dashboard summary' },
      { status: 500 }
    );
  }
}
