import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';
import { logger } from './logger';

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

  // Only set up the web-vitals listeners if we have either a user handler or a logging endpoint
  if (onPerfEntry || process.env.NEXT_PUBLIC_LOGGING_ENDPOINT) {
    getCLS(handler);
    getFID(handler);
    getFCP(handler);
    getLCP(handler);
    getTTFB(handler);
  }
};

export default reportWebVitals;