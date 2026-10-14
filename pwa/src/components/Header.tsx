import React from 'react';
import { Sparkles, Settings, UserCheck, UserX, Sliders } from 'lucide-react';
import { AuthState, VibeType } from '../types';

interface HeaderProps {
  currentVibe: VibeType;
  onOpenVibeSelector: () => void;
  onVibecode: () => void;
  isGenerating: boolean;
  authState: AuthState;
  onOpenAuth: () => void;
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentVibe,
  onOpenVibeSelector,
  onVibecode,
  isGenerating,
  authState,
  onOpenAuth,
  onOpenSettings,
}) => {
  return (
    <header className="h-14 bg-butter/95 backdrop-blur-md border-b border-stone-200/90 px-3 sm:px-4 flex items-center justify-between gap-2 z-30 select-none">
      
      {/* Brand & Vibe */}
      <div className="flex items-center gap-2 min-w-0">
        <div className="flex items-center gap-1.5 font-extrabold text-slate-900 text-sm sm:text-base tracking-tight">
          <span className="text-xl">🐛</span>
          <span className="hidden xs:inline">Doodlebug</span>
        </div>

        {/* Vibe Pill Trigger */}
        <button
          onClick={onOpenVibeSelector}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-pink-100 hover:bg-pink-200 text-pink-800 border border-pink-200 text-xs font-semibold transition-all transform active:scale-95 truncate max-w-[150px] sm:max-w-[200px]"
          title="Change Aesthetic Vibe"
        >
          <Sliders className="w-3 h-3 text-pink-600 flex-shrink-0" />
          <span className="truncate">{currentVibe}</span>
        </button>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
        {/* Auth Status Button */}
        <button
          onClick={onOpenAuth}
          className={`p-2 rounded-xl border text-xs font-medium flex items-center gap-1 transition-all ${
            authState.isAuthenticated
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
              : 'bg-stone-100 border-stone-200 text-slate-600 hover:bg-stone-200'
          }`}
          title={authState.isAuthenticated ? `Signed in as ${authState.user?.email || authState.user?.uid}` : 'Sign in to publish'}
        >
          {authState.isAuthenticated ? (
            <UserCheck className="w-4 h-4 text-emerald-600" />
          ) : (
            <UserX className="w-4 h-4 text-slate-400" />
          )}
          <span className="hidden sm:inline">
            {authState.isAuthenticated ? 'Auth' : 'Sign in'}
          </span>
        </button>

        {/* Settings Modal Trigger */}
        <button
          onClick={onOpenSettings}
          className="p-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-slate-600 border border-stone-200 transition-colors"
          title="Cloudflare & Firebase Settings"
        >
          <Settings className="w-4 h-4" />
        </button>

        {/* Primary Action: VIBECODE */}
        <button
          onClick={onVibecode}
          disabled={isGenerating}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold text-white shadow-retro-sm transition-all transform active:translate-x-0.5 active:translate-y-0.5 ${
            isGenerating
              ? 'bg-slate-400 cursor-not-allowed'
              : 'bg-slate-900 hover:bg-slate-800 active:shadow-none'
          }`}
        >
          <Sparkles className={`w-4 h-4 text-pink-400 ${isGenerating ? 'animate-spin' : 'animate-pulse'}`} />
          <span>{isGenerating ? 'Vibecoding...' : 'Vibecode'}</span>
        </button>
      </div>

    </header>
  );
};
