// Helper for working with separate log tables
// Based on actual database structure: camelCase columns, no userId in log tables
import { LogType } from '@/types';
import { query } from '@/lib/db';

// Map log types to table names
export const LOG_TABLE_MAP: Record<LogType, string> = {
  toilet: 'ToiletLog',
  food: 'FoodLog',
  sleep: 'SleepLog',
  walk: 'WalkLog',
  play: 'PlayLog',
  bark: 'BarkLog',
  custom: 'CustomLog',
  medication: 'DogNote',
  consultation: 'DogNote',
};

export function getLogTableName(logType: LogType): string {
  return LOG_TABLE_MAP[logType];
}

// Get unique log table names
export function getUniqueLogTableNames(): string[] {
  return Array.from(new Set(Object.values(LOG_TABLE_MAP)));
}

// Find which table contains a log ID
export async function findLogTable(logId: string): Promise<{ table: string; logType: LogType } | null> {
  const id = parseInt(logId);
  if (isNaN(id)) {
    return null;
  }

  for (const [logType, tableName] of Object.entries(LOG_TABLE_MAP)) {
    try {
      const result = await query(`SELECT id FROM "${tableName}" WHERE id = $1 LIMIT 1`, [id]);
      if (result.rows.length > 0) {
        return { table: tableName, logType: logType as LogType };
      }
    } catch (error) {
      // Continue to next table if this one doesn't exist or has an error
      continue;
    }
  }
  return null;
}

