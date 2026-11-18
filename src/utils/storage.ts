import { PRESET_CITIES } from './astronomy';
import type {
  LearningProgressState,
  PrayerTypeConfig,
  RecitationRecord,
  UserPreferences,
} from '../types/namaz';

const PREFS_KEY = 'namaz_companion_prefs_v1';
const PROGRESS_KEY = 'namaz_companion_progress_v1';
const CUSTOM_RECITATIONS_KEY = 'namaz_companion_custom_recitations_v1';
const CUSTOM_PRAYER_TYPES_KEY = 'namaz_companion_custom_prayer_types_v1';

export const DEFAULT_PREFERENCES: UserPreferences = {
  hasCompletedSetup: false,
  languages: ['en', 'hi', 'ur'],
  primaryLanguage: 'en',
  madhhab: 'hanafi',
  learningLevel: 'beginner',
  location: PRESET_CITIES[0], // New Delhi
  calculationMethod: 'karachi',
  asrMethod: 'hanafi',
  audioVolume: 0.85,
  playbackSpeed: 1,
  voiceGender: 'male',
  spokenInstructionsEnabled: false,
  autoAdvanceEnabled: true,
  animationQuality: 'high',
  theme: 'light',
  arabicTextScale: 'normal',
  notifications: {
    fajr: true,
    zuhr: true,
    asr: true,
    maghrib: true,
    isha: true,
  },
  downloadedPacks: ['fajr'],
};

export const DEFAULT_PROGRESS: LearningProgressState = {
  completedSessions: [
    {
      id: 'seed_fajr_sunnah',
      prayerId: 'fajr',
      categoryLabel: 'Sunnah Muakkadah (Before Fard)',
      madhhab: 'hanafi',
      rakatCount: 2,
      completedAt: '2026-11-16T05:45:00.000Z',
    },
  ],
  learnedMovements: ['takbir', 'qiyam', 'ruku'],
  reviewedDuas: ['sana', 'fatiha', 'ruku_tasbih'],
  lastActivity: {
    prayerId: 'fajr',
    prayerTypeId: 'hanafi_fajr_fard',
    rakatNumber: 1,
    stepIndex: 0,
    timestamp: '2026-11-17T06:10:00.000Z',
  },
};

const VALID_SPEEDS = [0.25, 0.5, 0.75, 1, 1.25] as const;

export function loadPreferences(): UserPreferences {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    const parsed = JSON.parse(raw) as Partial<UserPreferences>;
    return {
      ...DEFAULT_PREFERENCES,
      ...parsed,
      playbackSpeed: VALID_SPEEDS.includes(parsed.playbackSpeed as (typeof VALID_SPEEDS)[number])
        ? (parsed.playbackSpeed as UserPreferences['playbackSpeed'])
        : DEFAULT_PREFERENCES.playbackSpeed,
      voiceGender: parsed.voiceGender === 'female' ? 'female' : 'male',
      notifications: {
        ...DEFAULT_PREFERENCES.notifications,
        ...(parsed.notifications ?? {}),
      },
      location: parsed.location?.lat != null ? parsed.location : DEFAULT_PREFERENCES.location,
      languages:
        Array.isArray(parsed.languages) && parsed.languages.length > 0
          ? parsed.languages
          : DEFAULT_PREFERENCES.languages,
      downloadedPacks: Array.isArray(parsed.downloadedPacks)
        ? parsed.downloadedPacks
        : DEFAULT_PREFERENCES.downloadedPacks,
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function savePreferences(prefs: UserPreferences): void {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // Ignore storage quota errors
  }
}

export function loadProgress(): LearningProgressState {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return DEFAULT_PROGRESS;
    const parsed = JSON.parse(raw) as Partial<LearningProgressState>;
    return {
      completedSessions: Array.isArray(parsed.completedSessions)
        ? parsed.completedSessions
        : DEFAULT_PROGRESS.completedSessions,
      learnedMovements: Array.isArray(parsed.learnedMovements)
        ? parsed.learnedMovements
        : DEFAULT_PROGRESS.learnedMovements,
      reviewedDuas: Array.isArray(parsed.reviewedDuas)
        ? parsed.reviewedDuas
        : DEFAULT_PROGRESS.reviewedDuas,
      lastActivity: parsed.lastActivity ?? DEFAULT_PROGRESS.lastActivity,
    };
  } catch {
    return DEFAULT_PROGRESS;
  }
}

export function saveProgress(progress: LearningProgressState): void {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  } catch {
    // Ignore storage quota errors
  }
}

export function loadCustomRecitations(): Record<string, RecitationRecord> | null {
  try {
    const raw = localStorage.getItem(CUSTOM_RECITATIONS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Record<string, RecitationRecord>;
  } catch {
    return null;
  }
}

export function saveCustomRecitations(data: Record<string, RecitationRecord>): void {
  try {
    localStorage.setItem(CUSTOM_RECITATIONS_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage quota errors
  }
}

export function loadCustomPrayerTypes(): PrayerTypeConfig[] | null {
  try {
    const raw = localStorage.getItem(CUSTOM_PRAYER_TYPES_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as PrayerTypeConfig[]) : null;
  } catch {
    return null;
  }
}

export function saveCustomPrayerTypes(data: PrayerTypeConfig[]): void {
  try {
    localStorage.setItem(CUSTOM_PRAYER_TYPES_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage quota errors
  }
}
