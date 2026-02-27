import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '名古屋クイズバトル🏯',
  description: '岩手県民が思わず笑う早押クイズ',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="bg-slate-900 text-white min-h-screen">{children}</body>
    </html>
  );
}
