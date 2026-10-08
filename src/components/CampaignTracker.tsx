'use client';

import { useEffect } from 'react';
import Script from 'next/script';

declare global {
  interface Window {
    fbq: ((...args: unknown[]) => void) & { callMethod?: (...args: unknown[]) => void; queue: unknown[]; loaded: boolean; version: string; push: (...args: unknown[]) => void };
    _fbq: unknown;
  }
}

export default function CampaignTracker() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const slug = params.get('c');
    if (slug) {
      localStorage.setItem('mr_campaign', slug);
    }

    const metaCampaignId   = params.get('meta_campaign_id');
    const metaCampaignName = params.get('meta_campaign_name');
    const isResolved = (v: string) => !v.includes('{{');
    if (metaCampaignId   && isResolved(metaCampaignId))   localStorage.setItem('mr_meta_campaign_id',   metaCampaignId);
    if (metaCampaignName && isResolved(metaCampaignName)) localStorage.setItem('mr_meta_campaign_name', metaCampaignName);

    const campaignSlug = slug || localStorage.getItem('mr_campaign') || '';
    if (!campaignSlug) return;

    fetch(`/api/pixel-config?c=${encodeURIComponent(campaignSlug)}`)
      .then((r) => r.json())
      .then(({ pixelId }: { pixelId: string | null }) => {
        if (!pixelId || typeof window.fbq !== 'function') return;
        // Only init once per session — fbq queues events until init, so re-init causes duplicate sends
        if ((window as any).__mr_pixel_inited === pixelId) return;
        (window as any).__mr_pixel_inited = pixelId;
        window.fbq('init', pixelId);
        window.fbq('track', 'PageView');
      })
      .catch(() => {});
  }, []);

  return (
    <Script id="meta-pixel-base" strategy="afterInteractive">{`
      !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
      n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}
      (window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
    `}</Script>
  );
}
