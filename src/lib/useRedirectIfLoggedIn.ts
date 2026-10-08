'use client';

import { useEffect } from 'react';

// Auth/OTP pages: if the user is already logged in (e.g. they pressed Back from home
// and the browser restored this page from its back/forward cache, skipping the
// proxy redirect), send them on — home if subscribed, else the subscription page.
export function useRedirectIfLoggedIn() {
  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch('/api/user/profile', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (!data.success) return;
        const campaign = localStorage.getItem('mr_campaign');
        window.location.replace(
          data.data.sub_status
            ? '/'
            : `/subscription${campaign ? `?c=${encodeURIComponent(campaign)}` : ''}`,
        );
      } catch {
        // offline / not logged in — stay on the page
      }
    };

    check();
    const onShow = (e: PageTransitionEvent) => {
      if (e.persisted) check();
    };
    window.addEventListener('pageshow', onShow);
    return () => window.removeEventListener('pageshow', onShow);
  }, []);
}
