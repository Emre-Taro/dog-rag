'use client';

import { useState, FormEvent } from 'react';
import { LogType, LogData } from '@/types';
import { Button } from '@/components/ui/Button';
import { FIXED_USER_ID } from '@/lib/constants';

interface LogEntryFormProps {
  logType: LogType;
  dogId: number;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: LogData;
  logId?: string; // For editing
}

export function LogEntryForm({
  logType,
  dogId,
  onClose,
  onSuccess,
  initialData,
  logId,
}: LogEntryFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getFormFields = () => {
    switch (logType) {
      case 'toilet':
        return (
          <ToiletForm
            initialData={initialData as any}
            onSubmit={handleSubmit}
            onCancel={onClose}
            loading={loading}
          />
        );
      case 'food':
        return (
          <FoodForm
            initialData={initialData as any}
            onSubmit={handleSubmit}
            onCancel={onClose}
            loading={loading}
          />
        );
      case 'sleep':
        return (
          <SleepForm
            initialData={initialData as any}
            onSubmit={handleSubmit}
            onCancel={onClose}
            loading={loading}
          />
        );
      case 'walk':
        return (
          <WalkForm
            initialData={initialData as any}
            onSubmit={handleSubmit}
            onCancel={onClose}
            loading={loading}
          />
        );
      case 'play':
        return (
          <PlayForm
            initialData={initialData as any}
            onSubmit={handleSubmit}
            onCancel={onClose}
            loading={loading}
          />
        );
      case 'bark':
        return (
          <BarkForm
            initialData={initialData as any}
            onSubmit={handleSubmit}
            onCancel={onClose}
            loading={loading}
          />
        );
      case 'custom':
        return (
          <CustomForm
            initialData={initialData as any}
            onSubmit={handleSubmit}
            onCancel={onClose}
            loading={loading}
          />
        );
      default:
        return <div>Form not implemented for {logType}</div>;
    }
  };

  const handleSubmit = async (formData: any) => {
    setLoading(true);
    setError(null);

    try {
      const logData: LogData = {
        log_type: logType,
        ...formData,
      };

      const url = logId ? `/api/logs/${logId}` : '/api/logs';
      const method = logId ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dogId: dogId,
          log_type: logType,
          log_data: formData,
          user_id: FIXED_USER_ID, // TODO: Get from auth
        }),
      });

      const result = await response.json();

      if (result.success) {
        onSuccess();
        onClose();
      } else {
        const errorMsg = result.error || result.details || 'Failed to save log entry';
        setError(errorMsg);
        console.error('Save error:', result);
      }
    } catch (err: any) {
      const errorMsg = err?.message || 'An error occurred while saving';
      setError(errorMsg);
      console.error('Save exception:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-slate-900 p-6 text-slate-100">
        <h2 className="mb-4 text-lg font-semibold">
          {logId ? '編集' : '新規記録'} - {getLogTypeLabel(logType)}
        </h2>
        {error && (
          <div className="mb-4 rounded-lg bg-red-500/20 px-4 py-2 text-sm text-red-300">
            {error}
          </div>
        )}
        {getFormFields()}
      </div>
    </div>
  );
}

function getLogTypeLabel(logType: LogType): string {
  const labels: Record<LogType, string> = {
    toilet: '排泄',
    food: '食事',
    sleep: '睡眠',
    walk: '散歩',
    play: '遊び',
    bark: '吠える',
    custom: 'カスタム',
    medication: '投薬',
    consultation: '診察',
  };
  return labels[logType] || logType;
}

// Form components for each log type
function ToiletForm({ initialData, onSubmit, onCancel, loading }: any) {
  const [type, setType] = useState<'ONE' | 'TWO' | 'BOTH'>(initialData?.type || 'ONE');
  const [success, setSuccess] = useState(initialData?.success ?? true);
  const [health, setHealth] = useState<'NORMAL' | 'SOFT' | 'HARD' | 'BLOODY' | 'OTHER'>(initialData?.health || 'NORMAL');
  const [comment, setComment] = useState(initialData?.comment || '');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit({
      type,
      time: new Date().toISOString(),
      success,
      health,
      comment: comment || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm">種類</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as 'ONE' | 'TWO' | 'BOTH')}
          className="w-full rounded-lg bg-slate-800 px-3 py-2"
        >
          <option value="ONE">排尿</option>
          <option value="TWO">排便</option>
          <option value="BOTH">両方</option>
        </select>
      </div>
      <div>
        <label className="mb-1 block text-sm">成功</label>
        <select
          value={success ? 'true' : 'false'}
          onChange={(e) => setSuccess(e.target.value === 'true')}
          className="w-full rounded-lg bg-slate-800 px-3 py-2"
        >
          <option value="true">成功</option>
          <option value="false">失敗</option>
        </select>
      </div>
      <div>
        <label className="mb-1 block text-sm">健康状態 *</label>
        <select
          value={health}
          onChange={(e) => setHealth(e.target.value as 'NORMAL' | 'SOFT' | 'HARD' | 'BLOODY' | 'OTHER')}
          className="w-full rounded-lg bg-slate-800 px-3 py-2"
          required
        >
          <option value="NORMAL">普通</option>
          <option value="SOFT">柔らかい</option>
          <option value="HARD">硬い</option>
          <option value="BLOODY">血が混じる</option>
          <option value="OTHER">その他 ＞ コメントに入力</option>
        </select>
      </div>
      <div>
        <label className="mb-1 block text-sm">コメント（任意）</label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="w-full rounded-lg bg-slate-800 px-3 py-2"
          rows={3}
          maxLength={500}
        />
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? '保存中...' : '保存'}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          キャンセル
        </Button>
      </div>
    </form>
  );
}

function FoodForm({ initialData, onSubmit, onCancel, loading }: any) {
  // Support both old and new field names for backward compatibility
  const [mealType, setMealType] = useState<'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK'>(
    initialData?.mealType || initialData?.meal_type || 'BREAKFAST'
  );
  const [amountGrams, setAmountGrams] = useState(initialData?.amountGrams || initialData?.amount || '');
  const [eatenAmount, setEatenAmount] = useState<'ALL' | 'HALF' | 'LITTLE' | ''>(
    initialData?.eatenAmount?.toUpperCase() || initialData?.completion?.toUpperCase() || ''
  );
  const [time, setTime] = useState(
    initialData?.time ? new Date(initialData.time).toISOString().slice(0, 16) : ''
  );
  const [comment, setComment] = useState(initialData?.comment || '');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit({
      mealType,
      amountGrams: amountGrams ? parseFloat(amountGrams) : undefined,
      time: time || new Date().toISOString(),
      eatenAmount: eatenAmount || undefined,
      comment: comment || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm">食事タイプ</label>
        <select
          value={mealType}
          onChange={(e) => setMealType(e.target.value as 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK')}
          className="w-full rounded-lg bg-slate-800 px-3 py-2"
          required
        >
          <option value="BREAKFAST">朝食</option>
          <option value="LUNCH">昼食</option>
          <option value="DINNER">夕食</option>
          <option value="SNACK">おやつ</option>
        </select>
      </div>
      <div>
        <label className="mb-1 block text-sm">量 (g)（任意）</label>
        <input
          type="number"
          value={amountGrams}
          onChange={(e) => setAmountGrams(e.target.value)}
          className="w-full rounded-lg bg-slate-800 px-3 py-2"
          min="0"
          max="10000"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm">時刻</label>
        <input
          type="datetime-local"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="w-full rounded-lg bg-slate-800 px-3 py-2"
          required
        />
      </div>
      <div>
        <label className="mb-1 block text-sm">完食状況（任意）</label>
        <select
          value={eatenAmount}
          onChange={(e) => setEatenAmount(e.target.value as 'ALL' | 'HALF' | 'LITTLE' | '')}
          className="w-full rounded-lg bg-slate-800 px-3 py-2"
        >
          <option value="">選択してください</option>
          <option value="ALL">完食</option>
          <option value="HALF">半分</option>
          <option value="LITTLE">少しだけ</option>
        </select>
      </div>
      <div>
        <label className="mb-1 block text-sm">コメント（任意）</label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="w-full rounded-lg bg-slate-800 px-3 py-2"
          rows={3}
          maxLength={500}
        />
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? '保存中...' : '保存'}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          キャンセル
        </Button>
      </div>
    </form>
  );
}

function SleepForm({ initialData, onSubmit, onCancel, loading }: any) {
  const [durationMinutes, setDurationMinutes] = useState(initialData?.durationMinutes || initialData?.duration || '');
  const [startedAt, setStartedAt] = useState(initialData?.startedAt ? new Date(initialData.startedAt).toISOString().slice(0, 16) : '');
  const [comment, setComment] = useState(initialData?.comment || '');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit({
      durationMinutes: parseInt(durationMinutes),
      startedAt: startedAt || undefined,
      comment: comment || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm">睡眠時間 (分)</label>
        <input
          type="number"
          value={durationMinutes}
          onChange={(e) => setDurationMinutes(e.target.value)}
          className="w-full rounded-lg bg-slate-800 px-3 py-2"
          min="0"
          max="1440"
          required
        />
      </div>
      <div>
        <label className="mb-1 block text-sm">開始時刻（任意）</label>
        <input
          type="datetime-local"
          value={startedAt}
          onChange={(e) => setStartedAt(e.target.value)}
          className="w-full rounded-lg bg-slate-800 px-3 py-2"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm">コメント（任意）</label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="w-full rounded-lg bg-slate-800 px-3 py-2"
          rows={3}
          maxLength={500}
        />
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? '保存中...' : '保存'}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          キャンセル
        </Button>
      </div>
    </form>
  );
}

function WalkForm({ initialData, onSubmit, onCancel, loading }: any) {
  const [minutes, setMinutes] = useState(initialData?.minutes || '');
  const [distanceKm, setDistanceKm] = useState(initialData?.distanceKm || initialData?.distance || '');
  const [weather, setWeather] = useState(initialData?.weather || '');
  const [startedAt, setStartedAt] = useState(initialData?.startedAt ? new Date(initialData.startedAt).toISOString().slice(0, 16) : '');
  const [comment, setComment] = useState(initialData?.comment || '');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit({
      minutes: parseInt(minutes),
      distanceKm: distanceKm ? parseFloat(distanceKm) : undefined,
      weather: weather || undefined,
      startedAt: startedAt || undefined,
      comment: comment || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm">時間 (分)</label>
        <input
          type="number"
          value={minutes}
          onChange={(e) => setMinutes(e.target.value)}
          className="w-full rounded-lg bg-slate-800 px-3 py-2"
          min="0"
          max="600"
          required
        />
      </div>
      <div>
        <label className="mb-1 block text-sm">距離 (km)（任意）</label>
        <input
          type="number"
          step="0.1"
          value={distanceKm}
          onChange={(e) => setDistanceKm(e.target.value)}
          className="w-full rounded-lg bg-slate-800 px-3 py-2"
          min="0"
          max="100"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm">天気（任意）</label>
        <select
          value={weather}
          onChange={(e) => setWeather(e.target.value)}
          className="w-full rounded-lg bg-slate-800 px-3 py-2"
        >
          <option value="">選択してください</option>
          <option value="HOT">暑い</option>
          <option value="COOL">涼しい</option>
          <option value="HUMID">湿度が高い</option>
          <option value="COLD">寒い</option>
          <option value="NORMAL">普通</option>
          <option value="RAINY">雨</option>
          <option value="THUNDER">雷</option>
        </select>
      </div>
      <div>
        <label className="mb-1 block text-sm">開始時刻（任意）</label>
        <input
          type="datetime-local"
          value={startedAt}
          onChange={(e) => setStartedAt(e.target.value)}
          className="w-full rounded-lg bg-slate-800 px-3 py-2"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm">コメント（任意）</label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="w-full rounded-lg bg-slate-800 px-3 py-2"
          rows={3}
          maxLength={500}
        />
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? '保存中...' : '保存'}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          キャンセル
        </Button>
      </div>
    </form>
  );
}

function PlayForm({ initialData, onSubmit, onCancel, loading }: any) {
  const [minutes, setMinutes] = useState(initialData?.minutes || '');
  const [playType, setPlayType] = useState<'RUN' | 'PULL' | 'CUDDLE' | 'LICK' | 'OTHER'>(initialData?.playType || initialData?.activity || 'RUN');
  const [startedAt, setStartedAt] = useState(initialData?.startedAt ? new Date(initialData.startedAt).toISOString().slice(0, 16) : '');
  const [comment, setComment] = useState(initialData?.comment || '');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit({
      minutes: parseInt(minutes),
      playType,
      startedAt: startedAt || undefined,
      comment: comment || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm">時間 (分)</label>
        <input
          type="number"
          value={minutes}
          onChange={(e) => setMinutes(e.target.value)}
          className="w-full rounded-lg bg-slate-800 px-3 py-2"
          min="0"
          max="600"
          required
        />
      </div>
      <div>
        <label className="mb-1 block text-sm">活動</label>
        <select
          value={playType}
          onChange={(e) => setPlayType(e.target.value as 'RUN' | 'PULL' | 'CUDDLE' | 'LICK' | 'OTHER')}
          className="w-full rounded-lg bg-slate-800 px-3 py-2"
        >
          <option value="RUN">走る</option>
          <option value="PULL">引っ張る</option>
          <option value="CUDDLE">抱っこ</option>
          <option value="LICK">舐める</option>
          <option value="OTHER">その他</option>
        </select>
      </div>
      <div>
        <label className="mb-1 block text-sm">開始時刻（任意）</label>
        <input
          type="datetime-local"
          value={startedAt}
          onChange={(e) => setStartedAt(e.target.value)}
          className="w-full rounded-lg bg-slate-800 px-3 py-2"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm">コメント（任意）</label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="w-full rounded-lg bg-slate-800 px-3 py-2"
          rows={3}
          maxLength={500}
        />
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? '保存中...' : '保存'}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          キャンセル
        </Button>
      </div>
    </form>
  );
}

function BarkForm({ initialData, onSubmit, onCancel, loading }: any) {
  const [time, setTime] = useState(
    initialData?.time ? new Date(initialData.time).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16)
  );
  const [period, setPeriod] = useState(initialData?.period || '');
  const [before, setBefore] = useState(initialData?.before || '');
  const [after, setAfter] = useState(initialData?.after || '');
  const [difficulty, setDifficulty] = useState(
    initialData?.difficulty || initialData?.calm_down_difficulty || 3
  );

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit({
      time: new Date(time).toISOString(),
      period: period || undefined,
      before: before || undefined,
      after: after || undefined,
      difficulty: parseInt(difficulty.toString()),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm">時刻</label>
        <input
          type="datetime-local"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="w-full rounded-lg bg-slate-800 px-3 py-2"
          required
        />
      </div>
      <div>
        <label className="mb-1 block text-sm">時間帯（任意）</label>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="w-full rounded-lg bg-slate-800 px-3 py-2"
        >
          <option value="">選択してください</option>
          <option value="MORNING">朝</option>
          <option value="AFTERNOON">昼</option>
          <option value="EVENING">夕方</option>
          <option value="NIGHT">夜</option>
          <option value="MIDNIGHT">深夜</option>
        </select>
      </div>
      <div>
        <label className="mb-1 block text-sm">前の状況（任意）</label>
        <input
          type="text"
          value={before}
          onChange={(e) => setBefore(e.target.value)}
          className="w-full rounded-lg bg-slate-800 px-3 py-2"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm">後の状況（任意）</label>
        <input
          type="text"
          value={after}
          onChange={(e) => setAfter(e.target.value)}
          className="w-full rounded-lg bg-slate-800 px-3 py-2"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm">落ち着かせる難しさ (1-5)</label>
        <input
          type="range"
          min="1"
          max="5"
          value={difficulty}
          onChange={(e) => setDifficulty(parseInt(e.target.value))}
          className="w-full"
        />
        <div className="text-center text-sm">{difficulty}</div>
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? '保存中...' : '保存'}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          キャンセル
        </Button>
      </div>
    </form>
  );
}

function CustomForm({ initialData, onSubmit, onCancel, loading }: any) {
  const [title, setTitle] = useState(initialData?.title || '');
  const [content, setContent] = useState(initialData?.content || initialData?.value || initialData?.comment || '');
  const [loggedAt, setLoggedAt] = useState(
    initialData?.loggedAt ? new Date(initialData.loggedAt).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16)
  );

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    // Convert datetime-local format to ISO string
    let loggedAtValue: string;
    if (loggedAt) {
      // datetime-local format is YYYY-MM-DDTHH:mm, convert to ISO
      const date = new Date(loggedAt);
      loggedAtValue = date.toISOString();
    } else {
      loggedAtValue = new Date().toISOString();
    }
    onSubmit({
      title,
      content,
      loggedAt: loggedAtValue,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm">タイトル *</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-lg bg-slate-800 px-3 py-2"
          required
        />
      </div>
      <div>
        <label className="mb-1 block text-sm">内容 *</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full rounded-lg bg-slate-800 px-3 py-2"
          rows={5}
          required
        />
      </div>
      <div>
        <label className="mb-1 block text-sm">記録日時（任意）</label>
        <input
          type="datetime-local"
          value={loggedAt}
          onChange={(e) => setLoggedAt(e.target.value)}
          className="w-full rounded-lg bg-slate-800 px-3 py-2"
        />
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? '保存中...' : '保存'}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          キャンセル
        </Button>
      </div>
    </form>
  );
}

