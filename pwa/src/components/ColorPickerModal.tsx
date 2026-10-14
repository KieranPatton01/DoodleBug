import React from 'react';
import { X, Check } from 'lucide-react';

interface ColorPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedColor: string;
  onSelectColor: (color: string) => void;
}

const PALETTES = [
  {
    name: 'Classics',
    colors: ['#0f172a', '#475569', '#94a3b8', '#ffffff'],
  },
  {
    name: 'Pastel Romance',
    colors: ['#fda4af', '#f472b6', '#e879f9', '#c084fc', '#a78bfa'],
  },
  {
    name: 'Sunny & Earthy',
    colors: ['#fde047', '#facc15', '#fb923c', '#f97316', '#78350f'],
  },
  {
    name: 'Minty & Ocean',
    colors: ['#6ee7b7', '#34d399', '#38bdf8', '#0ea5e9', '#6366f1'],
  },
  {
    name: 'Retro 90s Pop',
    colors: ['#ff007f', '#00f0ff', '#7000ff', '#ffe600', '#00ff66'],
  },
];

export const ColorPickerModal: React.FC<ColorPickerModalProps> = ({
  isOpen,
  onClose,
  selectedColor,
  onSelectColor,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl border border-stone-200 shadow-retro max-w-sm w-full p-5 space-y-4">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎨</span>
            <h3 className="font-extrabold text-slate-900 text-base">Color Palette</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-stone-100 text-slate-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Palettes */}
        <div className="space-y-3">
          {PALETTES.map((group) => (
            <div key={group.name} className="space-y-1.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                {group.name}
              </span>
              <div className="flex items-center gap-2.5 flex-wrap">
                {group.colors.map((c) => {
                  const isSelected = selectedColor.toLowerCase() === c.toLowerCase();
                  return (
                    <button
                      key={c}
                      onClick={() => {
                        onSelectColor(c);
                        onClose();
                      }}
                      style={{ backgroundColor: c }}
                      className="w-9 h-9 rounded-2xl border-2 border-stone-300/80 shadow-xs flex items-center justify-center transition-transform hover:scale-110 active:scale-95"
                    >
                      {isSelected && (
                        <Check
                          className={`w-4 h-4 ${
                            c === '#ffffff' || c === '#fde047' ? 'text-slate-900' : 'text-white'
                          }`}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Custom Color Input */}
        <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-600">Custom hex color:</span>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={selectedColor}
              onChange={(e) => onSelectColor(e.target.value)}
              className="w-8 h-8 rounded-lg border border-stone-300 cursor-pointer p-0"
            />
            <span className="font-mono text-xs text-slate-500 uppercase">{selectedColor}</span>
          </div>
        </div>

      </div>
    </div>
  );
};
