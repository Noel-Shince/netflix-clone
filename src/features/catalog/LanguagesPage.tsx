/**
 * Browse by Languages (`/languages?lang=ko`): pick an original language and
 * see popular and top-rated movies and TV shows made in it.
 *
 * The choice lives in the URL, so it survives reloads and Back. Rows come from
 * TMDB's discover endpoints filtered by `with_original_language`, which is
 * what "language" means here: the language a title was made in, not dubs.
 */
import { useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { CatalogRow } from './BrowsePage.tsx';
import { row } from './browsePages.ts';
import './LanguagesPage.css';

/** ISO 639-1 codes TMDB uses, with the label shown in the picker. */
const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'ko', label: 'Korean' },
  { code: 'ja', label: 'Japanese' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'hi', label: 'Hindi' },
  { code: 'de', label: 'German' },
  { code: 'it', label: 'Italian' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'tr', label: 'Turkish' },
  { code: 'zh', label: 'Chinese' },
  { code: 'ml', label: 'Malayalam' },
] as const;

/** Korean: a strong, recognisable catalogue that shows the feature off well. */
const DEFAULT_LANGUAGE = LANGUAGES[1];

/** Keeps "top rated" from being won by obscure titles with three 10/10 votes. */
const MIN_VOTES = '200';

function rowsFor(code: string) {
  const lang = { with_original_language: code };
  return [
    row('lang-movies-popular', 'Popular Movies', {
      path: '/discover/movie',
      mediaType: 'movie',
      params: { ...lang, sort_by: 'popularity.desc' },
    }),
    row('lang-tv-popular', 'Popular TV Shows', {
      path: '/discover/tv',
      mediaType: 'tv',
      params: { ...lang, sort_by: 'popularity.desc' },
    }),
    row('lang-movies-top', 'Top Rated Movies', {
      path: '/discover/movie',
      mediaType: 'movie',
      params: { ...lang, sort_by: 'vote_average.desc', 'vote_count.gte': MIN_VOTES },
    }),
    row('lang-tv-top', 'Top Rated TV Shows', {
      path: '/discover/tv',
      mediaType: 'tv',
      params: { ...lang, sort_by: 'vote_average.desc', 'vote_count.gte': MIN_VOTES },
    }),
  ];
}

export function LanguagesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get('lang');
  const language = LANGUAGES.find((l) => l.code === requested) ?? DEFAULT_LANGUAGE;
  // New loaders only when the language changes, so rows don't refetch every render.
  const rows = useMemo(() => rowsFor(language.code), [language.code]);

  return (
    <>
      <main className="languages">
        <div className="languages__header">
          <h1 className="languages__heading">Browse by Languages</h1>
          <label className="languages__picker">
            <span>Original language</span>
            <select
              value={language.code}
              onChange={(event) => setSearchParams({ lang: event.target.value })}
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        {rows.map((config) => (
          // Keyed by language so a new choice starts each row from its loading state.
          <CatalogRow key={`${language.code}-${config.id}`} config={config} />
        ))}
      </main>
    </>
  );
}
