import React, { useState, useRef, useEffect } from 'react';
import { Header } from './components/Header';
import { Canvas, CanvasHandle } from './components/Canvas';
import { Toolbar } from './components/Toolbar';
import { ColorPickerModal } from './components/ColorPickerModal';
import { BrushPickerModal } from './components/BrushPickerModal';
import { TextModal } from './components/TextModal';
import { StickerTrayModal } from './components/StickerTrayModal';
import { VibeSelector } from './components/VibeSelector';
import { PreviewModal } from './components/PreviewModal';
import { AuthModal } from './components/AuthModal';
import { SettingsModal } from './components/SettingsModal';
import { 
  ToolType, 
  VibeType, 
  CanvasTextNote, 
  CanvasSticker, 
  GenerateResult, 
  PublishResult, 
  AuthState 
} from './types';
import { callGenerateApi, callPublishApi } from './services/workerClient';
import { initFirebase, getFirebaseAuth } from './config/firebase';
import { onAuthStateChanged } from 'firebase/auth';

export const App: React.FC = () => {
  const canvasRef = useRef<CanvasHandle>(null);

  // Drawing tool state
  const [currentTool, setCurrentTool] = useState<ToolType>('brush');
  const [brushColor, setBrushColor] = useState<string>('#0f172a');
  const [brushSize, setBrushSize] = useState<number>(8);
  const [currentVibe, setCurrentVibe] = useState<VibeType>('Cute Handwritten');

  // Canvas elements state (starts empty without hardcoded notes)
  const [textNotes, setTextNotes] = useState<CanvasTextNote[]>([]);
  const [stickers, setStickers] = useState<CanvasSticker[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Modal open states
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [isBrushPickerOpen, setIsBrushPickerOpen] = useState(false);
  const [isTextModalOpen, setIsTextModalOpen] = useState(false);
  const [isStickerTrayOpen, setIsStickerTrayOpen] = useState(false);
  const [isVibeSelectorOpen, setIsVibeSelectorOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // API Execution states
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateResult, setGenerateResult] = useState<GenerateResult | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<PublishResult | null>(null);
  const [errorNotification, setErrorNotification] = useState<string | null>(null);

  // Auth state
  const [authState, setAuthState] = useState<AuthState>(() => {
    // Only restore saved demo/mock login in local development mode to avoid broken mock states in production
    if (import.meta.env.DEV) {
      const savedMock = sessionStorage.getItem('doodlebug_mock_user');
      if (savedMock) {
        return {
          isAuthenticated: true,
          user: {
            uid: 'gf-authorized-uid-12345',
            email: 'lily@doodlebug.site',
            displayName: 'Lily (Site Owner)',
          },
          idToken: 'mock-token-uid-gf-authorized-uid-12345',
          isMockMode: true,
        };
      }
    }
    return {
      isAuthenticated: false,
      user: null,
      idToken: null,
      isMockMode: false,
    };
  });

  // Get a fresh ID token at request time (prevents 1-hour expiration 401s)
  const getFreshIdToken = async (): Promise<string | null> => {
    if (authState.isMockMode) {
      return authState.idToken;
    }
    const auth = getFirebaseAuth();
    if (auth?.currentUser) {
      try {
        const freshToken = await auth.currentUser.getIdToken();
        if (freshToken !== authState.idToken) {
          setAuthState((prev) => ({ ...prev, idToken: freshToken }));
        }
        return freshToken;
      } catch (e) {
        console.warn('Failed to retrieve fresh Firebase ID token:', e);
      }
    }
    return authState.idToken;
  };

  // Listen to Firebase Auth state changes
  useEffect(() => {
    initFirebase();
    const auth = getFirebaseAuth();
    if (!auth) return;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const idToken = await firebaseUser.getIdToken();
        setAuthState({
          isAuthenticated: true,
          user: {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
          },
          idToken,
          isMockMode: false,
        });
      } else {
        // Sign-out or null session: clear state unless in active dev mock mode
        const savedMock = import.meta.env.DEV ? sessionStorage.getItem('doodlebug_mock_user') : null;
        if (!savedMock) {
          setAuthState({
            isAuthenticated: false,
            user: null,
            idToken: null,
            isMockMode: false,
          });
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const handleUpdateAuthState = (newAuth: AuthState) => {
    setAuthState(newAuth);
    if (import.meta.env.DEV && newAuth.isMockMode && newAuth.isAuthenticated) {
      sessionStorage.setItem('doodlebug_mock_user', 'true');
    } else {
      sessionStorage.removeItem('doodlebug_mock_user');
    }
  };

  const handleStrokeCountChange = React.useCallback((undoAvailable: boolean, redoAvailable: boolean) => {
    setCanUndo(undoAvailable);
    setCanRedo(redoAvailable);
  }, []);

  // Add text note to canvas
  const handleAddTextNote = (noteData: Omit<CanvasTextNote, 'id' | 'x' | 'y'>) => {
    const newNote: CanvasTextNote = {
      ...noteData,
      id: Math.random().toString(36).substring(2, 9),
      x: 60,
      y: 120 + textNotes.length * 50,
    };
    setTextNotes((prev) => [...prev, newNote]);
  };

  const handleUpdateTextNote = React.useCallback((id: string, updates: Partial<CanvasTextNote>) => {
    setTextNotes((prev) => prev.map((n) => (n.id === id ? { ...n, ...updates } : n)));
  }, []);

  const handleDeleteTextNote = React.useCallback((id: string) => {
    setTextNotes((prev) => prev.filter((n) => n.id !== id));
  }, []);

  // Add photo sticker to canvas
  const handlePlacePhoto = (photoUrl: string) => {
    const newSticker: CanvasSticker = {
      id: Math.random().toString(36).substring(2, 9),
      url: photoUrl,
      x: 40 + stickers.length * 30,
      y: 200 + stickers.length * 30,
      width: 140,
      height: 140,
      rotation: (Math.random() - 0.5) * 8, // slight aesthetic polaroid tilt
    };
    setStickers((prev) => [...prev, newSticker]);
  };

  const handleUpdateSticker = React.useCallback((id: string, updates: Partial<CanvasSticker>) => {
    setStickers((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  }, []);

  const handleDeleteSticker = React.useCallback((id: string) => {
    setStickers((prev) => prev.filter((s) => s.id !== id));
  }, []);

  // Vibecode Generation Action
  const handleVibecode = async () => {
    const currentToken = await getFreshIdToken();
    if (!authState.isAuthenticated || !currentToken) {
      setIsAuthModalOpen(true);
      return;
    }

    if (!canvasRef.current) return;

    setIsGenerating(true);
    setPublishResult(null);

    try {
      const snapshotBase64 = await canvasRef.current.exportSnapshot();
      const imageUrls = stickers.map((s) => s.url);
      const notes = textNotes.map((n) => n.text).join('\n');

      const result = await callGenerateApi({
        snapshotBase64,
        imageUrls,
        vibe: currentVibe,
        notes,
        idToken: currentToken,
      });

      setGenerateResult(result);
      setIsPreviewModalOpen(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('❌ [PWA Vibecode Error]:', err);
      setErrorNotification(message.startsWith('Generation failed:') ? message : `Generation failed: ${message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // One-Click Publish Action
  const handlePublish = async () => {
    const currentToken = await getFreshIdToken();
    if (!generateResult || !currentToken) return;

    setIsPublishing(true);
    try {
      const result = await callPublishApi({
        html: generateResult.html,
        commitMessage: `🎨 Doodlebug: new ${currentVibe} layout via Vibecode`,
        idToken: currentToken,
      });
      setPublishResult(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('❌ [PWA Publish Error]:', err);
      setErrorNotification(message.startsWith('Publish failed:') ? message : `Publish failed: ${message}`);
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-butter select-none">
      
      {/* Top Navigation & Actions Bar */}
      <Header
        currentVibe={currentVibe}
        onOpenVibeSelector={() => setIsVibeSelectorOpen(true)}
        onVibecode={handleVibecode}
        isGenerating={isGenerating}
        authState={authState}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
      />

      {/* Core Retro Drawing Canvas Pad */}
      <main className="flex-1 relative overflow-hidden flex flex-col">
        <Canvas
          ref={canvasRef}
          currentTool={currentTool}
          brushColor={brushColor}
          brushSize={brushSize}
          textNotes={textNotes}
          stickers={stickers}
          onUpdateTextNote={handleUpdateTextNote}
          onDeleteTextNote={handleDeleteTextNote}
          onUpdateSticker={handleUpdateSticker}
          onDeleteSticker={handleDeleteSticker}
          onStrokeCountChange={handleStrokeCountChange}
        />
      </main>

      {/* Thumb-Friendly Bottom Mobile Toolbar */}
      <Toolbar
        currentTool={currentTool}
        onSelectTool={setCurrentTool}
        brushColor={brushColor}
        brushSize={brushSize}
        onOpenColorPicker={() => setIsColorPickerOpen(true)}
        onOpenBrushPicker={() => setIsBrushPickerOpen(true)}
        onOpenTextModal={() => setIsTextModalOpen(true)}
        onOpenStickerTray={() => setIsStickerTrayOpen(true)}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={() => canvasRef.current?.undo()}
        onRedo={() => canvasRef.current?.redo()}
        onClear={() => {
          canvasRef.current?.clearCanvas();
          setTextNotes([]);
          setStickers([]);
        }}
      />

      {/* Modals */}
      <ColorPickerModal
        isOpen={isColorPickerOpen}
        onClose={() => setIsColorPickerOpen(false)}
        selectedColor={brushColor}
        onSelectColor={setBrushColor}
      />

      <BrushPickerModal
        isOpen={isBrushPickerOpen}
        onClose={() => setIsBrushPickerOpen(false)}
        currentSize={brushSize}
        onSelectSize={setBrushSize}
        color={brushColor}
      />

      <TextModal
        isOpen={isTextModalOpen}
        onClose={() => setIsTextModalOpen(false)}
        onAddTextNote={handleAddTextNote}
        defaultColor={brushColor}
      />

      <StickerTrayModal
        isOpen={isStickerTrayOpen}
        onClose={() => setIsStickerTrayOpen(false)}
        onPlacePhoto={handlePlacePhoto}
        attachedUrls={stickers.map((s) => s.url)}
      />

      <VibeSelector
        isOpen={isVibeSelectorOpen}
        onClose={() => setIsVibeSelectorOpen(false)}
        currentVibe={currentVibe}
        onSelectVibe={setCurrentVibe}
      />

      <PreviewModal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        result={generateResult}
        onPublish={handlePublish}
        isPublishing={isPublishing}
        publishResult={publishResult}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        authState={authState}
        onUpdateAuthState={handleUpdateAuthState}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
      />

      {/* Floating Error Notification Toast */}
      {errorNotification && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 max-w-lg w-full px-4 animate-fade-in pointer-events-auto">
          <div className="bg-rose-50 border border-rose-300 text-rose-800 p-3.5 rounded-2xl shadow-retro flex items-start justify-between gap-3 text-xs">
            <div className="flex items-start gap-2 max-h-56 overflow-y-auto pr-1">
              <span className="text-base flex-shrink-0 mt-0.5">⚠️</span>
              <span className="font-medium break-words leading-relaxed select-text">{errorNotification}</span>
            </div>
            <button
              onClick={() => setErrorNotification(null)}
              className="p-1 rounded-lg hover:bg-rose-100 text-rose-600 transition-colors font-bold flex-shrink-0"
              title="Dismiss error"
            >
              ✕
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default App;
