import { NextResponse } from 'next/server';

export async function GET() {
  // TODO: Replace with real stats
  return NextResponse.json({ message: 'Dashboard stats (placeholder)', stats: { weeklyActivity: [1,2,3,4,5,6,7] } });
}
