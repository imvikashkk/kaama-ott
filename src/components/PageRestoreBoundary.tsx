'use client';

import { useEffect, useState } from 'react';

export default function PageRestoreBoundary({
  children,
}: {
  children: React.ReactNode;
}) {
  const [key, setKey] = useState(0);

  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      const nav = performance.getEntriesByType('navigation')[0] as
        | PerformanceNavigationTiming
        | undefined;
      const isBackForward = event.persisted || nav?.type === 'back_forward';

      if (isBackForward) {
        setKey((k) => k + 1);
      }
    };

    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, []);

  return <div key={key}>{children}</div>;
}
