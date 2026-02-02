import { NextRequest, NextResponse } from 'next/server';
import { scrapeMovieNames, scrapeShowtimes, scrapeSeats } from '../../../lib/seatScraper';
import SeatFinder from '../../../utils/seatFinder';

export async function POST(request: NextRequest) {
  try {
    const { action, theaterUrl, movieName, groupSize, heatmapPreference } = await request.json();

    switch (action) {
      case 'movies':
        const movies = await scrapeMovieNames(theaterUrl);
        return NextResponse.json({ movies });

      case 'showtimes':
        const showtimes = await scrapeShowtimes(theaterUrl, movieName);
        return NextResponse.json({ showtimes });

      case 'seats':
        const showtimesForSeats = await scrapeShowtimes(theaterUrl, movieName);
        
        // Create a streaming response
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          async start(controller) {
            try {
              const allSeats = [];
              
              for (let i = 0; i < showtimesForSeats.length; i++) {
                const showtime = showtimesForSeats[i];
                
                // Send progress update
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ type: 'progress', current: i + 1, total: showtimesForSeats.length })}\n\n`)
                );
                
                // Scrape seats for this showtime (with 5 second delay built in)
                const seats = await scrapeSeats([showtime]);
                allSeats.push(...seats);
              }
              
              // Calculate blocks
              const blocks = SeatFinder(allSeats, groupSize, heatmapPreference);
              
              // Send completion
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: 'complete', blocks })}\n\n`)
              );
              
              controller.close();
            } catch (error) {
              controller.error(error);
            }
          }
        });

        return new Response(stream, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        });

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