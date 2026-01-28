import axios from "axios";
import * as cheerio from "cheerio";
import { MovieInfo, Seat, Showtime } from "../types";

const BASE_URL = "https://www.cinemark.com";
const REQUEST_DELAY = 5000;

async function fetchHTML(url: string) {
    const response = await axios.get(url);
    return cheerio.load(response.data);
}

export async function scrapeMovieNames(theaterUrl: string): Promise<MovieInfo[]> {
  const $ = await fetchHTML(theaterUrl);
  const movieBlocks = $('div[class^="showtimeMovieBlock"]');
  
  return movieBlocks.map((_, block) => {
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
      
      return { name, imageUrl, rating, runtime };
  }).get();
}

export async function scrapeShowtimes(theaterUrl: string, movieName: string): Promise<Showtime[]> {
    const $ = await fetchHTML(theaterUrl);
    const movieBlocks = $('div[class^="showtimeMovieBlock"]');

    for (let i = 0; i < movieBlocks.length; i++) {
      const block = $(movieBlocks[i]);
      const movieTitle = block.find('h3').text().trim();
  
      if (movieTitle === movieName) {
        const showtimeLinks = block.find('.showtimeMovieTimes .showtime a.showtime-link');
        return showtimeLinks.map((_, link) => {
            const $link = $(link);
            return {
                'time': $link.text().trim(),
                'format': $link.attr('data-print-type-name')?.trim() || 'Unknown',
                'url': BASE_URL + $link.attr('href')?.trim() || 'Unknown'
            };
        }).get();
      }
    }
    console.log(`No showtimes found for movie: ${movieName}`);
    return [];
}

async function scrapeSeatsForShowtime(showtime: Showtime): Promise<Seat[]> {
    try {
        const $ = await fetchHTML(showtime.url);
        const availableSeatsElements = $('button.seatAvailable');
        const seats: Seat[] = [];
    
        availableSeatsElements.each((_, seat) => {
          const seatDesignation = $(seat).find('span.seatDesignation').text();
          if (seatDesignation) {
            const row = seatDesignation[0];
            const column = parseInt(seatDesignation.substring(1), 10);
            
            seats.push({ row, column, time: showtime.time });
          }
        });
    
        return seats;
      } catch (error) {
        console.error(`Error scraping seats for ${showtime.time}:`, error);
        return [];
      }
    }

export async function scrapeSeats(showtimes: Showtime[]): Promise<Seat[]> {
    const allSeats: Seat[] = [];

    for (const showtime of showtimes) {
        const seats = await scrapeSeatsForShowtime(showtime);
        allSeats.push(...seats);

        // Rate limiting - wait between requests
        if (showtimes.indexOf(showtime) < showtimes.length - 1) {
            await new Promise(resolve => setTimeout(resolve, REQUEST_DELAY));
        }
    }
    return allSeats;
}