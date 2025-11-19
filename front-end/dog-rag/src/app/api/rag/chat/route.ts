import { NextResponse } from 'next/server';

const RAG_API_URL = process.env.RAG_API_URL || '';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    // Expecting { prompt: string, ... }
    if (!body || !body.prompt) {
      return NextResponse.json({ error: 'Missing prompt in request body' }, { status: 400 });
    }

    if (!RAG_API_URL) {
      // Placeholder response when no external RAG endpoint configured
      return NextResponse.json({ message: 'RAG endpoint not configured', prompt: body.prompt }, { status: 501 });
    }

    // Forward to external Python RAG service (if configured)
    const resp = await fetch(RAG_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await resp.text();
    // Pass through response (could be JSON or text depending on RAG service)
    return new NextResponse(data, { status: resp.status, headers: { 'Content-Type': resp.headers.get('content-type') || 'text/plain' } });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to call RAG endpoint', detail: String(err) }, { status: 500 });
  }
}
