'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/input', label: 'ダッシュボード', icon: '📊' },
  { href: '/records', label: '記録一覧', icon: '📋' },
  { href: '/dashboard', label: '分析・レポート', icon: '📈' },
  { href: '/dog-profile', label: 'ペット管理', icon: '🐾' },
  { href: '/rag', label: 'AI相談', icon: '💬' },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-64 flex-col bg-slate-900 text-slate-100">
      <div className="flex items-center gap-3 px-5 pt-6 pb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500">
          <span className="text-xl">🐶</span>
        </div>
        <div>
          <div className="text-sm text-slate-300">リアルタイム管理</div>
          <div className="text-base font-semibold">ペット健康管理</div>
        </div>
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
  );
}
