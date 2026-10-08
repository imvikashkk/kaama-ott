'use client';

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';

import HlsPlayer from './HlsPlayer';
import { HeaderAction, IconBack, IconHelp, IconPlay, IconUser, SiteFooter, SiteHeader } from './SiteChrome';
import { FEATURED, MOVIES, SECTIONS, SERIES, type Title } from '@/data/content';
import { INK, LINE, PANEL, RED, YELLOW } from '@/lib/brand';

/* ── DATA & HELPERS ──────────────────────────────────────────── */
type Playing = { item: Title; ep: number };

const PICKS = FEATURED;
const ALL: Title[] = [...SERIES, ...MOVIES];
const SPOTLIGHT_MS = 6500;

// Filter chips: everything, then the curated sections, then genres present in the catalogue
type Filter = { key: string; label: string; desc?: string; items: Title[] };
const FILTERS: Filter[] = [
  { key: 'all', label: 'Sab', desc: 'Poori library, ek hi jagah', items: ALL },
  ...SECTIONS.map((s) => ({ key: `s:${s.label}`, label: s.label, desc: s.desc, items: s.items })),
  ...[...new Set(ALL.map((t) => t.genre).filter((g): g is string => !!g))].map((g) => ({
    key: `g:${g}`,
    label: g,
    items: ALL.filter((t) => t.genre === g),
  })),
];

const pad = (n: number) => String(n).padStart(2, '0');
const kindLabel = (t: Title) =>
  t.type === 'series' ? `${t.episodes.length} Episode${t.episodes.length === 1 ? '' : 's'}` : 'Movie';
const metaOf = (t: Title) => [t.genre, t.year, kindLabel(t)].filter(Boolean).join(' · ');

/* ── PLAYER ──────────────────────────────────────────────────── */
function PlayerPage({
  playing,
  onBack,
  onEpisode,
}: {
  playing: Playing;
  onBack: () => void;
  onEpisode: (ep: number) => void;
}) {
  const { item, ep } = playing;
  const episodes = item.type === 'series' ? item.episodes : [];
  const url = item.type === 'series' ? item.episodes[ep].videoUrl : item.videoUrl;
  const hasNext = ep + 1 < episodes.length;

  return (
    <div className="k-body fixed inset-0 z-[9999] flex flex-col" style={{ background: '#000' }}>
      <div
        className="flex items-center gap-3 px-3 md:px-6 h-14 shrink-0"
        style={{ background: INK, borderBottom: `1px solid ${LINE}` }}
      >
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md text-[12px] font-semibold cursor-pointer"
          style={{ background: YELLOW, color: INK, border: 0 }}
        >
          <IconBack s={14} /> Wapas
        </button>
        <div className="min-w-0 flex-1">
          <p className="k-display m-0 text-[20px] text-white truncate">{item.title}</p>
          {item.type === 'series' && (
            <p className="m-0 text-[11px] text-white/45 truncate">
              Episode {ep + 1} · {episodes[ep].title}
            </p>
          )}
        </div>
        {item.genre && (
          <span className="hidden sm:inline text-[11px] font-semibold px-2 py-1 rounded-sm" style={{ border: `1px solid ${LINE}`, color: 'rgba(245,239,230,.6)' }}>
            {item.genre}
          </span>
        )}
      </div>

      <div className="flex-1 relative bg-black">
        <HlsPlayer key={url} url={url} onEnded={hasNext ? () => onEpisode(ep + 1) : undefined} />
      </div>

      {/* Episode switcher (series) — next one also auto-plays on end */}
      {episodes.length > 0 && (
        <div className="k-noscroll px-3 md:px-6 py-3 flex gap-2 overflow-x-auto shrink-0" style={{ background: INK, borderTop: `1px solid ${LINE}` }}>
          {episodes.map((e, i) => (
            <button
              key={e.videoUrl}
              onClick={() => onEpisode(i)}
              className="shrink-0 flex items-center gap-3 p-1.5 pr-4 rounded-md cursor-pointer text-left"
              style={{
                background: i === ep ? YELLOW : PANEL,
                color: i === ep ? INK : '#fff',
                border: `1px solid ${i === ep ? YELLOW : LINE}`,
              }}
            >
              <div className="relative w-20 aspect-video rounded-sm overflow-hidden shrink-0">
                <Image src={e.thumbnail} alt={e.title} fill sizes="80px" style={{ objectFit: 'cover' }} />
              </div>
              <div className="max-w-[150px]">
                <p className="k-display m-0 text-[15px]">EP {pad(i + 1)}</p>
                <p className="m-0 text-[11px] truncate opacity-75">{e.title}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── DETAILS DRAWER (right on desktop, bottom sheet on phones) ── */
function DetailsDrawer({ item, onClose, onPlay }: { item: Title; onClose: () => void; onPlay: (ep: number) => void }) {
  return (
    <div className="fixed inset-0 z-[9000] flex items-end md:items-stretch md:justify-end" onClick={onClose}>
      <style>{`
        @keyframes kDrawerIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
        @keyframes kSheetIn { from { transform: translateY(100%); } to { transform: translateY(0); } }
        .k-drawer { animation: kSheetIn .35s cubic-bezier(.22,1,.36,1) both; }
        @media (min-width: 768px) { .k-drawer { animation-name: kDrawerIn; } }
      `}</style>
      <div className="absolute inset-0" style={{ background: 'rgba(12,8,9,.75)' }} />
      <aside
        className="k-drawer k-body relative w-full md:w-[460px] max-h-[88dvh] md:max-h-none overflow-y-auto rounded-t-xl md:rounded-none"
        style={{ background: PANEL, borderLeft: `1px solid ${LINE}`, borderTop: `3px solid ${YELLOW}` }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={item.title}
      >
        <div className="flex items-center justify-between px-5 h-12" style={{ borderBottom: `1px solid ${LINE}` }}>
          <span className="text-[11px] font-semibold tracking-[.2em] uppercase text-white/45">Details</span>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-md flex items-center justify-center text-white/70 hover:text-white cursor-pointer"
            style={{ border: `1px solid ${LINE}`, background: 'transparent' }}
          >
            ✕
          </button>
        </div>

        <div className="p-5">
          <div className="relative w-full aspect-video rounded-md overflow-hidden" style={{ border: `1px solid ${LINE}` }}>
            <Image src={item.banner} alt={item.title} fill sizes="(max-width:768px) 100vw, 460px" style={{ objectFit: 'cover' }} />
          </div>

          <h2 className="k-display m-0 mt-5 text-[44px] text-white">{item.title}</h2>
          <p className="m-0 mt-2 text-[12px] font-semibold text-white/45">{metaOf(item)}</p>
          {item.description && <p className="m-0 mt-4 text-[14px] leading-relaxed text-white/70">{item.description}</p>}

          <button
            onClick={() => onPlay(0)}
            className="mt-6 w-full h-12 rounded-md inline-flex items-center justify-center gap-2 text-[14px] font-bold cursor-pointer"
            style={{ background: YELLOW, color: INK, border: 0 }}
          >
            <IconPlay s={15} /> {item.type === 'series' ? 'Episode 1 chalao' : 'Abhi dekho'}
          </button>

          {item.type === 'series' && (
            <div className="mt-8">
              <h3 className="k-display m-0 mb-3 text-[22px] text-white">Episodes</h3>
              <ol className="m-0 p-0 list-none flex flex-col">
                {item.episodes.map((e, i) => (
                  <li key={e.videoUrl}>
                    <button
                      onClick={() => onPlay(i)}
                      className="group w-full flex items-center gap-3 py-3 text-left cursor-pointer"
                      style={{ background: 'transparent', border: 0, borderTop: `1px solid ${LINE}` }}
                    >
                      <span className="k-display text-[26px] w-10 shrink-0" style={{ color: YELLOW }}>
                        {pad(i + 1)}
                      </span>
                      <div className="relative w-28 aspect-video rounded-sm overflow-hidden shrink-0">
                        <Image src={e.thumbnail} alt={e.title} fill sizes="112px" style={{ objectFit: 'cover' }} />
                      </div>
                      <span className="text-[14px] font-semibold text-white/85 group-hover:text-white">{e.title}</span>
                    </button>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

/* ── SPOTLIGHT — tonight's numbered picks ────────────────────── */
function Spotlight({ onPlay, onDetails }: { onPlay: (t: Title) => void; onDetails: (t: Title) => void }) {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const cur = PICKS[idx];

  useEffect(() => {
    if (paused || PICKS.length < 2) return;
    const t = setTimeout(() => setIdx((i) => (i + 1) % PICKS.length), SPOTLIGHT_MS);
    return () => clearTimeout(t);
  }, [idx, paused]);

  return (
    <section
      className="relative z-10 px-4 md:px-10 pt-5 md:pt-10 pb-10"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="flex items-end justify-between gap-4 mb-4 md:mb-6">
        <h1 className="k-display m-0 text-[34px] md:text-[56px] text-white">
          Aaj raat <span style={{ color: YELLOW }}>kya dekhoge?</span>
        </h1>
        <span className="hidden md:block k-display text-[22px] text-white/30 pb-1">
          {pad(idx + 1)} / {pad(PICKS.length)}
        </span>
      </div>

      <div className="grid gap-5 md:gap-8 lg:grid-cols-12">
        {/* Banner */}
        <button
          onClick={() => onPlay(cur)}
          className="group relative lg:col-span-8 w-full aspect-video rounded-lg overflow-hidden cursor-pointer p-0"
          style={{ border: `1px solid ${LINE}`, background: PANEL }}
          aria-label={`Play ${cur.title}`}
        >
          {PICKS.map((s, i) => (
            <div
              key={s.slug}
              className="absolute inset-0 transition-opacity duration-700"
              style={{ opacity: i === idx ? 1 : 0 }}
            >
              <Image
                src={s.banner}
                alt={s.title}
                fill
                priority={i === 0}
                sizes="(max-width:1024px) 100vw, 66vw"
                style={{ objectFit: 'cover', objectPosition: 'top center' }}
              />
            </div>
          ))}
          <span
            className="absolute top-3 left-3 k-display text-[14px] px-2 py-1 rounded-sm"
            style={{ background: YELLOW, color: INK }}
          >
            No. {pad(idx + 1)}
          </span>
          <span
            className="absolute bottom-3 right-3 inline-flex items-center gap-2 h-10 px-4 rounded-md text-[13px] font-bold opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ background: YELLOW, color: INK }}
          >
            <IconPlay s={14} /> Play
          </span>
          {/* Auto-advance timer */}
          <span className="absolute bottom-0 inset-x-0 h-[3px]" style={{ background: 'rgba(0,0,0,.4)' }}>
            <span
              key={`${idx}-${paused}`}
              className="block h-full"
              style={{
                background: YELLOW,
                width: paused ? '0%' : undefined,
                animation: paused ? 'none' : `kFill ${SPOTLIGHT_MS}ms linear forwards`,
              }}
            />
          </span>
        </button>

        {/* Info + numbered list */}
        <div className="lg:col-span-4 flex flex-col min-w-0">
          <div key={cur.slug} className="k-rise">
            <p className="m-0 text-[12px] font-semibold text-white/45">{metaOf(cur)}</p>
            <h2 className="k-display m-0 mt-2 text-[44px] md:text-[60px] text-white break-words">{cur.title}</h2>
            {cur.description && (
              <p className="m-0 mt-3 text-[14px] leading-relaxed text-white/65 max-w-xl">{cur.description}</p>
            )}
            <div className="flex gap-2 mt-5">
              <button
                onClick={() => onPlay(cur)}
                className="inline-flex items-center gap-2 h-11 px-5 rounded-md text-[14px] font-bold cursor-pointer"
                style={{ background: YELLOW, color: INK, border: 0 }}
              >
                <IconPlay s={14} /> Abhi dekho
              </button>
              <button
                onClick={() => onDetails(cur)}
                className="inline-flex items-center h-11 px-5 rounded-md text-[14px] font-semibold text-white/80 hover:text-white cursor-pointer"
                style={{ background: 'transparent', border: `1px solid ${LINE}` }}
              >
                Details
              </button>
            </div>
          </div>

          {/* Phones: swipeable chips; desktop: vertical list */}
          <ol className="k-noscroll m-0 p-0 list-none mt-6 lg:mt-8 flex lg:flex-col gap-2 lg:gap-1.5 overflow-x-auto -mx-4 px-4 lg:mx-0 lg:px-0">
            {PICKS.map((t, i) => {
              const on = i === idx;
              return (
                <li key={t.slug} className="shrink-0">
                  <button
                    onClick={() => setIdx(i)}
                    className="w-full flex items-center gap-3 h-10 px-3 text-left cursor-pointer rounded-md"
                    style={{
                      background: 'transparent',
                      border: 0,
                      outline: on ? `1px solid ${YELLOW}` : `1px solid ${LINE}`,
                      outlineOffset: -1,
                    }}
                  >
                    <span className="k-display text-[18px] w-7 shrink-0" style={{ color: on ? YELLOW : 'rgba(245,239,230,.3)' }}>
                      {pad(i + 1)}
                    </span>
                    <span className={`text-[13px] whitespace-nowrap truncate ${on ? 'text-white font-bold' : 'text-white/55 font-medium'}`}>
                      {t.title}
                    </span>
                    {t.genre && (
                      <span className="hidden lg:block ml-auto pr-2 text-[11px] text-white/30">{t.genre}</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}

/* ── POSTER CARD ─────────────────────────────────────────────── */
function PosterCard({ item, n, onOpen }: { item: Title; n: number; onOpen: (t: Title) => void }) {
  return (
    <button
      onClick={() => onOpen(item)}
      className="group k-rise text-left cursor-pointer p-0 min-w-0"
      style={{ background: 'transparent', border: 0, animationDelay: `${Math.min(n, 12) * 40}ms` }}
    >
      <div
        className="relative aspect-[9/16] rounded-md overflow-hidden transition-transform duration-300 group-hover:-translate-y-1"
        style={{ border: `1px solid ${LINE}`, background: PANEL }}
      >
        <Image
          src={item.poster}
          alt={item.title}
          fill
          sizes="(max-width:640px) 50vw, (max-width:1024px) 33vw, 20vw"
          style={{ objectFit: 'cover' }}
        />
        <span className="absolute top-0 left-0 k-display text-[15px] px-2 py-1" style={{ background: YELLOW, color: INK }}>
          {pad(n)}
        </span>
        {item.type === 'series' && (
          <span className="absolute top-2 right-2 text-[10px] font-bold px-1.5 py-0.5 rounded-sm text-white" style={{ background: RED }}>
            {item.episodes.length} EP
          </span>
        )}
        <span className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity">
          <span
            className="k-display inline-flex items-center gap-2 text-[20px] px-4 py-2 -rotate-6"
            style={{ background: YELLOW, color: INK, boxShadow: `4px 4px 0 ${RED}` }}
          >
            <IconPlay s={16} /> Play
          </span>
        </span>
      </div>
      <p className="k-display m-0 mt-2.5 text-[19px] md:text-[21px] text-white truncate group-hover:text-[#FACC15] transition-colors">
        {item.title}
      </p>
      <p className="m-0 mt-0.5 text-[11px] text-white/45 truncate">{[item.genre, item.year].filter(Boolean).join(' · ')}</p>
    </button>
  );
}

/* ── MAIN PAGE ───────────────────────────────────────────────── */
export default function LandingPage() {
  const [playing, setPlaying] = useState<Playing | null>(null);
  const [info, setInfo] = useState<Title | null>(null);
  const [filterKey, setFilterKey] = useState('all');
  const filter = useMemo(() => FILTERS.find((f) => f.key === filterKey) ?? FILTERS[0], [filterKey]);

  const play = (item: Title, ep = 0) => {
    setInfo(null);
    setPlaying({ item, ep });
  };
  // Movies play straight away; series open their episode list
  const openTitle = (t: Title) => (t.type === 'movie' ? play(t) : setInfo(t));

  // Lock page scroll behind the details drawer
  useEffect(() => {
    if (!info) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [info]);

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    if (sp.get('mr_purchase') === '1') {
      window.history.replaceState({}, '', '/');
    }
  }, []);

  if (playing)
    return (
      <PlayerPage playing={playing} onBack={() => setPlaying(null)} onEpisode={(ep) => setPlaying({ ...playing, ep })} />
    );

  return (
    <div className="k-body k-grain relative min-h-screen overflow-x-hidden">
      <style>{`@keyframes kFill { from { width: 0%; } to { width: 100%; } }`}</style>

      {info && <DetailsDrawer item={info} onClose={() => setInfo(null)} onPlay={(ep) => play(info, ep)} />}

      <SiteHeader
        right={
          <>
            <HeaderAction href="/support">
              <IconHelp s={14} /> <span className="hidden sm:inline">Support</span>
            </HeaderAction>
            <HeaderAction href="/profile" solid>
              <IconUser s={14} /> Account
            </HeaderAction>
          </>
        }
      />

      <Spotlight onPlay={(t) => play(t)} onDetails={setInfo} />

      {/* ── Library: filter chips + poster grid ── */}
      <section className="relative z-10 pb-20">
        <div className="sticky top-14 md:top-16 z-30 px-4 md:px-10 py-3" style={{ background: INK, borderTop: `1px solid ${LINE}`, borderBottom: `1px solid ${LINE}` }}>
          <div className="k-noscroll flex gap-2 overflow-x-auto">
            {FILTERS.map((f) => {
              const on = f.key === filterKey;
              return (
                <button
                  key={f.key}
                  onClick={() => setFilterKey(f.key)}
                  className="shrink-0 h-9 px-4 rounded-full text-[13px] font-semibold cursor-pointer transition-colors"
                  style={{
                    background: on ? YELLOW : 'transparent',
                    color: on ? INK : 'rgba(245,239,230,.7)',
                    border: `1px solid ${on ? YELLOW : LINE}`,
                  }}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="px-4 md:px-10 pt-8">
          <div className="flex items-end justify-between gap-4 mb-6">
            <div>
              <h2 className="k-display m-0 text-[30px] md:text-[40px] text-white">{filter.label}</h2>
              {filter.desc && <p className="m-0 mt-1 text-[13px] text-white/45">{filter.desc}</p>}
            </div>
            <span className="text-[12px] font-semibold text-white/35 pb-1 whitespace-nowrap">
              {filter.items.length} title{filter.items.length === 1 ? '' : 's'}
            </span>
          </div>

          <div key={filter.key} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-4 gap-y-7 md:gap-x-6">
            {filter.items.map((item, i) => (
              <PosterCard key={item.slug} item={item} n={i + 1} onOpen={openTitle} />
            ))}
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
