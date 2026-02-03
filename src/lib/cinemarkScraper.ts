import * as cheerio from 'cheerio';
import type { Showtime, Seat, MovieInfo } from '../types';
import type { ExtensionScraper } from './extensionScraper';

const BASE_URL = 'https://www.cinemark.com';
const REQUEST_DELAY = 3000;

export async function fetchMovies(
  scraper: ExtensionScraper,
  theaterUrl: string
): Promise<MovieInfo[]> {
  console.log('📽️ Loading movies...');

  const html = await scraper.fetchHTML(theaterUrl);
  const $ = cheerio.load(html);

  const movieBlocks = $('div[class^="showtimeMovieBlock"]');
  console.log(`Found ${movieBlocks.length} movie blocks`);

  const movieList: MovieInfo[] = [];

  movieBlocks.each((_, block) => {
    const $block = $(block);
    const name = $block.find('h3').text().trim();

    const rating = $block.find('.showtimeMovieRating').text().trim() || null;
    const runtime = $block.find('.showtimeMovieRuntime').text().trim() || null;

    let imageUrl: string | null = null;

    const trailerButton = $block.find('a.showtimeMovieTrailerLink');
    if (trailerButton.length) {
      const jsonData = trailerButton.attr('data-json-model');
      if (jsonData) {
        try {
          const movieData = JSON.parse(jsonData.replace(/&quot;/g, '"'));
          imageUrl = movieData.posterMediumImageUrl || movieData.posterLargeImageUrl || movieData.posterSmallImageUrl || null;
        } catch (e) {
          console.error('Failed to parse JSON data:', e);
        }
      }
    }

    if (!imageUrl) {
      const sourceTag = $block.find('picture source');
      if (sourceTag.length) {
        imageUrl = sourceTag.attr('srcset') || null;
      }
    }

    if (!imageUrl) {
      const imgTag = $block.find('img');
      imageUrl = imgTag.attr('srcset') || imgTag.attr('data-srcset') || imgTag.attr('src') || null;
    }

    movieList.push({ name, imageUrl, rating, runtime });
  });

  console.log(`✅ Loaded ${movieList.length} movies`);
  return movieList;
}

export async function fetchShowtimes(
  scraper: ExtensionScraper,
  theaterUrl: string,
  movieName: string
): Promise<Showtime[]> {
  console.log('🕐 Fetching showtimes for:', movieName);

  const theaterHtml = await scraper.fetchHTML(theaterUrl);
  const $ = cheerio.load(theaterHtml);

  const showtimes: Showtime[] = [];
  const movieBlocks = $('div[class^="showtimeMovieBlock"]');

  movieBlocks.each((_, block) => {
    const movieTitle = $(block).find('h3').text().trim();
    if (movieTitle === movieName) {
      const showtimeLinks = $(block).find('.showtimeMovieTimes .showtime a.showtime-link');
      showtimeLinks.each((_, link) => {
        const $link = $(link);
        showtimes.push({
          time: $link.text().trim(),
          format: $link.attr('data-print-type-name')?.trim() || 'Unknown',
          url: BASE_URL + $link.attr('href')?.trim()
        });
      });
    }
  });

  console.log(`✅ Found ${showtimes.length} showtimes`);
  return showtimes;
}

export async function fetchAllSeats(
  scraper: ExtensionScraper,
  showtimes: Showtime[],
  onProgress: (current: number, total: number) => void
): Promise<Seat[]> {
  const allSeats: Seat[] = [];

  for (let i = 0; i < showtimes.length; i++) {
    const showtime = showtimes[i];
    console.log(`💺 Fetching seats for ${showtime.time} (${i + 1}/${showtimes.length})`);

    onProgress(i + 1, showtimes.length);

    const seatHtml = await scraper.fetchHTML(showtime.url);
    const $seats = cheerio.load(seatHtml);

    const seatsElements = $seats('button.seatBlock');
    console.log(`  Found ${seatsElements.length} seat elements`);

    seatsElements.each((_, seat) => {
      const seatDesignation = $seats(seat).find('span.seatDesignation').text();
      if (seatDesignation) {
        const row = seatDesignation[0];
        const column = parseInt(seatDesignation.substring(1), 10);
        const isAvailable = $seats(seat).hasClass('seatAvailable');

        allSeats.push({
          row,
          column,
          time: showtime.time,
          isAvailable,
          url: showtime.url
        });
      }
    });

    if (i < showtimes.length - 1) {
      await new Promise(resolve => setTimeout(resolve, REQUEST_DELAY));
    }
  }

  console.log(`✅ Total seats found: ${allSeats.length}`);
  return allSeats;
}