import React, { useState } from 'react';
import { Trash2, ImageOff } from 'lucide-react';
import { CanvasSticker } from '../types';

interface CanvasStickerItemProps {
  sticker: CanvasSticker;
  onPointerDown: (e: React.PointerEvent<HTMLDivElement>, sticker: CanvasSticker) => void;
  onUpdate: (id: string, updates: Partial<CanvasSticker>) => void;
  onDelete: (id: string) => void;
}

export const CanvasStickerItem: React.FC<CanvasStickerItemProps> = ({
  sticker,
  onPointerDown,
  onUpdate,
  onDelete,
}) => {
  const [loadError, setLoadError] = useState(false);

  return (
    <div
      onPointerDown={(e) => onPointerDown(e, sticker)}
      style={{
        left: `${sticker.x}px`,
        top: `${sticker.y}px`,
        width: `${sticker.width}px`,
        transform: `rotate(${sticker.rotation}deg)`,
      }}
      className="absolute z-10 group cursor-move select-none p-1.5 bg-white rounded-2xl border border-stone-200 shadow-sm transition-transform active:scale-105 hover:shadow-md touch-none"
    >
      <div className="relative aspect-square rounded-xl overflow-hidden bg-stone-100 flex items-center justify-center">
        {loadError ? (
          <div className="w-full h-full flex flex-col items-center justify-center bg-pink-50 text-pink-400 p-2 text-center select-none">
            <ImageOff className="w-6 h-6 mb-1 text-pink-300" />
            <span className="text-[10px] font-semibold">Photo</span>
          </div>
        ) : (
          <img
            src={sticker.url}
            alt="Photo sticker"
            className="w-full h-full object-cover pointer-events-none"
            crossOrigin="anonymous"
            onError={() => setLoadError(true)}
          />
        )}
      </div>
      <div className="mt-1 flex items-center justify-between px-1">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              const newW = Math.max(90, sticker.width - 25);
              const newH = Math.max(90, sticker.height - 25);
              onUpdate(sticker.id, { width: newW, height: newH });
            }}
            className="w-4 h-4 rounded bg-stone-100 hover:bg-stone-200 text-slate-700 text-[10px] font-bold flex items-center justify-center transition-colors"
            title="Shrink photo"
          >
            -
          </button>
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              const newW = Math.min(240, sticker.width + 25);
              const newH = Math.min(240, sticker.height + 25);
              onUpdate(sticker.id, { width: newW, height: newH });
            }}
            className="w-4 h-4 rounded bg-stone-100 hover:bg-stone-200 text-slate-700 text-[10px] font-bold flex items-center justify-center transition-colors"
            title="Enlarge photo"
          >
            +
          </button>
        </div>
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onDelete(sticker.id);
          }}
          className="p-0.5 text-rose-500 hover:text-rose-700"
          title="Delete photo"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
