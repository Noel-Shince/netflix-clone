/**
 * One horizontally scrolling row of title cards.
 *
 * Deliberately uses native overflow scrolling (touch, trackpad, shift+wheel)
 * plus prev/next buttons, instead of the tutorial's wheel-hijacking listener,
 * which blocks vertical page scroll while the cursor is over a row.
 */
import { useRef } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '../../../../components/icons/Icons.tsx';
import type { CatalogRow } from '../../data/mockTitles.ts';
import { placeholderGradient } from '../../../../lib/placeholderArt.ts';
import './TitleRow.css';

interface TitleRowProps {
  row: CatalogRow;
}

export function TitleRow({ row }: TitleRowProps) {
  const scrollerRef = useRef<HTMLUListElement>(null);
  const headingId = `title-row-${row.id}`;

  const scrollByPage = (direction: 1 | -1) => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    scroller.scrollBy({ left: direction * scroller.clientWidth * 0.9, behavior: 'smooth' });
  };

  return (
    <section className="title-row" aria-labelledby={headingId}>
      <h2 id={headingId} className="title-row__heading">
        {row.heading}
      </h2>

      <div className="title-row__viewport">
        <button
          type="button"
          className="title-row__arrow title-row__arrow--prev"
          aria-label={`Scroll ${row.heading} left`}
          onClick={() => scrollByPage(-1)}
        >
          <ChevronLeftIcon />
        </button>

        <ul ref={scrollerRef} className="title-row__list">
          {row.titles.map((title) => (
            <li key={title.id} className="title-row__card">
              <div
                className="title-row__art"
                style={
                  title.imageUrl
                    ? { backgroundImage: `url(${title.imageUrl})` }
                    : { backgroundImage: placeholderGradient(title.id) }
                }
              />
              <p className="title-row__name">{title.name}</p>
            </li>
          ))}
        </ul>

        <button
          type="button"
          className="title-row__arrow title-row__arrow--next"
          aria-label={`Scroll ${row.heading} right`}
          onClick={() => scrollByPage(1)}
        >
          <ChevronRightIcon />
        </button>
      </div>
    </section>
  );
}
