'use client';

import { useState } from 'react';
import { MapPin, Search, Loader2, Navigation } from 'lucide-react';

interface Theater {
  id: number;
  name: string;
  city: string;
  latitude: number;
  longitude: number;
  url: string;
  distance?: number;
}

interface TheaterSelectorProps {
  onTheaterSelect: (theaterUrl: string, theaterName: string) => void;
}

export default function TheaterSelector({ onTheaterSelect }: TheaterSelectorProps) {
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [cityTheaters, setCityTheaters] = useState<Theater[]>([]);
  const [nearbyTheaters, setNearbyTheaters] = useState<Theater[]>([]);
  const [error, setError] = useState('');
  const [useCurrentLocation, setUseCurrentLocation] = useState(false);

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!searchInput.trim()) {
      setError('Please enter a city name');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setCityTheaters([]);
      setNearbyTheaters([]);

      const response = await fetch('/api/theaters/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchInput, limit: 5 })
      });

      if (!response.ok) {
        throw new Error('Failed to find theaters');
      }

      const { cityMatches, nearbyMatches } = await response.json();
      setCityTheaters(cityMatches || []);
      setNearbyTheaters(nearbyMatches || []);

      if ((cityMatches?.length || 0) === 0 && (nearbyMatches?.length || 0) === 0) {
        setError('No theaters found. Try searching by city name.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setCityTheaters([]);
      setNearbyTheaters([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    setUseCurrentLocation(true);
    setLoading(true);
    setError('');
    setCityTheaters([]);
    setNearbyTheaters([]);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const response = await fetch('/api/theaters/nearest', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              lat: position.coords.latitude, 
              lon: position.coords.longitude, 
              limit: 5
            })
          });

          if (!response.ok) {
            throw new Error('Failed to find theaters');
          }

          const { theaters } = await response.json();
          setNearbyTheaters(theaters || []);

          if ((theaters?.length || 0) === 0) {
            setError('No theaters found near your location');
          }
        } catch (err) {
          setError('Unable to find nearby theaters. Please search by city instead.');
        } finally {
          setLoading(false);
          setUseCurrentLocation(false);
        }
      },
      (error) => {
        setError('Unable to get your location. Please search by city instead.');
        setLoading(false);
        setUseCurrentLocation(false);
      }
    );
  };

  const handleTheaterSelect = (theater: Theater) => {
    onTheaterSelect(theater.url, `${theater.name} - ${theater.city}`);
  };

  const allTheaters = [...cityTheaters, ...nearbyTheaters];

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6">
      {/* Minimal grid background */}
      <div className="fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

      <div className="relative w-full max-w-2xl">
        <div className="border-2 border-zinc-700 bg-zinc-950 p-10">
          {/* Header */}
          <div className="mb-10">
            <div className="w-12 h-12 border-2 border-zinc-700 flex items-center justify-center mb-6">
              <MapPin className="text-zinc-500" size={24} />
            </div>
            <h1 className="text-4xl font-light text-white mb-3 tracking-tight">
              Seat Finder <span className="text-zinc-600">for Cinemark</span>
            </h1>
            <p className="text-base text-zinc-500 font-mono uppercase tracking-wider">
              Select Your Theater
            </p>
          </div>

          {/* Search Form */}
          <form onSubmit={handleSearchSubmit} className="mb-5">
            <div className="flex gap-3">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Enter a city name that has a Cinemark theater"
                className="flex-1 px-5 py-4 bg-zinc-900 border-2 border-zinc-800 text-white text-base placeholder-zinc-600 focus:border-zinc-600 focus:outline-none transition-colors"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading}
                className="px-8 py-4 bg-white text-black hover:bg-zinc-200 disabled:bg-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed transition-colors text-base font-mono font-bold flex items-center gap-3"
              >
                {loading && !useCurrentLocation ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    <span className="hidden sm:inline">SEARCH</span>
                  </>
                ) : (
                  <>
                    <Search size={20} />
                    <span className="hidden sm:inline">SEARCH</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Location Button */}
          <div className="mb-10">
            <button
              onClick={handleUseCurrentLocation}
              disabled={loading}
              className="w-full px-5 py-4 bg-zinc-800 border-2 border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-700 hover:border-zinc-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-base font-mono flex items-center justify-center gap-3"
            >
              {useCurrentLocation ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  LOCATING
                </>
              ) : (
                <>
                  <Navigation size={20} />
                  USE CURRENT LOCATION
                </>
              )}
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-8 border-2 border-red-800 bg-red-950/40 p-4">
              <p className="text-red-300 text-sm font-mono text-center">{error}</p>
            </div>
          )}

          {/* City Results */}
          {cityTheaters.length > 0 && (
            <div className="space-y-3 mb-8">
              <h2 className="text-sm font-mono text-zinc-500 uppercase tracking-widest mb-4">
                {searchInput}
              </h2>
              {cityTheaters.map((theater) => (
                <button
                  key={theater.id}
                  onClick={() => handleTheaterSelect(theater)}
                  className="w-full text-left p-5 bg-zinc-900 border-2 border-zinc-800 hover:border-zinc-600 hover:bg-zinc-800 transition-all group"
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <h3 className="font-light text-white text-lg mb-2 group-hover:text-zinc-200 transition-colors">
                        {theater.name}
                      </h3>
                      <p className="text-zinc-500 text-sm font-mono">
                        {theater.city}
                      </p>
                    </div>
                    <div className="text-zinc-600 group-hover:text-zinc-400 transition-colors">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Nearby Results */}
          {nearbyTheaters.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-mono text-zinc-500 uppercase tracking-widest mb-4">
                {cityTheaters.length > 0 ? 'NEARBY' : 'NEAREST'}
              </h2>
              {nearbyTheaters.map((theater) => (
                <button
                  key={theater.id}
                  onClick={() => handleTheaterSelect(theater)}
                  className="w-full text-left p-5 bg-zinc-900 border-2 border-zinc-800 hover:border-zinc-600 hover:bg-zinc-800 transition-all group"
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <h3 className="font-light text-white text-lg mb-2 group-hover:text-zinc-200 transition-colors">
                        {theater.name}
                      </h3>
                      <div className="flex items-center gap-3 text-sm font-mono">
                        <p className="text-zinc-500">
                          {theater.city}
                        </p>
                        {theater.distance !== undefined && (
                          <>
                            <span className="text-zinc-700">·</span>
                            <p className="text-zinc-600">
                              {theater.distance.toFixed(1)} mi
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="text-zinc-600 group-hover:text-zinc-400 transition-colors">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!loading && allTheaters.length === 0 && !error && (
            <div className="text-center py-16">
              <div className="w-16 h-16 border-2 border-zinc-800 flex items-center justify-center mx-auto mb-6">
                <MapPin className="text-zinc-700" size={32} />
              </div>
              <p className="text-zinc-600 text-sm font-mono uppercase tracking-wider">
                Search to begin
              </p>
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
    </div>
  );
}