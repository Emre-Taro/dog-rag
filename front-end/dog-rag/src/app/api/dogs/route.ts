import { NextResponse } from 'next/server';

export async function GET() {
  // TODO: Replace with DB call
  return NextResponse.json({ message: 'List dogs (placeholder)', data: [] });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    // TODO: Create dog in DB
    return NextResponse.json({ message: 'Dog created (placeholder)', dog: body }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
}
