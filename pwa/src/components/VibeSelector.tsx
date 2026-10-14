import React from 'react';
import { X, Check } from 'lucide-react';
import { VibeType } from '../types';

interface VibeSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  currentVibe: VibeType;
  onSelectVibe: (vibe: VibeType) => void;
}

const VIBES: Array<{
  id: VibeType;
  emoji: string;
  name: string;
  desc: string;
  badgeColor: string;
}> = [
  {
    id: 'Cute Handwritten',
    emoji: '🌸',
    name: 'Cute Handwritten',
    desc: 'Caveat cursive, washi tape, warm scrapbooking, polaroids',
    badgeColor: 'bg-rose-100 text-rose-800 border-rose-200',
  },
  {
    id: 'Default Modern',
    emoji: '✨',
    name: 'Default Modern',
    desc: 'Sleek Tailwind cards, crisp typography, clean glassmorphism',
    badgeColor: 'bg-slate-100 text-slate-800 border-stone-200',
  },
  {
    id: 'Pastel Aesthetic',
    emoji: '🍬',
    name: 'Pastel Aesthetic',
    desc: 'Soft dreamy lavender/peach gradients, bubbly rounded cards',
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
  },
  {
    id: 'Dark Mode Neon',
    emoji: '⚡',
    name: 'Dark Mode Neon',
    desc: 'Deep slate-950, glowing neon cyan/magenta borders, cyber chic',
    badgeColor: 'bg-cyan-950 text-cyan-300 border-cyan-800',
  },
  {
    id: 'Retro 90s Web',
    emoji: '🕹️',
    name: 'Retro 90s Web',
    desc: 'Playful early web charm, bold borders, nostalgic badges',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
  },
  {
    id: 'Minimal Editorial',
    emoji: '📰',
    name: 'Minimal Editorial',
    desc: 'High contrast monochrome, elegant serif titles, magazine style',
    badgeColor: 'bg-stone-200 text-stone-800 border-stone-300',
  },
];

export const VibeSelector: React.FC<VibeSelectorProps> = ({
  isOpen,
  onClose,
  currentVibe,
  onSelectVibe,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl border border-stone-200 shadow-retro max-w-sm w-full p-5 space-y-4">
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🪄</span>
            <h3 className="font-extrabold text-slate-900 text-base">Select Website Vibe</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-xl hover:bg-stone-100 text-slate-500">
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-slate-500">
          Gemini Flash will adapt colors, typography, and layout micro-interactions to match your chosen aesthetic.
        </p>

        <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
          {VIBES.map((v) => {
            const isSelected = currentVibe === v.id;
            return (
              <button
                key={v.id}
                onClick={() => {
                  onSelectVibe(v.id);
                  onClose();
                }}
                className={`w-full p-3 rounded-2xl border text-left flex items-start gap-3 transition-all ${
                  isSelected
                    ? 'border-slate-900 bg-slate-50 shadow-retro-sm'
                    : 'border-stone-200 hover:bg-stone-50'
                }`}
              >
                <div className="text-2xl mt-0.5">{v.emoji}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <span className="font-bold text-sm text-slate-900 truncate">{v.name}</span>
                    {isSelected && <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />}
                  </div>
                  <p className="text-xs text-slate-500 leading-snug">{v.desc}</p>
                </div>
              </button>
            );
          })}
        </div>

      </div>
    </div>
  );
};
