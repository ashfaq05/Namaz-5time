import { useState } from 'react';
import { CheckCircle2, Play, RotateCcw } from 'lucide-react';
import { MOVEMENT_LESSONS } from '../data/activities';
import { MADHHAB_META } from '../data/prayers';
import { PrayerCharacterScene } from '../three/PrayerCharacterScene';
import type { MadhhabId, PoseId, UserPreferences } from '../types/namaz';
import { playGentleTransitionChime, speakGuidanceAndRecitation } from '../utils/audioPlayer';
import { Button, Surface } from './ui';

interface MovementsLibraryViewProps {
  prefs: UserPreferences;
  learnedMovements: PoseId[];
  onMarkLearned: (pose: PoseId) => void;
}

export function MovementsLibraryView({
  prefs,
  learnedMovements,
  onMarkLearned,
}: MovementsLibraryViewProps) {
  const [selectedPose, setSelectedPose] = useState<PoseId>('takbir');
  const [previewMadhhab, setPreviewMadhhab] = useState<MadhhabId>(prefs.madhhab);

  const active =
    MOVEMENT_LESSONS.find((m) => m.pose === selectedPose) ?? MOVEMENT_LESSONS[0];

  const handlePlayExplanation = () => {
    playGentleTransitionChime(prefs.audioVolume);
    speakGuidanceAndRecitation({
      spokenInstruction: `${active.title}. ${active.spokenSummary} ${active.madhhabGuidance[previewMadhhab]}`,
      language: prefs.primaryLanguage,
      rate: prefs.playbackSpeed,
      volume: prefs.audioVolume,
      spokenEnabled: true,
      voiceGender: prefs.voiceGender,
    });
    onMarkLearned(active.pose);
  };

  const handleReplayTransition = () => {
    // Briefly pulse through intention/qiyam and back to selected pose so user sees smooth motion
    const prev = active.pose;
    setSelectedPose(prev === 'takbir' ? 'qiyam' : 'takbir');
    window.setTimeout(() => {
      setSelectedPose(prev);
      playGentleTransitionChime(prefs.audioVolume);
    }, 320);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-medium text-foreground">
            Learn Individual Movements
          </h1>
          <p className="text-sm text-muted mt-1">
            Inspect each prayer posture in 3D, switch camera angles, compare Madhhab variations, and hear spoken guidance.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted mr-1">Preview School:</span>
          {(['hanafi', 'shafii', 'maliki', 'hanbali'] as MadhhabId[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setPreviewMadhhab(m)}
              className={`min-h-9 rounded-control border px-3 text-xs font-medium cursor-pointer ${
                previewMadhhab === m
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-surface text-foreground border-border hover:bg-surface-alt'
              }`}
            >
              {MADHHAB_META[m].name}
            </button>
          ))}
        </div>
      </div>

      {/* Movement Selector Strip */}
      <div className="flex flex-wrap gap-2">
        {MOVEMENT_LESSONS.map((m) => {
          const isSelected = m.pose === active.pose;
          const isDone = learnedMovements.includes(m.pose);
          return (
            <button
              key={m.pose}
              type="button"
              onClick={() => setSelectedPose(m.pose)}
              className={`inline-flex min-h-10 items-center gap-2 whitespace-nowrap rounded-control border px-3.5 text-xs font-medium transition-colors cursor-pointer ${
                isSelected
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-surface text-foreground border-border hover:bg-surface-alt'
              }`}
            >
              {m.title.split('(')[0].trim()}
              {isDone && (
                <CheckCircle2
                  className={`h-3.5 w-3.5 ${isSelected ? 'text-primary-foreground' : 'text-success'}`}
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <div className="lg:col-span-7">
          <PrayerCharacterScene
            pose={selectedPose}
            madhhab={previewMadhhab}
            theme={prefs.theme}
            quality={prefs.animationQuality}
            cameraPreset={active.cameraHint}
            className="h-[380px] sm:h-[450px] lg:h-[500px]"
            caption={`${active.arabicTitle} · ${MADHHAB_META[previewMadhhab].name} Posture`}
          />
        </div>

        <Surface className="lg:col-span-5 p-6 space-y-5">
          <div className="flex items-start justify-between gap-3 border-b border-border/70 pb-4">
            <div>
              <h2 className="font-display text-xl md:text-2xl font-medium text-foreground">
                {active.title}
              </h2>
              <p className="text-sm text-muted mt-1">{active.summary}</p>
            </div>
            <span className="font-arabic text-2xl text-primary shrink-0">{active.arabicTitle}</span>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={handlePlayExplanation}>
              <Play className="h-4 w-4" />
              Speak Explanation
            </Button>
            <Button tone="quiet" onClick={handleReplayTransition}>
              <RotateCcw className="h-4 w-4" />
              Replay Motion
            </Button>
            <Button
              tone="quiet"
              onClick={() => onMarkLearned(active.pose)}
            >
              <CheckCircle2 className="h-4 w-4 text-success" />
              {learnedMovements.includes(active.pose) ? 'Learned' : 'Mark Learned'}
            </Button>
          </div>

          <div className="space-y-2.5">
            <h3 className="text-sm font-semibold text-foreground">Key Posture Alignment Points</h3>
            <ul className="space-y-2 text-sm text-muted list-disc pl-5">
              {active.keyPoints.map((pt, i) => (
                <li key={i} className="leading-relaxed">
                  {pt}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-control bg-surface-alt p-4 space-y-1.5 border border-border/70">
            <p className="text-xs font-semibold text-primary">
              {MADHHAB_META[previewMadhhab].name} School Guidance
            </p>
            <p className="text-sm text-foreground leading-relaxed">
              {active.madhhabGuidance[previewMadhhab]}
            </p>
          </div>
        </Surface>
      </div>
    </div>
  );
}
