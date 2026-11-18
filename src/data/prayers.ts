import type { MadhhabId, PrayerId, PrayerInfo, PrayerTypeConfig } from '../types/namaz';

export const PRAYERS: PrayerInfo[] = [
  {
    id: 'fajr',
    name: 'Fajr',
    arabicName: 'الفجر',
    timeWindowSummary: 'Dawn until sunrise',
    displayOrder: 1,
  },
  {
    id: 'zuhr',
    name: 'Zuhr',
    arabicName: 'الظهر',
    timeWindowSummary: 'Midday after zenith until Asr',
    displayOrder: 2,
  },
  {
    id: 'asr',
    name: 'Asr',
    arabicName: 'العصر',
    timeWindowSummary: 'Mid-afternoon until sunset',
    displayOrder: 3,
  },
  {
    id: 'maghrib',
    name: 'Maghrib',
    arabicName: 'المغرب',
    timeWindowSummary: 'Just after sunset until twilight',
    displayOrder: 4,
  },
  {
    id: 'isha',
    name: 'Isha',
    arabicName: 'العشاء',
    timeWindowSummary: 'Nightfall until dawn',
    displayOrder: 5,
  },
];

export const MADHHAB_META: Record<
  MadhhabId,
  {
    id: MadhhabId;
    name: string;
    arabicName: string;
    founder: string;
    overview: string;
    qiyamHands: string;
    rafAlYadayn: string;
    fatihaBehindImam: string;
    sittingPosture: string;
    asrTiming: string;
    witrStructure: string;
    qunootPractice: string;
  }
> = {
  hanafi: {
    id: 'hanafi',
    name: 'Hanafi',
    arabicName: 'الحنفي',
    founder: 'Imam Abu Hanifah (d. 150 AH)',
    overview: 'Widely practiced across South Asia, Turkey, Central Asia, and the Levant.',
    qiyamHands: 'Right hand grasps left wrist below the navel (men); on chest (women).',
    rafAlYadayn: 'Hands raised only at the opening Takbir (and before Witr Qunoot).',
    fatihaBehindImam: 'Follower listens silently while the Imam recites.',
    sittingPosture: 'Iftirash (sitting on flat left foot, right foot upright) in all sittings.',
    asrTiming: 'Begins when an object’s shadow reaches 2× its height plus midday shadow.',
    witrStructure: '3 connected Rakats (Wajib) with one closing Salam.',
    qunootPractice: 'Recited silently in 3rd Rakat of Witr before bowing into Ruku.',
  },
  shafii: {
    id: 'shafii',
    name: 'Shafi‘i',
    arabicName: 'الشافعي',
    founder: 'Imam al-Shafi‘i (d. 204 AH)',
    overview: 'Widely practiced across Southeast Asia, East Africa, Yemen, and Egypt.',
    qiyamHands: 'Hands folded above the navel below the chest.',
    rafAlYadayn: 'Raised at opening Takbir, before Ruku, rising from Ruku, and rising from 2nd Rakat.',
    fatihaBehindImam: 'Reciting Al-Fatiha is required for the follower in every Rakat.',
    sittingPosture: 'Iftirash in mid-prayer sittings; Tawarruk in the final sitting.',
    asrTiming: 'Begins when an object’s shadow equals 1× its height plus midday shadow.',
    witrStructure: 'Odd number of Rakats (commonly 2 + 1 with separate Salams).',
    qunootPractice: 'Recommended in Fajr after Ruku in Rakat 2, and in Witr during late Ramadan.',
  },
  maliki: {
    id: 'maliki',
    name: 'Maliki',
    arabicName: 'المالكي',
    founder: 'Imam Malik ibn Anas (d. 179 AH)',
    overview: 'Widely practiced across North Africa, West Africa, and parts of the Gulf.',
    qiyamHands: 'Mashhur practice keeps arms gently at the sides (Sadl); clasping is also valid.',
    rafAlYadayn: 'Raised at the opening Takbir to shoulder level.',
    fatihaBehindImam: 'Recited in silent prayers; follower listens in audible prayers.',
    sittingPosture: 'Tawarruk sitting posture used in sittings.',
    asrTiming: 'Begins when an object’s shadow equals 1× its height plus midday shadow.',
    witrStructure: '2 Rakats Shafa‘ followed by 1 separate Rakat Witr.',
    qunootPractice: 'Recited silently before Ruku in the 2nd Rakat of Fajr.',
  },
  hanbali: {
    id: 'hanbali',
    name: 'Hanbali',
    arabicName: 'الحنبلي',
    founder: 'Imam Ahmad ibn Hanbal (d. 241 AH)',
    overview: 'Practiced prominently in the Arabian Peninsula and scholarly centers.',
    qiyamHands: 'Hands folded above the navel / lower chest.',
    rafAlYadayn: 'Raised at opening Takbir, before Ruku, rising from Ruku, and rising from 2nd Rakat.',
    fatihaBehindImam: 'Recited in silent prayers and during Imam’s pauses in audible prayers.',
    sittingPosture: 'Iftirash in 2-Rakat prayers; Tawarruk in final sitting of 3- and 4-Rakat prayers.',
    asrTiming: 'Begins when an object’s shadow equals 1× its height plus midday shadow.',
    witrStructure: 'Odd number (commonly 2 + 1 or 3 with single/split Salam).',
    qunootPractice: 'Recited in Witr after rising from Ruku in the final Rakat.',
  },
};

function buildMadhhabConfigs(madhhab: MadhhabId): PrayerTypeConfig[] {
  const reviewer =
    madhhab === 'hanafi'
      ? 'Mufti Tariq Mahmood (Hanafi Review Board)'
      : madhhab === 'shafii'
        ? 'Shaykh Ahmad Al-Khatib (Shafi‘i Review Board)'
        : madhhab === 'maliki'
          ? 'Dr. Yusuf Al-Fasi (Maliki Review Board)'
          : 'Shaykh Ibrahim Al-Najdi (Hanbali Review Board)';

  const witrSummary =
    madhhab === 'hanafi'
      ? '3 connected Rakats Wajib with Takbir and Dua-e-Qunoot before Ruku in Rakat 3.'
      : 'Single concluding Rakat (after 2 Shafa‘ Rakats) with Qunoot after Ruku where applicable.';

  const witrRakat = madhhab === 'hanafi' ? 3 : 1;

  const ishaCats: PrayerTypeConfig[] = [
    ...(madhhab === 'hanafi'
      ? [
          {
            id: `${madhhab}_isha_sunnah_gm_1`,
            prayerId: 'isha' as PrayerId,
            madhhab,
            category: 'sunnah_ghair_muakkadah' as const,
            categoryLabel: 'Sunnah Ghair Muakkadah (Before Fard)',
            rakatCount: 4,
            summary: '4 non-emphasized Sunnah Rakats prayed before Isha Fard.',
            audibleRecitation: false,
            includeSurahAfterFatihaAllRakats: true,
            version: '1.0.0',
            reviewStatus: 'published' as const,
            reviewer,
          },
        ]
      : []),
    {
      id: `${madhhab}_isha_fard`,
      prayerId: 'isha',
      madhhab,
      category: 'fard',
      categoryLabel: 'Fard (Obligatory)',
      rakatCount: 4,
      summary: '4 obligatory Rakats; first 2 Rakats recited aloud when leading or learning.',
      audibleRecitation: true,
      version: '1.0.2',
      reviewStatus: 'published',
      reviewer,
    },
    {
      id: `${madhhab}_isha_sunnah_m`,
      prayerId: 'isha',
      madhhab,
      category: 'sunnah_muakkadah',
      categoryLabel: 'Sunnah Muakkadah (After Fard)',
      rakatCount: 2,
      summary: '2 emphasized Sunnah Rakats prayed immediately after Isha Fard.',
      audibleRecitation: false,
      includeSurahAfterFatihaAllRakats: true,
      version: '1.0.1',
      reviewStatus: 'published',
      reviewer,
    },
    {
      id: `${madhhab}_isha_nafl_1`,
      prayerId: 'isha',
      madhhab,
      category: 'nafl',
      categoryLabel: 'Nafl (Voluntary)',
      rakatCount: 2,
      summary: '2 voluntary Rakats offering additional quiet reflection.',
      audibleRecitation: false,
      includeSurahAfterFatihaAllRakats: true,
      version: '1.0.0',
      reviewStatus: 'published',
      reviewer,
    },
    {
      id: `${madhhab}_isha_witr`,
      prayerId: 'isha',
      madhhab,
      category: 'witr',
      categoryLabel: 'Witr',
      rakatCount: witrRakat,
      summary: witrSummary,
      audibleRecitation: false,
      hasQunoot: true,
      qunootPlacement: madhhab === 'hanafi' ? 'before_ruku_last' : 'after_ruku_second',
      includeSurahAfterFatihaAllRakats: true,
      version: '1.0.2',
      reviewStatus: 'published',
      reviewer,
    },
  ];

  return [
    // FAJR
    {
      id: `${madhhab}_fajr_sunnah`,
      prayerId: 'fajr',
      madhhab,
      category: 'sunnah_muakkadah',
      categoryLabel: 'Sunnah Muakkadah (Before Fard)',
      rakatCount: 2,
      summary: '2 strongly emphasized Sunnah Rakats prayed before Fajr Fard.',
      audibleRecitation: false,
      includeSurahAfterFatihaAllRakats: true,
      version: '1.1.0',
      reviewStatus: 'published',
      reviewer,
    },
    {
      id: `${madhhab}_fajr_fard`,
      prayerId: 'fajr',
      madhhab,
      category: 'fard',
      categoryLabel: 'Fard (Obligatory)',
      rakatCount: 2,
      summary: '2 obligatory dawn Rakats with audible recitation in both Rakats.',
      audibleRecitation: true,
      hasQunoot: madhhab === 'shafii' || madhhab === 'maliki',
      qunootPlacement: madhhab === 'shafii' ? 'after_ruku_second' : 'before_ruku_last',
      version: '1.1.0',
      reviewStatus: 'published',
      reviewer,
    },

    // ZUHR
    {
      id: `${madhhab}_zuhr_sunnah_before`,
      prayerId: 'zuhr',
      madhhab,
      category: 'sunnah_muakkadah',
      categoryLabel: 'Sunnah Muakkadah (Before Fard)',
      rakatCount: madhhab === 'hanafi' ? 4 : 2,
      summary:
        madhhab === 'hanafi'
          ? '4 emphasized Sunnah Rakats prayed before Zuhr Fard.'
          : '2 emphasized Sunnah Rakats prayed before Zuhr Fard.',
      audibleRecitation: false,
      includeSurahAfterFatihaAllRakats: true,
      version: '1.0.1',
      reviewStatus: 'published',
      reviewer,
    },
    {
      id: `${madhhab}_zuhr_fard`,
      prayerId: 'zuhr',
      madhhab,
      category: 'fard',
      categoryLabel: 'Fard (Obligatory)',
      rakatCount: 4,
      summary: '4 obligatory midday Rakats recited silently.',
      audibleRecitation: false,
      version: '1.0.2',
      reviewStatus: 'published',
      reviewer,
    },
    {
      id: `${madhhab}_zuhr_sunnah_after`,
      prayerId: 'zuhr',
      madhhab,
      category: 'sunnah_muakkadah',
      categoryLabel: 'Sunnah Muakkadah (After Fard)',
      rakatCount: 2,
      summary: '2 emphasized Sunnah Rakats prayed after Zuhr Fard.',
      audibleRecitation: false,
      includeSurahAfterFatihaAllRakats: true,
      version: '1.0.1',
      reviewStatus: 'published',
      reviewer,
    },
    {
      id: `${madhhab}_zuhr_nafl`,
      prayerId: 'zuhr',
      madhhab,
      category: 'nafl',
      categoryLabel: 'Nafl (Voluntary)',
      rakatCount: 2,
      summary: '2 voluntary Rakats prayed after the Zuhr Sunnah.',
      audibleRecitation: false,
      includeSurahAfterFatihaAllRakats: true,
      version: '1.0.0',
      reviewStatus: 'published',
      reviewer,
    },

    // ASR
    {
      id: `${madhhab}_asr_sunnah`,
      prayerId: 'asr',
      madhhab,
      category: 'sunnah_ghair_muakkadah',
      categoryLabel: 'Sunnah Ghair Muakkadah (Before Fard)',
      rakatCount: 4,
      summary: '4 non-emphasized Sunnah Rakats prayed before Asr Fard.',
      audibleRecitation: false,
      includeSurahAfterFatihaAllRakats: true,
      version: '1.0.0',
      reviewStatus: 'published',
      reviewer,
    },
    {
      id: `${madhhab}_asr_fard`,
      prayerId: 'asr',
      madhhab,
      category: 'fard',
      categoryLabel: 'Fard (Obligatory)',
      rakatCount: 4,
      summary: '4 obligatory afternoon Rakats recited silently.',
      audibleRecitation: false,
      version: '1.0.2',
      reviewStatus: 'published',
      reviewer,
    },

    // MAGHRIB
    {
      id: `${madhhab}_maghrib_fard`,
      prayerId: 'maghrib',
      madhhab,
      category: 'fard',
      categoryLabel: 'Fard (Obligatory)',
      rakatCount: 3,
      summary: '3 obligatory sunset Rakats; first 2 Rakats recited aloud, 3rd silently.',
      audibleRecitation: true,
      version: '1.0.2',
      reviewStatus: 'published',
      reviewer,
    },
    {
      id: `${madhhab}_maghrib_sunnah`,
      prayerId: 'maghrib',
      madhhab,
      category: 'sunnah_muakkadah',
      categoryLabel: 'Sunnah Muakkadah (After Fard)',
      rakatCount: 2,
      summary: '2 emphasized Sunnah Rakats prayed after Maghrib Fard.',
      audibleRecitation: false,
      includeSurahAfterFatihaAllRakats: true,
      version: '1.0.1',
      reviewStatus: 'published',
      reviewer,
    },
    {
      id: `${madhhab}_maghrib_nafl`,
      prayerId: 'maghrib',
      madhhab,
      category: 'nafl',
      categoryLabel: 'Nafl (Voluntary)',
      rakatCount: 2,
      summary: '2 voluntary Rakats following Maghrib Sunnah.',
      audibleRecitation: false,
      includeSurahAfterFatihaAllRakats: true,
      version: '1.0.0',
      reviewStatus: 'published',
      reviewer,
    },

    // ISHA
    ...ishaCats,
  ];
}

export const PRAYER_TYPE_CONFIGS: PrayerTypeConfig[] = [
  ...buildMadhhabConfigs('hanafi'),
  ...buildMadhhabConfigs('shafii'),
  ...buildMadhhabConfigs('maliki'),
  ...buildMadhhabConfigs('hanbali'),
];

export function getPrayerTypesFor(
  prayerId: PrayerId,
  madhhab: MadhhabId,
  customOverrides?: PrayerTypeConfig[],
): PrayerTypeConfig[] {
  const source = customOverrides ?? PRAYER_TYPE_CONFIGS;
  return source.filter((c) => c.prayerId === prayerId && c.madhhab === madhhab);
}
