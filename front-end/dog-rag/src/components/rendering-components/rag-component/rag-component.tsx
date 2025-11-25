'use client';

import { useState, useEffect, useRef } from 'react';
import { useDog } from '@/contexts/DogContext';
import { Button } from '@/components/ui/Button';
import { RagMessage } from '@/types';
import Link from 'next/link';
import { useAuth, getAuthHeaders } from '@/contexts/AuthContext';

const suggestions = [
  '最近の食事状況はどうですか？',
  '散歩の頻度は適切ですか？',
  '健康状態に問題はありませんか？',
  '訓練の進捗状況を教えてください',
  '体重の変化について分析してください',
  '排泄パターンに異常はありませんか？',
];

export function RagPage() {
  const { selectedDogId, selectedDog, dogs, setSelectedDogId } = useDog();
  const { token } = useAuth();
  const [messages, setMessages] = useState<RagMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content:
        'こんにちは！ペットの健康管理についてお手伝いします。記録されたデータを基に、健康状態の分析やアドバイスを提供できます。何か質問はありますか？',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(false);
  const [weeklyData, setWeeklyData] = useState<any>(null);
  const [daysRange, setDaysRange] = useState('30');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading || !selectedDogId) return;

    const userMessage: RagMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
      dogId: selectedDogId?.toString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/rag/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(token),
        },
        body: JSON.stringify({
          prompt: input,
          dogId: selectedDogId,
          weeklyData: weeklyData, // 週間サマリーとテキストデータを送信
        }),
      });

      const data = await response.json();

      let assistantContent: string;
      if (response.status === 501) {
        assistantContent =
          'RAGシステムはまだ実装されていません。実装後、データに基づいた分析とアドバイスを提供できます。';
      } else if (data.message || data.content) {
        assistantContent = data.message || data.content;
      } else {
        assistantContent = JSON.stringify(data);
      }

      const assistantMessage: RagMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: assistantContent,
        timestamp: new Date(),
        dogId: selectedDogId?.toString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: RagMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'エラーが発生しました。もう一度お試しください。',
        timestamp: new Date(),
        dogId: selectedDogId?.toString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestion = (suggestion: string) => {
    setInput(suggestion);
  };

  const fetchWeeklyData = async () => {
    if (!selectedDogId || fetchingData) return;

    setFetchingData(true);
    try {
      const response = await fetch(
        `/api/weekly-summary?dog_id=${selectedDogId}&days=${daysRange}`,
        {
          headers: {
            ...getAuthHeaders(token),
          },
        }
      );

      const data = await response.json();

      if (data.success) {
        setWeeklyData(data.data);
        // 成功メッセージを追加
        const successMessage: RagMessage = {
          id: Date.now().toString(),
          role: 'assistant',
          content: `過去${daysRange}日間の週間サマリーとテキストデータを取得しました。これらを参照して質問に答えることができます。`,
          timestamp: new Date(),
          dogId: selectedDogId?.toString(),
        };
        setMessages((prev) => [...prev, successMessage]);
      } else {
        throw new Error(data.error || 'データの取得に失敗しました');
      }
    } catch (error) {
      console.error('Error fetching weekly data:', error);
      const errorMessage: RagMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: '週間データの取得に失敗しました。もう一度お試しください。',
        timestamp: new Date(),
        dogId: selectedDogId?.toString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setFetchingData(false);
    }
  };

  const formatTime = (date: Date): string => {
    const d = new Date(date);
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
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

  return (
    <div className="flex h-full flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">AI相談</h1>
          <p className="text-sm text-slate-400">
            記録データをもとに、AIが健康状態を分析してアドバイスします
          </p>
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

      {/* データ取得セクション */}
      <section className="rounded-2xl bg-slate-900 p-5">
        <h2 className="mb-3 text-sm font-semibold">週間データの取得</h2>
        <p className="mb-4 text-xs text-slate-400">
          週間サマリーとテキストデータを取得して、RAGの回答の参照に使用できます
        </p>
        <div className="flex items-center gap-3">
          <select
            value={daysRange}
            onChange={(e) => setDaysRange(e.target.value)}
            className="rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-200"
            disabled={fetchingData}
          >
            <option value="7">過去7日間</option>
            <option value="14">過去14日間</option>
            <option value="30">過去30日間</option>
            <option value="60">過去60日間</option>
            <option value="90">過去90日間</option>
          </select>
          <Button
            onClick={fetchWeeklyData}
            disabled={fetchingData || !selectedDogId}
            className="px-4"
          >
            {fetchingData ? '取得中...' : weeklyData ? 'データを再取得' : 'データを取得'}
          </Button>
          {weeklyData && (
            <span className="text-xs text-green-400">
              ✓ {weeklyData.weeks?.length || 0}週分のデータを取得済み
            </span>
          )}
        </div>
        {weeklyData && (
          <div className="mt-3 rounded-lg bg-slate-800 p-3 text-xs text-slate-300">
            <p className="mb-1">
              <strong>取得期間:</strong> {weeklyData.dateRange?.start} 〜 {weeklyData.dateRange?.end}
            </p>
            <p>
              <strong>週数:</strong> {weeklyData.weeks?.length || 0}週
            </p>
          </div>
        )}
      </section>

      {/* おすすめ質問 */}
      <section className="rounded-2xl bg-slate-900 p-5">
        <h2 className="mb-3 text-sm font-semibold">おすすめの質問</h2>
        <p className="mb-4 text-xs text-slate-400">クリックして質問を送信できます</p>
        <div className="flex flex-wrap gap-2 text-xs">
          {suggestions.map((q, i) => (
            <button
              key={i}
              onClick={() => handleSuggestion(q)}
              className="rounded-full bg-slate-800 px-3 py-1 text-slate-200 hover:bg-slate-700 transition"
            >
              {q}
            </button>
          ))}
        </div>
      </section>

      {/* チャットエリア */}
      <section className="flex min-h-[360px] flex-1 flex-col rounded-2xl bg-slate-900 p-5">
        <div className="flex-1 space-y-4 overflow-y-auto">
          {messages.map((m) => (
            <div key={m.id} className="flex flex-col gap-1">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>{m.role === 'assistant' ? 'AIアシスタント' : 'あなた'}</span>
                <span>・</span>
                <span>{formatTime(m.timestamp)}</span>
              </div>
              <div
                className={`max-w-[600px] rounded-2xl px-4 py-3 text-sm ${
                  m.role === 'assistant'
                    ? 'bg-slate-800 text-slate-100'
                    : 'bg-blue-500 text-white ml-auto'
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>AIアシスタント</span>
                <span>・</span>
                <span>入力中...</span>
              </div>
              <div className="max-w-[600px] rounded-2xl bg-slate-800 px-4 py-3 text-sm text-slate-100">
                考え中...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* 入力欄 */}
        <form
          className="mt-4 flex items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            className="flex-1 resize-none rounded-xl bg-slate-950/40 px-3 py-2 text-sm text-slate-100 outline-none ring-1 ring-slate-700 focus:ring-blue-500"
            rows={3}
            placeholder="ペットの健康について質問してください…"
            disabled={loading}
          />
          <Button type="submit" disabled={loading || !input.trim()} className="h-10 px-4">
            📨
          </Button>
        </form>
        <p className="mt-2 text-xs text-slate-500">
          Shift + Enter で改行、Enter で送信
        </p>
      </section>
    </div>
  );
}
