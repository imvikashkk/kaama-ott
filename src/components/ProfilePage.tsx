'use client';

import { useState, useEffect, useLayoutEffect } from 'react';
import { HeaderAction, IconBack, IconHelp, SiteHeader } from './SiteChrome';
import { INK, LINE, PANEL, RED, YELLOW } from '@/lib/brand';

interface UserProfile {
  mobile: string;
  plan_name: string | null;
  plan_price: number | null;
  duration_days: number | null;
  end_date: string | null;
  sub_status: string | null;
  days_left: number | null;
}

const CACHE_KEY = 'mr_profile';

function formatExpiry(dateStr: string | null) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatDuration(days: number | null) {
  if (!days) return null;
  if (days >= 365) return `${Math.round(days / 365)} Year`;
  if (days >= 30)
    return `${Math.round(days / 30)} Month${Math.round(days / 30) > 1 ? 's' : ''}`;
  return `${days} Day${days > 1 ? 's' : ''}`;
}

function readCache(): UserProfile | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as UserProfile) : null;
  } catch {
    return null;
  }
}

function writeCache(data: UserProfile) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {}
}

function clearCache() {
  try {
    sessionStorage.removeItem(CACHE_KEY);
  } catch {}
}

export default function ProfilePage() {
  const [showLogout, setShowLogout] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [fromCache, setFromCache] = useState(false);

  // ✅ useLayoutEffect — browser paint se PEHLE chalta hai (synchronous flush)
  // Server pe nahi chalta, sirf client pe — isliye SSR mismatch nahi hoga
  // Agar cache hai → skeleton kabhi user ko dikhta hi nahi
  useLayoutEffect(() => {
    const cached = readCache();
    if (cached) {
      setProfile(cached);
      setLoading(false);
      setFromCache(true);
    }
  }, []);

  useEffect(() => {
    const getCookie = (name: string) =>
      document.cookie.split('; ').find((r) => r.startsWith(name + '='))?.split('=')[1] ?? '';

    const mobile = localStorage.getItem('mr_mobile') || getCookie('mr_mob');

    if (!localStorage.getItem('mr_mobile') && mobile) {
      localStorage.setItem('mr_mobile', mobile);
    }

    // Cache se data aa gaya → network call skip
    if (profile !== null) return;

    fetch('/api/user/profile')
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setProfile(data.data);
          writeCache(data.data);
        } else {
          setProfile({
            mobile: mobile ?? '',
            plan_name: null,
            plan_price: null,
            duration_days: null,
            end_date: null,
            sub_status: null,
            days_left: null,
          });
        }
      })
      .catch(() => {
        setProfile({
          mobile: mobile ?? '',
          plan_name: null,
          plan_price: null,
          duration_days: null,
          end_date: null,
          sub_status: null,
          days_left: null,
        });
      })
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    localStorage.clear();
    clearCache();
    window.location.href = '/auth';
  };

  // Renew / buy goes through the plans page so the user picks a plan (and the purchase gets campaign attribution)
  const handleRenew = () => {
    setPaying(true);
    window.location.href = '/subscription';
  };

  const hasSub = profile?.plan_name && profile?.sub_status === 'active';

  const anim = (delay: string) =>
    fromCache
      ? {}
      : { animation: `kRise .5s cubic-bezier(.22,1,.36,1) ${delay} both` };

  // Share of the plan still left — drives the meter on the pass
  const leftPct =
    hasSub && profile.duration_days && profile.days_left !== null
      ? Math.max(4, Math.min(100, Math.round((profile.days_left / profile.duration_days) * 100)))
      : 0;
  const low = profile?.days_left !== null && profile?.days_left !== undefined && profile.days_left <= 3;

  return (
    <main className="k-body k-grain relative min-h-[100dvh] overflow-x-hidden">
      <SiteHeader
        right={
          <>
            <HeaderAction href="/">
              <IconBack s={14} /> Home
            </HeaderAction>
            <HeaderAction href="/support">
              <IconHelp s={14} /> <span className="hidden sm:inline">Support</span>
            </HeaderAction>
          </>
        }
      />

      <div className="relative z-10 mx-auto max-w-md px-4 pt-8 pb-12">
        <h1 className="k-display m-0 text-[44px] text-white" style={{ ...anim('0s'), opacity: fromCache ? 1 : 0 }}>
          Mera <span style={{ color: YELLOW }}>account</span>
        </h1>

        {/* ── Membership pass ── */}
        <section
          className="relative mt-6 rounded-xl overflow-hidden"
          style={{
            ...anim('.06s'),
            opacity: fromCache ? 1 : 0,
            background: hasSub ? YELLOW : PANEL,
            color: hasSub ? INK : '#fff',
            border: `1.5px solid ${hasSub ? YELLOW : LINE}`,
            boxShadow: hasSub ? `6px 6px 0 ${RED}` : 'none',
          }}
        >
          <div className="flex items-start justify-between px-5 pt-5">
            <div>
              <p className="m-0 text-[10px] font-bold tracking-[.25em] uppercase opacity-60">Kaama pass</p>
              {loading ? (
                <div className="mt-2 h-8 w-40 rounded animate-pulse" style={{ background: 'rgba(128,128,128,.25)' }} />
              ) : (
                <p className="k-display m-0 mt-1 text-[34px]">{hasSub ? profile.plan_name : 'Koi pass nahi'}</p>
              )}
            </div>
            <span
              className="k-display text-[13px] px-2 py-1 rounded-sm"
              style={{ background: hasSub ? INK : 'rgba(245,239,230,.08)', color: hasSub ? YELLOW : 'rgba(245,239,230,.5)' }}
            >
              {loading ? '···' : hasSub ? 'Active' : 'Inactive'}
            </span>
          </div>

          <div className="px-5 pt-4 pb-5 grid grid-cols-2 gap-4">
            <div>
              <p className="m-0 text-[10px] font-bold tracking-[.2em] uppercase opacity-55">Mobile</p>
              {loading ? (
                <div className="mt-1.5 h-5 w-32 rounded animate-pulse" style={{ background: 'rgba(128,128,128,.25)' }} />
              ) : (
                <p className="m-0 mt-1 text-[15px] font-bold tracking-wide">+91 {profile?.mobile || '—'}</p>
              )}
            </div>
            {hasSub && (
              <div>
                <p className="m-0 text-[10px] font-bold tracking-[.2em] uppercase opacity-55">Valid till</p>
                <p className="m-0 mt-1 text-[15px] font-bold">{formatExpiry(profile.end_date)}</p>
              </div>
            )}
            {hasSub && (
              <div>
                <p className="m-0 text-[10px] font-bold tracking-[.2em] uppercase opacity-55">Plan</p>
                <p className="m-0 mt-1 text-[15px] font-bold">
                  {formatDuration(profile.duration_days)} · ₹{profile.plan_price}
                </p>
              </div>
            )}
          </div>

          {/* Days-left meter, torn-off strip style */}
          {hasSub && profile.days_left !== null && (
            <div className="px-5 py-4" style={{ borderTop: `2px dashed ${INK}33` }}>
              <div className="flex items-baseline justify-between">
                <span className="k-display text-[26px]" style={{ color: low ? RED : INK }}>
                  {profile.days_left === 0 ? 'Aaj khatam' : `${profile.days_left} din baaki`}
                </span>
                <span className="text-[11px] font-semibold opacity-60">{leftPct}%</span>
              </div>
              <div className="mt-2 h-2 rounded-full overflow-hidden" style={{ background: `${INK}22` }}>
                <div className="h-full rounded-full" style={{ width: `${leftPct}%`, background: low ? RED : INK }} />
              </div>
            </div>
          )}

          {!loading && !hasSub && (
            <p className="m-0 px-5 pb-5 text-[13px] text-white/55">Pass lo aur poori library abhi unlock karo.</p>
          )}
        </section>

        {/* ── Actions ── */}
        <div className="mt-8 flex flex-col gap-3" style={{ ...anim('.14s'), opacity: fromCache ? 1 : 0 }}>
          <button
            onClick={handleRenew}
            disabled={paying}
            className="w-full h-12 rounded-md text-[14px] font-extrabold cursor-pointer disabled:opacity-60 inline-flex items-center justify-center gap-2"
            style={{ background: hasSub ? 'transparent' : YELLOW, color: hasSub ? YELLOW : INK, border: `1.5px solid ${YELLOW}` }}
          >
            {paying ? (
              <>
                <span className="w-4 h-4 rounded-full border-2 animate-spin" style={{ borderColor: 'currentColor transparent currentColor currentColor' }} />
                Ruko...
              </>
            ) : hasSub ? (
              'Pass renew karo'
            ) : (
              'Pass lo →'
            )}
          </button>

          {!showLogout ? (
            <button
              onClick={() => setShowLogout(true)}
              className="w-full h-12 rounded-md text-[14px] font-semibold text-white/55 hover:text-white cursor-pointer"
              style={{ background: 'transparent', border: `1px solid ${LINE}` }}
            >
              Log out
            </button>
          ) : (
            <div className="rounded-md p-4" style={{ background: PANEL, border: `1px solid ${RED}66` }}>
              <p className="m-0 mb-3 text-[14px] text-white/80">Pakka log out karna hai?</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowLogout(false)}
                  className="flex-1 h-10 rounded-md text-[13px] font-semibold text-white/70 cursor-pointer"
                  style={{ background: 'transparent', border: `1px solid ${LINE}` }}
                >
                  Nahi
                </button>
                <button
                  onClick={handleLogout}
                  className="flex-1 h-10 rounded-md text-[13px] font-bold text-white cursor-pointer"
                  style={{ background: RED, border: 0 }}
                >
                  Haan, log out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

    </main>
  );
}
