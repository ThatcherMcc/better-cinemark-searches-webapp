// app/page.tsx or your component
'use client';

import { useState, useEffect } from 'react';
import type { SeatBlock } from '../types';

export default function HomePage() {
  const [movies, setMovies] = useState<string[]>([]);
  const [selectedMovie, setSelectedMovie] = useState<string | null>(null);
  const [groupSize, setGroupSize] = useState<number>(2);
  const [seatBlocks, setSeatBlocks] = useState<SeatBlock[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const theaterUrl = "https://www.cinemark.com/theatres/tx-allen/cinemark-allen-16-and-xd";

  // Load movies on mount
  useEffect(() => {
    const loadMovies = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch('/api/scrape', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            action: 'movies', 
            theaterUrl 
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
  }, []);

  // Handle movie selection and seat scraping
  const handleMovieSelect = async (movie: string) => {
    setSelectedMovie(movie);
    setSeatBlocks([]);
    setError(null);
    
    try {
      setLoading(true);
      
      const response = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'seats',
          theaterUrl,
          movieName: movie,
          groupSize
        })
      });

      if (!response.ok) {
        throw new Error('Failed to scrape seats');
      }

      const { blocks } = await response.json();
      setSeatBlocks(blocks);

      if (blocks.length === 0) {
        setError(`No blocks of ${groupSize} contiguous seats found`);
      }
    } catch (err) {
      setError('Failed to scrape seats');
      console.error(err);
    } finally {
      setLoading(false);
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

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-4xl font-bold mb-8">Cinemark Seat Finder</h1>

      {/* Group Size Selector */}
      <div className="mb-8">
        <label className="block text-lg font-semibold mb-2">
          Group Size:
        </label>
        <select
          value={groupSize}
          onChange={(e) => handleGroupSizeChange(Number(e.target.value))}
          className="border rounded px-4 py-2"
          disabled={loading}
        >
          {[1, 2, 3, 4, 5, 6, 7, 8].map(size => (
            <option key={size} value={size}>{size}</option>
          ))}
        </select>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-8">
          <p className="text-xl">Loading...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Movie Selection */}
      {!selectedMovie && movies.length > 0 && (
        <div>
          <h2 className="text-2xl font-semibold mb-4">Select a Movie:</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {movies.map((movie, index) => (
              <button
                key={index}
                onClick={() => handleMovieSelect(movie)}
                className="p-4 border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition text-left"
                disabled={loading}
              >
                <h3 className="font-semibold">{movie}</h3>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Seat Blocks Display */}
      {selectedMovie && seatBlocks.length > 0 && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold">
              Available Seats for {selectedMovie}
            </h2>
            <button
              onClick={() => {
                setSelectedMovie(null);
                setSeatBlocks([]);
                setError(null);
              }}
              className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
            >
              Back to Movies
            </button>
          </div>

          <p className="mb-4 text-gray-600">
            Found {seatBlocks.length} blocks of {groupSize} contiguous seats
          </p>

          <div className="space-y-4">
            {seatBlocks.map((block, index) => (
              <div
                key={index}
                className="border rounded-lg p-4 hover:shadow-lg transition"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-lg">
                      Showtime: {block.showtime}
                    </p>
                    <p className="text-gray-600">Row: {block.row}</p>
                    <p className="text-gray-600">
                      Seats: {block.seats.map(s => `${s.row}${s.column}`).join(', ')}
                    </p>
                  </div>
                  <button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                    Select
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}