'use client';

import { useEffect } from 'react';
import reportWebVitals from '@/lib/performance';

export default function Analytics() {
  useEffect(() => {
    reportWebVitals(console.log);
  }, []);

  return null;
}