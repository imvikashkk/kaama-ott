'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { INK, LINE, PANEL, RED, YELLOW } from '@/lib/brand';

interface OrderInfo {
  status: string;
  amount: number;
  planName: string;
  payeeName: string;
  upiLink: string;
  qrCode: string;
  expiresAt: string | null;
}

const POLL_MS = 3000;

// PhonePe rejects this merchant's intent links (tap-to-pay) but accepts the same order QR when scanned,
// so payment is QR-only: scanned from another screen, or saved and picked from the gallery inside PhonePe.
// The order id travels in the QR's `tr`, so a scanned payment is still auto-verified.
const PHONEPE_ICON = '/upi/phonepe.png';

const isMobile = () => /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

function formatLeft(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

// Bottom sheet on mobile, centered popup on desktop. Polls /api/payment/verify until the order settles;
// closing it only hides the UI — the backend watcher still activates a payment made later.
export default function UpiPaySheet({ txnId, onClose }: { txnId: string; onClose: () => void }) {
  const [state, setState] = useState<'loading' | 'pay' | 'success' | 'failed'>('loading');
  const [msg, setMsg] = useState('');
  const [order, setOrder] = useState<OrderInfo | null>(null);
  const [left, setLeft] = useState<number | null>(null);
  const [mobile, setMobile] = useState(true);
  const doneRef = useRef(false);
  const busyRef = useRef(false);

  const fail = useCallback((text: string) => {
    if (doneRef.current) return;
    doneRef.current = true;
    setState('failed');
    setMsg(text);
  }, []);

  // Returns true once the order reached a final state
  const verify = useCallback(async (): Promise<boolean> => {
    if (doneRef.current || busyRef.current) return doneRef.current;
    busyRef.current = true;
    try {
      const res = await fetch('/api/payment/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ txnId }),
      });
      const data = await res.json();

      if (data.success) {
        doneRef.current = true;
        localStorage.removeItem('mr_campaign');
        localStorage.removeItem('mr_meta_campaign_id');
        localStorage.removeItem('mr_meta_campaign_name');
        setState('success');
        setMsg('Payment successful! Subscription active ho gayi 🎉');
        setTimeout(() => {
          window.location.href = '/';
        }, 1800);
        return true;
      }
      if (data.message !== 'Payment not completed yet') {
        fail('Payment failed ya cancel ho gaya.');
        return true;
      }
      return false;
    } catch {
      // Transient network error — keep polling
      return false;
    } finally {
      busyRef.current = false;
    }
  }, [txnId, fail]);

  // Load the UPI link / QR for this order
  useEffect(() => {
    fetch(`/api/payment/order?txnId=${encodeURIComponent(txnId)}`)
      .then(async (r) => {
        if (r.status === 401) {
          window.location.href = '/auth';
          return;
        }
        const data = await r.json();
        if (!data.success) return fail('Order nahi mila.');
        const o: OrderInfo = data.data;
        if (o.status === 'success') {
          verify();
          return;
        }
        if (o.status !== 'pending' || !o.upiLink) return fail('Payment failed ya cancel ho gaya.');
        setOrder(o);
        setState('pay');
      })
      .catch(() => fail('Network error. Please try again.'));
  }, [txnId, fail, verify]);

  // Poll while open, and check right away when the user returns from the UPI app
  useEffect(() => {
    if (state !== 'pay') return;
    const id = setInterval(verify, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') verify();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [state, verify]);

  // Countdown to QR expiry; one last check before giving up
  useEffect(() => {
    if (state !== 'pay' || !order?.expiresAt) return;
    const end = new Date(order.expiresAt).getTime();
    let id: ReturnType<typeof setInterval> | undefined = undefined;
    const tick = async () => {
      const ms = end - Date.now();
      setLeft(ms);
      if (ms <= 0) {
        clearInterval(id);
        if (!(await verify())) fail('Payment time khatam ho gaya. Dobara try karo.');
      }
    };
    id = setInterval(tick, 1000);
    tick();
    return () => clearInterval(id);
  }, [state, order, verify, fail]);

  useEffect(() => {
    setMobile(isMobile());
  }, []);

  // Lock background scroll while open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const canClose = state !== 'success';
  const color = state === 'success' ? '#22c55e' : state === 'failed' ? RED : YELLOW;

  return (
    <div className="k-body fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4" style={{ background: 'transparent' }}>
      <style>{`
        @keyframes upiFade { from{opacity:0} to{opacity:1} }
        @keyframes upiUp { from{transform:translateY(100%)} to{transform:translateY(0)} }
        @keyframes upiPop { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        .upi-backdrop { animation: upiFade .25s ease both; }
        .upi-panel { animation: upiUp .35s cubic-bezier(.22,1,.36,1) both; }
        @media (min-width: 640px) { .upi-panel { animation: upiPop .3s cubic-bezier(.22,1,.36,1) both; } }
      `}</style>

      {/* Backdrop is inert on purpose — only the ✕ button closes the sheet */}
      <div className="upi-backdrop absolute inset-0" style={{ background: 'rgba(12,8,9,.8)' }} />

      <div
        role="dialog"
        aria-modal="true"
        className="upi-panel relative w-full sm:max-w-sm max-h-[92dvh] overflow-y-auto rounded-t-xl sm:rounded-xl px-5 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:pb-5"
        style={{ background: PANEL, border: `1px solid ${LINE}`, borderTop: `3px solid ${color}` }}
      >
        {canClose && (
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute top-3 right-3 w-8 h-8 rounded-md flex items-center justify-center text-white/60 hover:text-white transition-colors cursor-pointer"
            style={{ background: 'transparent', border: `1px solid ${LINE}` }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}

        {state === 'loading' && (
          <div className="py-12 text-center">
            <div
              className="w-10 h-10 rounded-full border-[3px] mx-auto mb-4 animate-spin"
              style={{ borderColor: `${color} transparent ${color} ${color}` }}
            />
            <p className="m-0 text-white/60 text-sm">Payment load ho raha hai...</p>
          </div>
        )}

        {state === 'pay' && order && (
          <>
            {/* Bill */}
            <div className="pr-10">
              <p className="m-0 text-[10px] font-bold tracking-[.22em] uppercase text-white/45">{order.planName}</p>
              <p className="k-display m-0 mt-1 text-[48px] leading-none" style={{ color: YELLOW }}>
                ₹{order.amount}
              </p>
              {order.payeeName && <p className="m-0 mt-1 text-[12px] text-white/45">Paying to {order.payeeName}</p>}
            </div>

            <div className="my-4" style={{ borderTop: `2px dashed ${LINE}` }} />

            <p className="m-0 mb-3 flex items-center justify-center gap-2 text-[13px] font-bold text-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={PHONEPE_ICON} alt="" className="w-5 h-5 rounded-sm bg-white object-contain" />
              Only PhonePe supported
            </p>

            {order.qrCode && (
              <div className="flex flex-col items-center mb-5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={order.qrCode} alt="UPI QR" className="w-52 h-52 rounded-sm bg-white p-1.5" />
                {mobile ? (
                  <>
                    <a
                      href={order.qrCode}
                      download={`kaama-pay-${order.amount}.png`}
                      className="flex items-center justify-center gap-2 w-full h-14 mt-4 rounded-md text-[15px] font-extrabold no-underline transition-transform active:scale-[.98]"
                      style={{ background: YELLOW, color: INK, boxShadow: `4px 4px 0 ${RED}` }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 3v12" />
                        <polyline points="7,10 12,15 17,10" />
                        <path d="M5 21h14" />
                      </svg>
                      QR save karo
                    </a>
                    <p className="m-0 mt-3 text-center text-[12px] leading-relaxed text-white/60">
                      PhonePe kholo → <span className="text-white font-semibold">Scan</span> → <span className="text-white font-semibold">Gallery</span> se ye QR chuno
                    </p>
                  </>
                ) : (
                  <p className="m-0 mt-2 text-[12px] text-white/60">PhonePe se scan karo</p>
                )}
              </div>
            )}

            <div className="flex items-center justify-between gap-2 rounded-md px-3 h-10 text-[12px]" style={{ background: 'rgba(245,239,230,.04)' }}>
              <span className="inline-flex items-center gap-2 text-white/60">
                <span
                  className="w-3 h-3 rounded-full border-2 animate-spin"
                  style={{ borderColor: `${color} transparent ${color} ${color}` }}
                />
                Payment ka wait...
              </span>
              {left !== null && left > 0 && <span className="k-display text-[16px]" style={{ color: YELLOW }}>{formatLeft(left)}</span>}
            </div>
            <p className="m-0 mt-2 text-center text-white/35 text-[11px]">Payment ke baad ye screen band mat karo</p>
          </>
        )}

        {(state === 'success' || state === 'failed') && (
          <div className="py-8 text-center">
            <div
              className="w-16 h-16 rounded-md flex items-center justify-center mx-auto mb-5"
              style={{ background: color, color: INK }}
            >
              {state === 'success' ? (
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20,6 9,17 4,12" />
                </svg>
              ) : (
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3} strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              )}
            </div>
            <p className="m-0 mb-1 text-white text-lg font-bold">{msg}</p>
            {state === 'success' ? (
              <p className="m-0 text-white/45 text-sm">Home page pe le ja rahe hain...</p>
            ) : (
              <button
                onClick={onClose}
                className="mt-5 w-full h-12 rounded-md text-[14px] font-extrabold cursor-pointer"
                style={{ background: YELLOW, color: INK, border: 0 }}
              >
                Dobara try karo
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
