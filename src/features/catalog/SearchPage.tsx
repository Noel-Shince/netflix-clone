/**
 * Search results: title matches plus genre, language and person matches for
 * `?q=`, each as its own labelled section of title cards.
 *
 * The query comes from the URL, which the navbar's search box updates as the
 * user types (debounced there), so this page only reacts to the URL. Results
 * are a single request per query; the TMDB client caches the underlying
 * calls, so deleting a character shows the earlier results instantly.
 */
import { useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { SEARCH_PARAM } from '../../lib/routes.ts';
import { tmdbErrorMessage } from '../../lib/tmdb.ts';
import { useAsync } from '../../lib/useAsync.ts';
import { TitleCard, TitleCardSkeleton } from '../../components/TitleCard/TitleCard.tsx';
import { searchAll, type SearchSection } from './api/searchApi.ts';
import './SearchPage.css';

const SKELETON_CARDS = 12;

export function SearchPage() {
  const [params] = useSearchParams();
  const query = (params.get(SEARCH_PARAM) ?? '').trim();

  // useAsync refetches when the loader changes, so it must change with the query only.
  // Results are tagged with their query: useAsync keeps the previous result
  // while the next one loads, and that result must not be read as this query's.
  const load = useMemo(
    () => () => searchAll(query).then((sections) => ({ query, sections })),
    [query],
  );
  const { result, retry } = useAsync(load);

  const current = result.status === 'success' && result.data.query === query ? result.data : null;
  // While the next query loads, keep showing the last results (dimmed) instead
  // of flashing skeletons on every keystroke.
  const stale =
    result.status === 'success' && !current && result.data.sections.length > 0
      ? result.data.sections
      : null;
  const loading = result.status === 'loading' || (result.status === 'success' && !current);

  return (
    <main className="search">
      <h1 className="search__heading">
        {query ? (
          <>
            Results for <span className="search__query">“{query}”</span>
          </>
        ) : (
          'Search'
        )}
      </h1>

      {!query && <p className="search__message">Type a title, genre, language or actor above.</p>}

      {query && loading && !stale && (
        <ul className="search__grid" aria-busy="true" aria-label="Loading results">
          {Array.from({ length: SKELETON_CARDS }, (_, i) => (
            <li key={i}>
              <TitleCardSkeleton />
            </li>
          ))}
        </ul>
      )}

      {query && result.status === 'error' && (
        <div className="search__message" role="alert">
          <p>{tmdbErrorMessage(result.error, 'Couldn’t load search results.')}</p>
          <button type="button" className="search__retry" onClick={retry}>
            Retry
          </button>
        </div>
      )}

      {query && stale && (
        <div className="search__sections search__sections--stale" aria-busy="true">
          {stale.map((section) => (
            <SearchSectionGrid key={section.id} section={section} />
          ))}
        </div>
      )}

      {query && current && current.sections.length === 0 && (
        <p className="search__message" role="status">
          Nothing matches “{query}”. Try a different title, genre, language or actor.
        </p>
      )}

      {query && current && current.sections.length > 0 && (
        <div className="search__sections">
          {current.sections.map((section) => (
            <SearchSectionGrid key={section.id} section={section} />
          ))}
        </div>
      )}
    </main>
  );
}

function SearchSectionGrid({ section }: { section: SearchSection }) {
  return (
    <section className="search__section">
      <h2 className="search__section-heading">{section.heading}</h2>
      <ul className="search__grid">
        {section.titles.map((title) => (
          <li key={`${title.mediaType}-${title.id}`}>
            <TitleCard title={title} />
          </li>
        ))}
      </ul>
    </section>
  );
}
