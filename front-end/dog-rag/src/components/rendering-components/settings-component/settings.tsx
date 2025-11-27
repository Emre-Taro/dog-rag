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
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-slate-400">Manage account and notification settings</p>
      </div>

      {/* Profile */}
      <section className="rounded-2xl bg-slate-900 p-5">
        <h2 className="mb-1 text-sm font-semibold">Profile</h2>
        <p className="mb-4 text-xs text-slate-400">Manage account information</p>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs text-slate-400">Name</label>
            <input
              type="text"
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              className="w-full rounded-lg bg-slate-950/40 px-3 py-2 text-sm text-slate-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">Email Address</label>
            <input
              type="email"
              value={profile.email}
              onChange={(e) => setProfile({ ...profile, email: e.target.value })}
              className="w-full rounded-lg bg-slate-950/40 px-3 py-2 text-sm text-slate-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">Organization</label>
            <input
              type="text"
              value={profile.organization}
              onChange={(e) => setProfile({ ...profile, organization: e.target.value })}
              className="w-full rounded-lg bg-slate-950/40 px-3 py-2 text-sm text-slate-100"
            />
          </div>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
          </Button>
        </div>
      </section>

      {/* Notification Settings */}
      <section className="rounded-2xl bg-slate-900 p-5">
        <h2 className="mb-1 text-sm font-semibold">Notification Settings</h2>
        <p className="mb-4 text-xs text-slate-400">Configure alerts and reminders</p>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-100">Email Notifications</div>
              <div className="text-xs text-slate-400">Receive important alerts via email</div>
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
              <div className="text-sm text-slate-100">Anomaly Detection Alerts</div>
              <div className="text-xs text-slate-400">Notify when health anomalies are detected</div>
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
              <div className="text-sm text-slate-100">Record Reminders</div>
              <div className="text-xs text-slate-400">Notifications to encourage regular recording</div>
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

      {/* Notification Frequency */}
      <section className="rounded-2xl bg-slate-900 p-5">
        <h2 className="mb-4 text-sm font-semibold">Notification Frequency</h2>
        <select
          value={frequency}
          onChange={(e) => setFrequency(e.target.value)}
          className="rounded-lg bg-slate-950/40 px-3 py-2 text-sm text-slate-200"
        >
          <option value="immediate">Immediate</option>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
        </select>
      </section>
    </div>
  );
}

