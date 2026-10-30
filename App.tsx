import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  SlidersHorizontal,
  X,
  Wand2,
  Shuffle,
  AlertCircle,
  Zap,
} from 'lucide-react';
import { Header } from './components/Header';
import { StyleSelector } from './components/StyleSelector';
import { PromptOutput } from './components/PromptOutput';
import { RecentPromptsModal } from './components/RecentPromptsModal';
import { AndroidExportModal } from './components/AndroidExportModal';
import {
  PhotoStyleId,
  PHOTO_STYLES,
  LIGHTING_OPTIONS,
  ASPECT_RATIOS,
  QUICK_INSPIRATIONS,
  GeneratedPromptResult,
} from './types/prompt';
import { synthesizeLocalPrompt } from './utils/promptEngine';

const STORAGE_KEY = 'chispo_recent_prompts_v1';

export default function App() {
  const [description, setDescription] = useState('');
  const [selectedStyle, setSelectedStyle] = useState<PhotoStyleId>('realistic');
  const [selectedLighting, setSelectedLighting] = useState('auto');
  const [selectedAspect, setSelectedAspect] = useState('4:5');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [generatedResult, setGeneratedResult] = useState<
    (GeneratedPromptResult & { tips?: string; source?: string }) | null
  >(null);

  const [history, setHistory] = useState<GeneratedPromptResult[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);

  // Load history from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } catch {
      // ignore
    }
  }, []);

  const saveToHistory = (item: GeneratedPromptResult) => {
    try {
      setHistory((prev) => {
        const filtered = prev.filter((p) => p.prompt !== item.prompt);
        const updated = [item, ...filtered].slice(0, 10);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        return updated;
      });
    } catch {
      // ignore
    }
  };

  const handleClearHistory = () => {
    setHistory([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  // Switch aspect ratio to style's default if user hasn't explicitly customized
  const handleSelectStyle = (styleId: PhotoStyleId) => {
    setSelectedStyle(styleId);
    const styleObj = PHOTO_STYLES.find((s) => s.id === styleId);
    if (styleObj) {
      setSelectedAspect(styleObj.defaultAspect);
    }
  };

  const handleRandomIdea = () => {
    const random =
      QUICK_INSPIRATIONS[Math.floor(Math.random() * QUICK_INSPIRATIONS.length)];
    setDescription(random.description);
    handleSelectStyle(random.style);
    setError(null);
  };

  // Core prompt generator with given parameters
  const generatePromptWithParams = async (
    textToUse: string,
    styleToUse: PhotoStyleId,
    lightingToUse: string = selectedLighting,
    aspectToUse: string = selectedAspect
  ) => {
    if (!textToUse.trim()) {
      setError('Please describe your photo idea first.');
      return;
    }

    setError(null);
    setIsGenerating(true);

    try {
      // Try server endpoint (which uses Gemini 3.8 Flash if key configured)
      const res = await fetch('/api/generate-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: textToUse.trim(),
          style: styleToUse,
          lighting: lightingToUse,
          aspectRatio: aspectToUse,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const result: GeneratedPromptResult & { tips?: string; source?: string } = {
          prompt: data.prompt,
          negativePrompt: data.negativePrompt || '',
          style: styleToUse,
          styleName:
            PHOTO_STYLES.find((s) => s.id === styleToUse)?.name || 'Realistic',
          aspectRatio: aspectToUse,
          lightingName:
            lightingToUse !== 'auto'
              ? LIGHTING_OPTIONS.find((l) => l.id === lightingToUse)?.name
              : undefined,
          timestamp: data.timestamp || Date.now(),
          tips: data.tips,
          source: data.source,
        };
        setGeneratedResult(result);
        saveToHistory(result);
      } else {
        throw new Error('Server response not ok');
      }
    } catch {
      // Seamless client-side local synthesis fallback
      const local = synthesizeLocalPrompt({
        description: textToUse,
        styleId: styleToUse,
        lightingId: lightingToUse,
        aspectRatioId: aspectToUse,
      });

      const fallbackResult = {
        ...local,
        tips: 'Ready to paste into Midjourney, Stable Diffusion, Flux, or DALL-E.',
        source: 'local',
      };
      setGeneratedResult(fallbackResult);
      saveToHistory(fallbackResult);
    } finally {
      setIsGenerating(false);

      // Smooth scroll to output card on mobile devices
      setTimeout(() => {
        const el = document.getElementById('chispo-output');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 100);
    }
  };

  const handleGenerate = () => {
    generatePromptWithParams(
      description,
      selectedStyle,
      selectedLighting,
      selectedAspect
    );
  };

  // Randomize Prompt: selects a random style and combines it with user's current description
  const handleRandomizePrompt = () => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(35);
    }

    // 1. If user description is currently empty, pick a quick inspiring idea
    let textToUse = description.trim();
    if (!textToUse) {
      const randomIdea =
        QUICK_INSPIRATIONS[Math.floor(Math.random() * QUICK_INSPIRATIONS.length)];
      textToUse = randomIdea.description;
      setDescription(textToUse);
    }

    // 2. Randomly select from available styles (Realistic, Cinematic, Anime, Couple, Portrait, Fashion, Fantasy)
    const availableStyles: PhotoStyleId[] = [
      'realistic',
      'cinematic',
      'anime',
      'couple',
      'portrait',
      'fashion',
      'fantasy',
    ];

    // Pick a different style to ensure a fresh, unique combination
    const alternativeStyles = availableStyles.filter((s) => s !== selectedStyle);
    const randomStyle =
      alternativeStyles.length > 0
        ? alternativeStyles[Math.floor(Math.random() * alternativeStyles.length)]
        : availableStyles[Math.floor(Math.random() * availableStyles.length)];

    // 3. Update style in state for visual feedback
    setSelectedStyle(randomStyle);
    const styleObj = PHOTO_STYLES.find((s) => s.id === randomStyle);
    const aspectToUse = styleObj?.defaultAspect || selectedAspect;
    setSelectedAspect(aspectToUse);

    // 4. Combine user's text description with chosen random style and generate
    generatePromptWithParams(
      textToUse,
      randomStyle,
      selectedLighting,
      aspectToUse
    );
  };

  const handleClear = () => {
    setGeneratedResult(null);
    setError(null);
  };

  const handleSelectFromHistory = (item: GeneratedPromptResult) => {
    setGeneratedResult(item);
    setSelectedStyle(item.style);
    setTimeout(() => {
      const el = document.getElementById('chispo-output');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 100);
  };

  return (
    <div className="min-h-screen bg-[#0b0813] text-zinc-100 flex flex-col justify-between selection:bg-purple-600 selection:text-white">
      {/* Background ambient lighting */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[480px] h-[340px] bg-purple-700/15 rounded-full blur-[110px]" />
        <div className="absolute top-[40%] -right-24 w-72 h-72 bg-violet-600/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-10 -left-20 w-80 h-80 bg-fuchsia-800/10 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 flex flex-col flex-grow w-full max-w-lg mx-auto">
        {/* App Header */}
        <Header
          onRandomIdea={handleRandomIdea}
          onOpenHistory={() => setIsHistoryOpen(true)}
          onOpenAndroidExport={() => setIsExportOpen(true)}
          historyCount={history.length}
        />

        {/* Main Content Area */}
        <main className="p-4 space-y-4 flex-grow">
          {/* Quick Inspiration Pills */}
          <section aria-label="Quick Inspiration" className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-purple-300/80 px-0.5">
              <span className="font-semibold flex items-center gap-1">
                <Zap className="w-3 h-3 text-purple-400" />
                Quick Inspiration
              </span>
              <button
                type="button"
                onClick={handleRandomIdea}
                className="text-purple-400 hover:text-purple-300 cursor-pointer font-medium"
              >
                Randomize
              </button>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar -mx-4 px-4">
              {QUICK_INSPIRATIONS.map((insp) => (
                <button
                  key={insp.title}
                  type="button"
                  onClick={() => {
                    setDescription(insp.description);
                    handleSelectStyle(insp.style);
                    setError(null);
                  }}
                  className="whitespace-nowrap shrink-0 text-[11px] font-medium px-3 py-1.5 rounded-full bg-[#150d24] text-purple-200 border border-purple-900/60 hover:border-purple-600/80 hover:bg-purple-950/60 active:scale-95 transition-all cursor-pointer"
                >
                  {insp.title}
                </button>
              ))}
            </div>
          </section>

          {/* Photo Description Text Box */}
          <section aria-label="Photo Description" className="space-y-1.5">
            <div className="flex items-center justify-between px-0.5">
              <label
                htmlFor="photo-description"
                className="text-xs font-bold uppercase tracking-wider text-purple-300/90 flex items-center gap-1"
              >
                Describe Your Photo
              </label>
              {description && (
                <button
                  type="button"
                  onClick={() => setDescription('')}
                  className="text-[11px] text-zinc-400 hover:text-zinc-200 flex items-center gap-1 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                  Clear input
                </button>
              )}
            </div>

            <div className="relative">
              <textarea
                id="photo-description"
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  if (error) setError(null);
                }}
                rows={3}
                placeholder="What photo do you want to create? e.g. A solitary violinist playing on an empty misty bridge at sunrise..."
                className="w-full p-3.5 rounded-2xl bg-[#12091f]/90 border border-purple-900/80 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/30 transition-all resize-none purple-glow-sm shadow-inner"
              />
              <div className="flex items-center justify-between text-[10px] text-zinc-500 px-1 pt-1">
                <span>Free & unlimited • Midjourney, SDXL, Flux compatible</span>
                <span>{description.trim().length} chars</span>
              </div>
            </div>
          </section>

          {/* Style Selector */}
          <StyleSelector
            selectedStyle={selectedStyle}
            onSelectStyle={handleSelectStyle}
          />

          {/* Optional Quick Fine-Tuning (Aspect Ratio & Lighting) */}
          <div className="rounded-xl border border-purple-950 bg-[#10081d]/50 p-2.5">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full flex items-center justify-between text-xs font-semibold text-purple-300 hover:text-white cursor-pointer px-1 py-0.5"
            >
              <span className="flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-purple-400" />
                <span>Format & Lighting Options</span>
              </span>
              <span className="text-[10px] text-purple-400/80 font-normal">
                {showAdvanced
                  ? 'Hide'
                  : `${selectedAspect} • ${
                      LIGHTING_OPTIONS.find((l) => l.id === selectedLighting)?.name
                    }`}
              </span>
            </button>

            {showAdvanced && (
              <div className="pt-3 space-y-3 border-t border-purple-950/80 mt-2">
                {/* Aspect Ratio */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-medium text-zinc-400 block">
                    Aspect Ratio:
                  </span>
                  <div className="grid grid-cols-4 gap-1.5">
                    {ASPECT_RATIOS.map((aspect) => (
                      <button
                        key={aspect.id}
                        type="button"
                        onClick={() => setSelectedAspect(aspect.id)}
                        className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                          selectedAspect === aspect.id
                            ? 'bg-purple-600 text-white border-purple-400 purple-glow-sm'
                            : 'bg-purple-950/40 border-purple-900/50 text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        {aspect.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Lighting */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-medium text-zinc-400 block">
                    Lighting Atmosphere:
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {LIGHTING_OPTIONS.map((lighting) => (
                      <button
                        key={lighting.id}
                        type="button"
                        onClick={() => setSelectedLighting(lighting.id)}
                        className={`text-left py-1.5 px-2.5 rounded-lg text-xs font-medium border transition-all cursor-pointer truncate ${
                          selectedLighting === lighting.id
                            ? 'bg-purple-900/60 text-white border-purple-500'
                            : 'bg-purple-950/40 border-purple-900/50 text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        {lighting.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Validation Error Message */}
          {error && (
            <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/60 text-red-200 text-xs flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Action Buttons: Generate Prompt & Randomize Prompt */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating}
              className={`min-h-[52px] rounded-2xl font-extrabold text-sm sm:text-base flex items-center justify-center gap-2 text-white transition-all cursor-pointer shadow-xl active:scale-[0.98] ${
                isGenerating
                  ? 'bg-purple-900/80 cursor-wait opacity-80'
                  : 'bg-gradient-to-r from-purple-600 via-purple-500 to-violet-600 hover:from-purple-500 hover:to-violet-500 purple-glow border border-purple-400/30'
              }`}
            >
              {isGenerating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Crafting Prompt...</span>
                </>
              ) : (
                <>
                  <Wand2 className="w-5 h-5" />
                  <span>Generate Prompt</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleRandomizePrompt}
              disabled={isGenerating}
              title="Randomly picks a style and combines it with your description"
              className="min-h-[52px] rounded-2xl font-extrabold text-sm sm:text-base flex items-center justify-center gap-2 text-purple-200 bg-[#160b28] hover:bg-[#1f1038] hover:text-white border border-purple-500/60 hover:border-purple-400 purple-glow-sm transition-all cursor-pointer shadow-lg active:scale-[0.98]"
            >
              <Shuffle className="w-5 h-5 text-purple-400" />
              <span>Randomize Prompt</span>
            </button>
          </div>

          {/* Generated Prompt Output Box */}
          {generatedResult && (
            <div id="chispo-output" className="pt-2">
              <PromptOutput result={generatedResult} onClear={handleClear} />
            </div>
          )}
        </main>

        {/* Minimal Footer */}
        <footer className="py-3 px-4 text-center border-t border-purple-950/60 text-[11px] text-zinc-500">
          <p>
            Chispo • Lightweight AI Prompt Generator • 100% Free
          </p>
        </footer>
      </div>

      {/* Recent Prompts Modal */}
      <RecentPromptsModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        history={history}
        onSelectPrompt={handleSelectFromHistory}
        onClearHistory={handleClearHistory}
      />

      {/* Android Export & APK Packaging Guide Modal */}
      <AndroidExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
      />
    </div>
  );
}
