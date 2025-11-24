'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';

export function SettingsPage() {
  const [profile, setProfile] = useState({
    name: '山田 太郎',
    email: 'yamada@example.com',
    organization: '東京盲導犬協会',
  });
  const [notifications, setNotifications] = useState({
    email: true,
    anomaly: true,
    reminder: true,
  });
  const [frequency, setFrequency] = useState('immediate');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    setSaved(false);
    // TODO: Implement actual save functionality
    setTimeout(() => {
      setLoading(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }, 1000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">設定</h1>
        <p className="text-sm text-slate-400">アカウントと通知設定を管理</p>
      </div>

      {/* プロフィール */}
      <section className="rounded-2xl bg-slate-900 p-5">
        <h2 className="mb-1 text-sm font-semibold">プロフィール</h2>
        <p className="mb-4 text-xs text-slate-400">アカウント情報を管理します</p>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs text-slate-400">お名前</label>
            <input
              type="text"
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              className="w-full rounded-lg bg-slate-950/40 px-3 py-2 text-sm text-slate-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">メールアドレス</label>
            <input
              type="email"
              value={profile.email}
              onChange={(e) => setProfile({ ...profile, email: e.target.value })}
              className="w-full rounded-lg bg-slate-950/40 px-3 py-2 text-sm text-slate-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">組織</label>
            <input
              type="text"
              value={profile.organization}
              onChange={(e) => setProfile({ ...profile, organization: e.target.value })}
              className="w-full rounded-lg bg-slate-950/40 px-3 py-2 text-sm text-slate-100"
            />
          </div>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? '保存中...' : saved ? '保存しました！' : '変更を保存'}
          </Button>
        </div>
      </section>

      {/* 通知設定 */}
      <section className="rounded-2xl bg-slate-900 p-5">
        <h2 className="mb-1 text-sm font-semibold">通知設定</h2>
        <p className="mb-4 text-xs text-slate-400">アラートとリマインダーの設定</p>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-100">メール通知</div>
              <div className="text-xs text-slate-400">重要なアラートをメールで受信</div>
            </div>
            <button
              onClick={() => setNotifications({ ...notifications, email: !notifications.email })}
              className={`relative h-6 w-11 rounded-full transition ${
                notifications.email ? 'bg-blue-500' : 'bg-slate-700'
              }`}
            >
              <div
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${
                  notifications.email ? 'right-0.5' : 'left-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-100">異常検知アラート</div>
              <div className="text-xs text-slate-400">健康異常を検知した際に通知</div>
            </div>
            <button
              onClick={() => setNotifications({ ...notifications, anomaly: !notifications.anomaly })}
              className={`relative h-6 w-11 rounded-full transition ${
                notifications.anomaly ? 'bg-blue-500' : 'bg-slate-700'
              }`}
            >
              <div
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${
                  notifications.anomaly ? 'right-0.5' : 'left-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-100">記録リマインダー</div>
              <div className="text-xs text-slate-400">定期的な記録を促す通知</div>
            </div>
            <button
              onClick={() => setNotifications({ ...notifications, reminder: !notifications.reminder })}
              className={`relative h-6 w-11 rounded-full transition ${
                notifications.reminder ? 'bg-blue-500' : 'bg-slate-700'
              }`}
            >
              <div
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${
                  notifications.reminder ? 'right-0.5' : 'left-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      </section>

      {/* 通知頻度 */}
      <section className="rounded-2xl bg-slate-900 p-5">
        <h2 className="mb-4 text-sm font-semibold">通知頻度</h2>
        <select
          value={frequency}
          onChange={(e) => setFrequency(e.target.value)}
          className="rounded-lg bg-slate-950/40 px-3 py-2 text-sm text-slate-200"
        >
          <option value="immediate">即時</option>
          <option value="daily">毎日</option>
          <option value="weekly">毎週</option>
        </select>
      </section>
    </div>
  );
}

