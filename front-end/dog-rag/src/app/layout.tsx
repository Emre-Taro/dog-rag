import './globals.css';
import type { Metadata } from 'next';
import { AppShell } from '../components/layout/Appshell';

export const metadata: Metadata = {
  title: 'Dog Health RAG',
  description: 'ペットの健康管理ダッシュボード',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="bg-slate-950">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
