'use client';

import { useEffect } from 'react';

export default function BackForwardReload() {
  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      const nav = performance.getEntriesByType('navigation')[0] as
        | PerformanceNavigationTiming
        | undefined;
      const isBackForward = event.persisted || nav?.type === 'back_forward';

      if (isBackForward) {
        window.location.reload();
      }
    };

    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, []);

  return null;
}
