// Helper functions for working with separate log tables
import { LogType } from '@/types';

// Map log types to table names
export const LOG_TABLE_MAP: Record<LogType, string> = {
  toilet: 'ToiletLog',
  food: 'FoodLog',
  sleep: 'SleepLog',
  walk: 'WalkLog',
  play: 'PlayLog',
  bark: 'BarkLog',
  custom: 'CustomLog',
  medication: 'DogNote', // Assuming medication uses DogNote table
  consultation: 'DogNote', // Assuming consultation uses DogNote table
};

// Get table name for a log type
export function getLogTableName(logType: LogType): string {
  return LOG_TABLE_MAP[logType];
}

// Get all log table names
export function getAllLogTableNames(): string[] {
  return Object.values(LOG_TABLE_MAP);
}

// Get unique log table names (in case multiple types share a table)
export function getUniqueLogTableNames(): string[] {
  return Array.from(new Set(Object.values(LOG_TABLE_MAP)));
}

// Build a UNION query to get logs from all tables
// Note: This assumes tables have columns: id, dogId (or dog_id), userId (or user_id), 
// createdAt (or created_at), updatedAt (or updated_at), plus type-specific columns
export function buildUnifiedLogsQuery(
  whereConditions: string[],
  params: any[],
  limit?: number,
  offset?: number
): string {
  const tables = getUniqueLogTableNames();
  const unions: string[] = [];

  tables.forEach((table) => {
    // Find all log types that use this table
    const logTypes = Object.entries(LOG_TABLE_MAP)
      .filter(([_, tableName]) => tableName === table)
      .map(([logType]) => logType);
    
    logTypes.forEach((logType) => {
      // Build SELECT for each table
      // Try both camelCase and snake_case column names
      // Adjust based on your actual schema
      const select = `
        SELECT 
          id,
          COALESCE("dogId", dog_id) as dog_id,
          COALESCE("userId", user_id) as user_id,
          '${logType}'::text as log_type,
          to_jsonb(t.*) as log_data,
          COALESCE("createdAt", created_at) as created_at,
          COALESCE("updatedAt", updated_at) as updated_at
        FROM "${table}" t
      `;
      
      unions.push(select);
    });
  });

  const unionQuery = unions.join(' UNION ALL ');
  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
  const orderBy = 'ORDER BY created_at DESC';
  
  let finalParams = [...params];
  if (limit !== undefined) {
    finalParams.push(limit);
  }
  if (offset !== undefined) {
    finalParams.push(offset);
  }
  
  const limitClause = limit !== undefined ? `LIMIT $${params.length + 1}` : '';
  const offsetClause = offset !== undefined ? `OFFSET $${params.length + (limit !== undefined ? 2 : 1)}` : '';

  return `
    SELECT * FROM (
      ${unionQuery}
    ) unified_logs
    ${whereClause}
    ${orderBy}
    ${limitClause}
    ${offsetClause}
  `;
}

// Helper to find which table a log ID belongs to
export async function findLogTable(query: any, logId: string): Promise<{ table: string; logType: LogType } | null> {
  for (const [logType, tableName] of Object.entries(LOG_TABLE_MAP)) {
    try {
      const result = await query(`SELECT id FROM "${tableName}" WHERE id = $1`, [logId]);
      if (result.rows.length > 0) {
        return { table: tableName, logType: logType as LogType };
      }
    } catch (error) {
      // Table might not exist or have different structure, continue
      continue;
    }
  }
  return null;
}

