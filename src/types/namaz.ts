export type MadhhabId = 'hanafi' | 'shafii' | 'maliki' | 'hanbali';

export type LanguageCode = 'en' | 'hi' | 'ur';

export type VoiceGender = 'male' | 'female';

export type PlaybackSpeed = 0.25 | 0.5 | 0.75 | 1 | 1.25;

export type LearningLevel = 'beginner' | 'intermediate' | 'advanced';

export type PrayerId = 'fajr' | 'zuhr' | 'asr' | 'maghrib' | 'isha';

export type PrayerCategory =
  | 'fard'
  | 'sunnah_muakkadah'
  | 'sunnah_ghair_muakkadah'
  | 'nafl'
  | 'witr';

export type PoseId =
  | 'intention'
  | 'takbir'
  | 'qiyam'
  | 'ruku'
  | 'qawmah'
  | 'sujud'
  | 'jalsa'
  | 'tashahhud'
  | 'salam_right'
  | 'salam_left';

export type ReviewStatus = 'draft' | 'in_review' | 'approved' | 'published';

export type CalculationMethodId =
  | 'mwl'
  | 'isna'
  | 'umm_al_qura'
  | 'egyptian'
  | 'karachi'
  | 'tehran';

export interface WordToken {
  arabic: string;
  transliteration: string;
  en: string;
  hi: string;
  ur: string;
}

export interface RecitationRecord {
  id: string;
  title: string;
  category: 'opening' | 'surah' | 'ruku_sujud' | 'sitting' | 'closing';
  arabic: string;
  transliteration: string;
  translations: Record<LanguageCode, string>;
  wordByWord?: WordToken[];
  reciter: string;
  sourceReference: string;
  durationSec: number;
  version: string;
  reviewStatus: ReviewStatus;
  approvedBy: string;
  approvedDate: string;
}

export interface ActivityDefinition {
  id: string;
  name: string;
  arabicTitle: string;
  pose: PoseId;
  rulingTag: 'Fard (Obligatory)' | 'Wajib (Required)' | 'Sunnah' | 'Preparation';
  cameraHint: 'front' | 'side' | 'three_quarter';
  keyPosturePoints: string[];
  instructions: Record<LanguageCode, string>;
  madhhabNotes: Record<MadhhabId, string>;
  spokenGuidanceDurationSec: number;
}

export interface PrayerInfo {
  id: PrayerId;
  name: string;
  arabicName: string;
  timeWindowSummary: string;
  displayOrder: number;
}

export interface PrayerTypeConfig {
  id: string;
  prayerId: PrayerId;
  madhhab: MadhhabId;
  category: PrayerCategory;
  categoryLabel: string;
  rakatCount: number;
  summary: string;
  audibleRecitation: boolean;
  hasQunoot?: boolean;
  qunootPlacement?: 'before_ruku_last' | 'after_ruku_second';
  includeSurahAfterFatihaAllRakats?: boolean;
  version: string;
  reviewStatus: ReviewStatus;
  reviewer: string;
}

export interface PrayerStep {
  stepIndex: number;
  rakatNumber: number;
  totalRakats: number;
  activity: ActivityDefinition;
  recitation: RecitationRecord | null;
  transitionTakbir?: boolean;
  repeatCount?: number;
  spokenInstruction: Record<LanguageCode, string>;
  madhhabRulingNote: string;
  durationSec: number;
}

export interface CityLocation {
  id: string;
  name: string;
  country: string;
  lat: number;
  lon: number;
  timezoneOffsetHours: number;
}

export interface UserPreferences {
  hasCompletedSetup: boolean;
  languages: LanguageCode[]; // Arabic is always shown; user picks 1+ translation languages
  primaryLanguage: LanguageCode;
  madhhab: MadhhabId;
  learningLevel: LearningLevel;
  location: CityLocation;
  calculationMethod: CalculationMethodId;
  asrMethod: 'standard' | 'hanafi';
  audioVolume: number; // 0 to 1
  playbackSpeed: PlaybackSpeed;
  voiceGender: VoiceGender;
  spokenInstructionsEnabled: boolean;
  autoAdvanceEnabled: boolean;
  animationQuality: 'standard' | 'high';
  theme: 'light' | 'dark';
  arabicTextScale: 'normal' | 'large';
  notifications: Record<PrayerId, boolean>;
  downloadedPacks: PrayerId[];
}

export interface LearningProgressState {
  completedSessions: Array<{
    id: string;
    prayerId: PrayerId;
    categoryLabel: string;
    madhhab: MadhhabId;
    rakatCount: number;
    completedAt: string;
  }>;
  learnedMovements: PoseId[];
  reviewedDuas: string[];
  lastActivity: {
    prayerId: PrayerId;
    prayerTypeId: string;
    rakatNumber: number;
    stepIndex: number;
    timestamp: string;
  } | null;
}
