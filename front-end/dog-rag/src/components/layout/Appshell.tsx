'use client';

import type { ReactNode } from 'react';
import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { useAuth } from '@/contexts/AuthContext';
import { useDog } from '@/contexts/DogContext';

export function AppShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const { selectedDog } = useDog();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // モバイルではデフォルトでサイドバーを閉じる
  useEffect(() => {
    const checkScreenSize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(true); // デスクトップでは開く
      } else {
        setSidebarOpen(false); // モバイルでは閉じる
      }
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  return (
    <AuthGuard>
      <div className="flex h-screen overflow-hidden bg-slate-950 text-slate-50">
        {/* オーバーレイ（モバイル時のみ） */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* サイドバー */}
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <div className="flex flex-1 flex-col overflow-hidden bg-slate-950">
          {/* ヘッダー */}
          <header className="flex shrink-0 items-center justify-between border-b border-slate-800 px-4 py-4 lg:px-8">
            <div className="flex items-center gap-4">
              {/* ハンバーガーメニューボタン */}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="rounded-lg bg-slate-800 p-2 text-slate-200 hover:bg-slate-700 lg:hidden"
                aria-label="Toggle sidebar"
              >
                <svg
                  className="h-6 w-6"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  {sidebarOpen ? (
                    <path d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
              <div className="hidden text-sm text-slate-400 lg:block">
                centralized pet health management tool
              </div>
            </div>
            <div className="flex items-center gap-4">
              {selectedDog && (
                <button className="rounded-full bg-slate-800 px-4 py-1 text-xs text-slate-200">
                  {selectedDog.dogName}
                </button>
              )}
              {user && (
                <div className="flex items-center gap-2">
                  <span className="hidden text-sm text-slate-300 sm:inline">{user.userName}</span>
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
          <main className="flex-1 overflow-y-auto px-4 py-6 lg:px-8">{children}</main>
        </div>
      </div>
    </AuthGuard>
  );
}
