import { useMemo, useState } from 'react';
import { BookOpen, CheckCircle2, Play, Search, Square, Volume2 } from 'lucide-react';
import type { RecitationRecord, UserPreferences } from '../types/namaz';
import { speakGuidanceAndRecitation, stopSpeechPlayback } from '../utils/audioPlayer';
import { Button, Surface, TextInput } from './ui';

interface DuaLibraryViewProps {
  recitationsMap: Record<string, RecitationRecord>;
  prefs: UserPreferences;
  reviewedDuas: string[];
  onMarkReviewed: (id: string) => void;
}

const CATEGORIES: Array<{ id: string; label: string }> = [
  { id: 'all', label: 'All Entries' },
  { id: 'opening', label: 'Opening & Takbir' },
  { id: 'surah', label: 'Surahs' },
  { id: 'ruku_sujud', label: 'Ruku & Sujud' },
  { id: 'sitting', label: 'Sitting & Tashahhud' },
  { id: 'closing', label: 'Salam & Qunoot' },
];

export function DuaLibraryView({
  recitationsMap,
  prefs,
  reviewedDuas,
  onMarkReviewed,
}: DuaLibraryViewProps) {
  const [category, setCategory] = useState<string>('all');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string>('fatiha');
  const [wordByWordMode, setWordByWordMode] = useState(true);
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    return Object.values(recitationsMap).filter((rec) => {
      if (category !== 'all' && rec.category !== category) return false;
      if (!q) return true;
      return (
        rec.title.toLowerCase().includes(q) ||
        rec.transliteration.toLowerCase().includes(q) ||
        rec.translations.en.toLowerCase().includes(q)
      );
    });
  }, [recitationsMap, category, query]);

  const active = recitationsMap[selectedId] ?? items[0] ?? Object.values(recitationsMap)[0];

  const handlePlay = (rec: RecitationRecord) => {
    if (speakingId === rec.id) {
      stopSpeechPlayback();
      setSpeakingId(null);
      return;
    }
    setSpeakingId(rec.id);
    speakGuidanceAndRecitation({
      arabicText: rec.arabic,
      transliterationText: rec.transliteration,
      language: prefs.primaryLanguage,
      rate: prefs.playbackSpeed,
      volume: prefs.audioVolume,
      spokenEnabled: false,
      voiceGender: prefs.voiceGender,
    });
    onMarkReviewed(rec.id);
    window.setTimeout(() => setSpeakingId((cur) => (cur === rec.id ? null : cur)), rec.durationSec * 1000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-medium text-foreground">
            Dua & Surah Library
          </h1>
          <p className="text-sm text-muted mt-1">
            Verified Arabic recitations with transliteration, English, Hindi & Urdu meanings, and word-by-word study.
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted" />
          <TextInput
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Surah or Dua..."
            aria-label="Search Dua and Surah Library"
            className="pl-9"
          />
        </div>
      </div>

      {/* Category Filter Chips */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setCategory(cat.id)}
            className={`min-h-10 whitespace-nowrap rounded-full border px-3.5 text-xs font-medium transition-colors cursor-pointer ${
              category === cat.id
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-surface text-foreground border-border hover:bg-surface-alt'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Entry List */}
        <div className="lg:col-span-5 grid grid-cols-1 gap-2.5">
          {items.length === 0 ? (
            <Surface className="p-6 text-center text-sm text-muted">
              No entries match "{query}". Clear the search to view all Duas and Surahs.
            </Surface>
          ) : (
            items.map((rec) => {
              const isSelected = active?.id === rec.id;
              const isReviewed = reviewedDuas.includes(rec.id);
              return (
                <button
                  key={rec.id}
                  type="button"
                  onClick={() => setSelectedId(rec.id)}
                  className={`w-full text-left rounded-card border p-4 transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-surface border-primary ring-1 ring-primary'
                      : 'bg-surface border-border/75 hover:bg-surface-alt'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">{rec.title}</p>
                      <p className="text-xs text-muted mt-0.5 truncate">{rec.transliteration}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {isReviewed && (
                        <CheckCircle2 className="h-4 w-4 text-success" aria-label="Reviewed" />
                      )}
                      <span className="text-xs text-muted tabular-nums">{rec.durationSec}s</span>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Selected Entry Detail */}
        {active && (
          <Surface className="lg:col-span-7 p-6 space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border/70 pb-4">
              <div>
                <h2 className="font-display text-xl md:text-2xl font-medium text-foreground">
                  {active.title}
                </h2>
                <p className="text-xs text-muted mt-1">
                  {active.sourceReference} · Status: {active.reviewStatus} (v{active.version})
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={() => handlePlay(active)}>
                  {speakingId === active.id ? (
                    <>
                      <Square className="h-4 w-4" />
                      Stop
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4" />
                      Listen ({prefs.playbackSpeed}×)
                    </>
                  )}
                </Button>
                <Button
                  tone="quiet"
                  onClick={() => onMarkReviewed(active.id)}
                >
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  {reviewedDuas.includes(active.id) ? 'Reviewed' : 'Mark Reviewed'}
                </Button>
              </div>
            </div>

            <p
              dir="rtl"
              className={`font-arabic leading-[2.1] text-right text-foreground ${
                prefs.arabicTextScale === 'large' ? 'text-3xl md:text-4xl' : 'text-2xl md:text-3xl'
              }`}
            >
              {active.arabic}
            </p>

            <div className="rounded-control bg-surface-alt p-4 space-y-1">
              <p className="text-xs font-medium text-muted">Transliteration</p>
              <p className="text-sm md:text-base font-medium text-foreground leading-relaxed">
                {active.transliteration}
              </p>
            </div>

            {/* Word-by-Word Toggle & Breakdown */}
            {active.wordByWord && active.wordByWord.length > 0 && (
              <div className="space-y-3 border-t border-border/60 pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <BookOpen className="h-4 w-4 text-primary" />
                    Word-by-Word Learning
                  </div>
                  <Button
                    tone="quiet"
                    onClick={() => setWordByWordMode((v) => !v)}
                    className="min-h-9 px-3 text-xs"
                  >
                    {wordByWordMode ? 'Hide Breakdown' : 'Show Word-by-Word'}
                  </Button>
                </div>

                {wordByWordMode && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {active.wordByWord.map((tok, i) => (
                      <div
                        key={i}
                        className="rounded-control border border-border/70 bg-surface-alt p-3 flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-foreground">{tok.transliteration}</p>
                          <p className="text-xs text-muted mt-0.5">{tok[prefs.primaryLanguage]}</p>
                        </div>
                        <span dir="rtl" className="font-arabic text-xl text-primary shrink-0">
                          {tok.arabic}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* All 3 Translation Languages */}
            <div className="space-y-3 divide-y divide-border/50 border-t border-border/60 pt-4">
              <div>
                <p className="text-xs font-medium text-muted mb-1">English Meaning</p>
                <p className="text-sm text-foreground leading-relaxed">{active.translations.en}</p>
              </div>
              <div className="pt-3">
                <p className="text-xs font-medium text-muted mb-1">हिन्दी (Hindi Meaning)</p>
                <p className="font-hindi text-sm text-foreground leading-relaxed">{active.translations.hi}</p>
              </div>
              <div className="pt-3">
                <p className="text-xs font-medium text-muted mb-1">اردو (Urdu Meaning)</p>
                <p dir="rtl" className="font-urdu text-right text-base text-foreground leading-[1.9]">
                  {active.translations.ur}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3 text-xs text-muted">
              <span className="inline-flex items-center gap-1.5">
                <Volume2 className="h-3.5 w-3.5" />
                {active.reciter}
              </span>
              <span>Reviewed by {active.approvedBy}</span>
            </div>
          </Surface>
        )}
      </div>
    </div>
  );
}
