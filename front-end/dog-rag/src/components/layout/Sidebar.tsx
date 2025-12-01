'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/input', label: 'Dashboard', icon: '📊' },
  { href: '/records', label: 'Record List', icon: '📋' },
  { href: '/dashboard', label: 'Analysis & Report', icon: '📈' },
  { href: '/dog-profile', label: 'Pet Management', icon: '🐾' },
  { href: '/rag', label: 'AI Consultation', icon: '💬' },
  { href: '/settings', label: 'Settings', icon: '⚙️' },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* モバイル用：オーバーレイとして表示 */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-screen w-64 flex-col bg-slate-900 text-slate-100 transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between gap-3 px-5 pt-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500">
              <span className="text-xl">🐶</span>
            </div>
            <div>
              <div className="text-base font-semibold">Pet Health Management</div>
            </div>
          </div>
          {/* モバイル用：閉じるボタン */}
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200 lg:hidden"
            aria-label="Close sidebar"
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
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav className="mt-4 flex flex-1 flex-col gap-1 px-2">
          {navItems.map((item) => {
            const active =
              item.href === '/'
                ? pathname === '/'
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => {
                  // モバイルではリンクをクリックしたらサイドバーを閉じる
                  if (window.innerWidth < 1024) {
                    onClose();
                  }
                }}
                className={`flex items-center gap-3 rounded-lg px-4 py-2 text-sm transition
                  ${
                    active
                      ? 'bg-slate-800 text-blue-200'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-slate-100'
                  }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="px-5 pb-6 text-xs text-slate-500">
          © {new Date().getFullYear()} Dog RAG
        </div>
      </aside>
    </>
  );
}
