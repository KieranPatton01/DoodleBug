import React, { useState } from 'react';
import { 
  X, 
  Smartphone, 
  Tablet, 
  Monitor, 
  Code, 
  Eye, 
  Check, 
  Copy, 
  Rocket, 
  ExternalLink, 
  Loader2 
} from 'lucide-react';
import { GenerateResult, PublishResult } from '../types';

interface PreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: GenerateResult | null;
  onPublish: () => Promise<void>;
  isPublishing: boolean;
  publishResult: PublishResult | null;
}

export const PreviewModal: React.FC<PreviewModalProps> = ({
  isOpen,
  onClose,
  result,
  onPublish,
  isPublishing,
  publishResult,
}) => {
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');
  const [viewport, setViewport] = useState<'mobile' | 'tablet' | 'desktop'>('mobile');
  const [copied, setCopied] = useState(false);

  if (!isOpen || !result) return null;

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(result.html);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      // fallback
    }
  };

  const viewportWidthClass = {
    mobile: 'max-w-[390px]',
    tablet: 'max-w-[640px]',
    desktop: 'max-w-full',
  }[viewport];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl border border-stone-200 shadow-2xl max-w-4xl w-full h-[92vh] flex flex-col overflow-hidden">
        
        {/* Modal Top Bar */}
        <div className="px-4 py-3 bg-stone-50 border-b border-stone-200 flex items-center justify-between gap-2 flex-shrink-0">
          
          <div className="flex items-center gap-2">
            <span className="text-xl">✨</span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">In-App Sandbox Preview</h3>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-pink-100 text-pink-700">
                  {result.vibe}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                Model: {result.model} • Sandboxed iframe
              </p>
            </div>
          </div>

          {/* Viewport & Tab Switchers */}
          <div className="flex items-center gap-2">
            
            {/* Viewport toggle */}
            <div className="hidden sm:flex items-center bg-stone-200/80 p-0.5 rounded-xl text-slate-600">
              <button
                onClick={() => setViewport('mobile')}
                className={`p-1.5 rounded-lg transition-all ${viewport === 'mobile' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'}`}
                title="Mobile View (390px)"
              >
                <Smartphone className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewport('tablet')}
                className={`p-1.5 rounded-lg transition-all ${viewport === 'tablet' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'}`}
                title="Tablet View (640px)"
              >
                <Tablet className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewport('desktop')}
                className={`p-1.5 rounded-lg transition-all ${viewport === 'desktop' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'}`}
                title="Full Responsive"
              >
                <Monitor className="w-4 h-4" />
              </button>
            </div>

            {/* Tab switch: Preview vs Code */}
            <div className="flex items-center bg-stone-200/80 p-0.5 rounded-xl text-xs font-semibold text-slate-600">
              <button
                onClick={() => setActiveTab('preview')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all ${
                  activeTab === 'preview' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Preview</span>
              </button>
              <button
                onClick={() => setActiveTab('code')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all ${
                  activeTab === 'code' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
                }`}
              >
                <Code className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Code</span>
              </button>
            </div>

            {/* Close button */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-stone-200 text-slate-500 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

        </div>

        {/* Success Banner if Published */}
        {publishResult && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-2.5 flex items-center justify-between gap-3 text-xs text-emerald-900 flex-shrink-0 animate-fade-in">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold">
                ✓
              </div>
              <div>
                <span className="font-bold">Committed to GitHub!</span>
                <span className="ml-1 text-emerald-700">Live site updates in ~1-2 min via GitHub Pages ({publishResult.commitSha.substring(0, 7)})</span>
              </div>
            </div>
            <a
              href={publishResult.htmlUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold underline flex items-center gap-1 hover:text-emerald-700"
            >
              <span>View on GitHub</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}

        {/* Modal Body (Preview Stage or Code View) */}
        <div className="flex-1 bg-stone-100 overflow-auto p-3 sm:p-6 flex items-center justify-center">
          {activeTab === 'preview' ? (
            <div className={`w-full ${viewportWidthClass} h-full bg-white rounded-2xl border border-stone-300 shadow-sm overflow-hidden transition-all duration-300 flex flex-col`}>
              <iframe
                srcDoc={result.html}
                title="Sandboxed Component Stage"
                className="w-full h-full border-none bg-white"
                sandbox="allow-scripts allow-modals allow-popups"
              />
            </div>
          ) : (
            <div className="w-full h-full bg-slate-950 rounded-2xl p-4 overflow-auto text-slate-200 font-mono text-xs relative">
              <button
                onClick={handleCopyCode}
                className="absolute top-4 right-4 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-sans text-white flex items-center gap-1.5 shadow-sm transition-all"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy HTML'}</span>
              </button>
              <pre className="whitespace-pre-wrap">{result.html}</pre>
            </div>
          )}
        </div>

        {/* Modal Bottom Action Bar */}
        <div className="px-4 py-3 bg-white border-t border-stone-200 flex items-center justify-between gap-3 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-stone-100 transition-colors"
          >
            ← Back to Canvas
          </button>

          <button
            onClick={onPublish}
            disabled={isPublishing}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white shadow-retro-sm transition-all transform active:translate-x-0.5 active:translate-y-0.5 flex items-center gap-2 ${
              isPublishing
                ? 'bg-slate-400 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-500'
            }`}
          >
            {isPublishing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Committing to GitHub Pages...</span>
              </>
            ) : (
              <>
                <Rocket className="w-4 h-4 text-emerald-200" />
                <span>Publish to Live Site</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
