'use client';

import { useState, useEffect } from 'react';
import { useDog } from '@/contexts/DogContext';
import { useAuth, getAuthHeaders } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { LogEntryForm } from '@/components/input/LogEntryForm';
import { DogLog, LogType } from '@/types';
import Link from 'next/link';

const LOG_TYPE_LABELS: Record<LogType, string> = {
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

const LOG_TYPE_EMOJIS: Record<LogType, string> = {
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

export function RecordPage() {
  const { selectedDogId, selectedDog, dogs, setSelectedDogId } = useDog();
  const { token } = useAuth();
  const [logs, setLogs] = useState<DogLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<LogType | 'all'>('all');
  const [filterDays, setFilterDays] = useState('30');
  const [showForm, setShowForm] = useState(false);
  const [editingLog, setEditingLog] = useState<DogLog | null>(null);
  const [showMenu, setShowMenu] = useState<string | null>(null);

  useEffect(() => {
    if (selectedDogId) {
      fetchLogs();
    }
  }, [selectedDogId, filterType, filterDays, searchQuery]);

  const fetchLogs = async () => {
    if (!selectedDogId) return;

    setLoading(true);
    try {
      let url = `/api/logs?dog_id=${selectedDogId}`;
      
      // Add date filter only if not "all" (9999)
      const days = parseInt(filterDays);
      if (days < 9999) {
        // Use UTC dates to avoid timezone issues
        const now = new Date();
        // endDate: 翌日の0時0分0秒（UTC、半開区間 [start, end) のため）
        const endDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0));
        
        // startDate: (今日 - days) の0時0分0秒（UTC）
        // 例: 過去7日間 = 今日から6日前まで（今日を含めて7日間）
        const startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - (days - 1), 0, 0, 0, 0));
        
        url += `&start_date=${startDate.toISOString()}&end_date=${endDate.toISOString()}`;
      }
      
      if (filterType !== 'all') {
        url += `&log_type=${filterType}`;
      }

      if (searchQuery) {
        url += `&search=${encodeURIComponent(searchQuery)}`;
      }

      const response = await fetch(url, {
        headers: getAuthHeaders(token),
      });
      const result = await response.json();

      if (result.success && result.data) {
        setLogs(result.data);
      } else {
        console.error('Failed to fetch logs:', result.error || 'Unknown error');
        setLogs([]);
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (!selectedDogId) return;

    try {
      const days = parseInt(filterDays);
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      let url = `/api/logs/export?dog_id=${selectedDogId}&start_date=${startDate.toISOString()}&end_date=${endDate.toISOString()}`;
      
      if (filterType !== 'all') {
        url += `&log_type=${filterType}`;
      }

      const response = await fetch(url, {
        headers: getAuthHeaders(token),
      });
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `dog-logs-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting logs:', error);
      alert('Export failed');
    }
  };

  const handleEdit = (log: DogLog) => {
    setEditingLog(log);
    setShowForm(true);
  };

  const handleDelete = async (logId: string, logType?: LogType) => {
    if (!confirm('Are you sure you want to delete this record?')) return;

    try {
      const url = logType ? `/api/logs/${logId}?log_type=${logType}` : `/api/logs/${logId}`;
      const response = await fetch(url, {
        method: 'DELETE',
        headers: getAuthHeaders(token),
      });
      const result = await response.json();

      if (result.success) {
        fetchLogs();
      } else {
        alert('Failed to delete: ' + result.error);
      }
    } catch (error) {
      console.error('Error deleting log:', error);
      alert('An error occurred while deleting');
    }
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
        return `${data.minutes} min・${distanceKm ? `${distanceKm} km` : 'N/A'}・${data.weather || 'N/A'}`;
      case 'play':
        const activityLabels: Record<string, string> = { RUN: 'Run', PULL: 'Pull', CUDDLE: 'Cuddle', LICK: 'Lick', OTHER: 'Other' };
        return `${data.minutes} min・${activityLabels[data.playType || data.activity] || data.playType || data.activity || 'N/A'}`;
      case 'bark':
        const difficulty = data.difficulty || data.calm_down_difficulty;
        return `Calming difficulty: ${difficulty}/5`;
      case 'custom':
        return `${data.title || 'Custom'}${data.content ? `: ${data.content}` : ''}`;
      default:
        return JSON.stringify(data).substring(0, 100);
    }
  };

  const formatDateTime = (date: Date): string => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Record List</h1>
          <p className="text-sm text-slate-400">Manage all activity records</p>
        </div>
        <div className="flex gap-3">
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
          <Button variant="ghost" onClick={handleExport}>
            Export
          </Button>
          <Button onClick={() => {
            setEditingLog(null);
            setShowForm(true);
          }}>
            ＋ New Record
          </Button>
        </div>
      </div>

      {/* Filter */}
      <section className="space-y-4 rounded-2xl bg-slate-900 p-5">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="🔍 Search records..."
            className="flex-1 rounded-lg bg-slate-950/40 px-3 py-2 text-xs text-slate-200 placeholder:text-slate-400"
          />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as LogType | 'all')}
            className="rounded-lg bg-slate-950/40 px-3 py-2 text-xs text-slate-200"
          >
            <option value="all">All Types</option>
            {Object.entries(LOG_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <select
            value={filterDays}
            onChange={(e) => setFilterDays(e.target.value)}
            className="rounded-lg bg-slate-950/40 px-3 py-2 text-xs text-slate-200"
          >
            <option value="7">Past 7 days</option>
            <option value="30">Past 30 days</option>
            <option value="90">Past 90 days</option>
            <option value="365">Past year</option>
            <option value="9999">All</option>
          </select>
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-center py-8 text-slate-400">Loading...</div>
        ) : logs.length === 0 ? (
          <div className="text-center py-8 text-slate-400">No records found</div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-800">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-slate-900">
                <tr className="text-slate-400">
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Details</th>
                  <th className="px-4 py-3">Date & Time</th>
                  <th className="px-4 py-3">Pet</th>
                  <th className="px-2 py-3 w-12">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-950/40">
                {logs.map((log) => (
                  <tr key={`${log.log_type}-${log.id}`} className="hover:bg-slate-900/70">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-800 text-sm">
                          {LOG_TYPE_EMOJIS[log.log_type] || '📝'}
                        </div>
                        <span className="text-slate-100">{LOG_TYPE_LABELS[log.log_type] || log.log_type}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-semibold text-slate-100 leading-relaxed">
                        {formatLogDetails(log)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-300 text-xs">{formatDateTime(log.created_at)}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[11px] text-emerald-300">
                        {selectedDog?.dogName || 'Unknown'}
                      </span>
                    </td>
                    <td className="px-2 py-3 w-12">
                      <div className="relative flex justify-center">
                        <button
                          onClick={() => setShowMenu(showMenu === log.id ? null : log.id)}
                          className={`text-slate-400 hover:text-slate-200 text-xl font-bold leading-none px-2 py-1 transition-colors rounded ${
                            showMenu === log.id ? 'bg-slate-800 text-slate-200' : ''
                          }`}
                          title="Menu"
                        >
                          ⋯
                        </button>
                        {showMenu === log.id && (
                          <div className="absolute right-0 top-8 z-10 rounded-lg bg-slate-800 shadow-lg border border-slate-700 min-w-[80px]">
                            <button
                              onClick={() => {
                                handleEdit(log);
                                setShowMenu(null);
                              }}
                              className="block w-full px-3 py-2 text-left text-xs text-slate-200 hover:bg-slate-700 first:rounded-t-lg"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => {
                                handleDelete(log.id, log.log_type);
                                setShowMenu(null);
                              }}
                              className="block w-full px-3 py-2 text-left text-xs text-red-400 hover:bg-slate-700 last:rounded-b-lg"
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* New Record/Edit Form */}
      {showForm && editingLog && (
        <LogEntryForm
          logType={editingLog.log_type}
          dogId={selectedDogId}
          onClose={() => {
            setShowForm(false);
            setEditingLog(null);
          }}
          onSuccess={() => {
            fetchLogs();
            setShowForm(false);
            setEditingLog(null);
          }}
          initialData={editingLog.log_data}
          logId={editingLog.id}
        />
      )}
    </div>
  );
}
