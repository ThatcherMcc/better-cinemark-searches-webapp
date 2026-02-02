// api/scrape/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { scrapeMovieNames, scrapeShowtimes, scrapeSeats } from '../../../lib/seatScraper';
import SeatFinder from '../../../utils/seatFinder';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('🔵 API Route - Received request:', { 
      action: body.action, 
      theaterUrl: body.theaterUrl?.substring(0, 50) + '...', 
      movieName: body.movieName,
      groupSize: body.groupSize,
      heatmapPreference: body.heatmapPreference
    });

    const { action, theaterUrl, movieName, groupSize, heatmapPreference } = body;

    switch (action) {
      case 'movies':
        console.log('🎬 Fetching movies for theater...');
        const movies = await scrapeMovieNames(theaterUrl);
        console.log(`✅ Found ${movies.length} movies`);
        return NextResponse.json({ movies });

      case 'showtimes':
        console.log('🕐 Fetching showtimes for movie:', movieName);
        const showtimes = await scrapeShowtimes(theaterUrl, movieName);
        console.log(`✅ Found ${showtimes.length} showtimes`);
        return NextResponse.json({ showtimes });

      case 'seats':
        console.log('💺 Starting seat scraping process...');
        const showtimesForSeats = await scrapeShowtimes(theaterUrl, movieName);
        console.log(`📅 Found ${showtimesForSeats.length} showtimes to scrape`);
        
        // Create a streaming response
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          async start(controller) {
            try {
              const allSeats = [];
              
              for (let i = 0; i < showtimesForSeats.length; i++) {
                const showtime = showtimesForSeats[i];
                console.log(`🔍 Scraping showtime ${i + 1}/${showtimesForSeats.length}: ${showtime.time}`);
                
                // Send progress update
                const progressData = { type: 'progress', current: i + 1, total: showtimesForSeats.length };
                console.log('📤 Sending progress:', progressData);
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify(progressData)}\n\n`)
                );
                
                // Scrape seats for this showtime (with 5 second delay built in)
                const seats = await scrapeSeats([showtime]);
                console.log(`  ✅ Found ${seats.length} seats for ${showtime.time}`);
                allSeats.push(...seats);
              }
              
              console.log(`🎯 Total seats scraped: ${allSeats.length}`);
              console.log(`🔢 Calculating blocks for group size: ${groupSize}, preference: ${heatmapPreference}`);
              
              // Calculate blocks
              const blocks = SeatFinder(allSeats, groupSize, heatmapPreference);
              console.log(`✅ Found ${blocks.length} seat blocks`);
              
              // Send completion
              const completeData = { type: 'complete', blocks };
              console.log('📤 Sending completion with', blocks.length, 'blocks');
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(completeData)}\n\n`)
              );
              
              controller.close();
              console.log('✅ Stream closed successfully');
            } catch (error) {
              console.error('❌ Error in stream:', error);
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
        console.warn('⚠️ Invalid action received:', action);
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('❌ Scraping error:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { error: 'Scraping failed', details: error instanceof Error ? error.message : 'Unknown error' }, 
      { status: 500 }
    );
  }
}