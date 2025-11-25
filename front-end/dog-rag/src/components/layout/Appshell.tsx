'use client';

import type { ReactNode } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { useAuth } from '@/contexts/AuthContext';
import { useDog } from '@/contexts/DogContext';

export function AppShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const { selectedDog } = useDog();

  return (
    <AuthGuard>
      <div className="flex min-h-screen bg-slate-950 text-slate-50">
        <Sidebar />

        <div className="flex min-h-screen flex-1 flex-col bg-slate-950">
          {/* ヘッダー */}
          <header className="flex items-center justify-between border-b border-slate-800 px-8 py-4">
            <div className="text-sm text-slate-400">ペットの健康状態を一元管理</div>
            <div className="flex items-center gap-4">
              {selectedDog && (
                <button className="rounded-full bg-slate-800 px-4 py-1 text-xs text-slate-200">
                  {selectedDog.dogName}
                </button>
              )}
              {user && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-300">{user.userName}</span>
                  <button
                    onClick={logout}
                    className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-200 hover:bg-slate-700"
                  >
                    ログアウト
                  </button>
                </div>
              )}
            </div>
          </header>

          {/* コンテンツ */}
          <main className="flex-1 overflow-y-auto px-8 py-6">{children}</main>
        </div>
      </div>
    </AuthGuard>
  );
}
