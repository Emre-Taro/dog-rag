import { NextResponse } from 'next/server';

export async function GET(_req: Request, { params }: { params: { dogId: string } }) {
  const { dogId } = params;
  // TODO: Fetch dog by ID from DB
  return NextResponse.json({ message: 'Get dog (placeholder)', dogId });
}

export async function PATCH(req: Request, { params }: { params: { dogId: string } }) {
  const { dogId } = params;
  try {
    const updates = await req.json();
    // TODO: Apply updates in DB
    return NextResponse.json({ message: 'Updated dog (placeholder)', dogId, updates });
  } catch (err) {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { dogId: string } }) {
  const { dogId } = params;
  // TODO: Delete dog in DB
  return NextResponse.json({ message: 'Deleted (placeholder)', dogId });
}
