/* ── CATALOGUE ────────────────────────────────────────────────────
   All titles live in content.json — edit that file to add content.
     movies[]  → { slug, title, description, genre, year, banner, poster, thumbnail, videoUrl, featured? }
     series[]  → { slug, title, description, genre, year, banner, poster, thumbnail, episodes[], featured? }
     episodes[] → { title, thumbnail, videoUrl }
   banner    = landscape 16:9 (hero slider)
   poster    = portrait 9:16 (cards)
   thumbnail = landscape (details / episode list)
   featured  = true → shown in the home hero slider
   sections[] → { title, subtitle, slugs[] } — the home page rows, in order; list any
                movie/series slugs (a title can appear in several rows)
   slug must be unique. Optional fields (description, genre, year) are shown only when set.
   ──────────────────────────────────────────────────────────────── */

import data from './content.json';

export interface Episode {
  title: string;
  thumbnail: string;
  videoUrl: string;
}

interface TitleBase {
  slug: string;
  title: string;
  banner: string;
  poster: string;
  thumbnail: string;
  description?: string;
  genre?: string;
  year?: string;
  featured?: boolean;
}

export interface Movie extends TitleBase {
  type: 'movie';
  videoUrl: string;
}

export interface Series extends TitleBase {
  type: 'series';
  episodes: Episode[];
}

export type Title = Movie | Series;

export const MOVIES: Movie[] = data.movies.map((m) => ({ ...m, type: 'movie' }));

export const SERIES: Series[] = (data.series as Omit<Series, 'type'>[]).map((s) => ({ ...s, type: 'series' }));

export interface Section {
  label: string;
  desc: string;
  items: Title[];
}

const BY_SLUG = new Map<string, Title>([...SERIES, ...MOVIES].map((t) => [t.slug, t]));

// Home page rows; unknown slugs are skipped so a typo can't break the page
export const SECTIONS: Section[] = data.sections
  .map((s) => ({
    label: s.title,
    desc: s.subtitle,
    items: s.slugs.map((slug) => BY_SLUG.get(slug)).filter((t): t is Title => !!t),
  }))
  .filter((s) => s.items.length > 0);

// Hero slider: titles marked featured (series first), else everything
const featured = [...SERIES, ...MOVIES].filter((t) => t.featured);
export const FEATURED: Title[] = featured.length > 0 ? featured : [...SERIES, ...MOVIES];
