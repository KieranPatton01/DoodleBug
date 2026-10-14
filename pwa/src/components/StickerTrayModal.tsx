import React, { useState, useRef } from 'react';
import { X, Upload, Sparkles, Loader2 } from 'lucide-react';
import { uploadPhotoToFirebase, validateImageFile, validateImageContent } from '../services/storageService';

interface StickerTrayModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlacePhoto: (photoUrl: string) => void;
  attachedUrls: string[];
}

const PRESET_SAMPLE_PHOTOS = [
  {
    name: 'Latte Art',
    url: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=400&q=80',
  },
  {
    name: 'Flower Bouquet',
    url: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=400&q=80',
  },
  {
    name: 'Bakery Croissant',
    url: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=400&q=80',
  },
  {
    name: 'Golden Sunset',
    url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=400&q=80',
  },
];

export const StickerTrayModal: React.FC<StickerTrayModalProps> = ({
  isOpen,
  onClose,
  onPlacePhoto,
  attachedUrls,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Immediate client-side pre-flight metadata validation
    const validation = validateImageFile(file);
    if (!validation.valid) {
      setUploadError(validation.error || 'Invalid image file.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    setUploadStatus('Checking photo format...');

    // Content-level magic byte check
    const contentCheck = await validateImageContent(file);
    if (!contentCheck.valid) {
      setUploadError(contentCheck.error || 'Invalid image file.');
      setIsUploading(false);
      setUploadStatus('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setUploadStatus('Optimizing photo on device...');

    try {
      const permanentUrl = await uploadPhotoToFirebase(file, (status) => {
        setUploadStatus(status);
      });
      onPlacePhoto(permanentUrl);
      onClose();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Photo upload failed');
    } finally {
      setIsUploading(false);
      setUploadStatus('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl border border-stone-200 shadow-retro max-w-sm w-full p-5 space-y-4">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">📸</span>
            <h3 className="font-extrabold text-slate-900 text-base">Drop Photo to Canvas</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-xl hover:bg-stone-100 text-slate-500">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Phone Upload Trigger Button */}
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={handleFileChange}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="w-full py-3 px-4 rounded-2xl border-2 border-dashed border-pink-300 hover:border-pink-500 bg-pink-50/60 hover:bg-pink-50 flex flex-col items-center justify-center gap-1.5 transition-all group"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-6 h-6 text-pink-600 animate-spin" />
                <span className="text-xs font-semibold text-pink-700">
                  {uploadStatus || 'Uploading to Firebase Storage...'}
                </span>
              </>
            ) : (
              <>
                <div className="w-9 h-9 rounded-full bg-pink-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Upload className="w-4 h-4 text-pink-600" />
                </div>
                <span className="text-xs font-bold text-slate-800">Upload Photo from Phone</span>
                <span className="text-[11px] text-slate-500">Auto-resized & optimized • Permanent URL</span>
              </>
            )}
          </button>

          {uploadError && (
            <p className="mt-2 text-xs text-rose-600 font-medium">{uploadError}</p>
          )}
        </div>

        {/* Preset aesthetic stickers / photos */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Or pick a sample photo:
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {PRESET_SAMPLE_PHOTOS.map((sample) => (
              <button
                key={sample.name}
                onClick={() => {
                  onPlacePhoto(sample.url);
                  onClose();
                }}
                className="group relative rounded-2xl border border-stone-200 overflow-hidden text-left hover:shadow-sm transition-all transform active:scale-95 bg-stone-50"
              >
                <div className="aspect-square w-full overflow-hidden">
                  <img
                    src={sample.url}
                    alt={sample.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    crossOrigin="anonymous"
                  />
                </div>
                <div className="p-1.5 bg-white text-center">
                  <span className="text-[11px] font-semibold text-slate-700 truncate block">
                    {sample.name}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {attachedUrls.length > 0 && (
          <div className="pt-2 border-t border-stone-100 text-[11px] text-slate-500 text-center">
            {attachedUrls.length} photo(s) currently placed on canvas
          </div>
        )}

      </div>
    </div>
  );
};
