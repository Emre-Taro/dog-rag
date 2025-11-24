import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { hashPassword, generateToken } from '@/lib/auth';

// POST /api/auth/register - Register a new user
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userName, email, password } = body;

    // Validate input
    if (!userName || !email || !password) {
      return NextResponse.json(
        { success: false, error: 'userName, email, and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await query('SELECT id FROM "User" WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const result = await query(
      `INSERT INTO "User" ("userName", email, "hashedPassword", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING id, "userName", email, "createdAt", "updatedAt"`,
      [userName, email, hashedPassword]
    );

    const user = result.rows[0];

    // Generate token
    const token = generateToken({ id: user.id, email: user.email });

    return NextResponse.json(
      {
        success: true,
        data: {
          user: {
            id: user.id,
            userName: user.userName,
            email: user.email,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
          },
          token,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error registering user:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to register user' },
      { status: 500 }
    );
  }
}

