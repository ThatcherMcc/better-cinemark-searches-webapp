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

  // If no theater selected, show theater selector
  if (!selectedTheater) {
    return <TheaterSelector onTheaterSelect={handleTheaterSelect} />;
  }

  return (
    <div className="min-h-screen bg-neutral-900 relative overflow-hidden">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-[0.02]">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMSI+PHBhdGggZD0iTTM2IDE0YzMuMzEgMCA2LTIuNjkgNi02cy0yLjY5LTYtNi02LTYgMi42OS02IDYgMi42OSA2IDYgNnpNNiA1NGMzLjMxIDAgNi0yLjY5IDYtNnMtMi42OS02LTYtNi02IDIuNjktNiA2IDIuNjkgNiA2IDZ6Ii8+PC9nPjwvZz48L3N2Zz4=')]"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-12 max-w-7xl">
        {/* Header with Theater Info */}
        <div className="text-center mb-12 space-y-3">
          <div className="flex items-center justify-center gap-3 mb-4">
            <button
              onClick={handleBackToTheaterSelection}
              className="px-4 py-2 bg-neutral-800 border border-neutral-700 text-neutral-300 rounded-lg hover:bg-neutral-700 transition-all text-sm font-medium"
            >
              ← Change Theater
            </button>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-white">
            Seat Finder for Cinemark
          </h1>
          <p className="text-lg text-neutral-400 font-light">
            {selectedTheater.name}
          </p>
          <div className="h-px w-24 mx-auto bg-gradient-to-r from-transparent via-neutral-600 to-transparent"></div>
        </div>

        {/* Group Size Selector */}
        {!selectedMovie && (
          <div className="mb-10 max-w-md mx-auto">
            <div className="bg-neutral-800/50 border border-neutral-700/50 rounded-xl p-5 shadow-lg">
              <label className="block text-sm font-medium mb-3 text-neutral-300 uppercase tracking-wider">
                Group Size
              </label>
              <div className="grid grid-cols-8 gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8].map(size => (
                  <button
                    key={size}
                    onClick={() => handleGroupSizeChange(size)}
                    disabled={loading}
                    className={`
                      aspect-square rounded-lg font-semibold text-base transition-all duration-200
                      ${groupSize === size 
                        ? 'bg-white text-neutral-900 shadow-md' 
                        : 'bg-neutral-700/50 text-neutral-300 hover:bg-neutral-600/50'
                      }
                      disabled:opacity-50 disabled:cursor-not-allowed
                    `}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Seating Preference Heatmaps */}
        {!selectedMovie && (
          <div className="mb-10">
            <TheaterHeatmaps 
              selectedPreference={heatmapPreference}
              onPreferenceChange={setHeatmapPreference}
            />
          </div>
        )}

        {/* Loading State with Progress Bar */}
        {loading && (
          <div className="text-center py-16">
            <div className="inline-block max-w-md w-full">
              <div className="w-12 h-12 border-3 border-neutral-700 border-t-white rounded-full animate-spin mx-auto"></div>
              <p className="mt-4 text-lg text-neutral-400">
                {loadingProgress 
                  ? `Scanning showtimes (${loadingProgress.current}/${loadingProgress.total})...` 
                  : 'Loading...'}
              </p>
              {loadingProgress && loadingProgress.total > 0 && (
                <div className="mt-6 w-full">
                  <div className="w-full bg-neutral-800 rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-white h-full transition-all duration-500 ease-out"
                      style={{ width: `${(loadingProgress.current / loadingProgress.total) * 100}%` }}
                    ></div>
                  </div>
                  <p className="mt-2 text-sm text-neutral-500">
                    This may take a few moments...
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="max-w-2xl mx-auto mb-8 bg-red-900/20 border border-red-800/30 rounded-xl p-4 shadow-lg">
            <p className="text-red-300 text-center">{error}</p>
          </div>
        )}

        {/* Movie Selection */}
        {!selectedMovie && movies.length > 0 && !loading && (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-neutral-200 tracking-tight">
              Now Showing
            </h2>
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {movies.map((movie, index) => (
                <button
                  key={index}
                  onClick={() => handleMovieSelect(movie)}
                  disabled={loading}
                  className="group relative aspect-[2/3] rounded-lg overflow-hidden transition-all duration-300 hover:scale-105 hover:z-10 hover:shadow-2xl disabled:cursor-not-allowed"
                >
                  {/* Movie Poster */}
                  <div className="absolute inset-0 bg-neutral-800">
                    {movie.imageUrl ? (
                      <img 
                        src={movie.imageUrl} 
                        alt={movie.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-neutral-600 text-4xl font-black">
                        ?
                      </div>
                    )}
                  </div>

                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-90 transition-opacity duration-300"></div>
                  
                  {/* Hover Effect Border */}
                  <div className="absolute inset-0 border-2 border-transparent group-hover:border-white/30 rounded-lg transition-all duration-300"></div>

                  {/* Rating Badge */}
                  {movie.rating && (
                    <div className="absolute top-2 right-2 px-2 py-0.5 bg-black/70 backdrop-blur-sm border border-white/20 rounded text-white text-[10px] font-semibold">
                      {movie.rating}
                    </div>
                  )}

                  {/* Title and Info */}
                  <div className="absolute bottom-0 left-0 right-0 p-3 space-y-1">
                    <h3 className="font-semibold text-white text-xs leading-tight line-clamp-2 group-hover:text-neutral-100 transition-colors duration-300">
                      {movie.name}
                    </h3>
                    {movie.runtime && (
                      <p className="text-[10px] text-neutral-400 font-medium">
                        {movie.runtime}
                      </p>
                    )}
                  </div>

                  {/* Play Icon Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="w-12 h-12 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-xl">
                      <svg className="w-5 h-5 text-neutral-900 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Seat Blocks Display */}
        {selectedMovie && seatBlocks.length > 0 && (
          <div className="space-y-6">
            {/* Header with Back Button */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
              <div className="text-center md:text-left">
                <h2 className="text-3xl font-bold text-white mb-1">
                  {selectedMovie.name}
                </h2>
                <p className="text-neutral-400 text-base">
                  Top 3 seats for {groupSize} {groupSize === 1 ? 'person' : 'people'} per showtime
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedMovie(null);
                  setSeatBlocks([]);
                  setError(null);
                }}
                className="px-5 py-2.5 bg-neutral-800 border border-neutral-700 text-neutral-200 rounded-lg hover:bg-neutral-700 transition-all duration-200 font-medium"
              >
                ← Back to Movies
              </button>
            </div>

            {/* Group by Showtime */}
            {(() => {
              // Group blocks by showtime
              const showtimeGroups = seatBlocks.reduce((groups, block) => {
                if (!groups[block.showtime]) {
                  groups[block.showtime] = [];
                }
                groups[block.showtime].push(block);
                return groups;
              }, {} as Record<string, SeatBlock[]>);

              // For each showtime, get only the best block per row
              Object.keys(showtimeGroups).forEach(showtime => {
                const rowGroups = showtimeGroups[showtime].reduce((rows, block) => {
                  if (!rows[block.row] || block.distanceFromCenter < rows[block.row].distanceFromCenter) {
                    rows[block.row] = block;
                  }
                  return rows;
                }, {} as Record<string, SeatBlock>);
                
                // Get top 3 only
                showtimeGroups[showtime] = Object.values(rowGroups).slice(0, 3);
              });

              return Object.entries(showtimeGroups).map(([showtime, blocks]) => (
                <div key={showtime} className="space-y-4">
                  {/* Showtime Header */}
                  <div className="flex items-center gap-3 px-2">
                    <div className="w-10 h-10 rounded-lg bg-neutral-700 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">{showtime}</p>
                      <p className="text-sm text-neutral-400">Top {blocks.length} seat{blocks.length === 1 ? '' : 's'}</p>
                    </div>
                  </div>

                  {/* Seat Blocks for this Showtime */}
                  <div className="grid gap-3 pl-2">
                    {blocks.map((block, index) => (
                      <div
                        key={index}
                        className="bg-neutral-800/50 border border-neutral-700/50 rounded-xl p-4 hover:bg-neutral-800/70 hover:border-neutral-600/50 hover:shadow-xl transition-all duration-300 group"
                      >
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                          <div className="flex items-center gap-6 flex-1">
                            {/* Rank Badge */}
                            <div className="flex-shrink-0">
                              <div className={`
                                w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg
                                ${index === 0 ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' : 
                                  index === 1 ? 'bg-gray-400/20 text-gray-300 border border-gray-400/30' : 
                                  index === 2 ? 'bg-orange-700/20 text-orange-400 border border-orange-700/30' : 
                                  'bg-neutral-700 text-neutral-300 border border-neutral-600'}
                              `}>
                                {index + 1}
                              </div>
                            </div>

                            {/* Row */}
                            <div>
                              <p className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold mb-1">Row</p>
                              <p className="text-xl font-bold text-neutral-200">{block.row}</p>
                            </div>
                            
                            {/* Seats */}
                            <div>
                              <p className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold mb-1">Seats</p>
                              <div className="flex gap-2">
                                {block.seats.map((seat, seatIndex) => (
                                  <span 
                                    key={seatIndex}
                                    className="px-2.5 py-1 bg-neutral-700 border border-neutral-600 rounded text-white font-mono text-sm"
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
                            className="px-6 py-3 bg-white text-neutral-900 rounded-lg font-semibold hover:bg-neutral-100 hover:shadow-lg transition-all duration-200 whitespace-nowrap"
                          >
                            Select Seats →
                          </a>
                        </div>
                      </div>
                    ))}
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