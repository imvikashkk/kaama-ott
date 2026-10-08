'use client';

import {
  useState,
  useRef,
  useEffect,
  KeyboardEvent,
  ClipboardEvent,
} from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AuthShell, { Hot, KaamaLogo, RED, YELLOW } from './AuthShell';
import { useRedirectIfLoggedIn } from '@/lib/useRedirectIfLoggedIn';

const OTP_LENGTH = 6;
const RESEND_SECONDS = 30;

export default function OtpPage() {
  const router = useRouter();
  useRedirectIfLoggedIn();
  const searchParams = useSearchParams();
  const mobile = searchParams.get('mobile') ?? '';
  const isMobileValid = /^[6-9]\d{9}$/.test(mobile);

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [timer, setTimer] = useState(RESEND_SECONDS);
  const [resendCount, setResendCount] = useState(0);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer
  useEffect(() => {
    if (timer <= 0) return;
    const id = setInterval(() => setTimer((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [timer, resendCount]);

  // Auto-focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // Redirect if mobile is missing/invalid
  useEffect(() => {
    if (!isMobileValid) {
      router.replace('/auth');
    }
  }, [isMobileValid, router]);

  const focusInput = (index: number) => {
    const clamped = Math.max(0, Math.min(OTP_LENGTH - 1, index));
    inputRefs.current[clamped]?.focus();
  };

  const handleChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...otp];
    next[index] = digit;
    setOtp(next);
    setStatus('idle');
    setErrorMsg('');
    if (digit && index < OTP_LENGTH - 1) focusInput(index + 1);
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (otp[index]) {
        const next = [...otp];
        next[index] = '';
        setOtp(next);
      } else if (index > 0) {
        focusInput(index - 1);
      }
    } else if (e.key === 'ArrowLeft') {
      focusInput(index - 1);
    } else if (e.key === 'ArrowRight') {
      focusInput(index + 1);
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData('text')
      .replace(/\D/g, '')
      .slice(0, OTP_LENGTH);
    if (!pasted) return;
    const next = Array(OTP_LENGTH).fill('');
    pasted.split('').forEach((d, i) => {
      next[i] = d;
    });
    setOtp(next);
    focusInput(Math.min(pasted.length, OTP_LENGTH - 1));
  };

  const filledCount = otp.filter(Boolean).length;
  const isComplete = filledCount === OTP_LENGTH;

  const handleVerify = async () => {
    if (!isMobileValid || !isComplete || status === 'loading') {
      if (!isMobileValid) {
        setStatus('error');
        setErrorMsg('Invalid mobile number. Please login again.');
      }
      return;
    }
    setStatus('loading');
    setErrorMsg('');
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile, otp: otp.join('') }),
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem('mr_mobile', data.data.mobile);
        setStatus('success');

        const pendingPlan = localStorage.getItem('mr_pending_plan');
        const campaign    = localStorage.getItem('mr_campaign');
        const dest = data.data.hasActiveSub
          ? (pendingPlan ? `/subscription${campaign ? `?c=${encodeURIComponent(campaign)}` : ''}` : '/')
          : `/subscription${campaign ? `?c=${encodeURIComponent(campaign)}` : ''}`;
        // replace, so Back from home can't return to the OTP screen
        setTimeout(() => { window.location.replace(dest); }, 1200);
      } else {
        setStatus('error');
        setErrorMsg(data.message ?? 'Invalid OTP. Please try again.');
        setOtp(Array(OTP_LENGTH).fill(''));
        focusInput(0);
      }
    } catch {
      setStatus('error');
      setErrorMsg('Network error. Please try again.');
    }
  };

  const handleResend = async () => {
    if (!isMobileValid || timer > 0) return;
    setOtp(Array(OTP_LENGTH).fill(''));
    setStatus('idle');
    setErrorMsg('');
    setTimer(RESEND_SECONDS);
    setResendCount((c) => c + 1);
    focusInput(0);
    try {
      await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile }),
      });
    } catch {
      // silently ignore resend errors
    }
  };

  const maskedMobile =
    mobile.length >= 10
      ? `+91 ${mobile.slice(0, 2)}XXXXXX${mobile.slice(-2)}`
      : `+91 ${mobile}`;

  return (
    <AuthShell>
      <style>{`
        .ka-otp {
          width: 100%; aspect-ratio: 5 / 6; max-width: 52px;
          background: rgba(0,0,0,.45);
          border: 2px solid rgba(255,255,255,.25);
          border-radius: 14px;
          font-size: 24px; font-weight: 800; text-align: center; color: #fff;
          outline: none; caret-color: ${YELLOW};
          transition: border-color .2s, background .2s, box-shadow .2s;
        }
        .ka-otp:focus { border-color: ${YELLOW}; box-shadow: 0 0 0 4px ${YELLOW}26; }
        .ka-otp.filled { border-color: ${RED}; }
        .ka-otp.ok  { border-color: #4ade80 !important; background: rgba(74,222,128,.12) !important; }
        .ka-otp.bad { border-color: #f87171 !important; background: rgba(248,113,113,.1) !important; }
      `}</style>

      <div className="text-center" style={{ textShadow: '0 2px 10px rgba(0,0,0,.8)' }}>
        <KaamaLogo />
        <h1 className="mt-5 text-[28px] font-extrabold leading-tight">
          {status === 'success' ? (
            <>
              <Hot>Welcome!</Hot> 🔥
            </>
          ) : (
            <>
              <Hot>OTP</Hot> daalo
            </>
          )}
        </h1>
        <p className="mt-1 text-base font-semibold text-white/90">
          {status === 'success' ? (
            'अब मज़ा शुरू!'
          ) : (
            <>
              SMS में आया 6 नंबर का code
              <br />
              <span className="text-white">{maskedMobile}</span>{' '}
              <button
                type="button"
                onClick={() => router.back()}
                className="font-bold underline underline-offset-2"
                style={{ color: YELLOW }}
              >
                Number badlo
              </button>
            </>
          )}
        </p>
      </div>

      <form
        className="mt-6"
        onSubmit={(e) => {
          e.preventDefault();
          handleVerify();
        }}
      >
        <div
          className={`grid grid-cols-6 gap-2 sm:gap-2.5 justify-items-center ${status === 'error' ? 'ka-shake' : ''}`}
          onAnimationEnd={() => status === 'error' && setStatus('idle')}
        >
          {otp.map((digit, i) => (
            <input
              key={i}
              ref={(el) => {
                inputRefs.current[i] = el;
              }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              className={`ka-otp ${digit ? 'filled' : ''} ${status === 'success' ? 'ok' : ''} ${status === 'error' ? 'bad' : ''}`}
              style={{ WebkitTextSecurity: digit ? 'disc' : 'none' } as React.CSSProperties}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onPaste={handlePaste}
              autoComplete="one-time-code"
              aria-label={`OTP digit ${i + 1}`}
            />
          ))}
        </div>

        <p className="mt-3 min-h-[20px] text-sm font-medium text-center" style={{ color: '#f87171' }}>
          {errorMsg}
        </p>

        <button
          type="submit"
          disabled={!isComplete || status === 'loading' || status === 'success'}
          className={`${status === 'success' ? '' : 'ka-btn'} mt-3 w-full rounded-2xl py-4 text-lg font-extrabold text-white transition-transform enabled:hover:-translate-y-0.5 disabled:cursor-not-allowed`}
          style={{
            textShadow: '0 1px 3px rgba(0,0,0,.5)',
            background: status === 'success' ? '#16a34a' : !isComplete ? RED : undefined,
            opacity: !isComplete && status !== 'success' ? 0.5 : 1,
          }}
        >
          {status === 'loading' ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
              Check ho raha hai...
            </span>
          ) : status === 'success' ? (
            'Ho gaya! ✔'
          ) : (
            'अंदर चलो 🔥 Enter'
          )}
        </button>
      </form>

      <div className="mt-4 text-center text-sm">
        <span className="text-white/75">Code nahi aaya? </span>
        {timer > 0 ? (
          <span className="font-bold text-white tabular-nums">{timer} sec ruko</span>
        ) : (
          <button onClick={handleResend} className="font-bold underline underline-offset-2" style={{ color: YELLOW }}>
            Dobara bhejo
          </button>
        )}
      </div>
    </AuthShell>
  );
}
