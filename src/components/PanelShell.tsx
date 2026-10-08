'use client';

import type { ReactNode } from 'react';
import { INK, RED, YELLOW } from '@/lib/brand';

// Shared frame for the internal dashboards (admin + media buyer):
// dark brand sidebar on desktop, top bar + scrollable tabs on phones, warm paper content area.
export const PAPER = '#F5F2EC';

export type PanelNavItem<K extends string> = { key: K; label: string; icon: string };

function NavIcon({ d, s = 16 }: { d: string; s?: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}

function Brand({ role }: { role: string }) {
  return (
    <div className="flex items-center gap-1.5 select-none">
      <span className="k-display text-[24px]" style={{ color: YELLOW, letterSpacing: '0.04em' }}>
        KAAMA
      </span>
      <span className="text-[9px] font-bold tracking-[.18em] uppercase px-1.5 py-0.5 rounded-sm" style={{ background: RED, color: '#fff' }}>
        {role}
      </span>
    </div>
  );
}

export default function PanelShell<K extends string>({
  role,
  nav,
  active,
  onNav,
  title,
  subtitle,
  account,
  children,
}: {
  role: string;
  nav: PanelNavItem<K>[];
  active: K;
  onNav: (k: K) => void;
  title: string;
  subtitle?: string;
  /** Bottom-of-sidebar block on desktop (user + logout); also shown in the phone top bar */
  account: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-h-[100dvh] text-stone-900" style={{ background: PAPER, fontFamily: 'var(--font-poppins), system-ui, sans-serif' }}>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        .fu { animation: fadeUp .35s cubic-bezier(.22,1,.36,1) both; }
        .k-panel ::-webkit-scrollbar { width: 6px; height: 6px; }
        .k-panel ::-webkit-scrollbar-track { background: transparent; }
        .k-panel ::-webkit-scrollbar-thumb { background: #D5CDC0; border-radius: 9999px; }
        .k-panel input[type="date"]::-webkit-calendar-picker-indicator { cursor: pointer; opacity: 0.5; }
        .k-panel select option { background: #fff; color: #211B17; }
        .k-panel tbody tr:hover td { background: #FFF9E6; transition: background .12s; }
        .k-panel th { white-space: nowrap; }
      `}</style>

      {/* ── Desktop sidebar ── */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-60 flex-col" style={{ background: INK }}>
        <div className="px-5 h-16 flex items-center" style={{ borderBottom: '1px solid rgba(245,239,230,.08)' }}>
          <Brand role={role} />
        </div>
        <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
          {nav.map((n) => {
            const on = n.key === active;
            return (
              <button
                key={n.key}
                onClick={() => onNav(n.key)}
                className="flex items-center gap-3 h-10 px-3 rounded-md text-[13px] font-semibold text-left transition-colors cursor-pointer"
                style={{
                  background: on ? YELLOW : 'transparent',
                  color: on ? INK : 'rgba(245,239,230,.65)',
                }}
              >
                <NavIcon d={n.icon} />
                {n.label}
              </button>
            );
          })}
        </nav>
        <div className="p-3" style={{ borderTop: '1px solid rgba(245,239,230,.08)' }}>
          {account}
        </div>
      </aside>

      {/* ── Phone top bar + tabs ── */}
      <header className="lg:hidden sticky top-0 z-30" style={{ background: INK }}>
        <div className="flex items-center justify-between px-4 h-14">
          <Brand role={role} />
          <div className="max-w-[60%]">{account}</div>
        </div>
        <nav className="flex gap-1 px-3 pb-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {nav.map((n) => {
            const on = n.key === active;
            return (
              <button
                key={n.key}
                onClick={() => onNav(n.key)}
                className="shrink-0 flex items-center gap-1.5 h-9 px-3 rounded-md text-[12px] font-semibold cursor-pointer"
                style={{ background: on ? YELLOW : 'rgba(245,239,230,.06)', color: on ? INK : 'rgba(245,239,230,.7)' }}
              >
                <NavIcon d={n.icon} s={14} />
                {n.label}
              </button>
            );
          })}
        </nav>
      </header>

      {/* ── Content ── */}
      <main className="k-panel lg:pl-60">
        <div className="px-4 md:px-8 py-6 md:py-8 max-w-[1280px]">
          <div className="mb-6 fu">
            <h1 className="k-display m-0 text-[34px] md:text-[42px] text-stone-900">{title}</h1>
            {subtitle && <p className="m-0 mt-1 text-[13px] text-stone-500">{subtitle}</p>}
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}

// Compact "who's logged in + logout" block for the sidebar / phone bar
export function PanelAccount({
  name,
  detail,
  onLogout,
  confirm,
  onConfirmChange,
}: {
  name: string;
  detail?: string;
  onLogout: () => void;
  /** Optional two-step logout: pass state + setter to ask "Sure?" first */
  confirm?: boolean;
  onConfirmChange?: (v: boolean) => void;
}) {
  const ask = onConfirmChange && !confirm;
  return (
    <div className="flex items-center gap-2.5">
      <span
        className="hidden lg:flex w-9 h-9 shrink-0 rounded-md items-center justify-center k-display text-[18px]"
        style={{ background: 'rgba(245,239,230,.08)', color: YELLOW }}
      >
        {name.charAt(0).toUpperCase()}
      </span>
      <div className="hidden lg:block min-w-0 flex-1">
        <p className="m-0 text-[13px] font-semibold text-white truncate">{name}</p>
        {detail && <p className="m-0 text-[11px] truncate" style={{ color: 'rgba(245,239,230,.45)' }}>{detail}</p>}
      </div>
      {confirm && onConfirmChange ? (
        <div className="flex items-center gap-1.5 shrink-0">
          <button onClick={() => onConfirmChange(false)} className="h-8 px-2.5 rounded-md text-[11px] font-semibold cursor-pointer" style={{ background: 'rgba(245,239,230,.08)', color: 'rgba(245,239,230,.75)' }}>
            No
          </button>
          <button onClick={onLogout} className="h-8 px-2.5 rounded-md text-[11px] font-bold text-white cursor-pointer" style={{ background: RED }}>
            Logout
          </button>
        </div>
      ) : (
        <button
          onClick={ask ? () => onConfirmChange(true) : onLogout}
          title="Logout"
          className="shrink-0 h-8 px-2.5 rounded-md flex items-center gap-1.5 text-[11px] font-semibold cursor-pointer transition-colors hover:text-white"
          style={{ background: 'rgba(245,239,230,.08)', color: 'rgba(245,239,230,.7)' }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden>
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          <span className="lg:hidden">Logout</span>
        </button>
      )}
    </div>
  );
}

/* ── Login frame for /admin_auth and /mediabuyer/login ── */
export const panelInputCls =
  'w-full h-11 px-3 rounded-md text-[14px] text-white placeholder:text-white/25 outline-none transition-colors focus:border-[#FACC15]';
export const panelInputStyle = { background: 'rgba(245,239,230,.05)', border: '1px solid rgba(245,239,230,.14)' };

export function PanelLoginFrame({
  role,
  title,
  subtitle,
  children,
}: {
  role: string;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <main className="k-body k-grain relative min-h-[100dvh] flex items-center justify-center px-4 py-10">
      <div className="relative z-10 w-full max-w-sm k-rise">
        <div className="mb-6">
          <Brand role={role} />
          <h1 className="k-display m-0 mt-5 text-[44px] text-white">{title}</h1>
          <p className="m-0 mt-1 text-[13px] text-white/45">{subtitle}</p>
        </div>
        <div className="rounded-lg p-5" style={{ background: '#17110F', border: '1px solid rgba(245,239,230,.12)', borderTop: `3px solid ${YELLOW}` }}>
          {children}
        </div>
      </div>
    </main>
  );
}

export function PanelLoginButton({ loading, disabled, label, loadingLabel }: { loading: boolean; disabled?: boolean; label: string; loadingLabel: string }) {
  return (
    <button
      type="submit"
      disabled={loading || disabled}
      className="w-full h-12 rounded-md text-[14px] font-extrabold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
      style={{ background: YELLOW, color: INK, border: 0, boxShadow: `4px 4px 0 ${RED}` }}
    >
      {loading && <span className="w-4 h-4 rounded-full border-2 animate-spin" style={{ borderColor: `${INK} transparent ${INK} ${INK}` }} />}
      {loading ? loadingLabel : label}
    </button>
  );
}

export function EyeToggle({ shown, onToggle }: { shown: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle} aria-label={shown ? 'Hide password' : 'Show password'}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/35 hover:text-white/70 transition-colors cursor-pointer" style={{ background: 'transparent', border: 0 }}>
      {shown ? (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
      ) : (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
      )}
    </button>
  );
}
