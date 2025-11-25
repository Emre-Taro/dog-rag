import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { query } from './db';

// JWT secret key - in production, use environment variable
const JWT_SECRET: string = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN: string = process.env.JWT_EXPIRES_IN || '7d';

export interface User {
  id: number;
  userName: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthTokenPayload {
  userId: number;
  email: string;
}

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate a JWT token for a user
 */
export function generateToken(user: { id: number; email: string }): string {
  const payload: AuthTokenPayload = {
    userId: user.id,
    email: user.email,
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as any);
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token: string): AuthTokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthTokenPayload;
    return decoded;
  } catch (error) {
    return null;
  }
}

/**
 * Get user from database by ID
 */
export async function getUserById(userId: number): Promise<User | null> {
  try {
    const result = await query(
      'SELECT id, "userName", email, "createdAt", "updatedAt" FROM "User" WHERE id = $1',
      [userId]
    );
    if (result.rows.length === 0) {
      return null;
    }
    const row = result.rows[0];
    return {
      id: row.id,
      userName: row.userName,
      email: row.email,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    };
  } catch (error) {
    console.error('Error getting user by ID:', error);
    return null;
  }
}

/**
 * Get user from database by email
 */
export async function getUserByEmail(email: string): Promise<(User & { hashedPassword: string }) | null> {
  try {
    const result = await query(
      'SELECT id, "userName", email, "hashedPassword", "createdAt", "updatedAt" FROM "User" WHERE email = $1',
      [email]
    );
    if (result.rows.length === 0) {
      return null;
    }
    const row = result.rows[0];
    return {
      id: row.id,
      userName: row.userName,
      email: row.email,
      hashedPassword: row.hashedPassword,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    };
  } catch (error) {
    console.error('Error getting user by email:', error);
    return null;
  }
}

/**
 * Extract token from Authorization header
 */
export function extractTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader) {
    return null;
  }
  // Bearer token format: "Bearer <token>"
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }
  return parts[1];
}

/**
 * Get authenticated user from request
 * Returns null if not authenticated
 */
export async function getAuthenticatedUser(req: Request): Promise<User | null> {
  const authHeader = req.headers.get('Authorization');
  const token = extractTokenFromHeader(authHeader);
  
  if (!token) {
    return null;
  }

  const payload = verifyToken(token);
  if (!payload) {
    return null;
  }

  const user = await getUserById(payload.userId);
  return user;
}

/**
 * Get authenticated user ID from request
 * Returns null if not authenticated
 * This is a convenience function for getting just the user ID
 */
export async function getAuthenticatedUserId(req: Request): Promise<number | null> {
  const user = await getAuthenticatedUser(req);
  return user?.id || null;
}

/**
 * Require authentication - returns user ID and user object
 * Returns null if not authenticated (caller should handle the error response)
 * Use this in API routes that require authentication
 */
export async function requireAuth(req: Request): Promise<{ userId: number; user: User } | null> {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return null;
  }
  return { userId: user.id, user };
}

