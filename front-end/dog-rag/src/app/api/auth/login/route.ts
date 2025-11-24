import { NextResponse } from 'next/server';
import { getUserByEmail, verifyPassword, generateToken } from '@/lib/auth';

// POST /api/auth/login - Login user
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = body;

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Get user by email
    const user = await getUserByEmail(email);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.hashedPassword);
    if (!isValidPassword) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Generate token
    const token = generateToken({ id: user.id, email: user.email });

    return NextResponse.json({
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
    });
  } catch (error: any) {
    console.error('Error logging in user:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to login' },
      { status: 500 }
    );
  }
}

