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
    <div className="min-h-screen bg-neutral-900 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="bg-neutral-800/50 border border-neutral-700/50 rounded-2xl p-8 shadow-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-neutral-700/50 rounded-full mb-4">
              <MapPin className="text-white" size={32} />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Find Your Theater
            </h1>
            <p className="text-neutral-400">
              Search by city or use your current location
            </p>
          </div>

          {/* Search Form */}
          <form onSubmit={handleSearchSubmit} className="mb-6">
            <div className="flex gap-3">
              <div className="flex-1">
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Enter city name..."
                  className="w-full px-4 py-3 bg-neutral-700/50 border border-neutral-600 rounded-lg text-white placeholder-neutral-400 focus:ring-2 focus:ring-white focus:border-transparent outline-none transition-all"
                  disabled={loading}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-white text-neutral-900 rounded-lg hover:bg-neutral-100 disabled:bg-neutral-600 disabled:cursor-not-allowed flex items-center gap-2 font-semibold transition-all"
              >
                {loading && !useCurrentLocation ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    <span className="hidden sm:inline">Searching...</span>
                  </>
                ) : (
                  <>
                    <Search size={20} />
                    <span className="hidden sm:inline">Search</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Use Current Location Button */}
          <div className="mb-6">
            <button
              onClick={handleUseCurrentLocation}
              disabled={loading}
              className="w-full px-4 py-3 bg-neutral-700/50 border border-neutral-600 text-white rounded-lg hover:bg-neutral-700 disabled:bg-neutral-800 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium transition-all"
            >
              {useCurrentLocation ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Getting location...
                </>
              ) : (
                <>
                  <Navigation size={20} />
                  Use my current location
                </>
              )}
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-900/20 border border-red-800/30 rounded-lg">
              <p className="text-red-300 text-sm text-center">{error}</p>
            </div>
          )}

          {/* Theater Results - City Matches */}
          {cityTheaters.length > 0 && (
            <div className="space-y-3 mb-6">
              <h2 className="text-lg font-semibold text-neutral-200">
                Theaters in {searchInput}
              </h2>
              {cityTheaters.map((theater) => (
                <button
                  key={theater.id}
                  onClick={() => handleTheaterSelect(theater)}
                  className="w-full text-left p-5 bg-neutral-700/30 border border-neutral-600/50 rounded-xl hover:bg-neutral-700/50 hover:border-neutral-500 transition-all group"
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white text-lg mb-1 group-hover:text-neutral-100 transition-colors">
                        {theater.name}
                      </h3>
                      <p className="text-neutral-400 text-sm">
                        {theater.city}
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center group-hover:bg-white/20 transition-colors">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Theater Results - Nearby */}
          {nearbyTheaters.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-neutral-200">
                {cityTheaters.length > 0 ? 'Nearby Theaters' : 'Nearest Theaters'}
              </h2>
              {nearbyTheaters.map((theater) => (
                <button
                  key={theater.id}
                  onClick={() => handleTheaterSelect(theater)}
                  className="w-full text-left p-5 bg-neutral-700/30 border border-neutral-600/50 rounded-xl hover:bg-neutral-700/50 hover:border-neutral-500 transition-all group"
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white text-lg mb-1 group-hover:text-neutral-100 transition-colors">
                        {theater.name}
                      </h3>
                      <p className="text-neutral-400 text-sm">
                        {theater.city}
                      </p>
                      {theater.distance !== undefined && (
                        <p className="text-neutral-500 text-xs mt-2">
                          {theater.distance.toFixed(1)} miles away
                        </p>
                      )}
                    </div>
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center group-hover:bg-white/20 transition-colors">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!loading && allTheaters.length === 0 && !error && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-neutral-700/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="text-neutral-500" size={32} />
              </div>
              <p className="text-neutral-400 text-sm">
                Enter your city to find nearby theaters
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}