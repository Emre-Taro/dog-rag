'use client';

import { Button } from '../../ui/Button';

const dummyLogs = [
  {
    type: '排尿',
    detail: '屋外・成功・普通量・黄色',
    datetime: '2025-01-14 08:30',
    pet: 'マックス',
    recorder: '山田 太郎',
  },
  {
    type: '朝食',
    detail: '完全・200g・ドライフード',
    datetime: '2025-01-14 07:00',
    pet: 'マックス',
    recorder: '山田 太郎',
  },
  {
    type: '散歩',
    detail: '30分・2.5km・晴れ',
    datetime: '2025-01-14 06:00',
    pet: 'マックス',
    recorder: 'マックス担当',
  },
];

export function RecordPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">記録一覧</h1>
          <p className="text-sm text-slate-400">すべての活動記録を管理</p>
        </div>
        <div className="flex gap-3">
          <Button variant="ghost">エクスポート</Button>
          <Button>＋ 新規記録</Button>
        </div>
      </div>

      {/* フィルター */}
      <section className="space-y-4 rounded-2xl bg-slate-900 p-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 rounded-lg bg-slate-950/40 px-3 py-2 text-xs text-slate-400">
            🔍 記録を検索...
          </div>
          <select className="rounded-lg bg-slate-950/40 px-3 py-2 text-xs text-slate-200">
            <option>すべての種類</option>
          </select>
          <select className="rounded-lg bg-slate-950/40 px-3 py-2 text-xs text-slate-200">
            <option>過去7日間</option>
          </select>
          <button className="rounded-lg bg-slate-950/40 px-3 py-2 text-xs text-slate-200">
            ⚙ フィルター
          </button>
        </div>

        {/* テーブル */}
        <div className="overflow-hidden rounded-xl border border-slate-800">
          <table className="min-w-full text-left text-xs">
            <thead className="bg-slate-900">
              <tr className="text-slate-400">
                <th className="px-4 py-3">種類</th>
                <th className="px-4 py-3">詳細</th>
                <th className="px-4 py-3">日時</th>
                <th className="px-4 py-3">ペット</th>
                <th className="px-4 py-3">記録者</th>
                <th className="px-4 py-3">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 bg-slate-950/40">
              {dummyLogs.map((log) => (
                <tr key={log.datetime} className="hover:bg-slate-900/70">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-800">
                        💧
                      </div>
                      <span className="text-slate-100">{log.type}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-300">{log.detail}</td>
                  <td className="px-4 py-3 text-slate-300">{log.datetime}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[11px] text-emerald-300">
                      {log.pet}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-300">{log.recorder}</td>
                  <td className="px-4 py-3 text-right text-slate-400">⋯</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
