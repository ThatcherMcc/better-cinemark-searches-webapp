// lib/seatScraper.ts
import axios from "axios";
import * as cheerio from "cheerio";
import { MovieInfo, Seat, Showtime } from "../types";

const BASE_URL = "https://www.cinemark.com";
const REQUEST_DELAY = 5000;

async function fetchHTML(url: string) {
    console.log('🌐 Fetching URL:', url);
    try {
        const response = await axios.get(url);
        console.log('✅ Fetch successful, status:', response.status);
        return cheerio.load(response.data);
    } catch (error) {
        console.error('❌ Fetch failed:', error);
        throw error;
    }
}

export async function scrapeMovieNames(theaterUrl: string): Promise<MovieInfo[]> {
  console.log('🎬 scrapeMovieNames - Starting...');
  const $ = await fetchHTML(theaterUrl);
  const movieBlocks = $('div[class^="showtimeMovieBlock"]');
  console.log(`📦 Found ${movieBlocks.length} movie blocks`);
  
  const movies = movieBlocks.map((index, block) => {
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
      
      console.log(`  📽️ Movie ${index + 1}: "${name}" - ${rating} - ${runtime}`);
      return { name, imageUrl, rating, runtime };
  }).get();
  
  console.log(`✅ scrapeMovieNames - Returning ${movies.length} movies`);
  return movies;
}

export async function scrapeShowtimes(theaterUrl: string, movieName: string): Promise<Showtime[]> {
    console.log('🕐 scrapeShowtimes - Starting for:', movieName);
    const $ = await fetchHTML(theaterUrl);
    const movieBlocks = $('div[class^="showtimeMovieBlock"]');
    console.log(`📦 Found ${movieBlocks.length} movie blocks to search`);

    for (let i = 0; i < movieBlocks.length; i++) {
      const block = $(movieBlocks[i]);
      const movieTitle = block.find('h3').text().trim();
      console.log(`  🔍 Checking block ${i + 1}: "${movieTitle}"`);
  
      if (movieTitle === movieName) {
        console.log(`  ✅ Match found! Extracting showtimes...`);
        const showtimeLinks = block.find('.showtimeMovieTimes .showtime a.showtime-link');
        console.log(`  🎫 Found ${showtimeLinks.length} showtime links`);
        
        const showtimes = showtimeLinks.map((_, link) => {
            const $link = $(link);
            const showtime = {
                'time': $link.text().trim(),
                'format': $link.attr('data-print-type-name')?.trim() || 'Unknown',
                'url': BASE_URL + $link.attr('href')?.trim() || 'Unknown'
            };
            console.log(`    🎬 Showtime: ${showtime.time} (${showtime.format})`);
            return showtime;
        }).get();
        
        console.log(`✅ scrapeShowtimes - Returning ${showtimes.length} showtimes`);
        return showtimes;
      }
    }
    console.warn(`⚠️ No showtimes found for movie: ${movieName}`);
    return [];
}

async function scrapeSeatsForShowtime(showtime: Showtime): Promise<Seat[]> {
    console.log(`💺 scrapeSeatsForShowtime - Starting for ${showtime.time}`);
    try {
        const $ = await fetchHTML(showtime.url);
        const seatsElements = $('button.seatBlock');
        console.log(`  🪑 Found ${seatsElements.length} seat elements`);
        const seats: Seat[] = [];
    
        seatsElements.each((index, seat) => {
          const seatDesignation = $(seat).find('span.seatDesignation').text();
          if (seatDesignation) {
            const row = seatDesignation[0];
            const column = parseInt(seatDesignation.substring(1), 10);
            const isAvailable = $(seat).hasClass('seatAvailable');

            seats.push({ row, column, time: showtime.time, isAvailable: isAvailable, url: showtime.url });
          }
        });
        
        const availableCount = seats.filter(s => s.isAvailable).length;
        console.log(`  ✅ Processed ${seats.length} seats (${availableCount} available)`);
        return seats;
      } catch (error) {
        console.error(`❌ Error scraping seats for ${showtime.time}:`, error);
        return [];
      }
    }

export async function scrapeSeats(showtimes: Showtime[]): Promise<Seat[]> {
    console.log(`💺 scrapeSeats - Starting for ${showtimes.length} showtimes`);
    const allSeats: Seat[] = [];

    for (const showtime of showtimes) {
        const seats = await scrapeSeatsForShowtime(showtime);
        allSeats.push(...seats);

        // Rate limiting - wait between requests
        const showtimeIndex = showtimes.indexOf(showtime);
        if (showtimeIndex < showtimes.length - 1) {
            console.log(`⏳ Waiting ${REQUEST_DELAY}ms before next request...`);
            await new Promise(resolve => setTimeout(resolve, REQUEST_DELAY));
        }
    }
    
    console.log(`✅ scrapeSeats - Total seats collected: ${allSeats.length}`);
    return allSeats;
}