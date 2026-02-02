'use client';

import { useState, useEffect } from 'react';
import type { SeatBlock, MovieInfo, HeatmapPreference } from '../types';
import TheaterHeatmaps from '../components/TheaterHeatmaps';
import TheaterSelector from '../components/TheaterSelector';

export default function HomePage() {
  const [selectedTheater, setSelectedTheater] = useState<{ url: string; name: string } | null>(null);
  const [movies, setMovies] = useState<MovieInfo[]>([]);
  const [selectedMovie, setSelectedMovie] = useState<MovieInfo | null>(null);
  const [groupSize, setGroupSize] = useState<number>(2);
  const [seatBlocks, setSeatBlocks] = useState<SeatBlock[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingProgress, setLoadingProgress] = useState<{ current: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [heatmapPreference, setHeatmapPreference] = useState<HeatmapPreference>('middles');

  // Load movies when theater is selected
  useEffect(() => {
    if (!selectedTheater) return;

    const loadMovies = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch('/api/scrape', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            action: 'movies', 
            theaterUrl: selectedTheater.url 
          })
        });

        if (!response.ok) {
          throw new Error('Failed to load movies');
        }

        const { movies } = await response.json();
        setMovies(movies);
      } catch (err) {
        setError('Failed to load movies');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadMovies();
  }, [selectedTheater]);

  // Handle theater selection
  const handleTheaterSelect = (theaterUrl: string, theaterName: string) => {
    setSelectedTheater({ url: theaterUrl, name: theaterName });
    setMovies([]);
    setSelectedMovie(null);
    setSeatBlocks([]);
    setError(null);
  };

  // Handle back to theater selection
  const handleBackToTheaterSelection = () => {
    setSelectedTheater(null);
    setMovies([]);
    setSelectedMovie(null);
    setSeatBlocks([]);
    setError(null);
  };

  // Handle movie selection and seat scraping
  const handleMovieSelect = async (movie: MovieInfo) => {
    setSelectedMovie(movie);
    setSeatBlocks([]);
    setError(null);
    setLoadingProgress(null);
    
    try {
      setLoading(true);
      
      // First, get the showtimes to know how many there are
      const showtimesResponse = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'showtimes',
          theaterUrl: selectedTheater!.url,
          movieName: movie.name
        })
      });

      if (!showtimesResponse.ok) {
        throw new Error('Failed to get showtimes');
      }

      const { showtimes } = await showtimesResponse.json();
      
      // Set initial progress
      setLoadingProgress({ current: 0, total: showtimes.length });

      // Now scrape seats with progress updates
      const response = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'seats',
          theaterUrl: selectedTheater!.url,
          movieName: movie.name,
          groupSize,
          heatmapPreference
        })
      });

      if (!response.ok) {
        throw new Error('Failed to scrape seats');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = JSON.parse(line.slice(6));
              if (data.type === 'progress') {
                setLoadingProgress({ current: data.current, total: data.total });
              } else if (data.type === 'complete') {
                setSeatBlocks(data.blocks);
                if (data.blocks.length === 0) {
                  setError(`No blocks of ${groupSize} contiguous seats found`);
                }
              }
            }
          }
        }
      }
    } catch (err) {
      setError('Failed to scrape seats');
      console.error(err);
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
                onClick={() => {
                  setSelectedMovie(null);
                  setSeatBlocks([]);
                  setError(null);
                }}
                className="px-6 py-3 bg-zinc-800 border-2 border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-700 hover:border-zinc-600 transition-all text-base font-mono"
              >
                ← BACK
              </button>
            </div>

            {/* Showtimes */}
            {(() => {
              const showtimeGroups = seatBlocks.reduce((groups, block) => {
                if (!groups[block.showtime]) {
                  groups[block.showtime] = [];
                }
                groups[block.showtime].push(block);
                return groups;
              }, {} as Record<string, SeatBlock[]>);

              Object.keys(showtimeGroups).forEach(showtime => {
                const rowGroups = showtimeGroups[showtime].reduce((rows, block) => {
                  if (!rows[block.row] || block.distanceFromCenter < rows[block.row].distanceFromCenter) {
                    rows[block.row] = block;
                  }
                  return rows;
                }, {} as Record<string, SeatBlock>);
                
                showtimeGroups[showtime] = Object.values(rowGroups).slice(0, 3);
              });

              return Object.entries(showtimeGroups).map(([showtime, blocks]) => (
                <div key={showtime} className="space-y-4">
                  {/* Showtime Header */}
                  <div className="flex items-baseline gap-4 border-b-2 border-zinc-800 pb-3">
                    <p className="text-2xl font-light text-white font-mono">{showtime}</p>
                    <p className="text-sm text-zinc-500 font-mono uppercase tracking-wider">
                      {blocks.length} Option{blocks.length === 1 ? '' : 's'}
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
    </div>
  );
}