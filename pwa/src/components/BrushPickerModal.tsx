import React from 'react';
import { X } from 'lucide-react';

interface BrushPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSize: number;
  onSelectSize: (size: number) => void;
  color: string;
}

const BRUSH_SIZES = [
  { label: 'Fine Pen', size: 3 },
  { label: 'Medium Brush', size: 8 },
  { label: 'Chunky Marker', size: 16 },
  { label: 'Fat Crayon', size: 28 },
];

export const BrushPickerModal: React.FC<BrushPickerModalProps> = ({
  isOpen,
  onClose,
  currentSize,
  onSelectSize,
  color,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-white rounded-3xl border border-stone-200 shadow-retro max-w-xs w-full p-5 space-y-4">
        
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-slate-900 text-base">Brush Thickness</h3>
          <button onClick={onClose} className="p-1 rounded-xl hover:bg-stone-100 text-slate-500">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {BRUSH_SIZES.map((b) => {
            const isSelected = currentSize === b.size;
            return (
              <button
                key={b.size}
                onClick={() => {
                  onSelectSize(b.size);
                  onClose();
                }}
                className={`p-3 rounded-2xl border flex flex-col items-center justify-center gap-2 transition-all ${
                  isSelected
                    ? 'border-slate-900 bg-slate-50 shadow-retro-sm'
                    : 'border-stone-200 hover:bg-stone-50'
                }`}
              >
                <div
                  className="rounded-full"
                  style={{
                    width: `${Math.min(32, Math.max(6, b.size))}px`,
                    height: `${Math.min(32, Math.max(6, b.size))}px`,
                    backgroundColor: color,
                  }}
                />
                <span className="text-xs font-semibold text-slate-700">{b.label}</span>
                <span className="text-[10px] text-slate-400 font-mono">{b.size}px</span>
              </button>
            );
          })}
        </div>

      </div>
    </div>
  );
};
