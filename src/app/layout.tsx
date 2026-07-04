import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Punctual Plumbers',
  description: 'Professional plumbing job management system',
  openGraph: {
    title: 'Punctual Plumbers',
    description: 'Professional plumbing job management system',
    url: 'https://punctualplumbers.example.com',
    siteName: 'Punctual Plumbers'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Punctual Plumbers',
    description: 'Professional plumbing job management system'
  }
};

const inter = Inter({ subsets: ['latin'] });

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
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}