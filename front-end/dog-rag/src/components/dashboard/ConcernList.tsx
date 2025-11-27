'use client';

import Link from 'next/link';

interface RagMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date | string;
}

interface ConcernListProps {
  messages: RagMessage[];
  dogId: number | null;
}

export function ConcernList({ messages, dogId }: ConcernListProps) {
  // Extract user questions/concerns from messages
  const userQuestions = messages
    .filter((msg) => msg.role === 'user')
    .map((msg) => ({
      id: msg.id,
      content: msg.content,
      timestamp: typeof msg.timestamp === 'string' ? new Date(msg.timestamp) : msg.timestamp,
    }))
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()) // Most recent first
    .slice(0, 12); // Show latest 12 concerns

  if (userQuestions.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400 text-sm">
        RAGチャットでの質問がありません
      </div>
    );
  }

  return (
    <div className="grid grid-cols-5 gap-1.5">
      {userQuestions.map((question) => {
        const dateStr = question.timestamp.toLocaleDateString('ja-JP', {
          month: 'short',
          day: 'numeric',
        });
        
        const ragUrl = dogId 
          ? `/rag?dogId=${dogId}&messageId=${question.id}`
          : '/rag';
        
        return (
          <Link
            key={question.id}
            href={ragUrl}
            className="aspect-square flex flex-col rounded border border-slate-700 bg-slate-800/50 p-1.5 hover:bg-slate-800 hover:border-slate-600 transition-colors cursor-pointer group"
            title={question.content}
          >
            <div className="flex-shrink-0 mb-1">
              <span className="text-xs text-slate-400">{dateStr}</span>
            </div>
            <p className="text-sm text-slate-200 leading-snug line-clamp-3 flex-1 overflow-hidden">
              {question.content}
            </p>
          </Link>
        );
      })}
    </div>
  );
}

