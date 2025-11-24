import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';

// GET /api/auth/me - Get current authenticated user
export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        userName: user.userName,
        email: user.email,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error: any) {
    console.error('Error getting current user:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get user' },
      { status: 500 }
    );
  }
}

