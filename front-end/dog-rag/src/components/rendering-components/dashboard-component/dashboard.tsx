'use client';

import { useState, useEffect } from 'react';
import { useDog } from '@/contexts/DogContext';
import { useAuth, getAuthHeaders } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { DashboardStats, ActivityRecord, HealthIndicator } from '@/types';
import Link from 'next/link';

export function DashboardPage() {
  const { selectedDogId, selectedDog, dogs, setSelectedDogId } = useDog();
  const { token } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activityRecords, setActivityRecords] = useState<ActivityRecord[]>([]);
  const [healthIndicators, setHealthIndicators] = useState<HealthIndicator[]>([]);
  const [loading, setLoading] = useState(false);
  const [days, setDays] = useState(30);

  useEffect(() => {
    if (selectedDogId) {
      fetchDashboardData();
    }
  }, [selectedDogId, days]);

  const fetchDashboardData = async () => {
    if (!selectedDogId) return;

    setLoading(true);
    try {
      // Fetch stats
      const statsResponse = await fetch(
        `/api/dashboard/stats?dog_id=${selectedDogId}&days=${days}`,
        {
          headers: getAuthHeaders(token),
        }
      );
      const statsResult = await statsResponse.json();
      if (statsResult.success) {
        setStats(statsResult.data);
      }

      // Fetch summary
      const summaryResponse = await fetch(
        `/api/dashboard/summary?dog_id=${selectedDogId}&days=${days}`,
        {
          headers: getAuthHeaders(token),
        }
      );
      const summaryResult = await summaryResponse.json();
      if (summaryResult.success) {
        setActivityRecords(summaryResult.data.activity_records || []);
        setHealthIndicators(summaryResult.data.health_indicators || []);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async () => {
    if (!selectedDogId) return;

    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const url = `/api/logs/export?dog_id=${selectedDogId}&start_date=${startDate.toISOString()}&end_date=${endDate.toISOString()}`;
      const response = await fetch(url, {
        headers: getAuthHeaders(token),
      });
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `dashboard-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting CSV:', error);
      alert('エクスポートに失敗しました');
    }
  };

  if (!selectedDogId || !selectedDog) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center text-slate-400">
          <p className="mb-4">ペットを選択してください</p>
          {dogs.length === 0 && (
            <Link href="/dog-profile">
              <Button>ペットを追加</Button>
            </Link>
          )}
        </div>
      </div>
    );
  }

  const maxActivity = Math.max(...activityRecords.map((r) => r.count), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">分析・レポート</h1>
          <p className="text-sm text-slate-400">健康状態の推移と傾向を可視化</p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <select
            value={selectedDogId || ''}
            onChange={(e) => setSelectedDogId(e.target.value ? parseInt(e.target.value) : null)}
            className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-slate-200"
          >
            {dogs.map((dog) => (
              <option key={dog.id} value={dog.id}>
                {dog.dogName}
              </option>
            ))}
          </select>
          <select
            value={days}
            onChange={(e) => setDays(parseInt(e.target.value))}
            className="rounded-lg bg-slate-900 px-3 py-2 text-slate-200"
          >
            <option value="7">過去7日間</option>
            <option value="30">過去30日間</option>
            <option value="90">過去90日間</option>
            <option value="365">過去1年間</option>
          </select>
          <Button variant="ghost" onClick={handleExportCSV}>
            CSV
          </Button>
        </div>
      </div>

      {/* サマリーカード */}
      {loading ? (
        <div className="text-center py-8 text-slate-400">読み込み中...</div>
      ) : stats ? (
        <section className="grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl bg-slate-900 p-4 text-xs text-slate-300">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800">
                📈
              </div>
              <span className="text-xs text-emerald-400">
                {stats.period_comparison?.records_change && stats.period_comparison.records_change > 0 ? '+' : ''}
                {stats.period_comparison?.records_change || 0}%
              </span>
            </div>
            <div className="text-[11px] text-slate-400">総記録数</div>
            <div className="mt-1 text-xl font-semibold text-slate-50">{stats.total_records}</div>
          </div>

          <div className="rounded-2xl bg-slate-900 p-4 text-xs text-slate-300">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800">
                🚶
              </div>
              <span className="text-xs text-emerald-400">
                {stats.period_comparison?.walk_time_change && stats.period_comparison.walk_time_change > 0 ? '+' : ''}
                {stats.period_comparison?.walk_time_change || 0}%
              </span>
            </div>
            <div className="text-[11px] text-slate-400">平均散歩時間</div>
            <div className="mt-1 text-xl font-semibold text-slate-50">{stats.average_walk_time}分</div>
          </div>

          <div className="rounded-2xl bg-slate-900 p-4 text-xs text-slate-300">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800">
                🍽️
              </div>
              <span
                className={`text-xs ${
                  (stats.period_comparison?.meal_rate_change || 0) >= 0
                    ? 'text-red-400'
                    : 'text-emerald-400'
                }`}
              >
                {stats.period_comparison?.meal_rate_change && stats.period_comparison.meal_rate_change > 0 ? '+' : ''}
                {stats.period_comparison?.meal_rate_change || 0}%
              </span>
            </div>
            <div className="text-[11px] text-slate-400">食事完食率</div>
            <div className="mt-1 text-xl font-semibold text-slate-50">{stats.meal_completion_rate}%</div>
          </div>

          <div className="rounded-2xl bg-slate-900 p-4 text-xs text-slate-300">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800">
                ⚠️
              </div>
              <span className="text-xs font-semibold text-red-400">要確認</span>
            </div>
            <div className="text-[11px] text-slate-400">異常検知</div>
            <div className="mt-1 text-xl font-semibold text-slate-50">{stats.anomaly_detections}件</div>
          </div>
        </section>
      ) : null}

      {/* グラフ領域 */}
      <section className="grid gap-4 lg:grid-cols-2">
        {/* 週間活動記録 */}
        <div className="rounded-2xl bg-slate-900 p-5">
          <h2 className="mb-1 text-sm font-semibold">週間活動記録</h2>
          <p className="mb-4 text-xs text-slate-400">過去{days}日間の活動回数</p>
          <div className="flex h-64 items-end justify-between rounded-xl bg-slate-950/40 p-4 text-[10px]">
            {activityRecords.length > 0 ? (
              activityRecords.slice(-7).map((record) => {
                const height = maxActivity > 0 ? (record.count / maxActivity) * 100 : 0;
                const date = new Date(record.date);
                const dayLabel = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];
                return (
                  <div key={record.date} className="flex flex-1 flex-col items-center gap-2">
                    <div className="flex w-full flex-col justify-end gap-1">
                      <div
                        className="w-full rounded-full bg-blue-500"
                        style={{ height: `${height}%` }}
                      />
                    </div>
                    <span className="text-slate-400">{dayLabel}</span>
                  </div>
                );
              })
            ) : (
              <div className="text-center text-slate-400 w-full">データがありません</div>
            )}
          </div>
        </div>

        {/* 健康指標の推移 */}
        <div className="rounded-2xl bg-slate-900 p-5">
          <h2 className="mb-1 text-sm font-semibold">健康指標の推移</h2>
          <p className="mb-4 text-xs text-slate-400">体重と体温の変化</p>
          <div className="flex h-64 flex-col justify-between rounded-xl bg-slate-950/40 p-4 text-[10px]">
            {healthIndicators.length > 0 ? (
              <div className="text-slate-400 text-center">
                {healthIndicators.length}件の健康指標データ
                <br />
                (グラフ表示は今後実装予定)
              </div>
            ) : (
              <div className="text-center text-slate-400">健康指標データがありません</div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
