import { Inter, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import type { Metadata } from 'next';

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
  }
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
      </head>
      <body className={`${inter.variable} ${display.variable} ${inter.className}`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}