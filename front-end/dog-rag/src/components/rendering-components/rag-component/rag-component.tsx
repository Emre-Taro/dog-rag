'use client';

import { useState, useEffect, useRef } from 'react';
import { useDog } from '@/contexts/DogContext';
import { Button } from '@/components/ui/Button';
import { RagMessage } from '@/types';
import Link from 'next/link';
import { useAuth, getAuthHeaders } from '@/contexts/AuthContext';
import ReactMarkdown from 'react-markdown';

const suggestions = [
  "How is your pet's eating habits recently?",
  "Is the frequency of walks appropriate?",
  "Is there any problem with your pet's health?",
  "Tell me about your pet's training progress.",
  "Analyze the changes in your pet's weight.",
  'Is there any abnormal elimination pattern?',
];

export function RagPage() {
  const { selectedDogId, selectedDog, dogs, setSelectedDogId } = useDog();
  const { token } = useAuth();
  const [messages, setMessages] = useState<RagMessage[]>([]);
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

  // Load message history from database when dog is selected
  useEffect(() => {
    const loadMessages = async () => {
      if (!selectedDogId || !token) return;

      try {
        const response = await fetch(`/api/rag/messages?dogId=${selectedDogId}`, {
          headers: {
            ...getAuthHeaders(token),
          },
        });

        const data = await response.json();

        if (data.success && data.messages && data.messages.length > 0) {
          // Convert database messages to RagMessage format
          const formattedMessages: RagMessage[] = data.messages.map((msg: any) => ({
            id: msg.id,
            role: msg.role,
            content: msg.content,
            timestamp: new Date(msg.timestamp),
            dogId: msg.dogId,
            evaluation: msg.evaluation,
          }));
          setMessages(formattedMessages);
        } else {
          // If no messages in DB, show welcome message
          setMessages([
            {
              id: '1',
              role: 'assistant',
              content:
                "Hello! I'm here to help you with your pet's health management. Based on the recorded data, I can analyze the health status and provide advice. Do you have any questions?",
              timestamp: new Date(),
            },
          ]);
        }
      } catch (error) {
        console.error('Error loading messages:', error);
        // On error, show welcome message
        setMessages([
          {
            id: '1',
            role: 'assistant',
            content:
              "Hello! I'm here to help you with your pet's health management. Based on the recorded data, I can analyze the health status and provide advice. Do you have any questions?",
            timestamp: new Date(),
          },
        ]);
      }
    };

    loadMessages();
  }, [selectedDogId, token]);

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
      const response = await fetch('/api/rag/advice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(token),
        },
        body: JSON.stringify({
          dogId: selectedDogId,
          question: input,
          lookbackDays: parseInt(daysRange),
          topKInternal: 5,
          topKExternal: 5,
        }),
      });

      const data = await response.json();

      let assistantContent: string;
      if (!data.success) {
        assistantContent = `Error: ${data.error || "Couldn't generate answer"}`;
      } else {
        assistantContent = data.answer || "Couldn't generate answer";
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
        content: 'Error: Problem occurred. Please try again.',
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
        // Add success message
        const successMessage: RagMessage = {
          id: Date.now().toString(),
          role: 'assistant',
          content: `Fetched weekly summary and text data for the past ${daysRange}days. Now you can get advice based on the context.`,
          timestamp: new Date(),
          dogId: selectedDogId?.toString(),
        };
        setMessages((prev) => [...prev, successMessage]);
      } else {
        throw new Error(data.error || 'Faild to fetch weekly data');
      }
    } catch (error) {
      console.error('Error fetching weekly data:', error);
      const errorMessage: RagMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'Failed to fetch weekly data. Please try again.',
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
          <p className="mb-4">Select a pet</p>
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
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">AI Advice</h1>
          <p className="text-xs text-slate-400">
            AI analyzes health status and provides advice based on recorded data.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Fetch Weekly Data - small inline */}
          <div className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2">
            <span className="text-xs font-medium text-slate-300">Data:</span>
            <select
              value={daysRange}
              onChange={(e) => setDaysRange(e.target.value)}
              className="rounded-lg bg-slate-800 px-2 py-1 text-xs text-slate-200"
              disabled={fetchingData}
            >
              <option value="7">7 days</option>
              <option value="14">14 days</option>
              <option value="30">30 days</option>
              <option value="60">60 days</option>
              <option value="90">90 days</option>
            </select>
            <Button
              onClick={fetchWeeklyData}
              disabled={fetchingData || !selectedDogId}
              className="px-3 py-1 text-xs"
            >
              {fetchingData ? 'Fetching...' : weeklyData ? 'Re-fetch' : 'Fetch'}
            </Button>
            {weeklyData && (
              <span className="text-xs font-medium text-green-400">
                ✓ {weeklyData.weeks?.length || 0}w
              </span>
            )}
          </div>
          <select
            value={selectedDogId || ''}
            onChange={(e) => setSelectedDogId(e.target.value ? parseInt(e.target.value) : null)}
            className="rounded-lg bg-slate-900 px-2 py-1.5 text-xs text-slate-200"
          >
            {dogs.map((dog) => (
              <option key={dog.id} value={dog.id}>
                {dog.dogName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Suggested Questions - full width */}
      <section className="rounded-xl bg-slate-900 p-3">
        <h2 className="mb-2 text-xs font-semibold">Suggested Questions</h2>
        <div className="flex flex-wrap gap-1.5 text-xs">
          {suggestions.map((q, i) => (
            <button
              key={i}
              onClick={() => handleSuggestion(q)}
              className="rounded-full bg-slate-800 px-2.5 py-1 text-slate-200 hover:bg-slate-700 transition"
            >
              {q}
            </button>
          ))}
        </div>
      </section>

      {/* Chat Area */}
      <section className="flex min-h-0 flex-1 flex-col rounded-xl bg-slate-900 p-3">
        <div className="flex-1 space-y-2 overflow-y-auto">
          {messages.map((m) => (
            <div key={m.id} className="flex flex-col gap-0.5">
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <span>{m.role === 'assistant' ? 'AI' : 'You'}</span>
                <span>・</span>
                <span>{formatTime(m.timestamp)}</span>
              </div>
              <div
                className={`max-w-[600px] rounded-xl px-3 py-2 text-xs ${
                  m.role === 'assistant'
                    ? 'bg-slate-800 text-slate-100'
                    : 'bg-blue-500 text-white ml-auto'
                }`}
              >
                <ReactMarkdown>{m.content}</ReactMarkdown>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <span>AI</span>
                <span>・</span>
                <span>Thinking...</span>
              </div>
              <div className="max-w-[600px] rounded-xl bg-slate-800 px-3 py-2 text-xs text-slate-100">
                Thinking...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Field */}
        <form
          className="mt-2 flex items-end gap-2"
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
            className="flex-1 resize-none rounded-lg bg-slate-950/40 px-2.5 py-1.5 text-xs text-slate-100 outline-none ring-1 ring-slate-700 focus:ring-blue-500"
            rows={2}
            placeholder="Ask about your pet's health..."
            disabled={loading}
          />
          <Button type="submit" disabled={loading || !input.trim()} className="h-8 px-3 text-xs">
            📨
          </Button>
        </form>
        <p className="mt-1 text-[10px] text-slate-500">
          Shift+Enter: newline, Enter: send
        </p>
      </section>
    </div>
  );
}
