import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { DashboardStats, ActivityRecord, HealthIndicator } from '@/types';
import { FIXED_USER_ID } from '@/lib/constants';

// GET /api/dashboard/stats - Get dashboard statistics
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    // TODO: Get user_id from authentication/session
    const userId = searchParams.get('user_id') ? parseInt(searchParams.get('user_id')!) : FIXED_USER_ID;
    const dogId = searchParams.get('dog_id') || null;
    const days = parseInt(searchParams.get('days') || '30');

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Build WHERE clause
    let whereClause = 'user_id = $1 AND created_at >= $2 AND created_at < $3';
    const params: any[] = [userId, startDate, endDate];

    if (dogId) {
      whereClause += ' AND dog_id = $4';
      params.push(dogId);
    }

    // Get total records
    const totalRecordsResult = await query(
      `SELECT COUNT(*) as count FROM dog_logs WHERE ${whereClause}`,
      params
    );
    const totalRecords = parseInt(totalRecordsResult.rows[0].count);

    // Get average walk time
    const walkStatsResult = await query(
      `SELECT 
        AVG((log_data->>'minutes')::numeric) as avg_minutes,
        COUNT(*) as count
      FROM dog_logs 
      WHERE ${whereClause} AND log_type = 'walk'`,
      params
    );
    const avgWalkTime = walkStatsResult.rows[0].avg_minutes 
      ? Math.round(parseFloat(walkStatsResult.rows[0].avg_minutes))
      : 0;

    // Get meal completion rate
    const mealStatsResult = await query(
      `SELECT 
        COUNT(*) FILTER (WHERE log_data->>'completion' = 'all') as completed,
        COUNT(*) as total
      FROM dog_logs 
      WHERE ${whereClause} AND log_type = 'food'`,
      params
    );
    const completedMeals = parseInt(mealStatsResult.rows[0].completed || '0');
    const totalMeals = parseInt(mealStatsResult.rows[0].total || '0');
    const mealCompletionRate = totalMeals > 0 
      ? Math.round((completedMeals / totalMeals) * 100)
      : 0;

    // Get anomaly detections (placeholder - can be enhanced with ML model)
    // For now, count logs with unusual patterns
    const anomalyResult = await query(
      `SELECT COUNT(*) as count 
      FROM dog_logs 
      WHERE ${whereClause} 
      AND (
        (log_type = 'bark' AND (log_data->>'difficulty')::int >= 4)
        OR (log_type = 'food' AND log_data->>'completion' = 'little')
        OR (log_type = 'toilet' AND log_data->>'success' = 'false')
      )`,
      params
    );
    const anomalyDetections = parseInt(anomalyResult.rows[0].count || '0');

    // Get comparison with previous period for trends
    const prevStartDate = new Date(startDate);
    prevStartDate.setDate(prevStartDate.getDate() - days);
    const prevEndDate = startDate;

    let prevWhereClause = 'user_id = $1 AND created_at >= $2 AND created_at < $3';
    const prevParams: any[] = [userId, prevStartDate, prevEndDate];

    if (dogId) {
      prevWhereClause += ' AND dog_id = $4';
      prevParams.push(dogId);
    }

    const prevRecordsResult = await query(
      `SELECT COUNT(*) as count FROM dog_logs WHERE ${prevWhereClause}`,
      prevParams
    );
    const prevRecords = parseInt(prevRecordsResult.rows[0].count || '0');
    const recordsChange = prevRecords > 0 
      ? Math.round(((totalRecords - prevRecords) / prevRecords) * 100)
      : 0;

    const prevWalkStatsResult = await query(
      `SELECT AVG((log_data->>'minutes')::numeric) as avg_minutes
      FROM dog_logs 
      WHERE ${prevWhereClause} AND log_type = 'walk'`,
      prevParams
    );
    const prevAvgWalkTime = prevWalkStatsResult.rows[0].avg_minutes 
      ? parseFloat(prevWalkStatsResult.rows[0].avg_minutes)
      : 0;
    const walkTimeChange = prevAvgWalkTime > 0 
      ? Math.round(((avgWalkTime - prevAvgWalkTime) / prevAvgWalkTime) * 100)
      : 0;

    const prevMealStatsResult = await query(
      `SELECT 
        COUNT(*) FILTER (WHERE log_data->>'completion' = 'all') as completed,
        COUNT(*) as total
      FROM dog_logs 
      WHERE ${prevWhereClause} AND log_type = 'food'`,
      prevParams
    );
    const prevCompletedMeals = parseInt(prevMealStatsResult.rows[0].completed || '0');
    const prevTotalMeals = parseInt(prevMealStatsResult.rows[0].total || '0');
    const prevMealRate = prevTotalMeals > 0 
      ? (prevCompletedMeals / prevTotalMeals) * 100
      : 0;
    const mealRateChange = prevMealRate > 0 
      ? Math.round(((mealCompletionRate - prevMealRate) / prevMealRate) * 100)
      : 0;

    const stats: DashboardStats = {
      total_records: totalRecords,
      average_walk_time: avgWalkTime,
      meal_completion_rate: mealCompletionRate,
      anomaly_detections: anomalyDetections,
      period_comparison: {
        records_change: recordsChange,
        walk_time_change: walkTimeChange,
        meal_rate_change: mealRateChange,
      },
    };

    return NextResponse.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dashboard statistics' },
      { status: 500 }
    );
  }
}
