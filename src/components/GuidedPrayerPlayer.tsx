import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Compass,
  Droplets,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  Repeat,
  RotateCcw,
  SkipBack,
  SkipForward,
  Sun,
  X,
} from 'lucide-react';
import { MADHHAB_META, PRAYERS } from '../data/prayers';
import { buildPrayerSequence } from '../engine/prayerEngine';
import { PrayerCharacterScene, type CameraPreset } from '../three/PrayerCharacterScene';
import type {
  LanguageCode,
  PlaybackSpeed,
  PrayerStep,
  PrayerTypeConfig,
  RecitationRecord,
  UserPreferences,
  VoiceGender,
} from '../types/namaz';
import {
  isSpeechPlaybackActive,
  playGentleTransitionChime,
  speakPrayerRecitation,
  stopSpeechPlayback,
  unlockAudioPlayback,
} from '../utils/audioPlayer';
import { useScreenWakeLock } from '../utils/wakeLock';
import { Button, Surface, ToggleSwitch } from './ui';

interface GuidedPrayerPlayerProps {
  config: PrayerTypeConfig;
  prefs: UserPreferences;
  recitationsMap: Record<string, RecitationRecord>;
  initialStepIndex?: number;
  startInPrep?: boolean;
  onUpdatePrefs: (patch: Partial<UserPreferences>) => void;
  onStepChange?: (rakatNumber: number, stepIndex: number) => void;
  onCompleteSession: (config: PrayerTypeConfig) => void;
  onBack: () => void;
}

const LANG_LABELS: Record<LanguageCode, string> = {
  en: 'English',
  hi: 'हिन्दी (Hindi)',
  ur: 'اردو (Urdu)',
};

const PLAYBACK_SPEEDS: PlaybackSpeed[] = [0.25, 0.5, 0.75, 1, 1.25];

export function GuidedPrayerPlayer({
  config,
  prefs,
  recitationsMap,
  initialStepIndex = 0,
  startInPrep = true,
  onUpdatePrefs,
  onStepChange,
  onCompleteSession,
  onBack,
}: GuidedPrayerPlayerProps) {
  const [inPrep, setInPrep] = useState(startInPrep);
  const [stepIdx, setStepIdx] = useState(initialStepIndex);
  const [isPlaying, setIsPlaying] = useState(false);
  const [repeatCurrent, setRepeatCurrent] = useState(false);
  const [segmentElapsed, setSegmentElapsed] = useState(0);
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [showMeaning, setShowMeaning] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(!startInPrep);

  const stageRef = useRef<HTMLDivElement | null>(null);

  const prayerInfo = PRAYERS.find((p) => p.id === config.prayerId)!;
  const madhhabInfo = MADHHAB_META[config.madhhab];

  const steps: PrayerStep[] = useMemo(
    () => buildPrayerSequence(config, recitationsMap),
    [config, recitationsMap],
  );

  const safeIdx = Math.min(Math.max(0, stepIdx), Math.max(0, steps.length - 1));
  const currentStep = steps[safeIdx];

  // Keep screen awake automatically throughout ongoing Namaz
  const { locked: wakeLocked } = useScreenWakeLock(!inPrep && !sessionCompleted);

  const isPlayingRef = useRef(isPlaying);
  const repeatRef = useRef(repeatCurrent);
  const autoAdvanceRef = useRef(prefs.autoAdvanceEnabled);
  const speedRef = useRef(prefs.playbackSpeed);
  const volumeRef = useRef(prefs.audioVolume);
  const voiceGenderRef = useRef(prefs.voiceGender);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);
  useEffect(() => {
    repeatRef.current = repeatCurrent;
  }, [repeatCurrent]);
  useEffect(() => {
    autoAdvanceRef.current = prefs.autoAdvanceEnabled;
  }, [prefs.autoAdvanceEnabled]);
  useEffect(() => {
    speedRef.current = prefs.playbackSpeed;
  }, [prefs.playbackSpeed]);
  useEffect(() => {
    volumeRef.current = prefs.audioVolume;
  }, [prefs.audioVolume]);
  useEffect(() => {
    voiceGenderRef.current = prefs.voiceGender;
  }, [prefs.voiceGender]);

  // Stop speech & exit native fullscreen on unmount
  useEffect(() => {
    return () => {
      stopSpeechPlayback();
      if (typeof document !== 'undefined' && document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    };
  }, []);

  const enterFullScreen = () => {
    setIsFullScreen(true);
    window.requestAnimationFrame(() => {
      const el = stageRef.current;
      if (el && el.requestFullscreen && !document.fullscreenElement) {
        el.requestFullscreen().catch(() => {
          // Fixed viewport fullscreen remains active if native fullscreen is blocked
        });
      }
    });
  };

  const exitFullScreen = () => {
    setIsFullScreen(false);
    if (typeof document !== 'undefined' && document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Report state tracking
  useEffect(() => {
    if (!inPrep && currentStep) {
      onStepChange?.(currentStep.rakatNumber, safeIdx);
    }
  }, [inPrep, safeIdx, currentStep, onStepChange]);

  // Trigger audio + recitation whenever playing a new step
  const triggerStepAudio = (
    step: PrayerStep,
    voiceOverride?: VoiceGender,
    speedOverride?: PlaybackSpeed,
  ) => {
    const vol = volumeRef.current;
    unlockAudioPlayback();
    playGentleTransitionChime(vol);
    speakPrayerRecitation({
      arabicText: step.recitation?.arabic,
      transliterationText: step.recitation?.transliteration,
      transitionTakbir: step.transitionTakbir,
      repeatCount: step.repeatCount,
      rate: speedOverride ?? speedRef.current,
      volume: vol,
      voiceGender: voiceOverride ?? voiceGenderRef.current,
    });
  };

  const handleSelectVoiceGender = (gender: VoiceGender) => {
    voiceGenderRef.current = gender;
    onUpdatePrefs({ voiceGender: gender });
    if (!inPrep && isPlaying && currentStep) {
      triggerStepAudio(currentStep, gender);
    }
  };

  const handleSelectSpeed = (spd: PlaybackSpeed) => {
    speedRef.current = spd;
    onUpdatePrefs({ playbackSpeed: spd });
    if (!inPrep && isPlaying && currentStep) {
      triggerStepAudio(currentStep, undefined, spd);
    }
  };

  // Playback progress loop
  useEffect(() => {
    if (!isPlaying || inPrep || !currentStep) return;

    let rafId = 0;
    let lastTs = performance.now();

    const tick = (now: number) => {
      if (!isPlayingRef.current) return;
      const dt = Math.min(0.1, (now - lastTs) / 1000) * speedRef.current;
      lastTs = now;

      setSegmentElapsed((prev) => {
        const next = prev + dt;
        if (next >= currentStep.durationSec) {
          if (isSpeechPlaybackActive()) {
            return currentStep.durationSec;
          }
          if (repeatRef.current) {
            triggerStepAudio(currentStep);
            return 0;
          }
          if (autoAdvanceRef.current) {
            if (safeIdx < steps.length - 1) {
              const upcoming = steps[safeIdx + 1];
              setStepIdx(safeIdx + 1);
              triggerStepAudio(upcoming);
              return 0;
            } else {
              setIsPlaying(false);
              setSessionCompleted(true);
              onCompleteSession(config);
              stopSpeechPlayback();
              return currentStep.durationSec;
            }
          } else {
            setIsPlaying(false);
            return currentStep.durationSec;
          }
        }
        return next;
      });

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying, inPrep, safeIdx, currentStep, steps, config, onCompleteSession]);

  const handleTogglePlay = () => {
    if (sessionCompleted) {
      setSessionCompleted(false);
      setStepIdx(0);
      setSegmentElapsed(0);
      setIsPlaying(true);
      enterFullScreen();
      if (steps[0]) triggerStepAudio(steps[0]);
      return;
    }
    if (isPlaying) {
      setIsPlaying(false);
      stopSpeechPlayback();
    } else {
      setIsPlaying(true);
      if (currentStep) triggerStepAudio(currentStep);
    }
  };

  const handleReplayStep = () => {
    setSegmentElapsed(0);
    setIsPlaying(true);
    if (currentStep) triggerStepAudio(currentStep);
  };

  const handleGoToStep = (targetIdx: number) => {
    const clamped = Math.min(Math.max(0, targetIdx), steps.length - 1);
    setStepIdx(clamped);
    setSegmentElapsed(0);
    setSessionCompleted(false);
    if (isPlaying && steps[clamped]) {
      triggerStepAudio(steps[clamped]);
    } else {
      stopSpeechPlayback();
    }
  };

  const handleExitPlayer = () => {
    stopSpeechPlayback();
    setIsPlaying(false);
    exitFullScreen();
    onBack();
  };

  // Screen 6: Prayer Preparation
  if (inPrep) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button tone="quiet" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
            Back to Prayer Categories
          </Button>
          <span className="text-xs font-medium text-muted">
            Screen 6 · Preparation & Preferences
          </span>
        </div>

        <Surface className="p-6 md:p-8 space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border/70 pb-5">
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-primary">
                Guided Learning & Practice Session
              </p>
              <h1 className="font-display text-2xl md:text-3xl font-medium text-foreground">
                {prayerInfo.name} · {config.categoryLabel}
              </h1>
              <p className="text-sm text-muted">
                {madhhabInfo.name} School · {config.rakatCount} Rakat{config.rakatCount > 1 ? 's' : ''} ·{' '}
                {steps.length} prayer segments
              </p>
            </div>
            <div className="text-right">
              <span className="font-arabic text-3xl text-primary">{prayerInfo.arabicName}</span>
            </div>
          </div>

          <div className="rounded-control border border-accent/45 bg-surface-alt px-4 py-3 text-sm text-foreground">
            <strong className="font-semibold">Learning Companion Notice:</strong> This guided session
            is designed for learning and practice. It does not replace an Imam, establish a valid
            congregation, or verify real-world prayer validity.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-control border border-border/70 p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Droplets className="h-4 w-4 text-primary" />
                Wudu & Cleanliness
              </div>
              <p className="text-sm text-muted">
                When preparing for an actual prayer, ensure Wudu (ablution), clean clothing, and a
                clean prayer area.
              </p>
            </div>

            <div className="rounded-control border border-border/70 p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Compass className="h-4 w-4 text-primary" />
                Facing the Qibla
              </div>
              <p className="text-sm text-muted">
                Check the Qibla Compass in this app if practicing in a room, and keep your screen
                on—your device stays awake automatically during Namaz.
              </p>
            </div>
          </div>

          <div className="border-t border-border/70 pt-5 space-y-4">
            <div>
              <h2 className="text-base font-semibold text-foreground">Session Playback Preferences</h2>
              <p className="text-xs text-muted mt-0.5">
                Starts in full screen with screen wake lock enabled so your phone stays awake while
                you pray.
              </p>
            </div>

            <div>
              <ToggleSwitch
                id="prep-autoadvance"
                checked={prefs.autoAdvanceEnabled}
                onChange={(v) => onUpdatePrefs({ autoAdvanceEnabled: v })}
                label="Automatic Progression"
                description="Advance automatically to the next prayer segment after each recitation finishes"
              />
            </div>

            <div className="flex flex-wrap items-center gap-6 pt-2">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-foreground">Recitation Voice</span>
                <div className="flex items-center gap-1.5" role="group" aria-label="Recitation Voice">
                  {(['male', 'female'] as const).map((gender) => (
                    <button
                      key={gender}
                      type="button"
                      onClick={() => handleSelectVoiceGender(gender)}
                      aria-pressed={prefs.voiceGender === gender}
                      className={`min-h-9 whitespace-nowrap rounded-control px-3 text-xs font-medium border cursor-pointer capitalize ${
                        prefs.voiceGender === gender
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-surface text-foreground border-border'
                      }`}
                    >
                      {gender}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <label htmlFor="prep-speed" className="text-sm font-medium text-foreground">
                  Playback Speed
                </label>
                <div id="prep-speed" className="flex flex-wrap items-center gap-1.5">
                  {PLAYBACK_SPEEDS.map((spd) => (
                    <button
                      key={spd}
                      type="button"
                      onClick={() => handleSelectSpeed(spd)}
                      className={`min-h-9 rounded-control px-3 text-xs font-medium border cursor-pointer tabular-nums ${
                        prefs.playbackSpeed === spd
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-surface text-foreground border-border'
                      }`}
                    >
                      {spd}×
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3 flex-1 min-w-[200px] max-w-xs">
                <label htmlFor="prep-volume" className="text-sm font-medium text-foreground whitespace-nowrap">
                  Volume
                </label>
                <input
                  id="prep-volume"
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={prefs.audioVolume}
                  onChange={(e) => onUpdatePrefs({ audioVolume: Number(e.target.value) })}
                  className="w-full accent-primary cursor-pointer"
                />
                <span className="text-xs text-muted tabular-nums w-9 text-right">
                  {Math.round(prefs.audioVolume * 100)}%
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border/70 pt-5">
            <p className="text-xs text-muted">
              Content reviewed for {madhhabInfo.name} guidance · {config.version}
            </p>
            <Button
              onClick={() => {
                setInPrep(false);
                setIsPlaying(true);
                setSegmentElapsed(0);
                setSessionCompleted(false);
                enterFullScreen();
                if (steps[safeIdx]) triggerStepAudio(steps[safeIdx]);
              }}
              className="px-6"
            >
              <Play className="h-4 w-4" />
              Begin Guided Session
            </Button>
          </div>
        </Surface>
      </div>
    );
  }

  if (!currentStep) return null;

  const totalProgressPct = Math.round(
    ((safeIdx + segmentElapsed / currentStep.durationSec) / steps.length) * 100,
  );
  const segPct = Math.min(100, Math.round((segmentElapsed / currentStep.durationSec) * 100));
  const cameraPreset: CameraPreset = currentStep.activity.cameraHint;

  const voiceToggleControl = (
    <div
      className="inline-flex items-center rounded-control border border-border bg-surface/92 p-0.5"
      role="group"
      aria-label="Voice gender"
    >
      {(['male', 'female'] as const).map((gender) => (
        <button
          key={gender}
          type="button"
          onClick={() => handleSelectVoiceGender(gender)}
          aria-pressed={prefs.voiceGender === gender}
          className={`min-h-8 whitespace-nowrap rounded-[6px] px-2.5 text-xs font-medium capitalize transition-colors cursor-pointer ${
            prefs.voiceGender === gender
              ? 'bg-primary text-primary-foreground'
              : 'text-foreground hover:bg-surface-alt'
          }`}
        >
          {gender}
        </button>
      ))}
    </div>
  );

  // Full-Screen Immersive Namaz Stage
  if (isFullScreen) {
    return (
      <div
        ref={stageRef}
        className="fixed inset-0 z-50 flex flex-col justify-between overflow-hidden bg-background"
      >
        {/* Full-bleed 3D Animation Stage */}
        <div className="absolute inset-0">
          <PrayerCharacterScene
            pose={currentStep.activity.pose}
            madhhab={config.madhhab}
            theme={prefs.theme}
            quality={prefs.animationQuality}
            cameraPreset={cameraPreset}
            fullScreenMode
            className="h-full w-full"
          />
        </div>

        {/* Top Floating HUD */}
        <header className="relative z-10 pointer-events-none flex flex-wrap items-start justify-between gap-2 p-3 sm:p-4">
          <div className="pointer-events-auto flex flex-wrap items-center gap-3 rounded-card border border-border/80 bg-surface/90 px-3.5 py-2 backdrop-blur-md shadow-sm">
            <div>
              <p className="text-[11px] font-medium text-muted">
                {prayerInfo.name} · {config.categoryLabel} · {madhhabInfo.name}
              </p>
              <p className="text-sm font-semibold text-foreground tabular-nums">
                Rakat {currentStep.rakatNumber} of {currentStep.totalRakats} · Step {safeIdx + 1}/
                {steps.length}
              </p>
            </div>

            {!sessionCompleted && (
              <span
                title="Screen stay-awake active while Namaz is ongoing"
                className="inline-flex items-center gap-1 rounded-control border border-primary/30 bg-surface-alt px-2 py-1 text-[11px] font-medium text-primary"
              >
                <Sun className="h-3 w-3" />
                {wakeLocked ? 'Screen Awake' : 'Keep-Awake On'}
              </span>
            )}
          </div>

          <div className="pointer-events-auto flex flex-wrap items-center gap-2">
            {voiceToggleControl}

            <button
              type="button"
              onClick={exitFullScreen}
              className="inline-flex min-h-9 items-center gap-1.5 whitespace-nowrap rounded-control border border-border/85 bg-surface/92 px-3 text-xs font-medium text-foreground hover:bg-surface-alt backdrop-blur-md cursor-pointer"
            >
              <Minimize2 className="h-3.5 w-3.5" />
              Minimize
            </button>

            <button
              type="button"
              onClick={handleExitPlayer}
              aria-label="Exit Prayer Session"
              className="inline-flex min-h-9 items-center gap-1 whitespace-nowrap rounded-control border border-border/85 bg-surface/92 px-3 text-xs font-medium text-foreground hover:bg-surface-alt backdrop-blur-md cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
              Exit
            </button>
          </div>
        </header>

        {/* Bottom Floating Recitation & Transport HUD */}
        <footer className="relative z-10 pointer-events-none p-3 sm:p-4 flex justify-center">
          <div className="pointer-events-auto w-full max-w-2xl rounded-card border border-border/80 bg-surface/90 p-3.5 sm:p-4 backdrop-blur-md shadow-md space-y-3">
            {sessionCompleted ? (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-6 w-6 text-success shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      Namaz Learning Session Completed
                    </p>
                    <p className="text-xs text-muted">
                      {prayerInfo.name} {config.categoryLabel} ({config.rakatCount} Rakat
                      {config.rakatCount > 1 ? 's' : ''})
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={handleTogglePlay} className="min-h-9 px-3.5 text-xs">
                    Replay Session
                  </Button>
                  <Button tone="quiet" onClick={handleExitPlayer} className="min-h-9 px-3.5 text-xs">
                    Done
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-primary">
                      {currentStep.recitation?.title ?? currentStep.activity.name}
                      {currentStep.repeatCount && currentStep.repeatCount > 1
                        ? ` (×${currentStep.repeatCount})`
                        : ''}
                    </span>
                    {currentStep.transitionTakbir && (
                      <span className="inline-flex items-center gap-1.5 rounded-control border border-primary/25 bg-surface-alt px-2 py-0.5 text-xs font-medium text-foreground">
                        <span>Allahu Akbar</span>
                        <span dir="rtl" className="font-arabic text-sm text-primary leading-none">
                          اللَّهُ أَكْبَرُ
                        </span>
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-muted tabular-nums">
                    {segmentElapsed.toFixed(1)}s / {currentStep.durationSec.toFixed(0)}s
                  </span>
                </div>

                {currentStep.recitation && (
                  <div className="space-y-1.5">
                    <p
                      dir="rtl"
                      className={`font-arabic text-right text-foreground leading-[1.85] ${
                        prefs.arabicTextScale === 'large'
                          ? 'text-2xl sm:text-3xl'
                          : 'text-xl sm:text-2xl'
                      }`}
                    >
                      {currentStep.recitation.arabic}
                    </p>
                    <p className="text-xs sm:text-sm font-medium text-muted leading-snug">
                      {currentStep.recitation.transliteration}
                    </p>
                  </div>
                )}

                {/* Progress bar */}
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-alt">
                  <div
                    className="h-full bg-primary transition-[width] duration-100"
                    style={{ width: `${segPct}%` }}
                  />
                </div>

                {/* Transport controls */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Button
                      tone="quiet"
                      onClick={() => handleGoToStep(safeIdx - 1)}
                      disabled={safeIdx === 0}
                      aria-label="Previous Activity"
                      className="min-h-9 px-2.5 text-xs"
                    >
                      <SkipBack className="h-3.5 w-3.5" />
                      Prev
                    </Button>

                    <Button
                      onClick={handleTogglePlay}
                      aria-label={isPlaying ? 'Pause' : 'Play'}
                      className="min-h-9 px-3.5 text-xs"
                    >
                      {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                      {isPlaying ? 'Pause' : segmentElapsed > 0 ? 'Resume' : 'Play'}
                    </Button>

                    <Button
                      tone="quiet"
                      onClick={handleReplayStep}
                      aria-label="Replay Current Activity"
                      className="min-h-9 px-2.5 text-xs"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Replay
                    </Button>

                    <Button
                      tone="quiet"
                      onClick={() => handleGoToStep(safeIdx + 1)}
                      disabled={safeIdx >= steps.length - 1}
                      aria-label="Next Activity"
                      className="min-h-9 px-2.5 text-xs"
                    >
                      Next
                      <SkipForward className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setRepeatCurrent((v) => !v)}
                      aria-pressed={repeatCurrent}
                      className={`inline-flex min-h-9 items-center gap-1 rounded-control border px-2.5 text-xs font-medium cursor-pointer ${
                        repeatCurrent
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-surface text-foreground border-border'
                      }`}
                    >
                      <Repeat className="h-3.5 w-3.5" />
                      Repeat
                    </button>

                    <select
                      aria-label="Playback speed"
                      value={prefs.playbackSpeed}
                      onChange={(e) => handleSelectSpeed(Number(e.target.value) as PlaybackSpeed)}
                      className="min-h-9 rounded-control border border-border bg-surface px-2.5 text-xs font-medium text-foreground tabular-nums cursor-pointer"
                    >
                      {PLAYBACK_SPEEDS.map((spd) => (
                        <option key={spd} value={spd}>
                          {spd}× {spd <= 0.5 ? '(Slow)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </>
            )}
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div ref={stageRef} className="space-y-4">
      {/* Top Player Header */}
      <Surface className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Button tone="quiet" onClick={handleExitPlayer} className="min-h-10 px-3">
              <ArrowLeft className="h-4 w-4" />
              Exit
            </Button>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                <span>{prayerInfo.name} · {config.categoryLabel}</span>
                <span>·</span>
                <span>{madhhabInfo.name} Guidance</span>
                {!sessionCompleted && (
                  <>
                    <span>·</span>
                    <span className="inline-flex items-center gap-1 text-primary font-medium">
                      <Sun className="h-3 w-3" />
                      {wakeLocked ? 'Screen Awake' : 'Keep-Awake On'}
                    </span>
                  </>
                )}
              </div>
              <h1 className="text-lg md:text-xl font-semibold text-foreground truncate">
                {currentStep.activity.name}
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm tabular-nums">
            <div className="text-right">
              <p className="font-semibold text-foreground">
                Rakat {currentStep.rakatNumber} of {currentStep.totalRakats}
              </p>
              <p className="text-xs text-muted">
                Activity {safeIdx + 1} of {steps.length} · {totalProgressPct}%
              </p>
            </div>
            <Button tone="primary" onClick={enterFullScreen} className="min-h-10 px-3">
              <Maximize2 className="h-4 w-4" />
              Full Screen
            </Button>
            <Button
              tone="quiet"
              onClick={() => {
                setIsPlaying(false);
                stopSpeechPlayback();
                setInPrep(true);
              }}
              className="min-h-10 px-3"
            >
              Preferences
            </Button>
          </div>
        </div>

        {/* Overall sequence progress bar */}
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-surface-alt">
          <div
            className="h-full bg-primary transition-[width] duration-200 ease-out"
            style={{ width: `${Math.min(100, totalProgressPct)}%` }}
          />
        </div>
      </Surface>

      {/* Main Split Stage: 3D Demonstration + Synchronized Recitation & Audio Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        <div className="lg:col-span-6 space-y-3">
          <PrayerCharacterScene
            pose={currentStep.activity.pose}
            madhhab={config.madhhab}
            theme={prefs.theme}
            quality={prefs.animationQuality}
            cameraPreset={cameraPreset}
            className="h-[360px] sm:h-[430px] lg:h-[490px]"
            caption={`${currentStep.activity.arabicTitle} · ${currentStep.activity.rulingTag}`}
          />

          {/* Audio Player Control Bar */}
          <Surface className="p-3.5 space-y-3">
            <div className="flex items-center justify-between gap-2 text-xs text-muted tabular-nums">
              <span>{currentStep.recitation?.title ?? currentStep.activity.name}</span>
              <span>
                {segmentElapsed.toFixed(1)}s / {currentStep.durationSec.toFixed(0)}s
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-alt">
              <div
                className="h-full bg-accent transition-[width] duration-100"
                style={{ width: `${segPct}%` }}
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <Button
                  tone="quiet"
                  onClick={() => handleGoToStep(safeIdx - 1)}
                  disabled={safeIdx === 0}
                  aria-label="Previous Activity"
                  className="min-h-10 px-3"
                >
                  <SkipBack className="h-4 w-4" />
                  Prev
                </Button>

                <Button
                  onClick={handleTogglePlay}
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                  className="min-h-10 px-4"
                >
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  {sessionCompleted ? 'Restart' : isPlaying ? 'Pause' : segmentElapsed > 0 ? 'Resume' : 'Play'}
                </Button>

                <Button
                  tone="quiet"
                  onClick={handleReplayStep}
                  aria-label="Replay Current Activity"
                  className="min-h-10 px-3"
                >
                  <RotateCcw className="h-4 w-4" />
                  Replay
                </Button>

                <Button
                  tone="quiet"
                  onClick={() => handleGoToStep(safeIdx + 1)}
                  disabled={safeIdx >= steps.length - 1}
                  aria-label="Next Activity"
                  className="min-h-10 px-3"
                >
                  Next
                  <SkipForward className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {voiceToggleControl}

                <button
                  type="button"
                  onClick={() => setRepeatCurrent((v) => !v)}
                  aria-pressed={repeatCurrent}
                  className={`inline-flex min-h-10 items-center gap-1.5 rounded-control border px-3 text-xs font-medium cursor-pointer ${
                    repeatCurrent
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-surface text-foreground border-border'
                  }`}
                >
                  <Repeat className="h-3.5 w-3.5" />
                  Repeat
                </button>

                <select
                  aria-label="Playback speed"
                  value={prefs.playbackSpeed}
                  onChange={(e) => handleSelectSpeed(Number(e.target.value) as PlaybackSpeed)}
                  className="min-h-10 rounded-control border border-border bg-surface px-2.5 text-xs font-medium text-foreground tabular-nums cursor-pointer"
                >
                  {PLAYBACK_SPEEDS.map((spd) => (
                    <option key={spd} value={spd}>
                      {spd}× {spd <= 0.5 ? '(Slow)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </Surface>
        </div>

        {/* Lower / Right Synchronized Recitation Text */}
        <div className="lg:col-span-6 space-y-4">
          {sessionCompleted && (
            <Surface className="p-5 border-success/60 bg-surface">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-6 w-6 text-success shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <h2 className="text-lg font-semibold text-foreground">
                    Learning Session Completed
                  </h2>
                  <p className="text-sm text-muted">
                    You walked through all {config.rakatCount} Rakat{config.rakatCount > 1 ? 's' : ''} of{' '}
                    {prayerInfo.name} {config.categoryLabel} ({madhhabInfo.name}). This records your
                    lesson progress only.
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button onClick={handleTogglePlay}>Review Sequence Again</Button>
                    <Button tone="quiet" onClick={handleExitPlayer}>
                      Choose Another Prayer
                    </Button>
                  </div>
                </div>
              </div>
            </Surface>
          )}

          {/* Arabic Recitation & Transliteration */}
          <Surface className="p-5 md:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 pb-3">
              <span className="text-xs font-semibold text-primary">
                {currentStep.recitation?.title ?? currentStep.activity.name}
                {currentStep.repeatCount && currentStep.repeatCount > 1
                  ? ` (×${currentStep.repeatCount})`
                  : ''}
              </span>
              <span className="text-xs text-muted">
                {currentStep.recitation?.sourceReference ?? currentStep.activity.rulingTag}
              </span>
            </div>

            {currentStep.transitionTakbir && (
              <div className="flex items-center justify-between gap-3 rounded-control border border-primary/25 bg-surface-alt px-3.5 py-2.5">
                <span className="text-sm font-medium text-foreground">Allahu Akbar</span>
                <span dir="rtl" className="font-arabic text-xl text-primary leading-none">
                  اللَّهُ أَكْبَرُ
                </span>
              </div>
            )}

            {currentStep.recitation ? (
              <div className="space-y-4">
                <p
                  dir="rtl"
                  className={`font-arabic leading-[2.05] text-foreground text-right ${
                    prefs.arabicTextScale === 'large' ? 'text-3xl md:text-4xl' : 'text-2xl md:text-3xl'
                  }`}
                >
                  {currentStep.recitation.arabic}
                </p>

                <div className="rounded-control bg-surface-alt p-3.5 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium text-muted">Transliteration</p>
                    {currentStep.repeatCount && currentStep.repeatCount > 1 && (
                      <span className="text-xs font-semibold text-primary">
                        Recite {currentStep.repeatCount} times
                      </span>
                    )}
                  </div>
                  <p className="text-sm md:text-base font-medium text-foreground leading-relaxed">
                    {currentStep.recitation.transliteration}
                  </p>
                </div>

                <div className="border-t border-border/60 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowMeaning((v) => !v)}
                    aria-expanded={showMeaning}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-muted hover:text-foreground cursor-pointer py-1"
                  >
                    {showMeaning ? (
                      <ChevronUp className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5" />
                    )}
                    {showMeaning ? 'Hide Meaning' : 'Show Meaning'}
                  </button>

                  {showMeaning && (
                    <div className="mt-2.5 space-y-3 divide-y divide-border/50">
                      {prefs.languages.map((lang) => (
                        <div key={lang} className="pt-2.5 first:pt-0">
                          <p className="text-xs font-medium text-muted mb-1">{LANG_LABELS[lang]}</p>
                          <p
                            dir={lang === 'ur' ? 'rtl' : 'ltr'}
                            className={`text-sm md:text-base text-foreground leading-relaxed ${
                              lang === 'ur'
                                ? 'font-urdu text-right text-lg leading-[1.95]'
                                : lang === 'hi'
                                  ? 'font-hindi'
                                  : ''
                            }`}
                          >
                            {currentStep.recitation!.translations[lang]}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </Surface>

          {/* Activity Sequence Stepper */}
          <Surface className="p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-foreground">
                Sequence Steps (Tap any step to jump)
              </p>
              <ToggleSwitch
                id="player-autoadvance"
                checked={prefs.autoAdvanceEnabled}
                onChange={(v) => onUpdatePrefs({ autoAdvanceEnabled: v })}
                label="Auto-Advance"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {steps.map((st, idx) => (
                <button
                  key={st.stepIndex}
                  type="button"
                  onClick={() => handleGoToStep(idx)}
                  className={`rounded-control px-2.5 py-1.5 text-xs font-medium border transition-colors cursor-pointer ${
                    idx === safeIdx
                      ? 'bg-primary text-primary-foreground border-primary'
                      : idx < safeIdx
                        ? 'bg-surface-alt text-foreground border-border'
                        : 'bg-surface text-muted border-border/70 hover:text-foreground'
                  }`}
                >
                  R{st.rakatNumber} · {st.activity.name.split('—')[0].trim()}
                </button>
              ))}
            </div>
          </Surface>
        </div>
      </div>
    </div>
  );
}
