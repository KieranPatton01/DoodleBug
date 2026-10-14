import React, { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import { CanvasTextNote } from '../types';

interface TextModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTextNote: (note: Omit<CanvasTextNote, 'id' | 'x' | 'y'>) => void;
  defaultColor: string;
}

export const TextModal: React.FC<TextModalProps> = ({
  isOpen,
  onClose,
  onAddTextNote,
  defaultColor,
}) => {
  const [text, setText] = useState('');
  const [fontFamily, setFontFamily] = useState<'Caveat' | 'system-ui'>('Caveat');
  const [fontSize, setFontSize] = useState(24);
  const [color, setColor] = useState(defaultColor || '#0f172a');

  useEffect(() => {
    if (isOpen) {
      setColor(defaultColor || '#0f172a');
    }
  }, [isOpen, defaultColor]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    onAddTextNote({
      text: text.trim(),
      fontFamily,
      fontSize,
      color,
    });

    setText('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-white rounded-3xl border border-stone-200 shadow-retro max-w-sm w-full p-5 space-y-4">
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">📝</span>
            <h3 className="font-extrabold text-slate-900 text-base">Add Canvas Note</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-xl hover:bg-stone-100 text-slate-500">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <textarea
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="e.g. coffee & croissants on Sunday 🥐✨"
              rows={3}
              style={{
                fontFamily: fontFamily === 'Caveat' ? 'Caveat, cursive' : 'Plus Jakarta Sans, sans-serif',
                color: color,
              }}
              className="w-full p-3 rounded-2xl border border-stone-300 focus:outline-none focus:border-slate-900 text-lg resize-none bg-amber-50/50"
            />
          </div>

          {/* Font Style Toggle */}
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-600">Style:</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setFontFamily('Caveat')}
                className={`px-3 py-1.5 rounded-xl border text-sm font-hand transition-all ${
                  fontFamily === 'Caveat'
                    ? 'border-slate-900 bg-amber-100 text-amber-900 font-bold'
                    : 'border-stone-200 text-slate-600'
                }`}
              >
                Handwritten
              </button>
              <button
                type="button"
                onClick={() => setFontFamily('system-ui')}
                className={`px-3 py-1.5 rounded-xl border text-xs font-sans transition-all ${
                  fontFamily === 'system-ui'
                    ? 'border-slate-900 bg-slate-100 text-slate-900 font-bold'
                    : 'border-stone-200 text-slate-600'
                }`}
              >
                Modern Sans
              </button>
            </div>
          </div>

          {/* Size Selection */}
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-600">Size:</span>
            <div className="flex items-center gap-2">
              {[18, 24, 32].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setFontSize(s)}
                  className={`px-2.5 py-1 rounded-xl border text-xs ${
                    fontSize === s ? 'border-slate-900 bg-slate-900 text-white font-bold' : 'border-stone-200 text-slate-600'
                  }`}
                >
                  {s === 18 ? 'S' : s === 24 ? 'M' : 'L'}
                </button>
              ))}
            </div>
          </div>

          {/* Color Selection */}
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-600">Color:</span>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-7 h-7 rounded-lg border border-stone-300 cursor-pointer p-0"
              />
              <span className="font-mono text-[11px] text-slate-500 uppercase">{color}</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={!text.trim()}
            className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-retro-sm transition-all transform active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
          >
            <Check className="w-4 h-4 text-emerald-400" />
            <span>Drop Note onto Canvas</span>
          </button>
        </form>

      </div>
    </div>
  );
};
