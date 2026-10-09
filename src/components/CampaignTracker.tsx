'use client';

import { useEffect } from 'react';

declare global {
  interface Window {
    fbq: ((...args: unknown[]) => void) & { callMethod?: (...args: unknown[]) => void; queue: unknown[]; loaded: boolean; version: string; push: (...args: unknown[]) => void };
    _fbq: unknown;
  }
}

// Meta pixel base code — defines the fbq queue synchronously, so init below never races the script load
function loadPixelBase() {
  if (typeof window.fbq === 'function') return;
  const n = function (...args: unknown[]) {
    if (n.callMethod) n.callMethod(...args);
    else n.queue.push(args);
  } as Window['fbq'];
  window.fbq = n;
  if (!window._fbq) window._fbq = n;
  n.push = n;
  n.loaded = true;
  n.version = '2.0';
  n.queue = [];
  const t = document.createElement('script');
  t.async = true;
  t.src = 'https://connect.facebook.net/en_US/fbevents.js';
  document.head.appendChild(t);
}

function getCookie(name: string) {
  return document.cookie.split('; ').find((r) => r.startsWith(name + '='))?.split('=')[1] ?? '';
}

// Set _fbp/_fbc in Meta's own format when the pixel hasn't (ad blocker, slow script) — CAPI reads them
// server-side to match purchases to the ad click. fbevents.js reuses these cookies if present.
function ensureFbCookies(fbclid: string | null) {
  const opts = `; path=/; max-age=${60 * 60 * 24 * 90}; SameSite=Lax`;
  if (!getCookie('_fbp')) {
    document.cookie = `_fbp=fb.1.${Date.now()}.${Math.floor(Math.random() * 1e10)}${opts}`;
  }
  if (fbclid && !getCookie('_fbc').endsWith(`.${fbclid}`)) {
    document.cookie = `_fbc=fb.1.${Date.now()}.${fbclid}${opts}`;
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

    ensureFbCookies(params.get('fbclid'));
    loadPixelBase();

    fetch(`/api/pixel-config?c=${encodeURIComponent(campaignSlug)}`)
      .then((r) => r.json())
      .then(({ pixelId }: { pixelId: string | null }) => {
        if (!pixelId) return;
        // Only init once per session — fbq queues events until init, so re-init causes duplicate sends
        if ((window as any).__mr_pixel_inited === pixelId) return;
        (window as any).__mr_pixel_inited = pixelId;
        window.fbq('init', pixelId);
        window.fbq('track', 'PageView');
      })
      .catch(() => {});
  }, []);

  return null;
}
