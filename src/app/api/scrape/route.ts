// app/api/scrape/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { scrapeMovieNames, scrapeShowtimes, scrapeSeats } from '../../../lib/seatScraper';
import SeatFinder from '../../../utils/seatFinder';

export async function POST(request: NextRequest) {
  try {
    const { action, theaterUrl, movieName, groupSize } = await request.json();

    switch (action) {
      case 'movies':
        const movies = await scrapeMovieNames(theaterUrl);
        return NextResponse.json({ movies });

      case 'seats':
        const showtimes = await scrapeShowtimes(theaterUrl, movieName);
        const seats = await scrapeSeats(showtimes);
        const blocks = SeatFinder(seats, groupSize);
        return NextResponse.json({ blocks, seats });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Scraping error:', error);
    return NextResponse.json(
      { error: 'Scraping failed', details: error instanceof Error ? error.message : 'Unknown error' }, 
      { status: 500 }
    );
  }
}