/**
 * Home / browse page: navbar, hero with an overlapping row, more rows, footer.
 *
 * The only place that knows where catalog data comes from. Slice 03 swaps the
 * mock import for TMDB fetches; the components below take plain props.
 */
import { Footer } from '../../components/Footer/Footer.tsx';
import { Navbar } from '../../components/Navbar/Navbar.tsx';
import { Hero } from './components/Hero/Hero.tsx';
import { TitleRow } from './components/TitleRow/TitleRow.tsx';
import { catalogRows, featuredTitle, heroRow } from './data/mockTitles.ts';
import './HomePage.css';

export function HomePage() {
  return (
    <>
      <Navbar />
      <main className="home">
        <Hero title={featuredTitle}>
          <TitleRow row={heroRow} />
        </Hero>
        <div className="home__rows">
          {catalogRows.map((row) => (
            <TitleRow key={row.id} row={row} />
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}
