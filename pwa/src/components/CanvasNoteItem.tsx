import React from 'react';
import { Trash2, Move } from 'lucide-react';
import { CanvasTextNote } from '../types';

interface CanvasNoteItemProps {
  note: CanvasTextNote;
  onPointerDown: (e: React.PointerEvent<HTMLDivElement>, note: CanvasTextNote) => void;
  onDelete: (id: string) => void;
}

export const CanvasNoteItem: React.FC<CanvasNoteItemProps> = ({
  note,
  onPointerDown,
  onDelete,
}) => {
  return (
    <div
      onPointerDown={(e) => onPointerDown(e, note)}
      style={{
        left: `${note.x}px`,
        top: `${note.y}px`,
        color: note.color,
        fontSize: `${note.fontSize}px`,
        fontFamily: note.fontFamily === 'Caveat' ? 'Caveat, cursive' : 'Plus Jakarta Sans, sans-serif',
      }}
      className="absolute z-20 group cursor-move select-none p-1.5 px-3 rounded-xl bg-amber-100/90 border border-amber-300/80 shadow-xs backdrop-blur-xs flex items-center gap-1.5 transition-shadow hover:shadow-md active:scale-105 touch-none"
    >
      <Move className="w-3 h-3 text-amber-700/60 opacity-0 group-hover:opacity-100 transition-opacity" />
      <span className="font-bold whitespace-pre">{note.text}</span>
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onDelete(note.id);
        }}
        className="ml-1.5 p-0.5 rounded text-rose-500 hover:text-rose-700 opacity-60 hover:opacity-100"
        title="Delete note"
      >
        <Trash2 className="w-3 h-3" />
      </button>
    </div>
  );
};
