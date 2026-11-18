import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Clock,
  Compass,
  Download,
  PersonStanding,
  Play,
  Sparkles,
} from 'lucide-react';
import { MADHHAB_META, PRAYERS, getPrayerTypesFor } from '../data/prayers';
import { PrayerCharacterScene } from '../three/PrayerCharacterScene';
import type {
  LearningProgressState,
  PrayerId,
  PrayerTypeConfig,
  UserPreferences,
} from '../types/namaz';
import {
  computeDailyPrayerTimes,
  formatCurrentTime,
  formatGregorianDate,
  formatHijriDate,
  formatHourFloat,
  getNextPrayerCountdown,
  getZonedDateParts,
} from '../utils/astronomy';
import { Button, IslamicPatternAccent, Surface } from './ui';

interface HomeDashboardViewProps {
  prefs: UserPreferences;
  progress: LearningProgressState;
  prayerConfigs: PrayerTypeConfig[];
  selectedPrayerId: PrayerId | null;
  onSelectPrayer: (prayerId: PrayerId | null) => void;
  onStartPrayerType: (config: PrayerTypeConfig) => void;
  onContinueLearning: () => void;
  onOpenMovements: () => void;
  onOpenDuas: () => void;
  onOpenTimings: () => void;
  onOpenQibla: () => void;
  onOpenMadhhabs: () => void;
  onOpenWelcomeSetup: () => void;
}

export function HomeDashboardView({
  prefs,
  progress,
  prayerConfigs,
  selectedPrayerId,
  onSelectPrayer,
  onStartPrayerType,
  onContinueLearning,
  onOpenMovements,
  onOpenDuas,
  onOpenTimings,
  onOpenQibla,
  onOpenMadhhabs,
  onOpenWelcomeSetup,
}: HomeDashboardViewProps) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const times = computeDailyPrayerTimes(
    now,
    prefs.location,
    prefs.calculationMethod,
    prefs.asrMethod,
    prefs.timeZone,
  );
  const nextPrayer = getNextPrayerCountdown(now, times, prefs.timeZone);
  const zonedNow = getZonedDateParts(now, prefs.timeZone);
  const madhhabInfo = MADHHAB_META[prefs.madhhab];

  // Screen 5: Select Prayer Type
  if (selectedPrayerId) {
    const prayer = PRAYERS.find((p) => p.id === selectedPrayerId)!;
    const types = getPrayerTypesFor(selectedPrayerId, prefs.madhhab, prayerConfigs);

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button tone="quiet" onClick={() => onSelectPrayer(null)}>
            <ArrowLeft className="h-4 w-4" />
            All Five Prayers
          </Button>
          <button
            type="button"
            onClick={onOpenMadhhabs}
            className="text-xs font-medium text-primary hover:underline cursor-pointer"
          >
            School: {madhhabInfo.name} · Switch Madhhab →
          </button>
        </div>

        <Surface className="p-6 md:p-8 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-primary">
              Select Prayer Category · {madhhabInfo.name} Configuration
            </p>
            <h1 className="font-display text-2xl md:text-3xl font-medium text-foreground">
              {prayer.name} Prayer
            </h1>
            <p className="text-sm text-muted">
              {prayer.timeWindowSummary} · Choose Fard, Sunnah, Nafl, or Witr sequence to practice.
            </p>
          </div>
          <span className="font-arabic text-4xl text-primary">{prayer.arabicName}</span>
        </Surface>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {types.map((cfg) => (
            <Surface key={cfg.id} className="p-6 flex flex-col justify-between gap-5">
              <div className="space-y-2.5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-primary uppercase tracking-wider">
                      {cfg.category.replace(/_/g, ' ')}
                    </p>
                    <h2 className="text-lg font-semibold text-foreground mt-0.5">
                      {cfg.categoryLabel}
                    </h2>
                  </div>
                  <span className="rounded-full bg-surface-alt border border-border px-3 py-1 text-xs font-semibold text-foreground tabular-nums shrink-0">
                    {cfg.rakatCount} Rakat{cfg.rakatCount > 1 ? 's' : ''}
                  </span>
                </div>
                <p className="text-sm text-muted leading-relaxed">{cfg.summary}</p>
                <p className="text-xs text-muted">
                  Reviewed by {cfg.reviewer} · v{cfg.version}
                </p>
              </div>

              <div className="flex items-center justify-between gap-3 border-t border-border/60 pt-4">
                <span className="text-xs text-muted">
                  {cfg.audibleRecitation ? 'Audible recitation model' : 'Quiet recitation model'}
                </span>
                <Button onClick={() => onStartPrayerType(cfg)}>
                  <Play className="h-4 w-4" />
                  Start Learning
                </Button>
              </div>
            </Surface>
          ))}
        </div>
      </div>
    );
  }

  const timeByPrayer: Record<PrayerId, number> = {
    fajr: times.fajr,
    zuhr: times.zuhr,
    asr: times.asr,
    maghrib: times.maghrib,
    isha: times.isha,
  };

  const hour = zonedNow.hour;
  const greeting =
    hour < 12 ? 'As-salamu alaykum · Good Morning' : hour < 17 ? 'As-salamu alaykum · Good Afternoon' : 'As-salamu alaykum · Good Evening';

  return (
    <div className="space-y-6">
      {/* Subtle non-blocking Setup Banner for first-time visitors */}
      {!prefs.hasCompletedSetup && (
        <Surface className="px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 border-primary/40">
          <div className="flex items-center gap-2.5 text-sm text-foreground">
            <Sparkles className="h-4 w-4 text-primary shrink-0" />
            <span>
              Currently configured for <strong>{madhhabInfo.name}</strong> guidance in{' '}
              <strong>{prefs.location.name}</strong>. Want to view the Welcome tour or customize your setup?
            </span>
          </div>
          <Button tone="quiet" onClick={onOpenWelcomeSetup} className="min-h-9 px-3.5 text-xs">
            Open Welcome & Setup
          </Button>
        </Surface>
      )}

      {/* Hero Dashboard Card: Greeting, Hijri Date, Next Prayer Countdown & Live 3D Sanctuary Preview */}
      <Surface className="relative overflow-hidden p-6 md:p-8">
        <IslamicPatternAccent className="absolute -left-10 -bottom-10 h-56 w-56 text-primary" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center relative">
          <div className="lg:col-span-7 space-y-5">
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-primary">
                {greeting} · {madhhabInfo.name} Guidance
              </p>
              <h1 className="font-display text-3xl md:text-4xl font-medium text-foreground leading-tight">
                Learn. Listen. Pray.
              </h1>
              <p className="text-sm text-muted">
                {formatGregorianDate(now, prefs.timeZone)} · {formatHijriDate(now, prefs.timeZone)} ·{' '}
                {prefs.location.name} ·{' '}
                <strong className="text-foreground tabular-nums">
                  {formatCurrentTime(now, prefs.timeZone)}
                </strong>
              </p>
            </div>

            {/* Next Prayer & Countdown Strip */}
            <div className="rounded-card border border-border/80 bg-surface-alt p-4 flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-medium text-muted">Next Prayer</p>
                <p className="text-xl font-semibold text-foreground">
                  {nextPrayer.label} at {nextPrayer.timeStr}
                </p>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-xs font-medium text-muted">Countdown</p>
                <p className="text-xl font-semibold text-primary tabular-nums">
                  {nextPrayer.countdownStr}
                </p>
              </div>
            </div>

            {/* Quick Shortcuts */}
            <div className="flex flex-wrap gap-2.5">
              <Button onClick={onContinueLearning}>
                <Play className="h-4 w-4" />
                {progress.lastActivity ? 'Continue Learning' : 'Start Fajr Lesson'}
              </Button>
              <Button tone="quiet" onClick={onOpenMovements}>
                <PersonStanding className="h-4 w-4" />
                Learn a Movement
              </Button>
              <Button tone="quiet" onClick={onOpenDuas}>
                <BookOpen className="h-4 w-4" />
                Learn a Dua
              </Button>
              <Button tone="quiet" onClick={onOpenTimings}>
                <Clock className="h-4 w-4" />
                Prayer Timings
              </Button>
              <Button tone="quiet" onClick={onOpenQibla}>
                <Compass className="h-4 w-4" />
                Qibla
              </Button>
            </div>
          </div>

          <div className="lg:col-span-5">
            <PrayerCharacterScene
              pose="qiyam"
              madhhab={prefs.madhhab}
              theme={prefs.theme}
              quality={prefs.animationQuality}
              modelId={prefs.characterModel}
              compact
              className="h-[270px] sm:h-[310px]"
              caption={`Qiyam Posture · ${madhhabInfo.name}`}
            />
          </div>
        </div>
      </Surface>

      {/* Five Daily Prayers Grid */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-xl md:text-2xl font-medium text-foreground">
            Five Daily Prayers
          </h2>
          <p className="text-xs text-muted">
            Showing categories & Rakat arrangements for the{' '}
            <button
              type="button"
              onClick={onOpenMadhhabs}
              className="font-semibold text-primary hover:underline cursor-pointer"
            >
              {madhhabInfo.name} school
            </button>
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {PRAYERS.map((prayer) => {
            const types = getPrayerTypesFor(prayer.id, prefs.madhhab, prayerConfigs);
            const isNext = nextPrayer.nextPrayerId === prayer.id;
            const isOffline = prefs.downloadedPacks.includes(prayer.id);
            const rakatSummary = types
              .map((t) => `${t.rakatCount} ${t.categoryLabel.split(' ')[0]}`)
              .join(' + ');

            return (
              <Surface
                key={prayer.id}
                className={`p-5 flex flex-col justify-between gap-4 transition-colors ${
                  isNext ? 'border-primary ring-1 ring-primary' : ''
                }`}
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-medium text-muted tabular-nums">
                        {formatHourFloat(timeByPrayer[prayer.id])}
                        {isNext && <span className="ml-1.5 text-primary font-semibold">· Next</span>}
                      </p>
                      <h3 className="text-lg font-semibold text-foreground mt-0.5">
                        {prayer.name}
                      </h3>
                    </div>
                    <span className="font-arabic text-2xl text-primary">{prayer.arabicName}</span>
                  </div>

                  <p className="text-xs text-muted leading-relaxed">{rakatSummary}</p>

                  {isOffline && (
                    <p className="inline-flex items-center gap-1 text-xs text-success font-medium">
                      <Download className="h-3 w-3" />
                      Offline ready
                    </p>
                  )}
                </div>

                <Button
                  tone={isNext ? 'primary' : 'quiet'}
                  onClick={() => onSelectPrayer(prayer.id)}
                  className="w-full justify-between"
                >
                  <span>Select Prayer</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Surface>
            );
          })}
        </div>
      </section>
    </div>
  );
}
