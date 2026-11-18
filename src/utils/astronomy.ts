import type { CalculationMethodId, CityLocation, PrayerId } from '../types/namaz';

export const KAABA_COORDS = {
  lat: 21.422487,
  lon: 39.826206,
};

export const PRESET_CITIES: CityLocation[] = [
  { id: 'delhi', name: 'New Delhi', country: 'India', lat: 28.6139, lon: 77.209, timezoneOffsetHours: 5.5 },
  { id: 'lucknow', name: 'Lucknow', country: 'India', lat: 26.8467, lon: 80.9462, timezoneOffsetHours: 5.5 },
  { id: 'hyderabad', name: 'Hyderabad', country: 'India', lat: 17.385, lon: 78.4867, timezoneOffsetHours: 5.5 },
  { id: 'mumbai', name: 'Mumbai', country: 'India', lat: 19.076, lon: 72.8777, timezoneOffsetHours: 5.5 },
  { id: 'karachi', name: 'Karachi', country: 'Pakistan', lat: 24.8607, lon: 67.0011, timezoneOffsetHours: 5 },
  { id: 'lahore', name: 'Lahore', country: 'Pakistan', lat: 31.5204, lon: 74.3587, timezoneOffsetHours: 5 },
  { id: 'makkah', name: 'Makkah', country: 'Saudi Arabia', lat: 21.4225, lon: 39.8262, timezoneOffsetHours: 3 },
  { id: 'madinah', name: 'Madinah', country: 'Saudi Arabia', lat: 24.4672, lon: 39.6112, timezoneOffsetHours: 3 },
  { id: 'istanbul', name: 'Istanbul', country: 'Turkey', lat: 41.0082, lon: 28.9784, timezoneOffsetHours: 3 },
  { id: 'cairo', name: 'Cairo', country: 'Egypt', lat: 30.0444, lon: 31.2357, timezoneOffsetHours: 2 },
  { id: 'london', name: 'London', country: 'United Kingdom', lat: 51.5072, lon: -0.1276, timezoneOffsetHours: 0 },
  { id: 'new_york', name: 'New York', country: 'United States', lat: 40.7128, lon: -74.006, timezoneOffsetHours: -5 },
  { id: 'kuala_lumpur', name: 'Kuala Lumpur', country: 'Malaysia', lat: 3.139, lon: 101.6869, timezoneOffsetHours: 8 },
  { id: 'jakarta', name: 'Jakarta', country: 'Indonesia', lat: -6.2088, lon: 106.8456, timezoneOffsetHours: 7 },
];

export interface CalculationMethodMeta {
  id: CalculationMethodId;
  name: string;
  fajrAngle: number;
  ishaAngle?: number;
  ishaMinutesAfterMaghrib?: number;
  regionNote: string;
}

export const CALCULATION_METHODS: Record<CalculationMethodId, CalculationMethodMeta> = {
  mwl: {
    id: 'mwl',
    name: 'Muslim World League (MWL)',
    fajrAngle: 18,
    ishaAngle: 17,
    regionNote: 'Widely used in Europe, Far East, and global settings',
  },
  karachi: {
    id: 'karachi',
    name: 'University of Islamic Sciences, Karachi',
    fajrAngle: 18,
    ishaAngle: 18,
    regionNote: 'Common across India, Pakistan, and South Asia',
  },
  isna: {
    id: 'isna',
    name: 'Islamic Society of North America (ISNA)',
    fajrAngle: 15,
    ishaAngle: 15,
    regionNote: 'Standard in North America',
  },
  umm_al_qura: {
    id: 'umm_al_qura',
    name: 'Umm al-Qura University, Makkah',
    fajrAngle: 18.5,
    ishaMinutesAfterMaghrib: 90,
    regionNote: 'Arabian Peninsula standard',
  },
  egyptian: {
    id: 'egyptian',
    name: 'Egyptian General Authority of Survey',
    fajrAngle: 19.5,
    ishaAngle: 17.5,
    regionNote: 'Africa, Syria, and Levant',
  },
  tehran: {
    id: 'tehran',
    name: 'Institute of Geophysics, Tehran',
    fajrAngle: 17.7,
    ishaAngle: 14,
    regionNote: 'Iran and neighboring regions',
  },
};

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

function julianDay(year: number, month: number, day: number): number {
  let y = year;
  let m = month;
  if (m <= 2) {
    y -= 1;
    m += 12;
  }
  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + B - 1524.5;
}

function sunPosition(jd: number): { declination: number; eqTimeMinutes: number } {
  const D = jd - 2451545.0;
  const g = (357.529 + 0.98560028 * D) % 360;
  const q = (280.459 + 0.98564736 * D) % 360;
  const L = (q + 1.915 * Math.sin(g * DEG2RAD) + 0.02 * Math.sin(2 * g * DEG2RAD)) % 360;
  const e = 23.439 - 0.00000036 * D;
  const RA =
    Math.atan2(Math.cos(e * DEG2RAD) * Math.sin(L * DEG2RAD), Math.cos(L * DEG2RAD)) * RAD2DEG / 15;
  const eqTimeHours = q / 15 - ((RA % 24) + 24) % 24;
  const normalizedEq =
    eqTimeHours > 12 ? eqTimeHours - 24 : eqTimeHours < -12 ? eqTimeHours + 24 : eqTimeHours;
  const declination = Math.asin(Math.sin(e * DEG2RAD) * Math.sin(L * DEG2RAD)) * RAD2DEG;
  return { declination, eqTimeMinutes: normalizedEq * 60 };
}

function hourAngle(lat: number, decl: number, elevationDeg: number): number {
  const num =
    Math.sin(elevationDeg * DEG2RAD) - Math.sin(lat * DEG2RAD) * Math.sin(decl * DEG2RAD);
  const den = Math.cos(lat * DEG2RAD) * Math.cos(decl * DEG2RAD);
  const cosH = Math.max(-1, Math.min(1, num / (den || 1e-6)));
  return Math.acos(cosH) * RAD2DEG / 15;
}

export interface DailyPrayerTimes {
  fajr: number; // hours in local day (0..24)
  sunrise: number;
  zuhr: number;
  asr: number;
  maghrib: number;
  isha: number;
}

export function computeDailyPrayerTimes(
  date: Date,
  location: CityLocation,
  methodId: CalculationMethodId,
  asrMethod: 'standard' | 'hanafi',
): DailyPrayerTimes {
  const method = CALCULATION_METHODS[methodId];
  const jd = julianDay(date.getFullYear(), date.getMonth() + 1, date.getDate());
  const { declination, eqTimeMinutes } = sunPosition(jd);

  const solarNoon =
    12 + location.timezoneOffsetHours - location.lon / 15 - eqTimeMinutes / 60;

  const fajrHA = hourAngle(location.lat, declination, -method.fajrAngle);
  const sunriseHA = hourAngle(location.lat, declination, -0.833);

  const shadowFactor = asrMethod === 'hanafi' ? 2 : 1;
  const asrAlt =
    Math.atan(1 / (shadowFactor + Math.tan(Math.abs(location.lat - declination) * DEG2RAD))) *
    RAD2DEG;
  const asrHA = hourAngle(location.lat, declination, asrAlt);

  const fajr = solarNoon - fajrHA;
  const sunrise = solarNoon - sunriseHA;
  const zuhr = solarNoon + 2 / 60; // 2 min precaution
  const asr = solarNoon + asrHA;
  const maghrib = solarNoon + sunriseHA;
  const isha = method.ishaMinutesAfterMaghrib
    ? maghrib + method.ishaMinutesAfterMaghrib / 60
    : solarNoon + hourAngle(location.lat, declination, -(method.ishaAngle ?? 17));

  return { fajr, sunrise, zuhr, asr, maghrib, isha };
}

export function formatHourFloat(hourFloat: number): string {
  const norm = ((hourFloat % 24) + 24) % 24;
  const totalMinutes = Math.round(norm * 60);
  const h24 = Math.floor(totalMinutes / 60) % 24;
  const m = totalMinutes % 60;
  const suffix = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
}

export function getNextPrayerCountdown(
  now: Date,
  times: DailyPrayerTimes,
): { nextPrayerId: PrayerId; label: string; timeStr: string; countdownStr: string } {
  const currentHours = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
  const ordered: Array<{ id: PrayerId; label: string; hour: number }> = [
    { id: 'fajr', label: 'Fajr', hour: times.fajr },
    { id: 'zuhr', label: 'Zuhr', hour: times.zuhr },
    { id: 'asr', label: 'Asr', hour: times.asr },
    { id: 'maghrib', label: 'Maghrib', hour: times.maghrib },
    { id: 'isha', label: 'Isha', hour: times.isha },
  ];

  let next = ordered.find((p) => p.hour > currentHours);
  let diffHours = 0;
  if (!next) {
    next = ordered[0];
    diffHours = 24 - currentHours + next.hour;
  } else {
    diffHours = next.hour - currentHours;
  }

  const totalSecs = Math.max(0, Math.floor(diffHours * 3600));
  const hrs = Math.floor(totalSecs / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;

  return {
    nextPrayerId: next.id,
    label: next.label,
    timeStr: formatHourFloat(next.hour),
    countdownStr: `${String(hrs).padStart(2, '0')}h ${String(mins).padStart(2, '0')}m ${String(secs).padStart(2, '0')}s`,
  };
}

export function computeQiblaBearing(lat: number, lon: number): number {
  const phiK = KAABA_COORDS.lat * DEG2RAD;
  const lambdaK = KAABA_COORDS.lon * DEG2RAD;
  const phi = lat * DEG2RAD;
  const lambda = lon * DEG2RAD;
  const dLambda = lambdaK - lambda;
  const y = Math.sin(dLambda);
  const x = Math.cos(phi) * Math.tan(phiK) - Math.sin(phi) * Math.cos(dLambda);
  const bearing = Math.atan2(y, x) * RAD2DEG;
  return (bearing + 360) % 360;
}

export function computeDistanceToMakkahKm(lat: number, lon: number): number {
  const R = 6371;
  const dLat = (KAABA_COORDS.lat - lat) * DEG2RAD;
  const dLon = (KAABA_COORDS.lon - lon) * DEG2RAD;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat * DEG2RAD) *
      Math.cos(KAABA_COORDS.lat * DEG2RAD) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(Math.max(0, a)), Math.sqrt(Math.max(0, 1 - a)));
  return Math.round(R * c);
}

export function formatHijriDate(date: Date): string {
  try {
    return new Intl.DateTimeFormat('en-TN-u-ca-islamic-umalqura', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
  } catch {
    return 'Hijri calendar';
  }
}

export function formatGregorianDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}
