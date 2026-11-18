import { ACTIVITIES } from '../data/activities';
import { RECITATIONS } from '../data/recitations';
import type {
  PrayerStep,
  PrayerTypeConfig,
  RecitationRecord,
} from '../types/namaz';

/**
 * Reusable, data-driven Prayer Engine.
 * Builds an authentic, recitation-only sequence led like an Imam/Maulana:
 * the 3D character demonstrates every posture and transition visually, while
 * audio and text present strictly what is recited in prayer.
 */
export function buildPrayerSequence(
  config: PrayerTypeConfig,
  recitationsMap: Record<string, RecitationRecord> = RECITATIONS,
): PrayerStep[] {
  const steps: PrayerStep[] = [];
  const totalRakats = config.rakatCount;

  const pushStep = (
    rakatNumber: number,
    activityId: string,
    recitationId: string | null,
    options?: {
      transitionTakbir?: boolean;
      repeatCount?: number;
      overridePose?: ActivityDefinitionPose;
    },
  ) => {
    const baseActivity = ACTIVITIES[activityId];
    if (!baseActivity) return;
    const activity = options?.overridePose
      ? { ...baseActivity, pose: options.overridePose }
      : baseActivity;
    const recitation = recitationId ? (recitationsMap[recitationId] ?? null) : null;
    const repeatCount = options?.repeatCount ?? 1;
    const takbirSec = options?.transitionTakbir ? 2.2 : 0;
    const recDuration = recitation
      ? recitation.durationSec * (repeatCount > 1 ? 1.35 : 1)
      : 3;

    steps.push({
      stepIndex: steps.length,
      rakatNumber,
      totalRakats,
      activity,
      recitation,
      transitionTakbir: options?.transitionTakbir,
      repeatCount,
      spokenInstruction: activity.instructions,
      madhhabRulingNote: activity.madhhabNotes[config.madhhab],
      durationSec: Math.max(3, Math.round(recDuration + takbirSec)),
    });
  };

  for (let r = 1; r <= totalRakats; r++) {
    const isFirstRakat = r === 1;
    const isLastRakat = r === totalRakats;
    const isSecondRakatOfMulti = r === 2 && totalRakats > 2;
    const includeSurah =
      r <= 2 || Boolean(config.includeSurahAfterFatihaAllRakats);

    if (isFirstRakat) {
      pushStep(r, 'takbir_ihram', 'takbir_rec');
      if (config.madhhab !== 'maliki') {
        pushStep(r, 'qiyam_sana', 'sana');
        pushStep(r, 'qiyam_taawwudh', 'taawwudh');
        pushStep(r, 'qiyam_taawwudh', 'tasmiyah');
      } else {
        pushStep(r, 'qiyam_taawwudh', 'tasmiyah');
      }
    } else {
      pushStep(r, 'qiyam_taawwudh', 'tasmiyah', { transitionTakbir: true });
    }

    pushStep(r, 'qiyam_fatiha', 'fatiha');

    if (includeSurah) {
      const surahId = r % 2 === 1 ? 'surah_kawthar' : 'surah_ikhlas';
      pushStep(r, 'qiyam_surah', surahId);
    }

    if (
      config.hasQunoot &&
      config.qunootPlacement === 'before_ruku_last' &&
      isLastRakat &&
      config.madhhab === 'hanafi'
    ) {
      pushStep(r, 'qunoot_standing', 'dua_qunoot', { transitionTakbir: true });
    }

    pushStep(r, 'ruku', 'ruku_tasbih', { transitionTakbir: true, repeatCount: 3 });
    pushStep(r, 'qawmah', 'qawmah_tasmi');

    if (
      config.hasQunoot &&
      config.qunootPlacement === 'after_ruku_second' &&
      isLastRakat
    ) {
      pushStep(r, 'qunoot_standing', 'dua_qunoot');
    }

    pushStep(r, 'sujud_first', 'sujud_tasbih', { transitionTakbir: true, repeatCount: 3 });
    pushStep(r, 'jalsa', 'jalsa_dua', { transitionTakbir: true });
    pushStep(r, 'sujud_second', 'sujud_tasbih', { transitionTakbir: true, repeatCount: 3 });

    if (isSecondRakatOfMulti) {
      pushStep(r, 'tashahhud_first', 'attahiyyat', { transitionTakbir: true });
    }

    if (isLastRakat) {
      pushStep(r, 'tashahhud_final', 'attahiyyat', { transitionTakbir: true });
      pushStep(r, 'tashahhud_final', 'durood_ibrahim');
      pushStep(r, 'tashahhud_final', 'closing_dua');
      pushStep(r, 'salam_right', 'salam_rec');
      pushStep(r, 'salam_left', 'salam_rec');
    }
  }

  return steps;
}

type ActivityDefinitionPose = (typeof ACTIVITIES)[string]['pose'];
