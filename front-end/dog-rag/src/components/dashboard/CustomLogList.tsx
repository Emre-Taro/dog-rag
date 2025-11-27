'use client';

interface CustomLog {
  id: number;
  title: string;
  content: string;
  loggedAt: string;
  createdAt: string;
}

interface CustomLogListProps {
  logs: CustomLog[];
}

export function CustomLogList({ logs }: CustomLogListProps) {
  if (logs.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400 text-sm">
        重要事項はありません
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {logs.map((log) => {
        const loggedDate = new Date(log.loggedAt);
        const dateStr = loggedDate.toLocaleDateString('ja-JP', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });
        
        return (
          <div
            key={log.id}
            className="rounded-lg border border-slate-700 bg-slate-800/50 p-4 hover:bg-slate-800 transition-colors"
          >
            <div className="mb-2 flex items-start justify-between">
              <h3 className="text-sm font-semibold text-slate-100">{log.title}</h3>
              <span className="text-xs text-slate-400 whitespace-nowrap ml-2">{dateStr}</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
              {log.content}
            </p>
          </div>
        );
      })}
    </div>
  );
}

