import { NextResponse } from 'next/server';

export async function GET() {
  // TODO: Replace with real summary aggregation
  return NextResponse.json({ message: 'Dashboard summary (placeholder)', summary: { totalRecords: 342, avgWalkMin: 45 } });
}
