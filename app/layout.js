import { Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import BottomNav from '@/components/BottomNav';

const sans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['400', '500', '600', '700', '800'],
});

const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['500', '600', '700'],
});

export const metadata = {
  title: 'Nafilah POS',
  description: 'Aplikasi kasir, antrian, dan menu untuk kedai Nafilah',
  manifest: '/manifest.json',
  icons: {
    icon: '/icon-512.png',
    apple: '/icon-192.png',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#f0a92a',
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body className={`${sans.variable} ${mono.variable} font-sans bg-stone-100`}>
        <div className="max-w-md mx-auto min-h-screen bg-white relative pb-16 shadow-sm">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-stone-100">
            <img src="/logo.png" alt="Nafilah" className="h-7 w-auto" />
            <span className="font-extrabold text-stone-700 text-sm tracking-wide">
            Nafilah Kitchen
            </span>
          </div>
          {children}
        </div>
        <BottomNav />
      </body>
    </html>
  );
}
