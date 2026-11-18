import { useState } from 'react';
import { ArrowRight, Check, MapPin, Play } from 'lucide-react';
import { MADHHAB_META } from '../data/prayers';
import { PrayerCharacterScene } from '../three/PrayerCharacterScene';
import type {
  LanguageCode,
  LearningLevel,
  MadhhabId,
  UserPreferences,
} from '../types/namaz';
import { PRESET_CITIES } from '../utils/astronomy';
import { Button, Field, IslamicPatternAccent, SelectInput, Surface } from './ui';

interface WelcomeSetupViewProps {
  prefs: UserPreferences;
  onUpdatePrefs: (patch: Partial<UserPreferences>) => void;
  onComplete: () => void;
}

export function WelcomeSetupView({
  prefs,
  onUpdatePrefs,
  onComplete,
}: WelcomeSetupViewProps) {
  const [step, setStep] = useState<'welcome' | 'setup'>('welcome');

  const toggleLang = (code: LanguageCode) => {
    const exists = prefs.languages.includes(code);
    if (exists && prefs.languages.length === 1) return;
    const next = exists
      ? prefs.languages.filter((l) => l !== code)
      : [...prefs.languages, code];
    onUpdatePrefs({
      languages: next,
      primaryLanguage: next.includes(prefs.primaryLanguage) ? prefs.primaryLanguage : next[0],
    });
  };

  if (step === 'welcome') {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Screen 1 & Screen 2 Combined Sanctuary Welcome */}
        <Surface className="relative overflow-hidden p-6 md:p-10">
          <IslamicPatternAccent className="absolute -right-8 -top-8 h-52 w-52 text-primary" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative">
            <div className="lg:col-span-6 space-y-5">
              <div className="inline-flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-card bg-primary text-primary-foreground font-arabic text-2xl">
                  ص
                </div>
                <div>
                  <p className="font-display text-xl font-medium text-foreground">
                    Namaz Companion
                  </p>
                  <p className="text-xs font-medium text-primary">Learn. Listen. Pray.</p>
                </div>
              </div>

              <h1 className="font-display text-3xl md:text-4xl font-medium text-foreground leading-tight">
                A calm visual and audio guide for the five daily prayers.
              </h1>

              <p className="text-sm md:text-base text-muted leading-relaxed">
                Follow synchronized 3D posture demonstrations, authentic recitations, transliteration,
                and clear meanings in English, Hindi, and Urdu—tailored to your chosen Madhhab.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Button onClick={() => setStep('setup')} className="px-5">
                  <Play className="h-4 w-4" />
                  Personalize & Start Learning
                </Button>
                <Button
                  tone="quiet"
                  onClick={() => {
                    onUpdatePrefs({ hasCompletedSetup: true });
                    onComplete();
                  }}
                >
                  Skip Setup
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="lg:col-span-6">
              <PrayerCharacterScene
                pose="qiyam"
                madhhab={prefs.madhhab}
                theme={prefs.theme}
                quality={prefs.animationQuality}
                compact
                className="h-[320px] sm:h-[370px]"
                caption={`Qiyam · ${MADHHAB_META[prefs.madhhab].name} Preview`}
              />
            </div>
          </div>
        </Surface>
      </div>
    );
  }

  // Screen 3: Initial Setup
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Surface className="p-6 md:p-8 space-y-6">
        <div className="border-b border-border/70 pb-4">
          <p className="text-xs font-semibold text-primary">Screen 3 · Initial Setup</p>
          <h1 className="font-display text-2xl md:text-3xl font-medium text-foreground mt-1">
            Personalize your learning experience
          </h1>
          <p className="text-sm text-muted mt-1">
            All preferences can be changed anytime in Settings.
          </p>
        </div>

        {/* 1. Languages */}
        <div className="space-y-2.5">
          <p className="text-sm font-semibold text-foreground">
            1. Translation & Instruction Languages (Arabic script is always included)
          </p>
          <div className="flex flex-wrap gap-2">
            {(
              [
                { code: 'en', label: 'English' },
                { code: 'hi', label: 'हिन्दी (Hindi)' },
                { code: 'ur', label: 'اردو (Urdu)' },
              ] as const
            ).map((item) => {
              const selected = prefs.languages.includes(item.code);
              return (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => toggleLang(item.code)}
                  className={`inline-flex min-h-11 items-center gap-2 rounded-control border px-4 text-sm font-medium cursor-pointer ${
                    selected
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-surface text-foreground border-border'
                  }`}
                >
                  {selected && <Check className="h-4 w-4" />}
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Madhhab */}
        <div className="space-y-2.5">
          <p className="text-sm font-semibold text-foreground">
            2. School of Jurisprudence (Madhhab)
          </p>
          <p className="text-xs text-muted">
            Your selection loads reviewed prayer sequences, hand placements, and Witr/Asr rulings for that school. You can switch schools anytime.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(['hanafi', 'shafii', 'maliki', 'hanbali'] as MadhhabId[]).map((m) => {
              const meta = MADHHAB_META[m];
              const active = prefs.madhhab === m;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => onUpdatePrefs({ madhhab: m })}
                  className={`text-left rounded-control border p-3.5 transition-colors cursor-pointer ${
                    active
                      ? 'bg-surface-alt border-primary ring-1 ring-primary'
                      : 'bg-surface border-border hover:bg-surface-alt'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-foreground">{meta.name}</span>
                    <span className="font-arabic text-base text-primary">{meta.arabicName}</span>
                  </div>
                  <p className="text-xs text-muted mt-1">{meta.qiyamHands}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Learning Level & 4. City */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="3. Learning Level" id="setup-level">
            <SelectInput
              id="setup-level"
              value={prefs.learningLevel}
              onChange={(e) =>
                onUpdatePrefs({ learningLevel: e.target.value as LearningLevel })
              }
            >
              <option value="beginner">Beginner — Step-by-step from basics</option>
              <option value="intermediate">Intermediate — Strengthen recitations</option>
              <option value="advanced">Advanced — Madhhab variations & Duas</option>
            </SelectInput>
          </Field>

          <Field
            label="4. City (for Prayer Timings & Qibla)"
            id="setup-city"
            hint="Location is used only for prayer times and Qibla direction."
          >
            <div className="flex items-center gap-2">
              <SelectInput
                id="setup-city"
                value={prefs.location.id}
                onChange={(e) => {
                  const city = PRESET_CITIES.find((c) => c.id === e.target.value);
                  if (city) onUpdatePrefs({ location: city });
                }}
              >
                {PRESET_CITIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}, {c.country}
                  </option>
                ))}
              </SelectInput>
              <Button
                tone="quiet"
                title="Detect GPS location"
                onClick={() => {
                  navigator.geolocation?.getCurrentPosition((pos) => {
                    onUpdatePrefs({
                      location: {
                        id: 'custom_gps',
                        name: 'Current Location',
                        country: `${pos.coords.latitude.toFixed(2)}°, ${pos.coords.longitude.toFixed(2)}°`,
                        lat: pos.coords.latitude,
                        lon: pos.coords.longitude,
                        timezoneOffsetHours: -new Date().getTimezoneOffset() / 60,
                      },
                    });
                  });
                }}
                className="px-3"
              >
                <MapPin className="h-4 w-4" />
              </Button>
            </div>
          </Field>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border/70 pt-5">
          <Button tone="quiet" onClick={() => setStep('welcome')}>
            Back
          </Button>
          <Button
            onClick={() => {
              onUpdatePrefs({ hasCompletedSetup: true });
              onComplete();
            }}
            className="px-6"
          >
            Finish & Open Dashboard
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </Surface>
    </div>
  );
}
