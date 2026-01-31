// components/TheaterHeatmaps.tsx
'use client';

import { useState } from 'react';
import Image from 'next/image';
import type { HeatmapPreference, HeatmapOption } from '../types';

const preferences: HeatmapOption[] = [
  {
    id: 'middles',
    name: 'Middle',
    description: "You'll enjoy the middle seats of any back Rowdies.",
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
    description: 'You gravitate towards the middle back buy you can enjoy most of the back rows.',
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
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {/* Collapsed View - Small Header */}
      {!isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          className="w-full bg-neutral-800/50 border border-neutral-700/50 rounded-xl p-5 hover:bg-neutral-800/70 hover:border-neutral-600/50 transition-all duration-300 group"
        >
          <div className="flex items-center justify-between">
            <div className="text-left">
              <h3 className="text-lg font-semibold text-white mb-1">
                Seating Preference: <span className="text-neutral-400">{preferences.find(p => p.id === selectedPreference)?.name}</span>
              </h3>
              <p className="text-sm text-neutral-400">
                Click to change preference
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* Small preview image */}
              <div className="w-16 h-16 rounded-lg bg-neutral-700 overflow-hidden relative">
                <Image 
                  src={`/theater_heatmaps/${preferences.find(p => p.id === selectedPreference)?.image_name}`} 
                  alt={preferences.find(p => p.id === selectedPreference)?.name || ''} 
                  fill
                  className="object-contain p-1"
                />
              </div>
              <svg className="w-6 h-6 text-neutral-400 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </button>
      )}

      {/* Expanded View - Full Selection Interface */}
      {isExpanded && (
        <div className="space-y-6">
          {/* Header with Close Button */}
          <div className="flex items-center justify-between">
            <div className="text-center flex-1">
              <h2 className="text-3xl font-bold text-white mb-2">
                Seating Preferences
              </h2>
              <p className="text-neutral-400">
                Choose your preferred seating style
              </p>
            </div>
            <button
              onClick={() => setIsExpanded(false)}
              className="px-4 py-2 bg-neutral-800 border border-neutral-700 text-neutral-200 rounded-lg hover:bg-neutral-700 transition-all duration-200"
            >
              Done
            </button>
          </div>

          {/* Preference Grid - Larger */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {preferences.map((preference) => (
              <button
                key={preference.id}
                onClick={() => {
                  onPreferenceChange(preference.id);
                  setIsExpanded(false);
                }}
                className={`
                  relative group p-6 rounded-xl border-2 transition-all duration-300
                  ${selectedPreference === preference.id
                    ? 'bg-white border-white shadow-xl shadow-white/20'
                    : 'bg-neutral-800/50 border-neutral-700 hover:border-neutral-600 hover:bg-neutral-800/70'
                  }
                `}
              >
                {/* Image Preview - Much Larger */}
                <div className={`
                  w-full aspect-[4/3] rounded-lg mb-4 overflow-hidden transition-colors duration-300 relative
                  ${selectedPreference === preference.id
                    ? 'bg-neutral-100'
                    : 'bg-neutral-700 group-hover:bg-neutral-600'
                  }
                `}>
                  <Image 
                    src={`/theater_heatmaps/${preference.image_name}`} 
                    alt={preference.name} 
                    fill
                    className="object-contain p-4"
                  />
                </div>

                {/* Text Content */}
                <div className="text-left space-y-1">
                  <h3 className={`
                    font-semibold text-xl transition-colors duration-300
                    ${selectedPreference === preference.id
                      ? 'text-neutral-900'
                      : 'text-white'
                    }
                  `}>
                    {preference.name}
                  </h3>
                  <p className={`
                    text-base transition-colors duration-300
                    ${selectedPreference === preference.id
                      ? 'text-neutral-600'
                      : 'text-neutral-400'
                    }
                  `}>
                    {preference.description}
                  </p>
                </div>

                {/* Selected Indicator */}
                {selectedPreference === preference.id && (
                  <div className="absolute top-3 right-3">
                    <div className="w-8 h-8 rounded-full bg-neutral-900 flex items-center justify-center">
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












