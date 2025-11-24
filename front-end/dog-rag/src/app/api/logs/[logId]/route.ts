import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { validateLogData, ValidationError } from '@/lib/validation';
import { DogLog, LogType } from '@/types';
import { findLogTable, getLogTableName } from '@/lib/log-tables-simple';

// PATCH /api/logs/[logId] - Update a log entry
export async function PATCH(req: Request, { params }: { params: Promise<{ logId: string }> }) {
  const startTime = Date.now();
  try {
    const { logId } = await params;
    console.log('[PATCH] ===== PATCH /api/logs/:id called =====');
    console.log('[PATCH] Log ID:', logId);
    console.log('[PATCH] Request URL:', req.url);
    
    const updates = await req.json();
    console.log('[PATCH] Request body received:', JSON.stringify(updates, null, 2));

    // Determine log type and table name
    // Priority: 1) log_type from request, 2) find from database
    let logType: LogType | null = null;
    let tableName: string | null = null;

    if (updates.log_type) {
      logType = updates.log_type as LogType;
      tableName = getLogTableName(logType);
      console.log('[PATCH] Using log_type from request:', logType, '-> table:', tableName);
    }

    // If not provided in request, find from database
    if (!tableName) {
      const logInfo = await findLogTable(logId);
      if (!logInfo) {
        return NextResponse.json(
          { success: false, error: 'Log entry not found' },
          { status: 404 }
        );
      }
      tableName = logInfo.table;
      logType = logInfo.logType;
      console.log('[PATCH] Found log in database:', logType, '-> table:', tableName);
    }

    // Get existing log
    const checkResult = await query(`SELECT * FROM "${tableName}" WHERE id = $1`, [parseInt(logId)]);
    if (checkResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Log entry not found' },
        { status: 404 }
      );
    }

    const existingLog = checkResult.rows[0];
    const existingColumns = Object.keys(existingLog);
    console.log('[PATCH] Existing log columns:', existingColumns);
    console.log('[PATCH] Existing log data:', JSON.stringify(existingLog, null, 2));

    // If log_data is being updated, validate it (but allow extra fields that will be skipped)
    if (updates.log_data && logType) {
      try {
        // Only validate required fields - extra fields will be skipped later
        validateLogData(logType, updates.log_data);
      } catch (validationError) {
        // If validation fails, we'll still try to update valid fields
        // Only return error if it's a critical validation issue
        if (validationError instanceof ValidationError) {
          console.warn('[PATCH] Validation warning:', validationError.message);
          // Continue processing - invalid fields will be skipped
        } else {
          throw validationError;
        }
      }
    }

    // Build update query - update individual columns from log_data
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    // Field name mapping: frontend field names -> database column names
    // This handles cases where frontend uses camelCase but DB uses snake_case or different names
    // Note: FoodLog uses camelCase columns (mealType, amountGrams, eatenAmount), so no mapping needed
    const fieldMapping: Record<string, Record<string, string>> = {
      'BarkLog': {
        'difficulty': 'calm_down_difficulty', // Frontend: difficulty, DB: calm_down_difficulty
      },
      // FoodLog uses camelCase columns: mealType, amountGrams, eatenAmount, time, comment
      // No mapping needed - frontend field names match DB column names
      'SleepLog': {
        // SleepLog doesn't have 'time' column, only 'startedAt'
        // If 'time' is sent, it should be ignored or mapped to 'startedAt' if that's the intent
      },
    };

    // Update individual fields from log_data
    if (updates.log_data) {
      console.log('[PATCH] Updating log_data:', JSON.stringify(updates.log_data));
      console.log('[PATCH] Table:', tableName);
      console.log('[PATCH] Existing columns:', existingColumns);
      
      Object.entries(updates.log_data).forEach(([key, value]) => {
        // Map field name to database column name if mapping exists
        const tableMapping = fieldMapping[tableName] || {};
        let dbColumnName = tableMapping[key] || key;
        
        // Special handling for SleepLog: 'time' column doesn't exist, use 'startedAt' instead
        if (tableName === 'SleepLog' && key === 'time' && !existingColumns.includes('time')) {
          console.log(`[PATCH] SleepLog: 'time' field not found, mapping to 'startedAt'`);
          dbColumnName = 'startedAt';
        }
        
        // Check if the column actually exists in the table
        // Use case-insensitive comparison for column names
        const columnExists = existingColumns.some(col => 
          col.toLowerCase() === dbColumnName.toLowerCase() || 
          col === dbColumnName
        );
        
        if (!columnExists) {
          console.warn(`[PATCH] Column '${dbColumnName}' (from field '${key}') does not exist in table '${tableName}'. Skipping.`);
          console.warn(`[PATCH] Available columns: ${existingColumns.join(', ')}`);
          return; // Skip this field - no error, just skip
        }
        
        // Skip common fields that shouldn't be updated directly
        if (['id', 'dogId', 'createdAt'].includes(dbColumnName.toLowerCase())) {
          console.warn(`[PATCH] Skipping protected field: ${dbColumnName}`);
          return;
        }
        
        // All camelCase columns need quotes in PostgreSQL
        // snake_case columns typically don't need quotes, but we'll quote them for safety
        // Reserved words and camelCase always need quotes
        const isCamelCase = dbColumnName !== dbColumnName.toLowerCase() && 
                           dbColumnName[0] === dbColumnName[0].toLowerCase();
        const isReservedWord = ['time', 'period', 'before', 'after', 'comment'].includes(dbColumnName.toLowerCase());
        const needsQuotes = isCamelCase || isReservedWord || dbColumnName.includes('_');
        const columnName = needsQuotes ? `"${dbColumnName}"` : dbColumnName;
        
        updateFields.push(`${columnName} = $${paramIndex}`);
        values.push(value);
        console.log(`[PATCH] Adding field: ${key} -> ${dbColumnName} -> ${columnName} = ${value} (type: ${typeof value})`);
        paramIndex++;
      });
    }

    // If no fields to update, return existing log (no-op is OK)
    if (updateFields.length === 0) {
      console.log('[PATCH] No valid fields to update, returning existing log (no-op)');
      
      // Return existing log data
      const commonFields = ['id', 'dogId', 'createdAt'];
      const logDataFields: any = {};
      Object.keys(existingLog).forEach(key => {
        if (!commonFields.includes(key)) {
          logDataFields[key] = existingLog[key];
        }
      });

      // Get userId from DogProfile
      const dogResult = await query('SELECT "ownerId" FROM "DogProfile" WHERE id = $1', [existingLog.dogId]);
      const userId = dogResult.rows[0]?.ownerId;

      if (!logType) {
        return NextResponse.json(
          { success: false, error: 'Unable to determine log type' },
          { status: 400 }
        );
      }

      const existingLogResponse: DogLog = {
        id: String(existingLog.id),
        dogId: String(existingLog.dogId),
        userId: String(userId),
        log_type: logType,
        log_data: logDataFields,
        created_at: new Date(existingLog.createdAt),
        updated_at: new Date(existingLog.createdAt),
      };

      return NextResponse.json({ success: true, data: existingLogResponse }, { status: 200 });
    }

    values.push(parseInt(logId));
    
    const updateQuery = `UPDATE "${tableName}" 
       SET ${updateFields.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING id, "dogId", "createdAt", *`;
    
    console.log('[PATCH] Update query:', updateQuery);
    console.log('[PATCH] Values:', values);
    console.log('[PATCH] Table:', tableName);
    console.log('[PATCH] Log ID:', logId);
    console.log('[PATCH] Dog ID:', existingLog.dogId);
    console.log('[PATCH] Update fields count:', updateFields.length);
    console.log('[PATCH] Update fields:', updateFields);
    
    const result = await query(updateQuery, values);
    
    // Check row count
    const rowCount = result.rowCount || 0;
    console.log('[PATCH] UPDATE executed. Row count:', rowCount);
    
    if (rowCount === 0) {
      console.error('[PATCH] WARNING: UPDATE affected 0 rows!');
      console.error('[PATCH] Details:', {
        tableName,
        logId,
        dogId: existingLog.dogId,
        updateFields,
        values,
        whereClause: `id = $${paramIndex}`,
        whereValue: parseInt(logId),
      });
      
      // Verify the log still exists
      const verifyResult = await query(`SELECT id, "dogId" FROM "${tableName}" WHERE id = $1`, [parseInt(logId)]);
      if (verifyResult.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Log entry not found (may have been deleted)' },
          { status: 404 }
        );
      } else {
        console.error('[PATCH] Log entry exists but UPDATE did not affect any rows. Possible causes:');
        console.error('[PATCH] - WHERE clause condition not matching');
        console.error('[PATCH] - Data type mismatch');
        console.error('[PATCH] - Constraint violation');
        console.error('[PATCH] - Values are the same as existing values (no actual change)');
      }
    }
    
    if (result.rows.length === 0) {
      // UPDATE succeeded but RETURNING didn't return a row (shouldn't happen with RETURNING *)
      console.error('[PATCH] ERROR: UPDATE succeeded but RETURNING clause returned no rows');
      return NextResponse.json(
        { success: false, error: 'Update succeeded but could not retrieve updated data' },
        { status: 500 }
      );
    }

    if (!logType) {
      return NextResponse.json(
        { success: false, error: 'Unable to determine log type' },
        { status: 400 }
      );
    }

    // Extract log_data (all columns except common ones)
    const row = result.rows[0];
    const commonFields = ['id', 'dogId', 'createdAt'];
    const logDataFields: any = {};
    Object.keys(row).forEach(key => {
      if (!commonFields.includes(key)) {
        logDataFields[key] = row[key];
      }
    });

    // Get userId from DogProfile
    const dogResult = await query('SELECT "ownerId" FROM "DogProfile" WHERE id = $1', [row.dogId]);
    const userId = dogResult.rows[0]?.ownerId;

    const updatedLog: DogLog = {
      id: String(row.id),
      dogId: String(row.dogId),
      userId: String(userId),
      log_type: logType,
      log_data: logDataFields,
      created_at: new Date(row.createdAt),
      updated_at: new Date(row.createdAt), // Most tables don't have updatedAt
    };

    const duration = Date.now() - startTime;
    console.log('[PATCH] ===== PATCH /api/logs/:id completed successfully =====');
    console.log('[PATCH] Duration:', duration, 'ms');
    return NextResponse.json({ success: true, data: updatedLog });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('[PATCH] ===== PATCH /api/logs/:id ERROR =====');
    console.error('[PATCH] Duration:', duration, 'ms');
    console.error('Error updating log:', error);
    console.error('Error details:', {
      message: error?.message,
      code: error?.code,
      detail: error?.detail,
      where: error?.where,
    });
    if (error instanceof ValidationError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update log entry',
        details: error?.message || error?.detail || 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// DELETE /api/logs/[logId] - Delete a log entry
export async function DELETE(req: Request, { params }: { params: Promise<{ logId: string }> }) {
  try {
    const { logId } = await params;
    const { searchParams } = new URL(req.url);
    const logType = searchParams.get('log_type') as LogType | null;

    let tableName: string;
    
    // If log_type is provided, use it to get the correct table directly
    if (logType && getLogTableName(logType)) {
      tableName = getLogTableName(logType);
    } else {
      // Otherwise, search all tables
      const logInfo = await findLogTable(logId);
      
      if (!logInfo) {
        return NextResponse.json(
          { success: false, error: 'Log entry not found' },
          { status: 404 }
        );
      }
      tableName = logInfo.table;
    }

    // Check if log exists
    const checkResult = await query(`SELECT id FROM "${tableName}" WHERE id = $1`, [parseInt(logId)]);
    
    if (checkResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Log entry not found' },
        { status: 404 }
      );
    }

    await query(`DELETE FROM "${tableName}" WHERE id = $1`, [parseInt(logId)]);

    return NextResponse.json({ success: true, message: 'Log entry deleted successfully' });
  } catch (error) {
    console.error('Error deleting log:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete log entry' },
      { status: 500 }
    );
  }
}
