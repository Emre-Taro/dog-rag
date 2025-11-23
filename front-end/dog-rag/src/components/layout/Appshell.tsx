'use client';

import type { ReactNode } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-50">
      <Sidebar />

      <div className="flex min-h-screen flex-1 flex-col bg-slate-950">
        {/* ヘッダー */}
        <header className="flex items-center justify-between border-b border-slate-800 px-8 py-4">
          <div className="text-sm text-slate-400">ペットの健康状態を一元管理</div>
          <div className="flex items-center gap-4">
            <button className="rounded-full bg-slate-800 px-4 py-1 text-xs text-slate-200">
              マックス（盲導犬候補）
            </button>
            <button className="relative flex h-9 w-9 items-center justify-center rounded-full bg-slate-800">
              🔔
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px]">
                3
              </span>
            </button>
          </div>
        </header>

        {/* コンテンツ */}
        <main className="flex-1 overflow-y-auto px-8 py-6">{children}</main>
      </div>
    </div>
  );
}
