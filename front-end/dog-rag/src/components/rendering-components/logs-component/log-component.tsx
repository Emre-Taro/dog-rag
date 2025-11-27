'use client';

import { useState, useEffect } from 'react';
import { useDog } from '@/contexts/DogContext';
import { useAuth, getAuthHeaders } from '@/contexts/AuthContext';
import { QuickRecordButton } from '@/components/input/QuickRecordButton';
import { LogEntryForm } from '@/components/input/LogEntryForm';
import { Button } from '@/components/ui/Button';
import { LogType, DogLog, LogData } from '@/types';
import Link from 'next/link';

const QUICK_RECORD_TYPES: Array<{ label: string; emoji: string; type: LogType }> = [
  { label: 'Toilet', emoji: '💧', type: 'toilet' },
  { label: 'Food', emoji: '🍽️', type: 'food' },
  { label: 'Walk', emoji: '🚶‍♂️', type: 'walk' },
  { label: 'Play', emoji: '🎾', type: 'play' },
  { label: 'Sleep', emoji: '😴', type: 'sleep' },
  { label: 'Bark', emoji: '🐕', type: 'bark' },
  { label: 'Custom', emoji: '➕', type: 'custom' },
];

export function LogPage() {
  const { selectedDogId, selectedDog, dogs, setSelectedDogId } = useDog();
  const { token } = useAuth();
  const [todayLogs, setTodayLogs] = useState<DogLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formLogType, setFormLogType] = useState<LogType | null>(null);
  const [editingLog, setEditingLog] = useState<DogLog | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  useEffect(() => {
    if (selectedDogId) {
      fetchTodayLogs();
    }
  }, [selectedDogId]);

  const fetchTodayLogs = async () => {
    if (!selectedDogId) return;

    setLoading(true);
    try {
      // Get today's date in UTC (start of day)
      const now = new Date();
      const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
      // Get tomorrow's date in UTC (start of day) - this is the end date (exclusive)
      const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0));

      const startDateStr = today.toISOString();
      const endDateStr = tomorrow.toISOString();
      
      console.log('[fetchTodayLogs] Fetching logs:', {
        dogId: selectedDogId,
        startDate: startDateStr,
        endDate: endDateStr,
      });

      const response = await fetch(
        `/api/logs?dog_id=${selectedDogId}&start_date=${startDateStr}&end_date=${endDateStr}`,
        {
          headers: getAuthHeaders(token),
        }
      );
      const result = await response.json();

      console.log('[fetchTodayLogs] Response:', {
        success: result.success,
        count: result.data?.length || 0,
        logs: result.data?.map((log: DogLog) => ({
          id: log.id,
          type: log.log_type,
          createdAt: log.created_at,
        })) || [],
      });

      if (result.success && result.data) {
        setTodayLogs(result.data);
      } else {
        console.error('[fetchTodayLogs] Failed to fetch logs:', result.error);
        setTodayLogs([]);
      }
    } catch (error) {
      console.error('Error fetching today logs:', error);
      setTodayLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickRecord = (logType: LogType) => {
    setFormLogType(logType);
    setEditingLog(null);
    setShowForm(true);
  };

  const handleEditLog = (log: DogLog) => {
    setEditingLog(log);
    setFormLogType(log.log_type);
    setShowForm(true);
  };

  const handleDeleteLog = async (logId: string, logType?: LogType) => {
    if (!confirm('Are you sure you want to delete this record?')) return;

    setDeleteLoading(logId);
    try {
      const url = logType ? `/api/logs/${logId}?log_type=${logType}` : `/api/logs/${logId}`;
      const response = await fetch(url, {
        method: 'DELETE',
        headers: getAuthHeaders(token),
      });
      const result = await response.json();

      if (result.success) {
        fetchTodayLogs();
      } else {
        alert('Failed to delete: ' + result.error);
      }
    } catch (error) {
      console.error('Error deleting log:', error);
      alert('An error occurred while deleting');
    } finally {
      setDeleteLoading(null);
    }
  };

  const handleFormSuccess = async () => {
    console.log('[handleFormSuccess] Form submitted successfully, refreshing logs...');
    await fetchTodayLogs();
    setShowForm(false);
    setFormLogType(null);
    setEditingLog(null);
  };

  const formatTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    return `${diffDays} days ago`;
  };

  const formatLogDetails = (log: DogLog): string => {
    const data = log.log_data as any;
    switch (log.log_type) {
      case 'toilet':
        const toiletTypeLabels: Record<string, string> = { ONE: 'Urination', TWO: 'Defecation', BOTH: 'Both' };
        const healthLabels: Record<string, string> = { NORMAL: 'Normal', SOFT: 'Soft', HARD: 'Hard', BLOODY: 'Bloody', OTHER: 'Other' };
        return `${toiletTypeLabels[data.type] || data.type}・${data.success ? 'Success' : 'Failed'}・${healthLabels[data.health] || data.health || 'Normal'}`;
      case 'food':
        const mealLabels: Record<string, string> = { BREAKFAST: 'Breakfast', LUNCH: 'Lunch', DINNER: 'Dinner', SNACK: 'Snack' };
        const eatenAmountLabels: Record<string, string> = { ALL: 'All', HALF: 'Half', LITTLE: 'Little', all: 'All', half: 'Half', little: 'Little' };
        const mealType = data.mealType || data.meal_type;
        const eatenAmount = data.eatenAmount || data.completion;
        const amountGrams = data.amountGrams || data.amount;
        return `${mealLabels[mealType] || mealType}・${eatenAmount ? eatenAmountLabels[eatenAmount] || eatenAmount : 'N/A'}・${amountGrams ? `${amountGrams}g` : 'N/A'}`;
      case 'sleep':
        return `${data.durationMinutes || data.duration} min`;
      case 'walk':
        const distanceKm = data.distanceKm || data.distance;
        return `${data.minutes} min・${distanceKm ? `${distanceKm} km` : 'N/A'}・${getWeatherLabel(data.weather)}`;
      case 'play':
        return `${data.minutes} min・${getActivityLabel(data.playType || data.activity)}`;
      case 'bark':
        const difficulty = data.difficulty || data.calm_down_difficulty;
        return `${getPeriodLabel(data.period)}・Calming difficulty: ${difficulty}/5`;
      case 'custom':
        return `${data.title}${data.content ? `: ${data.content}` : ''}`;
      default:
        return JSON.stringify(data).substring(0, 50);
    }
  };

  const getWeatherLabel = (weather: string): string => {
    if (!weather) return 'N/A';
    const weatherLower = weather.toLowerCase();
    const labels: Record<string, string> = {
      sunny: 'Sunny',
      hot: 'Hot',
      cool: 'Cool',
      humid: 'Humid',
      cold: 'Cold',
      rainy: 'Rainy',
      thunder: 'Thunder',
    };
    return labels[weatherLower] || weather;
  };

  const getActivityLabel = (activity: string): string => {
    const labels: Record<string, string> = {
      RUN: 'Run',
      PULL: 'Pull',
      CUDDLE: 'Cuddle',
      LICK: 'Lick',
      OTHER: 'Other',
    };
    return labels[activity] || activity;
  };

  const getPeriodLabel = (period: string): string => {
    const labels: Record<string, string> = {
      morning: 'Morning',
      afternoon: 'Afternoon',
      evening: 'Evening',
      night: 'Night',
      midnight: 'Midnight',
    };
    return labels[period] || period;
  };

  const getLogTypeLabel = (logType: LogType): string => {
    const labels: Record<LogType, string> = {
      toilet: 'Toilet',
      food: 'Food',
      sleep: 'Sleep',
      walk: 'Walk',
      play: 'Play',
      bark: 'Bark',
      custom: 'Custom',
      medication: 'Medication',
      consultation: 'Consultation',
    };
    return labels[logType] || logType;
  };

  const getLogTypeEmoji = (logType: LogType): string => {
    const emojis: Record<LogType, string> = {
      toilet: '💧',
      food: '🍽️',
      sleep: '😴',
      walk: '🚶‍♂️',
      play: '🎾',
      bark: '🐕',
      custom: '➕',
      medication: '💊',
      consultation: '🏥',
    };
    return emojis[logType] || '📝';
  };

  const formatAge = (months: number): string => {
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    if (years === 0) return `${remainingMonths} months`;
    if (remainingMonths === 0) return `${years} years`;
    return `${years} years ${remainingMonths} months`;
  };

  if (!selectedDogId || !selectedDog) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center text-slate-400">
          <p className="mb-4">Please select a pet</p>
          {dogs.length === 0 && (
            <Link href="/dog-profile">
              <Button>Add a pet</Button>
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-6">
      {/* 左側：メイン */}
      <div className="flex-1 space-y-6">
        {/* ヘッダー - 犬選択 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-sm text-slate-400">View your pet's health status at a glance</p>
          </div>
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
        </div>

        {/* クイック記録 */}
        <section className="rounded-2xl bg-slate-900 p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold">Quick Record</h2>
              <p className="text-xs text-slate-400">Record quickly with one tap</p>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4 lg:grid-cols-7">
            {QUICK_RECORD_TYPES.map((item) => (
              <QuickRecordButton
                key={item.type}
                label={item.label}
                emoji={item.emoji}
                logType={item.type}
                onClick={handleQuickRecord}
              />
            ))}
          </div>
        </section>

        {/* 今日の記録 */}
        <section className="rounded-2xl bg-slate-900 p-5">
          <h2 className="mb-3 text-sm font-semibold">Today's Records</h2>
          <p className="mb-4 text-xs text-slate-400">Activity history entered today</p>

          {loading ? (
            <div className="text-center text-slate-400">Loading...</div>
          ) : todayLogs.length === 0 ? (
            <div className="text-center text-slate-400">No records for today yet</div>
          ) : (
            <div className="space-y-2">
              {todayLogs.map((log) => (
                <div
                  key={`${log.log_type}-${log.id}`}
                  className="flex items-center justify-between rounded-xl bg-slate-800/60 px-4 py-3 text-xs"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-700 text-sm">
                      {getLogTypeEmoji(log.log_type)}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-slate-100">
                        {getLogTypeLabel(log.log_type)}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {formatLogDetails(log)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-[10px] text-green-300">
                      {formatTimeAgo(log.created_at)}
                    </span>
                    <button
                      onClick={() => handleEditLog(log)}
                      className="rounded px-2 py-1 text-xs text-slate-400 hover:bg-slate-700 hover:text-slate-200"
                      title="Edit"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDeleteLog(log.id, log.log_type)}
                      disabled={deleteLoading === log.id}
                      className="rounded px-2 py-1 text-xs text-slate-400 hover:bg-slate-700 hover:text-red-300 disabled:opacity-50"
                      title="Delete"
                    >
                      {deleteLoading === log.id ? '...' : '🗑️'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* 右側：ペット情報カード */}
      <aside className="w-80 space-y-4">
        <section className="rounded-2xl bg-slate-900 p-5">
          <h2 className="mb-4 text-sm font-semibold">Pet Information</h2>
          <div className="flex flex-col items-center gap-2">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-800 text-3xl">
              🐕
            </div>
            <div className="text-lg font-semibold">{selectedDog.dogName}</div>
            <span className="rounded-full bg-blue-500/20 px-3 py-0.5 text-[11px] text-blue-300">
              {selectedDog.stageOfTraining}
            </span>
          </div>

          <dl className="mt-6 space-y-3 text-xs">
            <div className="flex justify-between">
              <dt className="text-slate-400">Age</dt>
              <dd className="font-medium">{selectedDog.age ? formatAge(selectedDog.age) : 'N/A'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-400">Weight</dt>
              <dd className="font-medium">{selectedDog.weight ?? 'N/A'} kg</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-400">Height</dt>
              <dd className="font-medium">{selectedDog.height ?? 'N/A'} cm</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-400">Breed</dt>
              <dd className="font-medium">{selectedDog.breed || 'N/A'}</dd>
            </div>
          </dl>

          <Link href="/dog-profile">
            <Button className="mt-6 w-full">View Details</Button>
          </Link>
        </section>
      </aside>

      {/* Log Entry Form Modal */}
      {showForm && formLogType && selectedDogId && (
        <LogEntryForm
          logType={formLogType}
          dogId={selectedDogId}
          onClose={() => {
            setShowForm(false);
            setFormLogType(null);
            setEditingLog(null);
          }}
          onSuccess={handleFormSuccess}
          initialData={editingLog?.log_data}
          logId={editingLog?.id}
        />
      )}
    </div>
  );
}
