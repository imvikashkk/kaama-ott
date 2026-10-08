import type { Metadata } from 'next';
import { SiteNav, SUPPORT_EMAIL } from '@/components/LegalPage';
import { SiteFooter } from '@/components/SiteChrome';
import { INK, LINE, PANEL, YELLOW } from '@/lib/brand';

const WHATSAPP_NUMBER = '9754159491';

export const metadata: Metadata = {
  title: 'Support | Kaama OTT',
};

const CHANNELS = [
  {
    label: 'Email',
    value: SUPPORT_EMAIL,
    note: 'Payment, pass ya account — sab yahin',
    href: `mailto:${SUPPORT_EMAIL}`,
    cta: 'Email likho',
    accent: YELLOW,
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <polyline points="3,7 12,13 21,7" />
      </svg>
    ),
  },
  {
    label: 'WhatsApp',
    value: `+91 ${WHATSAPP_NUMBER}`,
    note: 'Sirf WhatsApp message — call nahi',
    href: `https://wa.me/91${WHATSAPP_NUMBER}`,
    cta: 'WhatsApp karo',
    accent: '#25D366',
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3Z" />
      </svg>
    ),
  },
];

const TIPS = [
  'Wo mobile number jisse aap login karte ho',
  'Payment ki dikkat ho to UPI transaction ID ya screenshot',
  'Do-teen line mein kya hua aur kab hua',
];

// Quick answers for the issues people write in about most
const FAQ = [
  {
    q: 'Paise kat gaye par pass active nahi hua?',
    a: 'Kabhi-kabhi bank se confirmation aane mein thoda time lagta hai — 5-10 minute baad page refresh karke dekho. Phir bhi pass na dikhe to transaction ID ke saath email ya WhatsApp karo, check karke hum pass chalu kar denge.',
  },
  {
    q: 'OTP nahi aa raha?',
    a: 'Dekh lo ki number sahi daala hai aur phone mein network hai. Ek-do minute ruk ke dobara OTP mangwao. DND ya SMS blocker on ho to ek baar check kar lo.',
  },
  {
    q: 'Video ruk raha hai ya chal nahi raha?',
    a: 'Internet connection check karo aur page ek baar refresh karo. Phir bhi problem rahe to movie ka naam aur apna device (Android / iPhone / laptop) likh ke bhejo.',
  },
];

export default function SupportPage() {
  return (
    <main className="k-body k-grain relative min-h-screen">
      <SiteNav />

      <section className="relative z-10 mx-auto max-w-3xl px-4 md:px-6 py-10 md:py-16">
        <p className="m-0 mb-3 inline-block text-[11px] font-bold tracking-[.2em] uppercase px-2 py-1 rounded-sm" style={{ background: YELLOW, color: INK }}>
          Support
        </p>
        <h1 className="k-display m-0 text-[52px] md:text-[80px] text-white">
          Madad <span style={{ color: YELLOW }}>chahiye?</span>
        </h1>
        <p className="mt-4 mb-10 text-[15px] leading-7 text-white/60 max-w-xl">
          Login nahi ho raha, payment atak gaya ya video nahi chal raha — jo bhi ho, humein email ya WhatsApp
          message bhejo. Hamari team padh ke jitna jaldi ho sake jawab degi.
        </p>

        <div className="grid gap-4 sm:grid-cols-2 max-w-2xl">
          {CHANNELS.map((c) => (
            <a
              key={c.label}
              href={c.href}
              target={c.href.startsWith('http') ? '_blank' : undefined}
              rel="noopener noreferrer"
              className="group flex flex-col gap-5 p-5 rounded-lg no-underline transition-colors"
              style={{ background: PANEL, border: `1px solid ${LINE}`, borderTop: `3px solid ${c.accent}` }}
            >
              <div className="flex items-center gap-3">
                <span className="w-11 h-11 rounded-md flex items-center justify-center" style={{ background: c.accent, color: INK }}>
                  {c.icon}
                </span>
                <div className="min-w-0">
                  <p className="k-display m-0 text-[22px] text-white">{c.label}</p>
                  <p className="m-0 text-[12px] text-white/45">{c.note}</p>
                </div>
              </div>
              <p className="m-0 text-[17px] font-bold text-white break-all">{c.value}</p>
              <span
                className="mt-auto inline-flex items-center justify-center h-11 px-5 rounded-md text-[14px] font-extrabold"
                style={{ background: c.accent, color: INK }}
              >
                {c.cta} →
              </span>
            </a>
          ))}
        </div>

        <div className="mt-10 p-5 rounded-lg" style={{ border: `1px dashed ${LINE}` }}>
          <p className="m-0 mb-3 text-white font-bold">Message mein ye teen cheezein likhoge to kaam jaldi hoga:</p>
          <ol className="m-0 p-0 list-none flex flex-col gap-2 text-[14px] text-white/65">
            {TIPS.map((t, i) => (
              <li key={t} className="flex gap-3">
                <span className="k-display text-[18px] w-6 shrink-0" style={{ color: YELLOW }}>
                  {i + 1}
                </span>
                {t}
              </li>
            ))}
          </ol>
        </div>

        <h2 className="k-display m-0 mt-12 mb-4 text-[30px] md:text-[36px] text-white">
          Aksar pooche jaate <span style={{ color: YELLOW }}>sawal</span>
        </h2>
        <div className="flex flex-col">
          {FAQ.map((f) => (
            <details key={f.q} className="group py-4" style={{ borderTop: `1px solid ${LINE}` }}>
              <summary className="flex items-center justify-between gap-4 cursor-pointer list-none text-[15px] font-semibold text-white">
                {f.q}
                <span className="k-display text-[22px] shrink-0 transition-transform group-open:rotate-45" style={{ color: YELLOW }}>
                  +
                </span>
              </summary>
              <p className="m-0 mt-2 text-[14px] leading-7 text-white/60">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
