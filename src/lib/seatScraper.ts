// lib/seatScraper.ts
import axios from "axios";
import * as cheerio from "cheerio";
import { MovieInfo, Seat, Showtime } from "../types";

const BASE_URL = "https://www.cinemark.com";
const REQUEST_DELAY = 5000;

// Load proxies from environment variable
const PROXIES = process.env.PROXY_LIST?.split(',').map(p => p.trim()) || [];
let currentProxyIndex = 0;

function getNextProxy() {
    if (PROXIES.length === 0) {
        console.warn('⚠️ No proxies configured, using direct connection');
        return null;
    }
    
    const proxy = PROXIES[currentProxyIndex];
    currentProxyIndex = (currentProxyIndex + 1) % PROXIES.length;
    console.log(`🔄 Using proxy ${currentProxyIndex}/${PROXIES.length}: ${proxy.substring(0, 20)}...`);
    return proxy;
}

const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
];

function getRandomUserAgent() {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

async function fetchHTML(url: string, retries = 3) {
    console.log('🌐 Fetching URL:', url);
    
    for (let attempt = 0; attempt < retries; attempt++) {
        const proxyUrl = getNextProxy();
        
        try {
            // Parse proxy URL (format: http://username:password@host:port or http://host:port)
            let axiosConfig: any = {
                headers: {
                    'User-Agent': getRandomUserAgent(),
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Connection': 'keep-alive',
                    'Upgrade-Insecure-Requests': '1',
                    'Sec-Fetch-Dest': 'document',
                    'Sec-Fetch-Mode': 'navigate',
                    'Sec-Fetch-Site': 'same-origin',
                    'Sec-Fetch-User': '?1',
                    'Cache-Control': 'max-age=0',
                    'Referer': 'https://www.cinemark.com/',
                    'DNT': '1',
                },
                timeout: 30000,
                maxRedirects: 5,
            };

            if (proxyUrl) {
                // Parse the proxy URL
                const proxyUrlObj = new URL(proxyUrl);
                
                axiosConfig.proxy = {
                    protocol: proxyUrlObj.protocol.replace(':', ''),
                    host: proxyUrlObj.hostname,
                    port: parseInt(proxyUrlObj.port),
                };

                // Add auth if present
                if (proxyUrlObj.username && proxyUrlObj.password) {
                    axiosConfig.proxy.auth = {
                        username: proxyUrlObj.username,
                        password: proxyUrlObj.password,
                    };
                }
            }

            const response = await axios.get(url, axiosConfig);
            
            if (response.status === 403) {
                console.warn(`🚫 403 Forbidden on attempt ${attempt + 1}/${retries}`);
                if (attempt < retries - 1) {
                    const backoffDelay = (attempt + 1) * 2000;
                    console.log(`⏳ Waiting ${backoffDelay}ms before retry...`);
                    await new Promise(resolve => setTimeout(resolve, backoffDelay));
                    continue;
                }
                throw new Error('Request blocked by server (403)');
            }
            
            console.log('✅ Fetch successful, status:', response.status);
            console.log('📊 Response size:', response.data.length, 'bytes');
            return cheerio.load(response.data);
            
        } catch (error) {
            console.error(`❌ Fetch failed (attempt ${attempt + 1}/${retries}):`, error);
            
            if (axios.isAxiosError(error)) {
                console.error('Response status:', error.response?.status);
                console.error('Response headers:', error.response?.headers);
                
                // If it's a 403, try with next proxy
                if (error.response?.status === 403 && attempt < retries - 1) {
                    console.log('🔄 Trying with next proxy...');
                    continue;
                }
            }
            
            // If last attempt, throw
            if (attempt === retries - 1) {
                throw error;
            }
            
            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
    
    throw new Error('Failed after all retries');
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