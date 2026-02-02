// components/TheaterHeatmaps.tsx
'use client';

import { useState } from 'react';
import Image from 'next/image';
import type { HeatmapPreference, HeatmapOption } from '../types';

const preferences: HeatmapOption[] = [
  {
    id: 'middles',
    name: 'Middle',
    description: "You'll enjoy the middle seats of any back rows.",
    image_name: "middles.png",
  },
  {
    id: 'crosshair',
    name: 'Crosshair',
    description: "The middle of the middle seats.",
    image_name: "crosshair.png",
  },
  {
    id: 'back-triangle',
    name: 'Back Triangle',
    description: 'You gravitate towards the middle back but you can enjoy most of the back rows.',
    image_name: "back-triangle.png",
  },
  {
    id: 'back-back',
    name: 'Back Back',
    description: 'You enjoy the backest of the back.',
    image_name: "back-back.png",
  },
  {
    id: 'back',
    name: 'Back',
    description: 'Anything but the front rows.',
    image_name: "back.png",
  },
  {
    id: 'front',
    name: 'Front',
    description: "You're insane and enjoy your neck hurting.",
    image_name: "front.png",
  },
];

interface TheaterHeatmapsProps {
  selectedPreference: HeatmapPreference;
  onPreferenceChange: (preference: HeatmapPreference) => void;
}

export default function TheaterHeatmaps({ selectedPreference, onPreferenceChange }: TheaterHeatmapsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="w-full max-w-6xl mx-auto">
      {/* Collapsed View */}
      {!isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          className="w-full border-2 border-zinc-800 bg-zinc-950/90 hover:border-zinc-700 hover:bg-zinc-900/80 transition-all p-6 group"
        >
          <div className="flex items-center justify-between">
            <div className="text-left">
              <div className="text-sm font-mono text-zinc-500 mb-2 uppercase tracking-widest">
                Seating Preference
              </div>
              <div className="text-xl font-light text-white">
                {preferences.find(p => p.id === selectedPreference)?.name}
              </div>
            </div>
            <div className="flex items-center gap-5">
              <div className="w-20 h-20 border-2 border-zinc-800 bg-zinc-900 overflow-hidden relative">
                <Image 
                  src={`/theater_heatmaps/${preferences.find(p => p.id === selectedPreference)?.image_name}`} 
                  alt={preferences.find(p => p.id === selectedPreference)?.name || ''} 
                  fill
                  className="object-cover"
                />
              </div>
              <svg className="w-5 h-5 text-zinc-600 group-hover:text-zinc-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </button>
      )}

      {/* Expanded View */}
      {isExpanded && (
        <div className="space-y-8 border-2 border-zinc-800 bg-zinc-950/60 p-8">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-3xl font-light text-white mb-2">
                Seating Preferences
              </h2>
              <p className="text-base text-zinc-500 font-mono uppercase tracking-wider">
                Select Your Preferred Style
              </p>
            </div>
            <button
              onClick={() => setIsExpanded(false)}
              className="px-6 py-3 bg-zinc-800 border-2 border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-700 hover:border-zinc-600 transition-all text-base font-mono"
            >
              DONE
            </button>
          </div>

          {/* Preference Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {preferences.map((preference) => (
              <button
                key={preference.id}
                onClick={() => {
                  onPreferenceChange(preference.id);
                  setIsExpanded(false);
                }}
                className={`
                  relative p-6 border-2 transition-all text-left
                  ${selectedPreference === preference.id
                    ? 'bg-white border-white shadow-lg shadow-white/20'
                    : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900'
                  }
                `}
              >
                {/* Image */}
                <div className={`
                  w-full aspect-[1.7/1] mb-5 overflow-hidden relative border-2
                  ${selectedPreference === preference.id
                    ? 'bg-zinc-100 border-zinc-300'
                    : 'bg-zinc-900 border-zinc-800'
                  }
                `}>
                  <Image 
                    src={`/theater_heatmaps/${preference.image_name}`} 
                    alt={preference.name} 
                    fill
                    className="object-cover"
                  />
                </div>

                {/* Text */}
                <div className="space-y-2">
                  <h3 className={`
                    font-light text-xl
                    ${selectedPreference === preference.id
                      ? 'text-black'
                      : 'text-white'
                    }
                  `}>
                    {preference.name}
                  </h3>
                  <p className={`
                    text-sm leading-relaxed
                    ${selectedPreference === preference.id
                      ? 'text-zinc-700'
                      : 'text-zinc-500'
                    }
                  `}>
                    {preference.description}
                  </p>
                </div>

                {/* Selected Indicator */}
                {selectedPreference === preference.id && (
                  <div className="absolute top-4 right-4">
                    <div className="w-8 h-8 border-2 border-black flex items-center justify-center bg-black">
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}