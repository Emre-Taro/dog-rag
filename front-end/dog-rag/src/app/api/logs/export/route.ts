import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { LogType } from '@/types';
import { FIXED_USER_ID } from '@/lib/constants';
import { getLogTableName, LOG_TABLE_MAP } from '@/lib/log-tables-simple';

// GET /api/logs/export - Export logs as CSV
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    // TODO: Get user_id from authentication/session
    const userId = searchParams.get('user_id') ? parseInt(searchParams.get('user_id')!) : FIXED_USER_ID;
    const dogId = searchParams.get('dog_id') || null;
    const logType = searchParams.get('log_type') as LogType | null;
    const startDate = searchParams.get('start_date') || null;
    const endDate = searchParams.get('end_date') || null;

    // Build UNION query for all log tables (similar to GET /api/logs)
    const tables = logType 
      ? [getLogTableName(logType)]
      : Array.from(new Set(Object.values(LOG_TABLE_MAP)));
    
    const unions: string[] = [];
    const allParams: any[] = [];
    let paramIndex = 1;

    // Build WHERE conditions for each table
    const baseConditions: string[] = [];
    if (dogId) {
      baseConditions.push(`"dogId" = $${paramIndex}`);
      allParams.push(parseInt(dogId));
      paramIndex++;
    }
    if (startDate) {
      baseConditions.push(`"createdAt" >= $${paramIndex}`);
      allParams.push(startDate);
      paramIndex++;
    }
    if (endDate) {
      baseConditions.push(`"createdAt" < $${paramIndex}`);
      allParams.push(endDate);
      paramIndex++;
    }

    // Build UNION query for each table
    tables.forEach((table) => {
      const logTypes = Object.entries(LOG_TABLE_MAP)
        .filter(([_, tableName]) => tableName === table)
        .map(([type]) => type);
      
      logTypes.forEach((type) => {
        // All camelCase columns need quotes in PostgreSQL
        const select = `
          SELECT 
            t.id,
            t."dogId" as "dogId",
            '${type}'::text as log_type,
            to_jsonb(t.*) as log_data,
            t."createdAt" as created_at
          FROM "${table}" t
          ${baseConditions.length > 0 ? `WHERE ${baseConditions.join(' AND ')}` : ''}
        `;
        unions.push(select);
      });
    });

    // Filter by user through DogProfile
    const finalConditions: string[] = [];
    if (!dogId) {
      finalConditions.push(`"dogId" IN (SELECT id FROM "DogProfile" WHERE "ownerId" = $${paramIndex})`);
      allParams.push(userId);
      paramIndex++;
    } else {
      finalConditions.push(`"dogId" IN (SELECT id FROM "DogProfile" WHERE id = $1 AND "ownerId" = $${paramIndex})`);
      allParams.push(userId);
      paramIndex++;
    }

    const unionQuery = unions.join(' UNION ALL ');
    const finalQuery = `
      SELECT 
        unified_logs.id,
        unified_logs.log_type,
        unified_logs.log_data,
        unified_logs.created_at,
        dp."dogName"
      FROM (
        ${unionQuery}
      ) unified_logs
      LEFT JOIN "DogProfile" dp ON unified_logs."dogId" = dp.id
      WHERE ${finalConditions.join(' AND ')}
      ORDER BY unified_logs.created_at DESC
    `;

    const result = await query(finalQuery, allParams);

    // Convert to CSV format
    const headers = ['ID', 'Date', 'Dog Name', 'Type', 'Details'];
    const rows = result.rows.map((row) => {
      const date = new Date(row.created_at).toISOString();
      const details = formatLogDetails(row.log_type, row.log_data);
      return [
        row.id,
        date,
        row.dogName || 'Unknown',
        row.log_type,
        details.replace(/"/g, '""'), // Escape quotes in CSV
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    // Return CSV file
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="dog-logs-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error('Error exporting logs:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to export logs' },
      { status: 500 }
    );
  }
}

// Helper function to format log details for CSV
function formatLogDetails(logType: string, logData: any): string {
  try {
    const data = typeof logData === 'string' ? JSON.parse(logData) : logData;
    
    switch (logType) {
      case 'toilet':
        const toiletTypeLabels: Record<string, string> = { ONE: 'Urination', TWO: 'Defecation', BOTH: 'Both' };
        const healthLabels: Record<string, string> = { NORMAL: 'Normal', SOFT: 'Soft', HARD: 'Hard', BLOODY: 'Bloody', OTHER: 'Other' };
        return `Type: ${toiletTypeLabels[data.type] || data.type}, Success: ${data.success ? 'Yes' : 'No'}, Health: ${healthLabels[data.health] || data.health || 'Normal'}${data.comment ? `, Comment: ${data.comment}` : ''}`;
      
      case 'food':
        const mealType = data.mealType || data.meal_type;
        const amountGrams = data.amountGrams || data.amount;
        const eatenAmount = data.eatenAmount || data.completion;
        return `Meal: ${mealType}, Amount: ${amountGrams ? `${amountGrams}g` : 'N/A'}, Eaten: ${eatenAmount || 'N/A'}${data.time ? `, Time: ${data.time}` : ''}${data.comment ? `, Comment: ${data.comment}` : ''}`;
      
      case 'sleep':
        const durationMinutes = data.durationMinutes || data.duration;
        return `Duration: ${durationMinutes} minutes${data.startedAt ? `, Started: ${data.startedAt}` : ''}${data.comment ? `, Comment: ${data.comment}` : ''}`;
      
      case 'walk':
        const distanceKm = data.distanceKm || data.distance;
        return `Duration: ${data.minutes} min, Distance: ${distanceKm ? `${distanceKm}km` : 'N/A'}, Weather: ${data.weather || 'N/A'}${data.startedAt ? `, Started: ${data.startedAt}` : ''}${data.comment ? `, Comment: ${data.comment}` : ''}`;
      
      case 'play':
        return `Duration: ${data.minutes} min, Play Type: ${data.playType || data.activity}${data.startedAt ? `, Started: ${data.startedAt}` : ''}${data.comment ? `, Comment: ${data.comment}` : ''}`;
      
      case 'bark':
        const difficulty = data.difficulty || data.calm_down_difficulty;
        return `Time: ${data.time}, Period: ${data.period || 'N/A'}, Difficulty: ${difficulty}/5${data.before ? `, Before: ${data.before}` : ''}${data.after ? `, After: ${data.after}` : ''}`;
      
      case 'custom':
        return `Title: ${data.title}, Content: ${data.content || 'N/A'}${data.loggedAt ? `, Logged At: ${data.loggedAt}` : ''}`;
      
      case 'medication':
        return `Medication: ${data.medication_name}${data.amount ? `, Amount: ${data.amount}` : ''}${data.method ? `, Method: ${data.method}` : ''}${data.comment ? `, Comment: ${data.comment}` : ''}`;
      
      case 'consultation':
        return `Veterinarian: ${data.veterinarian || 'N/A'}${data.diagnosis ? `, Diagnosis: ${data.diagnosis}` : ''}${data.treatment ? `, Treatment: ${data.treatment}` : ''}${data.comment ? `, Comment: ${data.comment}` : ''}`;
      
      default:
        return JSON.stringify(data);
    }
  } catch {
    return String(logData);
  }
}

