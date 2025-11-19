'use client';

import { Button } from '../../ui/Button';
import { useState } from 'react';

const suggestions = [
  '最近の食事状況はどうですか？',
  '散歩の頻度は適切ですか？',
  '健康状態に問題はありませんか？',
  '訓練の進捗状況を教えてください',
  '体重の変化について分析してください',
  '排泄パターンに異常はありませんか？',
];

export function RagPage() {
  const [messages] = useState([
    {
      role: 'assistant',
      content:
        'こんにちは！ペットの健康管理についてお手伝いします。記録されたデータを基に、健康状態の分析やアドバイスを提供できます。何か質問はありますか？',
      time: '12:39',
    },
  ]);

  return (
    <div className="flex h-full flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">AI相談</h1>
        <p className="text-sm text-slate-400">
          記録データをもとに、AIが健康状態を分析してアドバイスします
        </p>
      </div>

      {/* おすすめ質問 */}
      <section className="rounded-2xl bg-slate-900 p-5">
        <h2 className="mb-3 text-sm font-semibold">おすすめの質問</h2>
        <p className="mb-4 text-xs text-slate-400">クリックして質問を送信できます</p>
        <div className="flex flex-wrap gap-2 text-xs">
          {suggestions.map((q) => (
            <button
              key={q}
              className="rounded-full bg-slate-800 px-3 py-1 text-slate-200 hover:bg-slate-700"
            >
              {q}
            </button>
          ))}
        </div>
      </section>

      {/* チャットエリア */}
      <section className="flex min-h-[360px] flex-1 flex-col rounded-2xl bg-slate-900 p-5">
        <div className="flex-1 space-y-4 overflow-y-auto">
          {messages.map((m, i) => (
            <div key={i} className="flex flex-col gap-1">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>AIアシスタント</span>
                <span>・</span>
                <span>{m.time}</span>
              </div>
              <div className="max-w-[600px] rounded-2xl bg-slate-800 px-4 py-3 text-sm text-slate-100">
                {m.content}
              </div>
            </div>
          ))}
        </div>

        {/* 入力欄 */}
        <form className="mt-4 flex items-end gap-3">
          <textarea
            className="flex-1 resize-none rounded-xl bg-slate-950/40 px-3 py-2 text-sm text-slate-100 outline-none ring-1 ring-slate-700 focus:ring-blue-500"
            rows={3}
            placeholder="ペットの健康について質問してください…"
          />
          <Button className="h-10 px-4">📨</Button>
        </form>
      </section>
    </div>
  );
}
