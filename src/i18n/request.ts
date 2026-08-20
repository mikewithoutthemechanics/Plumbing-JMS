import { notFound } from 'next/navigation';
import { getRequestConfig } from 'next-intl/server';
import { locales, Locale } from './locales';

export default getRequestConfig(async ({ locale }: { locale?: string }) => {
  const resolvedLocale = locale ?? 'en';
  
  if (!locales.includes(resolvedLocale as Locale)) {
    notFound();
  }

  return {
    locale: resolvedLocale,
    messages: (await import(`./messages/${resolvedLocale}.json`)).default,
  };
});