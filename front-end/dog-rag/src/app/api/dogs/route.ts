import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { validateDogProfile, ValidationError } from '@/lib/validation';
import { DogProfile } from '@/types';
import { requireAuth } from '@/lib/auth';

// GET /api/dogs - List all dogs for the current user
export async function GET(req: Request) {
  try {
    console.log('[GET /api/dogs] Request received');
    
    // Require authentication
    const auth = await requireAuth(req);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }
    const userId = auth.userId;
    console.log('[GET /api/dogs] userId:', userId);

    const result = await query(
      `SELECT 
        id, "ownerId", "dogName", gender, age, height, weight, breed, personality, 
        "stageOfTraining", "createdAt", "updatedAt"
      FROM "DogProfile" 
      WHERE "ownerId" = $1 
      ORDER BY "createdAt" DESC`,
      [userId]
    );

    const dogs: DogProfile[] = result.rows.map((row) => ({
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
    }));

    console.log('[GET /api/dogs] Returning', dogs.length, 'dogs');
    return NextResponse.json({ success: true, data: dogs });
  } catch (error) {
    console.error('Error fetching dogs:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dogs' },
      { status: 500 }
    );
  }
}

// POST /api/dogs - Create a new dog profile
export async function POST(req: Request) {
  try {
    console.log('[POST /api/dogs] Request received');
    const body = await req.json();
    console.log('[POST /api/dogs] Request body:', JSON.stringify(body));
    
    // Validate input data
    try {
      validateDogProfile(body);
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
    const ownerId = auth.userId;
    
    // Extract field names (support both camelCase and snake_case)
    const dogName = body.dogName || body.dog_name;
    const stageOfTraining = body.stageOfTraining || body.stage_of_training;
    
    // stageOfTraining is required in database
    if (!stageOfTraining) {
      return NextResponse.json(
        { success: false, error: 'stageOfTraining is required' },
        { status: 400 }
      );
    }

    // Helper function to normalize numeric values (convert NaN, empty strings to null)
    const normalizeNumericValue = (value: any): any => {
      if (value === '' || value === null || value === undefined || isNaN(Number(value))) {
        return null;
      }
      return Number(value);
    };

    const result = await query(
      `INSERT INTO "DogProfile" 
      ("ownerId", "dogName", "gender", "age", "height", "weight", "breed", "personality", "stageOfTraining", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
        RETURNING
          "id", "ownerId", "dogName", "gender", "age", "height", "weight", "breed", "personality",
          "stageOfTraining", "createdAt", "updatedAt"
        `,
        [
          ownerId,
          body.dogName ?? body.dog_name,
          body.gender || null,
          normalizeNumericValue(body.age),
          normalizeNumericValue(body.height),
          normalizeNumericValue(body.weight),
          body.breed ?? null,
          body.personality ?? null,
          stageOfTraining, // ← PUPPY / BASIC / INTERMEDIATE / ADVANCED / OTHER
        ]

    );

    const row = result.rows[0];
    const newDog: DogProfile = {
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

    console.log('[POST /api/dogs] Dog created successfully:', newDog.id);
    return NextResponse.json({ success: true, data: newDog }, { status: 201 });
  } catch (error) {
    console.error('Error creating dog:', error);
    if (error instanceof ValidationError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: 'Failed to create dog profile' },
      { status: 500 }
    );
  }
}
