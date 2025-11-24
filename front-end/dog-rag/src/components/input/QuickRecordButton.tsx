'use client';

import { LogType } from '@/types';

interface QuickRecordButtonProps {
  label: string;
  emoji: string;
  logType: LogType;
  onClick: (logType: LogType) => void;
}

export function QuickRecordButton({ label, emoji, logType, onClick }: QuickRecordButtonProps) {
  return (
    <button
      onClick={() => onClick(logType)}
      className="flex flex-col items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-950/40 py-4 text-xs text-slate-200 hover:border-blue-500 hover:bg-slate-900 transition"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-lg">
        {emoji}
      </div>
      <span>{label}</span>
    </button>
  );
}

