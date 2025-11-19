'use client';

import { Button } from '../../ui/Button';

export function LogPage() {
  return (
    <div className="flex gap-6">
      {/* 左側：メイン */}
      <div className="flex-1 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">ダッシュボード</h1>
          <p className="text-sm text-slate-400">ペットの健康状態を一目で確認</p>
        </div>

        {/* クイック記録 */}
        <section className="rounded-2xl bg-slate-900 p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold">クイック記録</h2>
              <p className="text-xs text-slate-400">1タップで素早く記録できます</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 lg:grid-cols-7">
            {[
              { label: '排泄', emoji: '💧' },
              { label: '食事', emoji: '🍽️' },
              { label: '散歩', emoji: '🚶‍♂️' },
              { label: '訓練', emoji: '🎓' },
              { label: '投薬', emoji: '💊' },
              { label: '診察', emoji: '🏥' },
              { label: 'カスタム', emoji: '➕' },
            ].map((card) => (
              <button
                key={card.label}
                className="flex flex-col items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-950/40 py-4 text-xs text-slate-200 hover:border-blue-500 hover:bg-slate-900"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-lg">
                  {card.emoji}
                </div>
                <span>{card.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* 最近の記録 */}
        <section className="rounded-2xl bg-slate-900 p-5">
          <h2 className="mb-3 text-sm font-semibold">最近の記録</h2>
          <p className="mb-4 text-xs text-slate-400">直近の活動履歴</p>

          <div className="space-y-2">
            {[
              {
                type: '排尿',
                tag: '10分前',
                tagColor: 'bg-green-500/20 text-green-300',
                detail: '屋外・成功・普通量・黄色',
              },
              {
                type: '朝食',
                tag: '2時間前',
                tagColor: 'bg-emerald-500/20 text-emerald-300',
                detail: '完全・200g・ドライフード',
              },
              {
                type: '散歩',
                tag: '4時間前',
                tagColor: 'bg-teal-500/20 text-teal-300',
                detail: '30分・2.5km・晴れ',
              },
            ].map((log) => (
              <div
                key={log.type}
                className="flex items-center justify-between rounded-xl bg-slate-800/60 px-4 py-3 text-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-700">
                    💧
                  </div>
                  <div>
                    <div className="font-semibold text-slate-100">{log.type}</div>
                    <div className="text-[11px] text-slate-400">{log.detail}</div>
                  </div>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] ${log.tagColor}`}>
                  {log.tag}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* 右側：ペット情報カード */}
      <aside className="w-80 space-y-4">
        <section className="rounded-2xl bg-slate-900 p-5">
          <h2 className="mb-4 text-sm font-semibold">ペット情報</h2>
          <div className="flex flex-col items-center gap-2">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-800 text-3xl">
              🐕
            </div>
            <div className="text-lg font-semibold">マックス</div>
            <span className="rounded-full bg-blue-500/20 px-3 py-0.5 text-[11px] text-blue-300">
              盲導犬候補
            </span>
          </div>

          <dl className="mt-6 space-y-3 text-xs">
            <div className="flex justify-between">
              <dt className="text-slate-400">年齢</dt>
              <dd className="font-medium">1歳3ヶ月</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-400">体重</dt>
              <dd className="font-medium">28.5 kg</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-400">体高</dt>
              <dd className="font-medium">58 cm</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-400">次回診察</dt>
              <dd className="font-medium">2025年1月20日</dd>
            </div>
          </dl>

          <Button className="mt-6 w-full">詳細を見る</Button>
        </section>
      </aside>
    </div>
  );
}
