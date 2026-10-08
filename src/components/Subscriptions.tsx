'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import SupportButton from './SupportButton';
import UpiPaySheet from './UpiPaySheet';
import { HeaderAction, IconBack, SiteHeader } from './SiteChrome';
import { INK, LINE, PANEL, RED, YELLOW } from '@/lib/brand';

// Ticket stamp per plan index (order from API: cheapest first)
const UI_META: { badge: string | null }[] = [
  { badge: null },
  { badge: 'Sabse popular' },
  { badge: 'Best value' },
  { badge: 'Sabse sasta / din' },
];

interface ApiPlan {
  id: number;
  name: string;
  price: number;
  original_price: number;
  duration_days: number;
  description: string;
}

interface Plan extends ApiPlan {
  badge: string | null;
  duration: string;
}

function formatDuration(days: number): string {
  if (days >= 365) return `${Math.round(days / 365)} Year`;
  if (days >= 30)
    return `${Math.round(days / 30)} Month${Math.round(days / 30) > 1 ? 's' : ''}`;
  return `${days} Day${days > 1 ? 's' : ''}`;
}

export default function SubscriptionsPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<number | null>(null);
  const [paying, setPaying] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [error, setError] = useState('');
  const [payTxnId, setPayTxnId] = useState<string | null>(null);
  const router = useRouter();
  const sel = plans.find((p) => p.id === selected) ?? null;

  // Back from the gateway's checkout restores this page from bfcache with the button still spinning
  useEffect(() => {
    const onShow = (e: PageTransitionEvent) => {
      if (e.persisted) setPaying(false);
    };
    window.addEventListener('pageshow', onShow);
    return () => window.removeEventListener('pageshow', onShow);
  }, []);

  useEffect(() => {
    // Check subscription via API (cookie-based auth)
    fetch('/api/user/profile')
      .then(async (r) => {
        if (r.status === 401) {
          // Token invalid/expired — force re-login
          await fetch('/api/auth/logout', { method: 'POST' });
          localStorage.removeItem('mr_mobile');
          localStorage.removeItem('mr_pending_plan');
          window.location.href = '/auth';
          return;
        }
        const data = await r.json();
        // Subscription got activated in the background (e.g. pay sheet closed before confirmation);
        // the response just refreshed the cookies, so go home
        if (data.success && data.subActivated) {
          localStorage.removeItem('mr_campaign');
          localStorage.removeItem('mr_meta_campaign_id');
          localStorage.removeItem('mr_meta_campaign_name');
          window.location.replace('/');
          return;
        }
        if (data.success && data.data.plan_name && data.data.sub_status === 'active') {
          setIsSubscribed(true);
        }
      })
      .catch(() => setIsSubscribed(false));

    fetch('/api/plans')
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          const mapped: Plan[] = data.data.map((p: ApiPlan, i: number) => ({
            ...p,
            duration: formatDuration(p.duration_days),
            ...(UI_META[i] ?? UI_META[UI_META.length - 1]),
          }));
          setPlans(mapped);
          setSelected(mapped[1]?.id ?? mapped[0]?.id ?? null);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    localStorage.removeItem('mr_mobile');
    localStorage.removeItem('mr_pending_plan');
    window.location.href = '/auth';
  };

  const handlePay = async () => {
    setError('');

    if (!selected) {
      setError('Please select a plan first.');
      return;
    }

    setPaying(true);
    try {
      const getCookie = (name: string) =>
        document.cookie.split('; ').find((r) => r.startsWith(name + '='))?.split('=')[1] ?? '';

      const slug             = localStorage.getItem('mr_campaign') ?? '';
      const metaCampaignId   = localStorage.getItem('mr_meta_campaign_id') ?? '';
      const metaCampaignName = localStorage.getItem('mr_meta_campaign_name') ?? '';
      const res = await fetch('/api/payment/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: selected,
          fbp: getCookie('_fbp'),
          fbc: getCookie('_fbc'),
          campaignSlug: slug,
          metaCampaignId:   metaCampaignId   || null,
          metaCampaignName: metaCampaignName || null,
        }),
      });
      if (res.status === 401) {
        await fetch('/api/auth/logout', { method: 'POST' });
        localStorage.clear();
        window.location.href = '/auth';
        return;
      }
      const data = await res.json();
      if (data.success) {
        setPayTxnId(data.data.txnId);
      } else {
        setError(data.message ?? 'Payment failed. Try again.');
        setPaying(false);
      }
    } catch {
      setError('Payment start nahi ho saka. Please try again.');
      setPaying(false);
    }
  };

  return (
    <main className="k-body k-grain relative min-h-[100dvh] overflow-x-hidden pb-28">
      <style>{`
        .k-ticket { transition: border-color .2s ease; }
        .k-ticket:focus-visible { box-shadow: 0 0 0 3px rgba(250,204,21,.35); }
        @keyframes kSpin { to { transform: rotate(360deg); } }
      `}</style>

      {/* Same collage as /auth, dimmed so the plan tickets stay readable */}
      <div className="fixed inset-0 overflow-hidden" aria-hidden>
        <picture>
          <source media="(max-width: 1023px)" srcSet="/assets/image/auth_bg_mobile.jpg" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/image/auth_bg.png"
            alt=""
            className="absolute inset-0 w-full h-full object-cover object-top lg:object-center"
          />
        </picture>
        <div className="absolute inset-0" style={{ background: 'rgba(12,8,9,.72)' }} />
      </div>

      <SiteHeader
        right={
          <>
            {isSubscribed && (
              <HeaderAction href="/">
                <IconBack s={14} /> <span className="hidden sm:inline">Home</span>
              </HeaderAction>
            )}
            <SupportButton />
            <HeaderAction onClick={handleLogout}>Logout</HeaderAction>
          </>
        }
      />

      <div className="relative z-10 mx-auto w-full max-w-xl px-4 pt-6 md:pt-10">
        {/* ── Header ── */}
        <div className="k-rise">
          <p className="k-hindi m-0 text-[22px] font-extrabold leading-none" style={{ color: RED }}>
            गरमा गरम !
          </p>
          <h1 className="k-display m-0 mt-2 text-[44px] md:text-[60px] text-white">
            Apna <span style={{ color: YELLOW }}>pass</span> chuno
          </h1>
          <p className="m-0 mt-2 text-[13px] text-white/55">
            Poori library unlock · Mobile ya laptop, kahin bhi dekho
          </p>
        </div>

        {/* ── Tickets ── */}
        <div className="mt-7 flex flex-col gap-3" role="radiogroup" aria-label="Plans">
          {loading &&
            [0, 1, 2, 3].map((i) => (
              <div key={i} className="h-[92px] rounded-lg animate-pulse" style={{ background: PANEL, border: `1px solid ${LINE}` }} />
            ))}

          {!loading &&
            plans.map((plan, i) => {
              const isSel = selected === plan.id;
              const off =
                plan.original_price > plan.price
                  ? Math.round(((plan.original_price - plan.price) / plan.original_price) * 100)
                  : 0;
              return (
                <div
                  key={plan.id}
                  role="radio"
                  aria-checked={isSel}
                  tabIndex={0}
                  onClick={() => setSelected(plan.id)}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setSelected(plan.id)}
                  className="k-ticket k-rise relative flex items-stretch rounded-lg cursor-pointer select-none outline-none"
                  style={{
                    animationDelay: `${0.05 + i * 0.06}s`,
                    background: PANEL,
                    border: `1.5px solid ${isSel ? YELLOW : LINE}`,
                  }}
                >
                  {/* Stub */}
                  <div
                    className="w-[96px] sm:w-[112px] shrink-0 flex flex-col items-center justify-center rounded-l-[7px] py-3"
                    style={{ background: isSel ? YELLOW : 'rgba(245,239,230,.04)', color: isSel ? INK : '#fff' }}
                  >
                    <span className="k-display text-[34px] sm:text-[38px] leading-none">{plan.duration.split(' ')[0]}</span>
                    <span className="text-[10px] font-bold tracking-[.18em] uppercase mt-1 opacity-70">
                      {plan.duration.split(' ').slice(1).join(' ')}
                    </span>
                  </div>

                  {/* Perforation */}
                  <div className="relative w-0 shrink-0" style={{ borderLeft: `2px dashed ${isSel ? INK : LINE}` }}>
                    <span className="absolute -top-[9px] -left-[9px] w-4 h-4 rounded-full" style={{ background: '#0c0809', border: `1.5px solid ${isSel ? YELLOW : LINE}`, clipPath: 'inset(50% 0 0 0)' }} />
                    <span className="absolute -bottom-[9px] -left-[9px] w-4 h-4 rounded-full" style={{ background: '#0c0809', border: `1.5px solid ${isSel ? YELLOW : LINE}`, clipPath: 'inset(0 0 50% 0)' }} />
                  </div>

                  {/* Body */}
                  <div className="flex-1 min-w-0 flex items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="k-display text-[30px] leading-none" style={{ color: isSel ? YELLOW : '#fff' }}>
                          ₹{plan.price}
                        </span>
                        {off > 0 && (
                          <>
                            <span className="text-[13px] text-white/40 line-through">₹{plan.original_price}</span>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-sm text-white" style={{ background: RED }}>
                              {off}% OFF
                            </span>
                          </>
                        )}
                      </div>
                      <p className="m-0 mt-1 text-[12px] font-semibold text-white/80">{plan.name}</p>
                      {plan.description && <p className="m-0 mt-0.5 text-[12px] text-white/50 leading-snug">{plan.description}</p>}
                    </div>

                    {/* Radio */}
                    <span
                      className="w-6 h-6 shrink-0 rounded-full flex items-center justify-center"
                      style={{ border: `2px solid ${isSel ? YELLOW : 'rgba(245,239,230,.25)'}` }}
                    >
                      {isSel && <span className="w-3 h-3 rounded-full" style={{ background: YELLOW }} />}
                    </span>
                  </div>

                  {/* Stamp */}
                  {plan.badge && (
                    <span
                      className="absolute -top-2.5 right-3 text-[10px] font-extrabold tracking-[.12em] uppercase px-2 py-0.5 rotate-[-3deg] pointer-events-none"
                      style={{ background: RED, color: '#fff', boxShadow: `2px 2px 0 ${INK}` }}
                    >
                      {plan.badge}
                    </span>
                  )}
                </div>
              );
            })}
        </div>

        {/* Trust */}
        <ul className="m-0 mt-6 p-0 list-none grid grid-cols-3 gap-2 text-center">
          {['UPI se secure payment', 'Turant access', 'Koi auto-debit nahi'].map((t) => (
            <li key={t} className="text-[11px] text-white/45 px-2 py-2 rounded-md" style={{ border: `1px solid ${LINE}` }}>
              {t}
            </li>
          ))}
        </ul>
      </div>

      {/* Sticky CTA */}
      <div className="fixed inset-x-0 bottom-0 z-50 px-4 pt-3 pb-[max(.75rem,env(safe-area-inset-bottom))]" style={{ background: INK, borderTop: `1px solid ${LINE}` }}>
        <div className="mx-auto max-w-xl flex flex-col gap-1.5">
          {error && <p className="m-0 text-[12px] text-center" style={{ color: RED }}>{error}</p>}
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="m-0 text-[10px] font-bold uppercase tracking-[.2em] text-white/40">Aapka pass</p>
              <p className="m-0 mt-0.5 text-[14px] font-bold text-white truncate">
                {sel ? (
                  <>
                    {sel.name} <span style={{ color: YELLOW }}>₹{sel.price}</span>
                  </>
                ) : (
                  '—'
                )}
              </p>
            </div>
            <button
              onClick={handlePay}
              disabled={paying || !sel}
              className="shrink-0 h-12 px-6 rounded-md text-[14px] font-extrabold cursor-pointer disabled:opacity-60 inline-flex items-center gap-2"
              style={{ background: YELLOW, color: INK, border: 0, boxShadow: `4px 4px 0 ${RED}` }}
            >
              {paying ? (
                <>
                  <span className="w-4 h-4 rounded-full border-2" style={{ borderColor: `${INK} transparent ${INK} ${INK}`, animation: 'kSpin .8s linear infinite' }} />
                  Ruko...
                </>
              ) : (
                <>Pay ₹{sel?.price ?? ''} →</>
              )}
            </button>
          </div>
        </div>
      </div>

      {payTxnId && (
        <UpiPaySheet
          txnId={payTxnId}
          onClose={() => {
            setPayTxnId(null);
            setPaying(false);
          }}
        />
      )}
    </main>
  );
}
