import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { validateLogData, ValidationError } from '@/lib/validation';
import { DogLog, LogType, LogFilter } from '@/types';
import { requireAuth } from '@/lib/auth';
import { getLogTableName, LOG_TABLE_MAP } from '@/lib/log-tables-simple';

// GET /api/logs - Get logs with optional filters
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    
    // Require authentication
    const auth = await requireAuth(req);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }
    const userId = auth.userId;
    const dogId = searchParams.get('dog_id') || null;
    const logType = searchParams.get('log_type') as LogType | null;
    const startDate = searchParams.get('start_date') || null;
    const endDate = searchParams.get('end_date') || null;
    const search = searchParams.get('search') || null;
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build UNION query for all log tables
    // Note: Log tables don't have userId column, so we filter by dogId and check dog's ownerId
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
            t."createdAt" as created_at,
            NULL::timestamp(3) as updated_at
          FROM "${table}" t
          ${baseConditions.length > 0 ? `WHERE ${baseConditions.join(' AND ')}` : ''}
        `;
        unions.push(select);
      });
    });

    // Filter by user through DogProfile join
    const finalConditions: string[] = [];
    if (!dogId) {
      // If no dogId filter, we need to join with DogProfile to filter by ownerId
      finalConditions.push(`"dogId" IN (SELECT id FROM "DogProfile" WHERE "ownerId" = $${paramIndex})`);
      allParams.push(userId);
      paramIndex++;
    } else {
      // If dogId is specified, verify it belongs to the user
      // dogId is already in allParams at index 1, so we reference it
      finalConditions.push(`"dogId" IN (SELECT id FROM "DogProfile" WHERE id = $1 AND "ownerId" = $${paramIndex})`);
      allParams.push(userId);
      paramIndex++;
    }

    if (search) {
      // Map Japanese log type names to English log types for search
      const logTypeMap: Record<string, string> = {
        '排泄': 'toilet',
        '食事': 'food',
        '睡眠': 'sleep',
        '散歩': 'walk',
        '遊び': 'play',
        '吠える': 'bark',
        'カスタム': 'custom',
        '投薬': 'medication',
        '診察': 'consultation',
      };
      
      // Check if search query contains Japanese log type names
      const matchedLogTypes: string[] = [];
      
      // Check for Japanese log type names in search query
      Object.entries(logTypeMap).forEach(([japanese, english]) => {
        if (search.includes(japanese)) {
          matchedLogTypes.push(english);
        }
      });
      
      // Also check for English log type names
      const searchLower = search.toLowerCase();
      Object.values(logTypeMap).forEach(english => {
        if (searchLower.includes(english) && !matchedLogTypes.includes(english)) {
          matchedLogTypes.push(english);
        }
      });
      
      // Build search condition: search in log_type (with English mapping) and log_data
      if (matchedLogTypes.length > 0) {
        const logTypeConditions = matchedLogTypes.map((_, idx) => `log_type = $${paramIndex + idx}`).join(' OR ');
        finalConditions.push(`(${logTypeConditions} OR log_data::text ILIKE $${paramIndex + matchedLogTypes.length})`);
        matchedLogTypes.forEach(type => allParams.push(type));
        allParams.push(`%${search}%`);
        paramIndex += matchedLogTypes.length + 1;
      } else {
        // No log type match, search in both log_type and log_data
        finalConditions.push(`(log_type ILIKE $${paramIndex} OR log_data::text ILIKE $${paramIndex})`);
        allParams.push(`%${search}%`);
        paramIndex++;
      }
    }

    // Add limit and offset
    allParams.push(limit, offset);

    const unionQuery = unions.join(' UNION ALL ');
    const finalQuery = `
      SELECT * FROM (
        ${unionQuery}
      ) unified_logs
      WHERE ${finalConditions.join(' AND ')}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    console.log('[GET /api/logs] Final SQL query:', finalQuery);
    console.log('[GET /api/logs] Base conditions:', baseConditions);
    console.log('[GET /api/logs] Final conditions:', finalConditions);
    console.log('[GET /api/logs] Executing query with params:', {
      paramCount: allParams.length,
      params: allParams.map((p, i) => ({ index: i + 1, value: p, type: typeof p })),
    });
    
    const result = await query(finalQuery, allParams);

    console.log('[GET /api/logs] Query result:', {
      rowCount: result.rows.length,
      firstRow: result.rows[0] ? {
        id: result.rows[0].id,
        dogId: result.rows[0].dogId,
        log_type: result.rows[0].log_type,
        created_at: result.rows[0].created_at,
      } : null,
    });

    // Get userId from DogProfile for each log (batch query for efficiency)
    const dogIds = [...new Set(result.rows.map(row => row.dogId))];
    const dogOwners = await query(
      `SELECT id, "ownerId" FROM "DogProfile" WHERE id = ANY($1::int[])`,
      [dogIds]
    );
    const ownerMap = new Map(dogOwners.rows.map(row => [row.id, row.ownerId]));
    
    const logs: DogLog[] = result.rows.map((row) => {
      const ownerId = ownerMap.get(parseInt(String(row.dogId))) || userId; // fallback to query param userId
      
      return {
        id: String(row.id),
        dogId: String(row.dogId),
        userId: String(ownerId),
        log_type: row.log_type as LogType,
        log_data: row.log_data,
        created_at: new Date(row.created_at),
        updated_at: row.updated_at ? new Date(row.updated_at) : new Date(row.created_at), // fallback to createdAt
      };
    });

    console.log('[GET /api/logs] Returning logs:', {
      count: logs.length,
      logs: logs.map(log => ({
        id: log.id,
        type: log.log_type,
        createdAt: log.created_at.toISOString(),
      })),
    });

    return NextResponse.json({ success: true, data: logs });
  } catch (error) {
    console.error('Error fetching logs:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch logs' },
      { status: 500 }
    );
  }
}

// POST /api/logs - Create a new log entry
export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Validate required fields
    if (!body.dogId && !body.dog_id || !body.log_type || !body.log_data) {
      return NextResponse.json(
        { success: false, error: 'dogId (or dog_id), log_type, and log_data are required' },
        { status: 400 }
      );
    }
    
    // Support both dogId and dog_id for backward compatibility
    const dogId = body.dogId || body.dog_id;

    // Validate log data based on type
    try {
      validateLogData(body.log_type, body.log_data);
    } catch (validationError) {
      if (validationError instanceof ValidationError) {
        return NextResponse.json(
          { success: false, error: validationError.message },
          { status: 400 }
        );
      }
      throw validationError;
    }

    // Require authentication
    const auth = await requireAuth(req);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }
    const userId = auth.userId;

    // Check if dog exists and belongs to user
    const dogCheck = await query('SELECT id, "ownerId" FROM "DogProfile" WHERE id = $1 AND "ownerId" = $2', [
      parseInt(dogId),
      userId,
    ]);
    if (dogCheck.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Dog profile not found or access denied' },
        { status: 404 }
      );
    }

    // Get the correct table name for this log type
    const tableName = getLogTableName(body.log_type);
    const logData = body.log_data;
    
    // Check for duplicate entries (same log type and similar time)
    // Different tables use different time column names:
    // - 'time' (ToiletLog, BarkLog)
    // - 'startedAt' (SleepLog, WalkLog, PlayLog)
    // - 'loggedAt' (CustomLog)
    const timeColumn = logData.time ? 'time' : (logData.startedAt ? 'startedAt' : (logData.loggedAt ? 'loggedAt' : null));
    const timeValue = logData.time || logData.startedAt || logData.loggedAt;
    
    if (timeColumn && timeValue) {
      try {
        const duplicateCheck = await query(
          `SELECT id FROM "${tableName}" 
           WHERE "dogId" = $1 
           AND "${timeColumn}" BETWEEN $2::timestamp - INTERVAL '5 minutes' 
           AND $2::timestamp + INTERVAL '5 minutes'`,
          [parseInt(dogId), timeValue]
        );
        if (duplicateCheck.rows.length > 0) {
          return NextResponse.json(
            {
              success: false,
              error: 'Similar log entry already exists within 5 minutes. Please edit or delete the existing entry.',
              duplicate_id: duplicateCheck.rows[0].id,
            },
            { status: 409 }
          );
        }
      } catch (error) {
        console.warn('Duplicate check failed, continuing:', error);
      }
    }

    // Build INSERT query based on actual table structure
    // Each table has different columns, so we need to map log_data fields to table columns
    const columns = ['dogId', ...Object.keys(logData)];
    const values = [parseInt(dogId), ...Object.values(logData)];
    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
    
    // Build column list - all camelCase columns need quotes in PostgreSQL
    const columnList = columns.map(col => {
      // All camelCase columns need quotes
      return `"${col}"`;
    }).join(', ');

    const result = await query(
      `INSERT INTO "${tableName}" (${columnList}, "createdAt")
       VALUES (${placeholders}, CURRENT_TIMESTAMP)
       RETURNING id, "dogId", "createdAt", *`,
      values
    );

    // Extract log_data from the row (all columns except common ones)
    const row = result.rows[0];
    const commonFields = ['id', 'dogId', 'createdAt'];
    const logDataFields: any = {};
    Object.keys(row).forEach(key => {
      if (!commonFields.includes(key)) {
        logDataFields[key] = row[key];
      }
    });

    const newLog: DogLog = {
      id: String(row.id),
      dogId: String(row.dogId),
      userId: String(userId),
      log_type: body.log_type,
      log_data: logDataFields,
      created_at: new Date(row.createdAt),
      updated_at: new Date(row.createdAt), // Most log tables don't have updatedAt
    };

    console.log('[POST /api/logs] Log created successfully:', {
      id: newLog.id,
      dogId: newLog.dogId,
      logType: newLog.log_type,
      createdAt: newLog.created_at.toISOString(),
    });

    return NextResponse.json({ success: true, data: newLog }, { status: 201 });
  } catch (error) {
    console.error('Error creating log:', error);
    if (error instanceof ValidationError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: 'Failed to create log entry' },
      { status: 500 }
    );
  }
}
