import axios from "axios";
import * as cheerio from "cheerio";
import { Seat, Showtime } from "../types";

const BASE_URL = "https://www.cinemark.com";
const REQUEST_DELAY = 5000;

async function fetchHTML(url: string) {
    const response = await axios.get(url);
    return cheerio.load(response.data);
}

export async function scrapeMovieNames(theaterUrl: string): Promise<string[]> {
    const $ = await fetchHTML(theaterUrl);
    const movieElements = $('div[class^="showtimeMovieBlock"] h3');
    
    return movieElements.map((_, movieName) => $(movieName).text().trim()).get();
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