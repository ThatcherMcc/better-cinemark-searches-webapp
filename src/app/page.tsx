'use client';

import { useState, useEffect } from 'react';
import TheaterHeatmaps from '../components/TheaterHeatmaps';
import TheaterSelector from '../components/TheaterSelector';
import { useExtensionScraper } from '../hooks/useExtensionScraper';
import type { SeatBlock, MovieInfo, HeatmapPreference } from '../types';
import { fetchMovies, fetchShowtimes, fetchAllSeats } from '../lib/cinemarkScraper';
import { groupAndFilterSeatBlocks } from '../utils/groupSeatBlocks';
import SeatFinder from '../utils/seatFinder';


export default function HomePage() {
  const { scraper, isInstalled, isChecking } = useExtensionScraper();
  
  const [selectedTheater, setSelectedTheater] = useState<{ url: string; name: string } | null>(null);
  const [movies, setMovies] = useState<MovieInfo[]>([]);
  const [movieCache, setMovieCache] = useState<Map<string, { movies: MovieInfo[], cachedAt: number }>>(new Map());
  const [selectedMovie, setSelectedMovie] = useState<MovieInfo | null>(null);
  const [groupSize, setGroupSize] = useState<number>(2);
  const [seatBlocks, setSeatBlocks] = useState<SeatBlock[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingProgress, setLoadingProgress] = useState<{ current: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [heatmapPreference, setHeatmapPreference] = useState<HeatmapPreference>('middles');

  const isCacheStale = (cachedAt: number): boolean => {
    const now = new Date();
    const cacheDate = new Date(cachedAt);
    
    // Get today's 2am cutoff time (middle of the 1-3am window)
    const todayCutoff = new Date(now);
    todayCutoff.setHours(2, 0, 0, 0);
    
    // If it's currently before 2am, use yesterday's 2am as the cutoff
    if (now.getHours() < 2) {
      todayCutoff.setDate(todayCutoff.getDate() - 1);
    }
    
    // Cache is stale if it was created before the last 2am cutoff
    return cacheDate < todayCutoff;
  };

  // Load movies when theater is selected
  const loadMovies = async (theaterUrl: string) => {
    // Check cache first
    const cached = movieCache.get(theaterUrl);
    if (cached && !isCacheStale(cached.cachedAt)) {
      console.log('📦 Loading movies from cache');
      setMovies(cached.movies);
      return;
    }

    if (cached && isCacheStale(cached.cachedAt)) {
      console.log('🗑️ Cache expired (before last 2am), refreshing...');
    }

    try {
      setLoading(true);
      setError(null);
      console.log('🔍 Fetching movies from server');
      const movieList = await fetchMovies(scraper, theaterUrl);
      setMovies(movieList);
      
      // Cache the results with current timestamp
      setMovieCache(prev => new Map(prev).set(theaterUrl, {
        movies: movieList,
        cachedAt: Date.now()
      }));
    } catch (err) {
      setError('Failed to load movies');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Handle theater selection
  const handleTheaterSelect = (theaterUrl: string, theaterName: string) => {
    setSelectedTheater({ url: theaterUrl, name: theaterName });
    setMovies([]);
    setSelectedMovie(null);
    setSeatBlocks([]);
    setError(null);
    
    // Load movies immediately
    loadMovies(theaterUrl);
  };

  // Handle back to theater selection
  const handleBackToTheaterSelection = () => {
    setSelectedTheater(null);
    setMovies([]);
    setSelectedMovie(null);
    setSeatBlocks([]);
    setError(null);
  };

  // Handle back to movie selection
  const handleBackToMovieSelection = () => {
    setSelectedMovie(null);
    setSeatBlocks([]);
    setError(null);
  };

  // Handle movie selection and seat scraping
  const handleMovieSelect = async (movie: MovieInfo) => {
    if (!isInstalled) {
      setError('Please install the browser extension first');
      return;
    }
  
    setSelectedMovie(movie);
    setSeatBlocks([]);
    setError(null);
    setLoading(true);
    setLoadingProgress(null);
  
    try {
      const showtimes = await fetchShowtimes(scraper, selectedTheater!.url, movie.name);
  
      if (showtimes.length === 0) {
        setError('No showtimes found for this movie');
        return;
      }
  
      setLoadingProgress({ current: 0, total: showtimes.length });
  
      const allSeats = await fetchAllSeats(scraper, showtimes, (current, total) => {
        setLoadingProgress({ current, total });
      });
  
      const blocks = SeatFinder(allSeats, groupSize, heatmapPreference);
      setSeatBlocks(blocks);
  
      if (blocks.length === 0) {
        setError(`No blocks of ${groupSize} contiguous seats found`);
      }
    } catch (error) {
      console.error('❌ Scraping failed:', error);
      setError(error instanceof Error ? error.message : 'Failed to scrape seats');
    } finally {
      setLoading(false);
      setLoadingProgress(null);
    }
  };

  // Handle group size change
  const handleGroupSizeChange = (newSize: number) => {
    setGroupSize(newSize);
    
    // Re-run seat finder if we already have a selected movie
    if (selectedMovie) {
      handleMovieSelect(selectedMovie);
    }
  };

  // Get quality styling for seat ranking
  const getQualityStyle = (index: number) => {
    if (index === 0) {
      return {
        containerClass: 'border-yellow-600/50 hover:border-yellow-500/70 shadow-lg shadow-yellow-600/10',
        seatClass: 'bg-yellow-600/10 border-yellow-600/40 text-yellow-200',
        buttonClass: 'bg-yellow-500 hover:bg-yellow-400 text-black shadow-lg shadow-yellow-500/30'
      };
    } else if (index === 1) {
      return {
        containerClass: 'border-zinc-600/50 hover:border-zinc-500/70',
        seatClass: 'bg-zinc-700/20 border-zinc-600/40 text-zinc-300',
        buttonClass: 'bg-white hover:bg-zinc-200 text-black'
      };
    }
    return {
      containerClass: 'border-zinc-700/50 hover:border-zinc-600/70',
      seatClass: 'bg-zinc-800/30 border-zinc-700/40 text-zinc-400',
      buttonClass: 'bg-white hover:bg-zinc-200 text-black'
    };
  };

  // Show loading while checking for extension
  if (isChecking) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
          </div>
          <p className="text-zinc-500 font-mono">CHECKING FOR EXTENSION</p>
        </div>
      </div>
    );
  }

  // Show extension installation prompt
  if (!isInstalled) {
    return (
      <div className="min-h-screen bg-black">
        <div className="fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />
        
        <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-6">
          <div className="max-w-2xl w-full border-2 border-zinc-800 bg-zinc-950 p-10">
            <div className="w-16 h-16 border-2 border-zinc-700 flex items-center justify-center mb-8 text-3xl">
              🧩
            </div>
            
            <h1 className="text-4xl font-light text-white mb-4 tracking-tight">
              One Quick Step
            </h1>

            <p className="text-zinc-400 mb-8 text-lg leading-relaxed">
              Cinemark doesn't let other apps pull up seat info directly. 
              A small browser extension lets Seat Finder check availability 
              the same way you would — just browsing their site normally.
            </p>

            <div className="bg-zinc-900 border-2 border-zinc-800 p-6 mb-8">
              <h3 className="text-white font-mono mb-4 text-sm uppercase tracking-wider">What to expect</h3>
              <ul className="text-zinc-400 space-y-3">
                <li className="flex items-start gap-3">
                  <span className="text-green-500 mt-1">✓</span>
                  <span>Install in one click from the Chrome Web Store</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-green-500 mt-1">✓</span>
                  <span>Only works on this app — can't access anything else</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-green-500 mt-1">✓</span>
                  <span>Nothing is stored or saved</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-green-500 mt-1">✓</span>
                  <span>Uninstall anytime from your Chrome extensions page</span>
                </li>
              </ul>
            </div>

            
            <a 
              href="https://chromewebstore.google.com/detail/cinemark-seat-finder/ggcnlllojphccplpckokceenceaelhff"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-8 py-4 bg-white text-black hover:bg-zinc-200 transition-colors text-base font-mono font-bold mb-4"
            >
              INSTALL EXTENSION →
            </a>
            
            <p className="text-zinc-600 text-sm font-mono">
              After installing, refresh this page
            </p>
          </div>
          <footer className="py-6 text-center text-zinc-600 text-xs font-mono">
            <p>© {new Date().getFullYear()} Thatcher McClure</p>
            <a href="/privacy" className="hover:text-white transition-colors underline mt-2 inline-block">
              Privacy Policy
            </a>
          </footer>
        </div>
      </div>
    );
  }

  // If no theater selected, show theater selector
  if (!selectedTheater) {
    return <TheaterSelector onTheaterSelect={handleTheaterSelect} />;
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Minimal grid background */}
      <div className="fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

      <div className="relative z-10 container mx-auto px-6 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-5xl font-light text-white tracking-tight mb-2">
                Seat Finder <span className="text-zinc-600">for Cinemark</span>
              </h1>
              <p className="text-base text-zinc-500 font-mono">
                {selectedTheater.name}
              </p>
            </div>
            <button
              onClick={handleBackToTheaterSelection}
              className="px-6 py-3 bg-zinc-800 border-2 border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-700 hover:border-zinc-600 transition-all text-base font-mono"
            >
              ← CHANGE THEATER
            </button>
          </div>
          <div className="h-px bg-gradient-to-r from-zinc-800 via-zinc-600 to-zinc-800" />
        </div>

        {/* Group Size Selector */}
        {!selectedMovie && (
          <div className="mb-10 max-w-lg">
            <label className="block text-sm font-mono text-zinc-400 mb-4 uppercase tracking-widest">
              Group Size
            </label>
            <div className="flex gap-3">
              {[1, 2, 3, 4, 5, 6, 7, 8].map(size => (
                <button
                  key={size}
                  onClick={() => handleGroupSizeChange(size)}
                  disabled={loading}
                  className={`
                    flex-1 aspect-square flex items-center justify-center text-lg font-mono transition-all border-2
                    ${groupSize === size 
                      ? 'bg-white text-black border-white shadow-lg shadow-white/20' 
                      : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 border-zinc-700 hover:border-zinc-600'
                    }
                    disabled:opacity-30 disabled:cursor-not-allowed
                  `}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Seating Preference */}
        {!selectedMovie && (
          <div className="mb-12">
            <TheaterHeatmaps 
              selectedPreference={heatmapPreference}
              onPreferenceChange={setHeatmapPreference}
            />
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="py-20">
            <div className="max-w-md mx-auto space-y-6">
              <div className="flex items-center justify-center gap-3">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
              </div>
              <p className="text-center text-base font-mono text-zinc-400">
                {loadingProgress 
                  ? `SCANNING ${loadingProgress.current}/${loadingProgress.total}` 
                  : 'LOADING'}
              </p>
              {loadingProgress && loadingProgress.total > 0 && (
                <div className="w-full h-1 bg-zinc-900 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-white to-zinc-400 transition-all duration-300"
                    style={{ width: `${(loadingProgress.current / loadingProgress.total) * 100}%` }}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="max-w-2xl mx-auto mb-8 border-2 border-red-800 bg-red-950/40 p-5">
            <p className="text-red-300 text-center text-base font-mono">{error}</p>
          </div>
        )}

        {/* Movie Selection */}
        {!selectedMovie && movies.length > 0 && !loading && (
          <div className="space-y-6">
            <h2 className="text-sm font-mono text-zinc-500 uppercase tracking-widest">
              Now Showing
            </h2>
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {movies.map((movie, index) => (
                <button
                  key={index}
                  onClick={() => handleMovieSelect(movie)}
                  disabled={loading}
                  className="group relative aspect-[2/3] overflow-hidden transition-all duration-300 hover:scale-[1.03] disabled:cursor-not-allowed"
                >
                  {/* Movie Poster */}
                  <div className="absolute inset-0 bg-zinc-900">
                    {movie.imageUrl ? (
                      <img 
                        src={movie.imageUrl} 
                        alt={movie.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-700 text-4xl font-light">
                        ?
                      </div>
                    )}
                  </div>

                  {/* Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent opacity-60 group-hover:opacity-95 transition-opacity" />
                  
                  {/* Border */}
                  <div className="absolute inset-0 border-2 border-zinc-800 group-hover:border-white/30 transition-colors" />

                  {/* Rating */}
                  {movie.rating && (
                    <div className="absolute top-3 right-3 px-2.5 py-1 bg-black/90 border-2 border-zinc-700 text-white text-xs font-mono">
                      {movie.rating}
                    </div>
                  )}

                  {/* Title */}
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <h3 className="font-light text-white text-sm leading-tight line-clamp-2 mb-1">
                      {movie.name}
                    </h3>
                    {movie.runtime && (
                      <p className="text-xs text-zinc-500 transition-opacity font-mono">
                        {movie.runtime}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Seat Blocks Display */}
        {selectedMovie && seatBlocks.length > 0 && (
          <div className="space-y-10">
            {/* Header */}
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-3xl font-light text-white mb-2">
                  {selectedMovie.name}
                </h2>
                <p className="text-base text-zinc-500 font-mono">
                  TOP SEATS · PARTY OF {groupSize}
                </p>
              </div>
              <button
                onClick={handleBackToMovieSelection}
                className="px-6 py-3 bg-zinc-800 border-2 border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-700 hover:border-zinc-600 transition-all text-base font-mono"
              >
                ← BACK TO MOVIES
              </button>
            </div>

            {/* Showtimes */}
            {(() => {
              const showtimeGroups = groupAndFilterSeatBlocks(seatBlocks);

              return Object.entries(showtimeGroups).map(([showtime, blocks]) => (
                <div key={showtime} className="space-y-4">
                  {/* Showtime Header */}
                  <div className="flex items-baseline gap-4 border-b-2 border-zinc-800 pb-3">
                    <p className="text-2xl font-light text-white font-mono">{showtime}</p>
                    <p className="text-sm text-zinc-500 font-mono uppercase tracking-wider">
                      Top {blocks.length} Option{blocks.length === 1 ? '' : 's'}
                    </p>
                  </div>

                  {/* Seat Options */}
                  <div className="space-y-3">
                    {blocks.map((block, index) => {
                      const style = getQualityStyle(index);
                      return (
                        <div
                          key={index}
                          className={`
                            border-2 bg-zinc-950 hover:bg-zinc-900 transition-all group
                            ${style.containerClass}
                          `}
                        >
                          <div className="flex items-center justify-between p-6">
                            <div className="flex items-center gap-8">
                              {/* Rank Number */}
                              <div className="w-12 h-12 flex items-center justify-center border-2 border-zinc-700 text-zinc-400 text-xl font-mono">
                                {index + 1}
                              </div>

                              {/* Row */}
                              <div>
                                <p className="text-xs text-zinc-500 font-mono mb-2 uppercase tracking-wider">ROW</p>
                                <p className="text-2xl font-light text-white">{block.row}</p>
                              </div>
                              
                              {/* Seats */}
                              <div>
                                <p className="text-xs text-zinc-500 font-mono mb-2 uppercase tracking-wider">SEATS</p>
                                <div className="flex gap-2">
                                  {block.seats.map((seat, seatIndex) => (
                                    <span 
                                      key={seatIndex}
                                      className={`
                                        px-3 py-2 border-2 font-mono text-sm font-medium
                                        ${style.seatClass}
                                      `}
                                    >
                                      {seat.row}{seat.column}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>

                            {/* Select Button */}
                            <a 
                              href={block.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className={`
                                px-8 py-4 transition-all text-base font-mono font-bold uppercase tracking-wide
                                ${style.buttonClass}
                              `}
                            >
                              SELECT →
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ));
            })()}
          </div>
        )}
      </div>
    <footer className="py-6 text-center text-zinc-600 text-xs font-mono">
      <p>© {new Date().getFullYear()} Thatcher McClure</p>
      <a href="/privacy" className="hover:text-white transition-colors underline mt-2 inline-block">
        Privacy Policy
      </a>
    </footer>
    </div>
  );
}