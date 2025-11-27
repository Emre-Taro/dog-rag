import { NextResponse } from 'next/server';

const RAG_API_URL = process.env.RAG_API_URL || '';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    // Expecting { prompt: string, dogId: number, weeklyData?: any }
    if (!body || !body.prompt) {
      return NextResponse.json({ error: 'Missing prompt in request body' }, { status: 400 });
    }

    if (!RAG_API_URL) {
      // Placeholder response when no external RAG endpoint configured
      // If weeklyData is provided, format it for the response
      let responseMessage = 'RAG endpoint not configured';
      if (body.weeklyData && body.weeklyData.weeks) {
        const weeksCount = body.weeklyData.weeks.length;
        responseMessage = `RAG endpoint not configured. ${weeksCount} weeks of data were provided, but the RAG service is not configured and cannot be processed.`;
      }
      return NextResponse.json(
        {
          message: responseMessage,
          prompt: body.prompt,
          weeklyDataProvided: !!body.weeklyData,
        },
        { status: 501 }
      );
    }

    // Format weekly data for RAG context if provided
    let ragContext = '';
    if (body.weeklyData && body.weeklyData.weeks) {
      ragContext = '\n\n=== Weekly Summary Data ===\n';
      body.weeklyData.weeks.forEach((week: any, index: number) => {
        ragContext += `\n[Week ${index + 1}: ${week.weekStart} ~ ${week.weekEnd}]\n`;
        ragContext += `Summary: ${week.summaryText || 'No summary'}\n`;
        if (week.timelineJson && week.timelineJson.entries) {
          ragContext += `Text entries: ${week.timelineJson.entries.length}\n`;
          // Include first few text entries as samples
          const sampleEntries = week.timelineJson.entries.slice(0, 3);
          sampleEntries.forEach((entry: any) => {
            ragContext += `- [${entry.category}] ${entry.content.substring(0, 50)}...\n`;
          });
        }
      });
      ragContext += '\n=== End of Data ===\n';
    }

    // Forward to external Python RAG service (if configured)
    const requestBody = {
      prompt: body.prompt,
      dogId: body.dogId,
      context: ragContext, // Add weekly data as context
      weeklyData: body.weeklyData, // Also send complete data (if needed)
    };

    const resp = await fetch(RAG_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    const data = await resp.text();
    // Pass through response (could be JSON or text depending on RAG service)
    return new NextResponse(data, {
      status: resp.status,
      headers: { 'Content-Type': resp.headers.get('content-type') || 'text/plain' },
    });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to call RAG endpoint', detail: String(err) }, { status: 500 });
  }
}
