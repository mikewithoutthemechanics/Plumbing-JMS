import { Inter, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import type { Metadata, Viewport } from 'next';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: 'Punctual Plumbers',
  description: 'Professional plumbing job management, beautifully simple.',
  openGraph: {
    title: 'Punctual Plumbers',
    description: 'Professional plumbing job management, beautifully simple.',
    url: 'https://plumbing-jms.vercel.app',
    siteName: 'Punctual Plumbers'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Punctual Plumbers',
    description: 'Professional plumbing job management, beautifully simple.'
  },
  manifest: '/manifest.json',
  themeColor: '#2563eb',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Punctual Plumbers',
  },
};

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const display = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-display', display: 'swap' });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
<head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#2563eb" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icon-512.png" />
      </head>
      <body className={`${inter.variable} ${display.variable} ${inter.className}`}>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.register('/sw.js').catch(console.error);
              }
            `,
          }}
        />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}