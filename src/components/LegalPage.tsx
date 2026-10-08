import Link from 'next/link';
import { SiteFooter, SiteHeader } from './SiteChrome';
import { INK, LINE, YELLOW } from '@/lib/brand';

export const SUPPORT_EMAIL = 'support@kaamaott.online';
export const SITE_DOMAIN = 'kaama.online';

// Shared header for the public info pages (privacy / terms / support)
export function SiteNav() {
  return (
    <SiteHeader
      right={
        <nav className="flex gap-1 md:gap-2 text-[12px] md:text-[13px]">
          {[
            ['Privacy', '/privacy'],
            ['Terms', '/terms'],
            ['Support', '/support'],
          ].map(([t, href]) => (
            <Link key={t} href={href} className="px-2 py-1.5 text-white/60 hover:text-[#FACC15] no-underline transition-colors">
              {t}
            </Link>
          ))}
        </nav>
      }
    />
  );
}

export type LegalSection = { heading: string; body: React.ReactNode };

export default function LegalPage({
  title,
  updated,
  intro,
  sections,
}: {
  title: string;
  updated: string;
  intro: React.ReactNode;
  sections: LegalSection[];
}) {
  return (
    <main className="k-body k-grain relative min-h-screen">
      <style>{`
        .legal a { color: ${YELLOW}; text-decoration: underline; text-underline-offset: 3px; }
        .legal a:hover { color: #fff; }
        .legal ul { list-style: none; padding-left: 0; margin: .5rem 0; }
        .legal li { position: relative; padding-left: 1.1rem; margin: .35rem 0; }
        .legal li::before { content: ''; position: absolute; left: 0; top: .7em; width: 6px; height: 6px; background: ${YELLOW}; }
      `}</style>

      <SiteNav />

      <article className="legal relative z-10 mx-auto max-w-3xl px-4 md:px-6 py-10 md:py-16 text-[15px] leading-7 text-white/70">
        <h1 className="k-display m-0 text-[48px] md:text-[72px] text-white">{title}</h1>
        <p className="mt-3 mb-8 inline-block text-[11px] font-bold tracking-[.18em] uppercase px-2 py-1 rounded-sm" style={{ background: YELLOW, color: INK }}>
          Last updated: {updated}
        </p>

        <div className="mb-10 text-white/80">{intro}</div>

        {sections.map((s, i) => (
          <section key={s.heading} className="grid grid-cols-[44px_1fr] md:grid-cols-[64px_1fr] gap-x-3 py-6" style={{ borderTop: `1px solid ${LINE}` }}>
            <span className="k-display text-[28px] md:text-[36px] leading-none" style={{ color: YELLOW }}>
              {String(i + 1).padStart(2, '0')}
            </span>
            <div>
              <h2 className="m-0 mb-2 text-[17px] font-bold text-white">{s.heading}</h2>
              <div>{s.body}</div>
            </div>
          </section>
        ))}

        <p className="mt-6 pt-6 text-[13px] text-white/50" style={{ borderTop: `1px solid ${LINE}` }}>
          Questions? Write to us at <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
        </p>
      </article>

      <SiteFooter />
    </main>
  );
}
