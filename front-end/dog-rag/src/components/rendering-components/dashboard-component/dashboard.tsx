'use client';

import { Button } from '../../ui/Button';

export function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">分析・レポート</h1>
          <p className="text-sm text-slate-400">健康状態の推移と傾向を可視化</p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <select className="rounded-lg bg-slate-900 px-3 py-2 text-slate-200">
            <option>過去30日間</option>
          </select>
          <Button variant="ghost">CSV</Button>
          <Button>PDF</Button>
        </div>
      </div>

      {/* サマリーカード */}
      <section className="grid gap-4 md:grid-cols-4">
        {[
          { label: '総記録数', value: '342', change: '+12%' },
          { label: '平均散歩時間', value: '45分', change: '+8%' },
          { label: '食事完食率', value: '95%', change: '+5%' },
          { label: '異常検知', value: '3件', change: '要確認', highlight: true },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-2xl bg-slate-900 p-4 text-xs text-slate-300"
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800">
                📈
              </div>
              <span
                className={
                  card.highlight
                    ? 'text-xs font-semibold text-red-400'
                    : 'text-xs text-emerald-400'
                }
              >
                {card.change}
              </span>
            </div>
            <div className="text-[11px] text-slate-400">{card.label}</div>
            <div className="mt-1 text-xl font-semibold text-slate-50">{card.value}</div>
          </div>
        ))}
      </section>

      {/* グラフ領域（ダミー） */}
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl bg-slate-900 p-5">
          <h2 className="mb-1 text-sm font-semibold">週間活動記録</h2>
          <p className="mb-4 text-xs text-slate-400">過去7日間の活動回数</p>
          <div className="flex h-64 items-end justify-between rounded-xl bg-slate-950/40 p-4 text-[10px]">
            {['月', '火', '水', '木', '金', '土', '日'].map((d, i) => (
              <div key={d} className="flex flex-1 flex-col items-center gap-2">
                <div className="flex w-6 flex-col justify-end gap-1">
                  <div className="h-20 rounded-full bg-slate-700" />
                  <div className="h-10 rounded-full bg-slate-600" />
                  <div className="h-6 rounded-full bg-slate-500" />
                </div>
                <span className="text-slate-400">{d}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-slate-900 p-5">
          <h2 className="mb-1 text-sm font-semibold">健康指標の推移</h2>
          <p className="mb-4 text-xs text-slate-400">体重と体温の変化</p>
          <div className="flex h-64 flex-col justify-between rounded-xl bg-slate-950/40 p-4 text-[10px]">
            {/* グラフのダミーライン */}
            <div className="h-[1px] w-full bg-slate-800" />
            <div className="h-[1px] w-full bg-slate-800" />
            <div className="h-[1px] w-full bg-slate-800" />
            <div className="h-[1px] w-full bg-slate-800" />
            <div className="h-[1px] w-full bg-slate-800" />
            <div className="mt-2 flex justify-between text-slate-400">
              {['1/8', '1/9', '1/10', '1/11', '1/12', '1/13', '1/14'].map((d) => (
                <span key={d}>{d}</span>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
