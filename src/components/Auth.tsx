'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useRedirectIfLoggedIn } from '@/lib/useRedirectIfLoggedIn';
import AuthShell, { Hot, KaamaLogo, YELLOW } from './AuthShell';

export default function AuthPage() {
  const router = useRouter();
  useRedirectIfLoggedIn();
  const [mobile, setMobile] = useState('');
  const [focused, setFocused] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const len = mobile.length;
  const isComplete = len === 10;
  const isValid = /^[6-9]\d{9}$/.test(mobile);

  const hint = error
    ? { text: error, color: '#f87171' }
    : len === 0
      ? { text: 'Apna 10 number ka mobile number daalo', color: 'rgba(255,255,255,.7)' }
      : !isComplete
        ? { text: `Aur ${10 - len} number daalo`, color: 'rgba(255,255,255,.8)' }
        : !isValid
          ? { text: 'Sahi mobile number daalo', color: '#f87171' }
          : { text: 'Ho gaya! Ab button dabao 👇', color: '#4ade80' };

  const nudge = () => {
    setShake(true);
    inputRef.current?.focus();
  };

  const handleSubmit = async () => {
    if (submitted) return;
    // Button always looks tappable; an incomplete number shakes the field instead of a dead button
    if (!isValid) {
      if (isComplete) setError('Sahi mobile number daalo');
      nudge();
      return;
    }
    setSubmitted(true);
    setError('');
    try {
      const getCookie = (name: string) =>
        document.cookie
          .split('; ')
          .find((r) => r.startsWith(name + '='))
          ?.split('=')[1] ?? '';

      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mobile,
          fbp: getCookie('_fbp'),
          fbc: getCookie('_fbc'),
          campaignSlug: localStorage.getItem('mr_campaign') ?? '',
          metaCampaignId: localStorage.getItem('mr_meta_campaign_id') ?? '',
          metaCampaignName: localStorage.getItem('mr_meta_campaign_name') ?? '',
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.message ?? 'Kuch gadbad ho gayi. Dobara try karo.');
        setSubmitted(false);
        return;
      }
      if (data.isSubscribed) {
        // Subscribed user - OTP sent, verify it to log in
        router.push(`/auth/otp?mobile=${mobile}`);
      } else {
        // Unsubscribed user - go to subscription page (replace, so Back can't return to login)
        const campaign = localStorage.getItem('mr_campaign');
        window.location.replace(
          `/subscription${campaign ? `?c=${encodeURIComponent(campaign)}` : ''}`,
        );
      }
    } catch {
      setError('Internet check karo aur dobara try karo.');
      setSubmitted(false);
    }
  };

  return (
    <AuthShell>
      <div className="text-center" style={{ textShadow: '0 2px 10px rgba(0,0,0,.8)' }}>
        <KaamaLogo />
        <h1 className="mt-5 text-[28px] font-extrabold leading-tight">
          Sabse <Hot>HOT</Hot> <span className="whitespace-nowrap">Web Series 🔥</span>
        </h1>
      </div>

      <form
        className="mt-6"
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
      >
        <label htmlFor="mobile" className="block text-sm font-semibold text-white mb-2">
          Mobile Number / मोबाइल नंबर
        </label>
        <div
          onAnimationEnd={() => setShake(false)}
          className={`flex items-center rounded-2xl transition-all duration-200 ${shake ? 'ka-shake' : ''}`}
          style={{
            background: 'rgba(0,0,0,.45)',
            border: `2px solid ${
              error ? '#f87171' : focused ? YELLOW : isValid ? '#4ade80' : 'rgba(255,255,255,.25)'
            }`,
            boxShadow: focused ? `0 0 0 4px ${YELLOW}26` : 'none',
          }}
        >
          <span className="pl-4 pr-3 text-lg font-bold text-white border-r border-white/20 py-3">+91</span>
          <input
            id="mobile"
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            maxLength={10}
            placeholder="98765 43210"
            value={mobile}
            ref={inputRef}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, '');
              setMobile(v);
              setError('');
              // Number done → drop the keyboard so the button is right there
              if (/^[6-9]\d{9}$/.test(v)) {
                inputRef.current?.blur();
                setTimeout(() => btnRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 150);
              }
            }}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            className="flex-1 min-w-0 bg-transparent px-3 py-3 text-lg font-bold tracking-[.1em] text-white placeholder-white/35 outline-none"
          />
          {len > 0 && (
            <button
              type="button"
              onClick={() => setMobile('')}
              className="w-10 h-10 mr-1 flex items-center justify-center rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              tabIndex={-1}
              aria-label="Clear"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
        <p className="mt-2 min-h-[20px] text-sm font-medium transition-colors" style={{ color: hint.color }}>
          {hint.text}
        </p>

        <button
          ref={btnRef}
          type="submit"
          disabled={submitted}
          className={`${isValid ? 'ka-btn' : ''} mt-4 w-full rounded-2xl py-4 text-lg font-extrabold transition-all duration-300 active:scale-[.98] disabled:cursor-wait ${
            isValid ? 'text-white hover:-translate-y-0.5' : 'text-white/60'
          }`}
          // Dim until a full number is in; still tappable so an incomplete number shakes the field
          style={{
            textShadow: '0 1px 3px rgba(0,0,0,.5)',
            background: isValid ? undefined : 'rgba(239,35,60,.35)',
            filter: isValid ? undefined : 'saturate(.7)',
          }}
        >
          {submitted ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
              Ruko...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              अभी देखो 🔥 Watch Now
              <span className={`${isValid ? 'ka-nudge' : ''} inline-block`}>→</span>
            </span>
          )}
        </button>

      </form>
    </AuthShell>
  );
}
