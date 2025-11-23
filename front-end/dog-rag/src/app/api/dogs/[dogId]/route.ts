import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { validateDogProfile, ValidationError } from '@/lib/validation';
import { DogProfile } from '@/types';

// GET /api/dogs/[dogId] - Get a specific dog profile
export async function GET(_req: Request, { params }: { params: Promise<{ dogId: string }> }) {
  try {
    const { dogId } = await params;

    const result = await query(
      `SELECT 
        id, "ownerId", "dogName", gender, age, height, weight, breed, personality, 
        "stageOfTraining", "createdAt", "updatedAt"
      FROM "DogProfile" 
      WHERE id = $1`,
      [parseInt(dogId)]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Dog profile not found' },
        { status: 404 }
      );
    }

    const row = result.rows[0];
    const dog: DogProfile = {
      id: row.id,
      ownerId: row.ownerId,
      dogName: row.dogName,
      gender: row.gender ?? '',
      age: row.age ?? null,
      height: row.height ?? null,
      weight: row.weight ?? null,
      breed: row.breed ?? null,
      personality: row.personality ?? null,
      stageOfTraining: row.stageOfTraining,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    };

    return NextResponse.json({ success: true, data: dog });
  } catch (error) {
    console.error('Error fetching dog:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dog profile' },
      { status: 500 }
    );
  }
}

// PATCH /api/dogs/[dogId] - Update a dog profile
export async function PATCH(req: Request, { params }: { params: Promise<{ dogId: string }> }) {
  let updates: any;
  try {
    const { dogId } = await params;
    updates = await req.json();
    
    // Debug: log incoming updates
    console.log('[PATCH] Received updates:', JSON.stringify(updates, (key, value) => {
      if (typeof value === 'number' && isNaN(value)) return 'NaN';
      return value;
    }));

    // Check if dog exists
    const checkResult = await query('SELECT * FROM "DogProfile" WHERE id = $1', [parseInt(dogId)]);
    if (checkResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Dog profile not found' },
        { status: 404 }
      );
    }

    // Build update query dynamically based on provided fields
    const updateFields: string[] = [];
    const values: any[] = [];
    const valueFields: string[] = []; // Track which field each value corresponds to
    let paramIndex = 1;

    const allowedFields: Record<string, string> = {
      dogName: '"dogName"',
      gender: 'gender',
      age: 'age',
      height: 'height',
      weight: 'weight',
      breed: 'breed',
      personality: 'personality',
      stageOfTraining: '"stageOfTraining"',
    };
    
    // Helper function to normalize numeric values (convert NaN, empty strings to null)
    const normalizeNumericValue = (value: any, field: string): any => {
      const numericFields = ['age', 'height', 'weight'];
      if (numericFields.includes(field)) {
        // Handle null, undefined, empty string
        if (value === null || value === undefined || value === '') {
          console.log(`[PATCH] Normalizing ${field}: ${value} (null/undefined/empty) -> null`);
          return null;
        }
        // Handle string "NaN" (case-insensitive)
        if (typeof value === 'string' && (value === 'NaN' || value.toLowerCase() === 'nan')) {
          console.log(`[PATCH] Normalizing ${field}: "${value}" (string NaN) -> null`);
          return null;
        }
        // Handle NaN number value - check this BEFORE Number() conversion
        if (typeof value === 'number' && isNaN(value)) {
          console.log(`[PATCH] Normalizing ${field}: ${value} (number NaN) -> null`);
          return null;
        }
        // Try to convert to number
        const numValue = Number(value);
        // If conversion results in NaN, return null
        if (isNaN(numValue) || !isFinite(numValue)) {
          console.log(`[PATCH] Normalizing ${field}: ${value} -> null (converted to NaN or Infinity)`);
          return null;
        }
        console.log(`[PATCH] Normalizing ${field}: ${value} -> ${numValue}`);
        return numValue;
      }
      return value;
    };
    
    for (const [key, dbField] of Object.entries(allowedFields)) {
      if (updates[key] !== undefined) {
        updateFields.push(`${dbField} = $${paramIndex}`);
        const normalizedValue = normalizeNumericValue(updates[key], key);
        values.push(normalizedValue);
        valueFields.push(key); // Track which field this value is for
        paramIndex++;
      }
    }

    if (updateFields.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    // Build merged data for validation (convert DB column names to camelCase for validation)
    const currentData = {
      dogName: checkResult.rows[0].dogName,
      gender: checkResult.rows[0].gender ?? '',
      age: checkResult.rows[0].age,
      height: checkResult.rows[0].height,
      weight: checkResult.rows[0].weight,
      breed: checkResult.rows[0].breed,
      personality: checkResult.rows[0].personality,
      stageOfTraining: checkResult.rows[0].stageOfTraining,
    };
    // Normalize updates before merging for validation
    const normalizedUpdates: any = {};
    for (const [key, value] of Object.entries(updates)) {
      normalizedUpdates[key] = normalizeNumericValue(value, key);
    }
    const mergedData = { ...currentData, ...normalizedUpdates };
    
    try {
      validateDogProfile(mergedData);
    } catch (validationError) {
      if (validationError instanceof ValidationError) {
        return NextResponse.json(
          { success: false, error: validationError.message },
          { status: 400 }
        );
      }
      throw validationError;
    }

    // Final safety check: ensure no NaN values in the values array
    const sanitizedValues = values.map((val, idx) => {
      const fieldName = valueFields[idx];
      if (['age', 'height', 'weight'].includes(fieldName)) {
        // Check for NaN in multiple ways
        const isNaNValue = val === null || 
                          val === undefined || 
                          (typeof val === 'number' && (isNaN(val) || !isFinite(val))) ||
                          (typeof val === 'string' && (val === 'NaN' || val.toLowerCase() === 'nan'));
        
        if (isNaNValue) {
          console.log(`[PATCH] Final sanitization: ${fieldName} = ${val} -> null`);
          return null;
        }
        // Double-check: if it's a number, ensure it's valid
        if (typeof val === 'number' && (isNaN(val) || !isFinite(val))) {
          console.log(`[PATCH] Final sanitization (number check): ${fieldName} = ${val} -> null`);
          return null;
        }
      }
      // Final check for any NaN that might have slipped through
      if (typeof val === 'number' && isNaN(val)) {
        console.log(`[PATCH] Final sanitization (catch-all): ${fieldName || 'unknown'} = ${val} -> null`);
        return null;
      }
      return val;
    });

    // Debug: log values before query
    console.log('[PATCH] Values being sent to database:', sanitizedValues.map((val, idx) => ({
      field: valueFields[idx] || 'dogId',
      value: val,
      type: typeof val,
      isNaN: typeof val === 'number' ? isNaN(val) : false
    })));

    // Helper to absolutely ensure a value is not NaN
    const ensureNotNaN = (val: any, fieldName: string): any => {
      // Handle null/undefined
      if (val === null || val === undefined) {
        return null;
      }
      
      // Handle string "NaN" (case-insensitive)
      if (typeof val === 'string') {
        if (val === 'NaN' || val.toLowerCase() === 'nan' || val.trim() === '') {
          console.error(`[PATCH] Found string NaN/empty in ${fieldName}: "${val}"`);
          return null;
        }
      }
      
      // Handle number NaN
      if (typeof val === 'number') {
        if (isNaN(val) || !isFinite(val)) {
          console.error(`[PATCH] Found number NaN/Infinity in ${fieldName}: ${val}`);
          return null;
        }
        return val;
      }
      
      // Try to convert to number for numeric fields
      if (['age', 'height', 'weight'].includes(fieldName)) {
        const numVal = Number(val);
        if (isNaN(numVal) || !isFinite(numVal)) {
          console.error(`[PATCH] Found NaN after conversion in ${fieldName}: ${val} -> ${numVal}`);
          return null;
        }
        return numVal;
      }
      
      return val;
    };

    // ABSOLUTE FINAL CHECK: Filter out any NaN values one more time
    const finalValues = sanitizedValues.map((val, idx) => {
      const fieldName = valueFields[idx] || 'unknown';
      return ensureNotNaN(val, fieldName);
    });

    // Validate finalValues one more time - check every single value
    for (let i = 0; i < finalValues.length; i++) {
      const val = finalValues[i];
      const fieldName = i < valueFields.length ? valueFields[i] : (i === finalValues.length - 1 ? 'dogId' : 'unknown');
      
      if (['age', 'height', 'weight'].includes(fieldName)) {
        if (val !== null && (typeof val !== 'number' || isNaN(val) || !isFinite(val))) {
          console.error(`[PATCH] CRITICAL: Invalid value in finalValues[${i}] (${fieldName}):`, val, typeof val);
          finalValues[i] = null;
        }
      } else if (typeof val === 'number' && (isNaN(val) || !isFinite(val))) {
        console.error(`[PATCH] CRITICAL: NaN found in finalValues[${i}] (${fieldName}):`, val);
        finalValues[i] = null;
      }
    }

    finalValues.push(parseInt(dogId));
    
    // Log final values one more time with detailed inspection
    console.log('[PATCH] Final values array before query:');
    finalValues.forEach((val, idx) => {
      const fieldName = idx < valueFields.length ? valueFields[idx] : (idx === finalValues.length - 1 ? 'dogId' : 'unknown');
      console.log(`  [${idx}] ${fieldName}: ${val} (${typeof val}) - isNaN: ${typeof val === 'number' ? isNaN(val) : 'N/A'}`);
    });
    console.log('[PATCH] Update query fields:', updateFields);
    console.log('[PATCH] SQL will be:', `UPDATE "DogProfile" SET ${updateFields.join(', ')}, "updatedAt" = CURRENT_TIMESTAMP WHERE id = $${paramIndex}`);
    
    try {
      const result = await query(
        `UPDATE "DogProfile" 
         SET ${updateFields.join(', ')}, "updatedAt" = CURRENT_TIMESTAMP
         WHERE id = $${paramIndex}
         RETURNING id, "ownerId", "dogName", gender, age, height, weight, breed, personality, 
                   "stageOfTraining", "createdAt", "updatedAt"`,
        finalValues
      );

      const row = result.rows[0];
    const updatedDog: DogProfile = {
      id: row.id,
      ownerId: row.ownerId,
      dogName: row.dogName,
      gender: row.gender ?? '',
      age: row.age ?? null,
      height: row.height ?? null,
      weight: row.weight ?? null,
      breed: row.breed ?? null,
      personality: row.personality ?? null,
      stageOfTraining: row.stageOfTraining,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    };

      return NextResponse.json({ success: true, data: updatedDog });
    } catch (queryError) {
      // Log the exact values that caused the error
      console.error('[PATCH] Query error occurred. Final values were:', finalValues);
      console.error('[PATCH] Value details:', finalValues.map((val, idx) => ({
        index: idx,
        field: idx < valueFields.length ? valueFields[idx] : (idx === finalValues.length - 1 ? 'dogId' : 'unknown'),
        value: val,
        type: typeof val,
        isNaN: typeof val === 'number' ? isNaN(val) : 'N/A',
        stringified: JSON.stringify(val)
      })));
      throw queryError; // Re-throw to be caught by outer catch
    }
  } catch (error) {
    console.error('Error updating dog:', error);
    // Log the updates that were received
    if (updates) {
      console.error('[PATCH] Original updates received:', JSON.stringify(updates, (key, value) => {
        if (typeof value === 'number' && isNaN(value)) return 'NaN';
        return value;
      }));
    }
    if (error instanceof ValidationError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: 'Failed to update dog profile' },
      { status: 500 }
    );
  }
}

// DELETE /api/dogs/[dogId] - Delete a dog profile
export async function DELETE(_req: Request, { params }: { params: Promise<{ dogId: string }> }) {
  try {
    const { dogId } = await params;

    // Check if dog exists
    const checkResult = await query('SELECT id FROM "DogProfile" WHERE id = $1', [parseInt(dogId)]);
    if (checkResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Dog profile not found' },
        { status: 404 }
      );
    }

    await query('DELETE FROM "DogProfile" WHERE id = $1', [parseInt(dogId)]);

    return NextResponse.json({ success: true, message: 'Dog profile deleted successfully' });
  } catch (error) {
    console.error('Error deleting dog:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete dog profile' },
      { status: 500 }
    );
  }
}
