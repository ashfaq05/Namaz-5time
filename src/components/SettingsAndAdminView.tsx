import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  CheckCircle2,
  Clock,
  Cloud,
  Download,
  FileCheck2,
  RotateCcw,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { CHARACTER_MODELS } from '../data/models';
import { MADHHAB_META, PRAYERS } from '../data/prayers';
import type {
  CalculationMethodId,
  LanguageCode,
  LearningLevel,
  MadhhabId,
  PrayerId,
  PrayerTypeConfig,
  RecitationRecord,
  ReviewStatus,
  UserPreferences,
  VoiceGender,
} from '../types/namaz';
import {
  CALCULATION_METHODS,
  PRESET_CITIES,
  TIMEZONE_OPTIONS,
  formatCurrentTime,
} from '../utils/astronomy';
import { GoogleLogoIcon } from './AuthAccountBadge';
import { Button, Field, SelectInput, Surface, TextInput, ToggleSwitch } from './ui';

interface SettingsAndAdminViewProps {
  prefs: UserPreferences;
  recitationsMap: Record<string, RecitationRecord>;
  prayerConfigs: PrayerTypeConfig[];
  initialTab?: 'settings' | 'admin';
  authUser: User | null;
  signingIn: boolean;
  onSignIn: () => void;
  onSignOut: () => void;
  onUpdatePrefs: (patch: Partial<UserPreferences>) => void;
  onUpdateRecitation: (id: string, patch: Partial<RecitationRecord>) => void;
  onUpdatePrayerConfig: (id: string, patch: Partial<PrayerTypeConfig>) => void;
  onResetAdminContent: () => void;
  onOpenSetupWizard: () => void;
}

const OFFLINE_PACK_SIZE_MB: Record<PrayerId, number> = {
  fajr: 14.2,
  zuhr: 21.8,
  asr: 18.4,
  maghrib: 17.6,
  isha: 26.5,
};

export function SettingsAndAdminView({
  prefs,
  recitationsMap,
  prayerConfigs,
  initialTab = 'settings',
  authUser,
  signingIn,
  onSignIn,
  onSignOut,
  onUpdatePrefs,
  onUpdateRecitation,
  onUpdatePrayerConfig,
  onResetAdminContent,
  onOpenSetupWizard,
}: SettingsAndAdminViewProps) {
  const [tab, setTab] = useState<'settings' | 'admin'>(initialTab);
  const [editingRecId, setEditingRecId] = useState<string>('fatiha');
  const [adminStatusMsg, setAdminStatusMsg] = useState<string>('');
  const [adminFilterMadhhab, setAdminFilterMadhhab] = useState<MadhhabId>(prefs.madhhab);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const toggleLanguage = (code: LanguageCode) => {
    const exists = prefs.languages.includes(code);
    if (exists && prefs.languages.length === 1) return; // Keep at least 1 translation language
    const next = exists
      ? prefs.languages.filter((l) => l !== code)
      : [...prefs.languages, code];
    onUpdatePrefs({
      languages: next,
      primaryLanguage: next.includes(prefs.primaryLanguage) ? prefs.primaryLanguage : next[0],
    });
  };

  const toggleDownloadPack = (id: PrayerId) => {
    const has = prefs.downloadedPacks.includes(id);
    const next = has
      ? prefs.downloadedPacks.filter((p) => p !== id)
      : [...prefs.downloadedPacks, id];
    onUpdatePrefs({ downloadedPacks: next });
  };

  const totalDownloadedMb = prefs.downloadedPacks.reduce(
    (sum, p) => sum + OFFLINE_PACK_SIZE_MB[p],
    0,
  );

  const activeRec = recitationsMap[editingRecId] ?? Object.values(recitationsMap)[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-medium text-foreground">
            {tab === 'settings' ? 'Settings & Offline Access' : 'Content Review & Admin Studio'}
          </h1>
          <p className="text-sm text-muted mt-1">
            {tab === 'settings'
              ? 'Manage languages, Madhhab, playback, display theme, offline packs, and content sources.'
              : 'Review Arabic text, translations, source references, version history, and publish status.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            tone={tab === 'settings' ? 'primary' : 'quiet'}
            onClick={() => setTab('settings')}
          >
            App Settings
          </Button>
          <Button
            tone={tab === 'admin' ? 'primary' : 'quiet'}
            onClick={() => setTab('admin')}
          >
            <FileCheck2 className="h-4 w-4" />
            Content & Review Admin
          </Button>
        </div>
      </div>

      {tab === 'settings' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Core Preferences */}
          <Surface className="lg:col-span-7 p-6 space-y-6">
            {/* Google Account & Cloud Sync */}
            <div className="rounded-control border border-border/80 bg-surface-alt p-4 flex flex-wrap items-center justify-between gap-3">
              {authUser ? (
                <>
                  <div className="flex items-center gap-3 min-w-0">
                    {authUser.photoURL ? (
                      <img
                        src={authUser.photoURL}
                        alt={authUser.displayName || 'User'}
                        referrerPolicy="no-referrer"
                        className="h-9 w-9 rounded-full object-cover border border-border shrink-0"
                      />
                    ) : (
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold shrink-0">
                        {(authUser.displayName || authUser.email || 'U').slice(0, 1).toUpperCase()}
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {authUser.displayName || 'Signed-in User'}
                      </p>
                      <p className="text-xs text-muted flex items-center gap-1 truncate">
                        <Cloud className="h-3 w-3 text-success shrink-0" />
                        <span>{authUser.email} · Synced</span>
                      </p>
                    </div>
                  </div>
                  <Button tone="quiet" onClick={onSignOut} className="min-h-9 px-3 text-xs">
                    Sign out
                  </Button>
                </>
              ) : (
                <>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">Google Account Sync</p>
                    <p className="text-xs text-muted">
                      Sign in to save your prayer logs and preferences across sessions.
                    </p>
                  </div>
                  <Button onClick={onSignIn} disabled={signingIn} className="min-h-9 px-3 text-xs">
                    <GoogleLogoIcon className="h-3.5 w-3.5" />
                    {signingIn ? 'Signing in…' : 'Sign in with Google'}
                  </Button>
                </>
              )}
            </div>

            <div className="flex items-center justify-between border-b border-border/70 pb-3">
              <h2 className="text-lg font-semibold text-foreground">
                Jurisprudence, Languages & Level
              </h2>
              <Button tone="quiet" onClick={onOpenSetupWizard} className="min-h-9 px-3 text-xs">
                Re-run Welcome Setup
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Selected Madhhab" id="set-madhhab">
                <SelectInput
                  id="set-madhhab"
                  value={prefs.madhhab}
                  onChange={(e) => onUpdatePrefs({ madhhab: e.target.value as MadhhabId })}
                >
                  {(['hanafi', 'shafii', 'maliki', 'hanbali'] as MadhhabId[]).map((m) => (
                    <option key={m} value={m}>
                      {MADHHAB_META[m].name} ({MADHHAB_META[m].arabicName})
                    </option>
                  ))}
                </SelectInput>
              </Field>

              <Field label="Learning Level" id="set-level">
                <SelectInput
                  id="set-level"
                  value={prefs.learningLevel}
                  onChange={(e) =>
                    onUpdatePrefs({ learningLevel: e.target.value as LearningLevel })
                  }
                >
                  <option value="beginner">Beginner (Full posture & step notes)</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced (Madhhab nuances)</option>
                </SelectInput>
              </Field>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">
                Translation Languages (Arabic source is always displayed)
              </p>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    { code: 'en', label: 'English' },
                    { code: 'hi', label: 'हिन्दी (Hindi)' },
                    { code: 'ur', label: 'اردو (Urdu)' },
                  ] as const
                ).map((item) => {
                  const active = prefs.languages.includes(item.code);
                  return (
                    <button
                      key={item.code}
                      type="button"
                      onClick={() => toggleLanguage(item.code)}
                      className={`min-h-10 rounded-control border px-3.5 text-xs font-medium cursor-pointer ${
                        active
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-surface text-foreground border-border'
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Primary Translation Language" id="set-primary-lang">
                <SelectInput
                  id="set-primary-lang"
                  value={prefs.primaryLanguage}
                  onChange={(e) =>
                    onUpdatePrefs({ primaryLanguage: e.target.value as LanguageCode })
                  }
                >
                  <option value="en">English</option>
                  <option value="hi">Hindi (हिन्दी)</option>
                  <option value="ur">Urdu (اردو)</option>
                </SelectInput>
              </Field>

              <Field label="City Location" id="set-city">
                <SelectInput
                  id="set-city"
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
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
              <Field
                label="Timezone (Local Clock & Prayer Times)"
                id="set-timezone"
                hint="Pick IST (India Standard Time) or any region if your browser clock is off."
              >
                <SelectInput
                  id="set-timezone"
                  value={prefs.timeZone}
                  onChange={(e) => onUpdatePrefs({ timeZone: e.target.value })}
                >
                  {TIMEZONE_OPTIONS.map((tz) => (
                    <option key={tz.id} value={tz.id}>
                      {tz.label}
                    </option>
                  ))}
                </SelectInput>
              </Field>

              <div className="rounded-control border border-border/80 bg-surface-alt px-3.5 py-2.5 flex items-center justify-between gap-2 min-h-11">
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted">
                  <Clock className="h-3.5 w-3.5 text-primary" />
                  Current Time
                </span>
                <span className="text-sm font-semibold text-foreground tabular-nums">
                  {formatCurrentTime(now, prefs.timeZone)}
                </span>
              </div>
            </div>

            <div className="border-t border-border/70 pt-5 space-y-4">
              <h3 className="text-base font-semibold text-foreground">
                Audio, Animation & Accessibility
              </h3>

              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">3D Character Model</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {CHARACTER_MODELS.map((model) => {
                    const selected = prefs.characterModel === model.id;
                    return (
                      <button
                        key={model.id}
                        type="button"
                        onClick={() => onUpdatePrefs({ characterModel: model.id })}
                        aria-pressed={selected}
                        className={`flex items-center gap-3 rounded-control border p-2.5 text-left transition-colors cursor-pointer ${
                          selected
                            ? 'border-primary bg-surface-alt ring-1 ring-primary'
                            : 'border-border bg-surface hover:bg-surface-alt/60'
                        }`}
                      >
                        {model.previewImage ? (
                          <img
                            src={model.previewImage}
                            alt={model.name}
                            className="h-12 w-12 shrink-0 rounded-control object-cover bg-surface-alt"
                          />
                        ) : (
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-control bg-primary/15 text-xs font-semibold text-primary">
                            3D
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate">
                            {model.name}
                          </p>
                          <p className="text-[11px] text-muted line-clamp-2 mt-0.5">
                            {model.subtitle}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field label="Display Theme" id="set-theme">
                  <SelectInput
                    id="set-theme"
                    value={prefs.theme}
                    onChange={(e) =>
                      onUpdatePrefs({ theme: e.target.value as 'light' | 'dark' })
                    }
                  >
                    <option value="light">Warm Parchment (Light)</option>
                    <option value="dark">Evening Sanctuary (Dark)</option>
                  </SelectInput>
                </Field>

                <Field label="3D Animation Quality" id="set-quality">
                  <SelectInput
                    id="set-quality"
                    value={prefs.animationQuality}
                    onChange={(e) =>
                      onUpdatePrefs({
                        animationQuality: e.target.value as 'standard' | 'high',
                      })
                    }
                  >
                    <option value="high">High (Anti-aliased)</option>
                    <option value="standard">Battery / Mid-Range Friendly</option>
                  </SelectInput>
                </Field>

                <Field label="Arabic Text Size" id="set-arabic-scale">
                  <SelectInput
                    id="set-arabic-scale"
                    value={prefs.arabicTextScale}
                    onChange={(e) =>
                      onUpdatePrefs({
                        arabicTextScale: e.target.value as 'normal' | 'large',
                      })
                    }
                  >
                    <option value="normal">Standard Readable</option>
                    <option value="large">Large Accessibility Scale</option>
                  </SelectInput>
                </Field>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field label="Prayer Calculation Method" id="set-calc-method">
                  <SelectInput
                    id="set-calc-method"
                    value={prefs.calculationMethod}
                    onChange={(e) =>
                      onUpdatePrefs({
                        calculationMethod: e.target.value as CalculationMethodId,
                      })
                    }
                  >
                    {Object.values(CALCULATION_METHODS).map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </SelectInput>
                </Field>

                <Field label="Recitation Voice" id="set-voice-gender">
                  <SelectInput
                    id="set-voice-gender"
                    value={prefs.voiceGender}
                    onChange={(e) =>
                      onUpdatePrefs({
                        voiceGender: e.target.value as VoiceGender,
                      })
                    }
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </SelectInput>
                </Field>

                <Field label={`Audio Volume (${Math.round(prefs.audioVolume * 100)}%)`} id="set-vol">
                  <input
                    id="set-vol"
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={prefs.audioVolume}
                    onChange={(e) => onUpdatePrefs({ audioVolume: Number(e.target.value) })}
                    className="mt-3 w-full accent-primary cursor-pointer"
                  />
                </Field>
              </div>

              <ToggleSwitch
                id="set-auto-advance"
                checked={prefs.autoAdvanceEnabled}
                onChange={(v) => onUpdatePrefs({ autoAdvanceEnabled: v })}
                label="Auto-Advance Guided Steps"
                description="Automatically continue to the next Rakat activity when audio completes"
              />
            </div>
          </Surface>

          {/* Offline Downloads & Content Integrity */}
          <div className="lg:col-span-5 space-y-5">
            <Surface className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Offline Lesson Packs</h2>
                  <p className="text-xs text-muted mt-0.5">
                    Cached locally: {totalDownloadedMb.toFixed(1)} MB across{' '}
                    {prefs.downloadedPacks.length} prayer{prefs.downloadedPacks.length === 1 ? '' : 's'}
                  </p>
                </div>
              </div>

              <div className="divide-y divide-border/70">
                {PRAYERS.map((p) => {
                  const downloaded = prefs.downloadedPacks.includes(p.id);
                  return (
                    <div key={p.id} className="py-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {p.name} Lesson Pack
                        </p>
                        <p className="text-xs text-muted">
                          Audio, sequences & 3D poses · {OFFLINE_PACK_SIZE_MB[p.id]} MB
                        </p>
                      </div>
                      <Button
                        tone={downloaded ? 'quiet' : 'primary'}
                        onClick={() => toggleDownloadPack(p.id)}
                        className="min-h-9 px-3 text-xs"
                      >
                        {downloaded ? (
                          <>
                            <Trash2 className="h-3.5 w-3.5" />
                            Remove
                          </>
                        ) : (
                          <>
                            <Download className="h-3.5 w-3.5" />
                            Download
                          </>
                        )}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </Surface>

            <Surface className="p-6 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Content Integrity & Privacy
              </div>
              <p className="text-xs text-muted leading-relaxed">
                Quranic recitations and prayer sequences are strictly pre-reviewed scholarly records—never
                dynamically generated by generative AI. No advertisements or promotional overlays
                appear during prayer learning sessions.
              </p>
              <p className="text-xs text-muted leading-relaxed">
                Your preferences, offline packs, and learning progress stay stored locally on your
                device. Location coordinates are used exclusively for prayer timing and Qibla
                bearing computation.
              </p>
            </Surface>
          </div>
        </div>
      ) : (
        /* Section 13: Lightweight Admin & Content Management Interface */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <Surface className="lg:col-span-6 p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 pb-3">
              <div>
                <h2 className="text-base font-semibold text-foreground">
                  Recitations & Translations Manager
                </h2>
                <p className="text-xs text-muted">
                  Inspect, update, and manage review workflow (Draft → Review → Approved → Published)
                </p>
              </div>
              <Button tone="quiet" onClick={onResetAdminContent} className="min-h-9 px-3 text-xs">
                <RotateCcw className="h-3.5 w-3.5" />
                Rollback Defaults
              </Button>
            </div>

            <Field label="Select Recitation Record" id="admin-rec-select">
              <SelectInput
                id="admin-rec-select"
                value={activeRec.id}
                onChange={(e) => setEditingRecId(e.target.value)}
              >
                {Object.values(recitationsMap).map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title} ({r.reviewStatus} · v{r.version})
                  </option>
                ))}
              </SelectInput>
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Review Status" id="admin-status">
                <SelectInput
                  id="admin-status"
                  value={activeRec.reviewStatus}
                  onChange={(e) => {
                    onUpdateRecitation(activeRec.id, {
                      reviewStatus: e.target.value as ReviewStatus,
                    });
                    setAdminStatusMsg(`Updated ${activeRec.title} status to ${e.target.value}.`);
                  }}
                >
                  <option value="draft">Draft</option>
                  <option value="in_review">In Review</option>
                  <option value="approved">Approved</option>
                  <option value="published">Published</option>
                </SelectInput>
              </Field>

              <Field label="Version Tag" id="admin-ver">
                <TextInput
                  id="admin-ver"
                  value={activeRec.version}
                  onChange={(e) => onUpdateRecitation(activeRec.id, { version: e.target.value })}
                />
              </Field>
            </div>

            <Field label="Reviewer / Approver Identity" id="admin-reviewer">
              <TextInput
                id="admin-reviewer"
                value={activeRec.approvedBy}
                onChange={(e) => onUpdateRecitation(activeRec.id, { approvedBy: e.target.value })}
              />
            </Field>

            <Field label="Source Reference" id="admin-source">
              <TextInput
                id="admin-source"
                value={activeRec.sourceReference}
                onChange={(e) =>
                  onUpdateRecitation(activeRec.id, { sourceReference: e.target.value })
                }
              />
            </Field>

            <Field label="English Translation" id="admin-en">
              <textarea
                id="admin-en"
                rows={3}
                value={activeRec.translations.en}
                onChange={(e) =>
                  onUpdateRecitation(activeRec.id, {
                    translations: { ...activeRec.translations, en: e.target.value },
                  })
                }
                className="w-full rounded-control border border-border bg-surface p-3 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-primary"
              />
            </Field>

            {adminStatusMsg && (
              <p role="status" className="text-xs font-medium text-success flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" />
                {adminStatusMsg}
              </p>
            )}
          </Surface>

          <Surface className="lg:col-span-6 p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 pb-3">
              <div>
                <h2 className="text-base font-semibold text-foreground">
                  Madhhab Prayer Configurations
                </h2>
                <p className="text-xs text-muted">
                  Separate versioned prayer types per school of jurisprudence
                </p>
              </div>
              <SelectInput
                aria-label="Filter by Madhhab"
                value={adminFilterMadhhab}
                onChange={(e) => setAdminFilterMadhhab(e.target.value as MadhhabId)}
                className="w-auto min-w-[140px]"
              >
                <option value="hanafi">Hanafi</option>
                <option value="shafii">Shafi‘i</option>
                <option value="maliki">Maliki</option>
                <option value="hanbali">Hanbali</option>
              </SelectInput>
            </div>

            <div className="divide-y divide-border/70">
              {prayerConfigs
                .filter((c) => c.madhhab === adminFilterMadhhab)
                .map((cfg) => (
                  <div key={cfg.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">
                        {cfg.prayerId.toUpperCase()} · {cfg.categoryLabel}
                      </p>
                      <p className="text-xs text-muted">
                        {cfg.rakatCount} Rakat · v{cfg.version} · {cfg.reviewer}
                      </p>
                    </div>
                    <SelectInput
                      aria-label={`Publish status for ${cfg.id}`}
                      value={cfg.reviewStatus}
                      onChange={(e) => {
                        onUpdatePrayerConfig(cfg.id, {
                          reviewStatus: e.target.value as ReviewStatus,
                        });
                        setAdminStatusMsg(
                          `Updated ${cfg.prayerId} ${cfg.categoryLabel} to ${e.target.value}.`,
                        );
                      }}
                      className="w-auto min-h-9 py-1 text-xs"
                    >
                      <option value="draft">Draft</option>
                      <option value="in_review">In Review</option>
                      <option value="approved">Approved</option>
                      <option value="published">Published</option>
                    </SelectInput>
                  </div>
                ))}
            </div>
          </Surface>
        </div>
      )}
    </div>
  );
}
