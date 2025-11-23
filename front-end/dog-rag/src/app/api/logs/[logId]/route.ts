import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { validateLogData, ValidationError } from '@/lib/validation';
import { DogLog, LogType } from '@/types';
import { findLogTable, getLogTableName } from '@/lib/log-tables-simple';

// PATCH /api/logs/[logId] - Update a log entry
export async function PATCH(req: Request, { params }: { params: Promise<{ logId: string }> }) {
  try {
    const { logId } = await params;
    const updates = await req.json();

    // Find which table contains this log
    const logInfo = await findLogTable(logId);
    if (!logInfo) {
      return NextResponse.json(
        { success: false, error: 'Log entry not found' },
        { status: 404 }
      );
    }

    const { table: tableName, logType } = logInfo;

    // Get existing log
    const checkResult = await query(`SELECT * FROM "${tableName}" WHERE id = $1`, [parseInt(logId)]);
    if (checkResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Log entry not found' },
        { status: 404 }
      );
    }

    const existingLog = checkResult.rows[0];

    // If log_data is being updated, validate it
    if (updates.log_data) {
      const updateLogType = updates.log_type || logType;
      try {
        validateLogData(updateLogType, updates.log_data);
      } catch (validationError) {
        if (validationError instanceof ValidationError) {
          return NextResponse.json(
            { success: false, error: validationError.message },
            { status: 400 }
          );
        }
        throw validationError;
      }
    }

    // Build update query - update individual columns from log_data
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    // Update individual fields from log_data
    if (updates.log_data) {
      console.log('[PATCH] Updating log_data:', JSON.stringify(updates.log_data));
      console.log('[PATCH] Table:', tableName);
      
      Object.entries(updates.log_data).forEach(([key, value]) => {
        // All camelCase columns need quotes in PostgreSQL
        const columnName = `"${key}"`;
        updateFields.push(`${columnName} = $${paramIndex}`);
        values.push(value);
        console.log(`[PATCH] Adding field: ${columnName} = ${value}`);
        paramIndex++;
      });
    }

    if (updateFields.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    values.push(parseInt(logId));
    
    const updateQuery = `UPDATE "${tableName}" 
       SET ${updateFields.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING id, "dogId", "createdAt", *`;
    
    console.log('[PATCH] Update query:', updateQuery);
    console.log('[PATCH] Values:', values);
    
    const result = await query(updateQuery, values);

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

    return NextResponse.json({ success: true, data: updatedLog });
  } catch (error: any) {
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
