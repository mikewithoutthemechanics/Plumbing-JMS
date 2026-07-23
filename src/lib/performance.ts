import { onCLS, onFCP, onINP, onLCP, onTTFB } from 'web-vitals';
import { logger } from '@/lib/logger';

const reportWebVitals = (onPerfEntry?: (metric: any) => void) => {
  const handler = (metric: any) => {
    // If a user handler is provided, call it
    if (onPerfEntry) {
      onPerfEntry(metric);
    }

    // If we have a logging endpoint, send to our logger
    if (process.env.NEXT_PUBLIC_LOGGING_ENDPOINT) {
      logger.info(`Web Vitals: ${metric.name}`, {
        value: metric.value,
        id: metric.id,
      });
    }
  };

  // Only set up the web-vitals listeners if we are in the browser
  if (typeof window !== 'undefined') {
    onCLS(handler);
    onFCP(handler);
    onINP(handler);
    onLCP(handler);
    onTTFB(handler);
  }
};

export default reportWebVitals;
