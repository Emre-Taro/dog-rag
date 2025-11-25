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
        responseMessage = `RAG endpoint not configured. ${weeksCount}週分のデータが提供されましたが、RAGサービスが設定されていないため処理できません。`;
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
      ragContext = '\n\n=== 週間サマリーデータ ===\n';
      body.weeklyData.weeks.forEach((week: any, index: number) => {
        ragContext += `\n【週 ${index + 1}: ${week.weekStart} 〜 ${week.weekEnd}】\n`;
        ragContext += `要約: ${week.summaryText || '要約なし'}\n`;
        if (week.timelineJson && week.timelineJson.entries) {
          ragContext += `テキストエントリ数: ${week.timelineJson.entries.length}\n`;
          // 最初の数件のテキストエントリをサンプルとして含める
          const sampleEntries = week.timelineJson.entries.slice(0, 3);
          sampleEntries.forEach((entry: any) => {
            ragContext += `- [${entry.category}] ${entry.content.substring(0, 50)}...\n`;
          });
        }
      });
      ragContext += '\n=== データ終了 ===\n';
    }

    // Forward to external Python RAG service (if configured)
    const requestBody = {
      prompt: body.prompt,
      dogId: body.dogId,
      context: ragContext, // 週間データをコンテキストとして追加
      weeklyData: body.weeklyData, // 完全なデータも送信（必要に応じて）
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
