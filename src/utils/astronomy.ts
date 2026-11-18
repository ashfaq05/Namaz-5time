import type { CalculationMethodId, CityLocation, PrayerId } from '../types/namaz';

export const KAABA_COORDS = {
  lat: 21.422487,
  lon: 39.826206,
};

export interface TimeZoneOption {
  id: string;
  label: string;
  shortLabel: string;
}

export const TIMEZONE_OPTIONS: TimeZoneOption[] = [
  { id: 'auto', label: 'Device Local Time (Auto-detect)', shortLabel: 'Local' },
  { id: 'Asia/Kolkata', label: 'IST — India Standard Time (UTC+05:30)', shortLabel: 'IST' },
  { id: 'Asia/Karachi', label: 'PKT — Pakistan Standard Time (UTC+05:00)', shortLabel: 'PKT' },
  { id: 'Asia/Dhaka', label: 'BST — Bangladesh Standard Time (UTC+06:00)', shortLabel: 'BST' },
  { id: 'Asia/Dubai', label: 'GST — UAE / Gulf Time (UTC+04:00)', shortLabel: 'GST' },
  { id: 'Asia/Riyadh', label: 'AST — Makkah / Madinah / Arabia (UTC+03:00)', shortLabel: 'AST' },
  { id: 'Europe/Istanbul', label: 'TRT — Turkey Time (UTC+03:00)', shortLabel: 'TRT' },
  { id: 'Africa/Cairo', label: 'EET — Egypt Time (UTC+02:00)', shortLabel: 'EET' },
  { id: 'Europe/London', label: 'GMT / BST — London (UTC+00:00 / +01:00)', shortLabel: 'UK' },
  { id: 'Europe/Paris', label: 'CET — Central Europe (UTC+01:00 / +02:00)', shortLabel: 'CET' },
  { id: 'America/New_York', label: 'EST / EDT — US Eastern (UTC-05:00 / -04:00)', shortLabel: 'ET' },
  { id: 'America/Chicago', label: 'CST / CDT — US Central (UTC-06:00 / -05:00)', shortLabel: 'CT' },
  { id: 'America/Los_Angeles', label: 'PST / PDT — US Pacific (UTC-08:00 / -07:00)', shortLabel: 'PT' },
  { id: 'Asia/Kuala_Lumpur', label: 'MYT — Malaysia Time (UTC+08:00)', shortLabel: 'MYT' },
  { id: 'Asia/Jakarta', label: 'WIB — Western Indonesia Time (UTC+07:00)', shortLabel: 'WIB' },
  { id: 'Asia/Singapore', label: 'SGT — Singapore Time (UTC+08:00)', shortLabel: 'SGT' },
  { id: 'Australia/Sydney', label: 'AEST / AEDT — Sydney (UTC+10:00 / +11:00)', shortLabel: 'AET' },
  { id: 'UTC', label: 'UTC — Coordinated Universal Time (UTC+00:00)', shortLabel: 'UTC' },
];

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

export interface ZonedDateParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  offsetHours: number;
  resolvedTimeZone: string;
  shortZoneName: string;
}

export function resolveEffectiveTimeZone(timeZone?: string): string {
  if (!timeZone || timeZone === 'auto') {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    } catch {
      return 'UTC';
    }
  }
  return timeZone;
}

export function getZonedDateParts(date: Date, timeZone?: string): ZonedDateParts {
  const resolved = resolveEffectiveTimeZone(timeZone);
  try {
    const dtf = new Intl.DateTimeFormat('en-US', {
      timeZone: resolved,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
      timeZoneName: 'short',
    });
    const parts = dtf.formatToParts(date);
    const getNum = (type: Intl.DateTimeFormatPartTypes, fallback: number) => {
      const val = Number(parts.find((p) => p.type === type)?.value);
      return Number.isFinite(val) ? val : fallback;
    };
    const year = getNum('year', date.getFullYear());
    const month = getNum('month', date.getMonth() + 1);
    const day = getNum('day', date.getDate());
    const hour = getNum('hour', date.getHours()) % 24;
    const minute = getNum('minute', date.getMinutes());
    const second = getNum('second', date.getSeconds());

    const utcTarget = Date.UTC(year, month - 1, day, hour, minute, second);
    const utcNow = Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds(),
    );
    const offsetMinutes = Math.round((utcTarget - utcNow) / 60000);
    const offsetHours = offsetMinutes / 60;

    const rawZoneName = parts.find((p) => p.type === 'timeZoneName')?.value ?? '';
    const presetMatch = TIMEZONE_OPTIONS.find((z) => z.id === resolved);
    const shortZoneName =
      resolved === 'Asia/Kolkata'
        ? 'IST'
        : presetMatch?.shortLabel ?? (rawZoneName || resolved);

    return {
      year,
      month,
      day,
      hour,
      minute,
      second,
      offsetHours,
      resolvedTimeZone: resolved,
      shortZoneName,
    };
  } catch {
    return {
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate(),
      hour: date.getHours(),
      minute: date.getMinutes(),
      second: date.getSeconds(),
      offsetHours: -date.getTimezoneOffset() / 60,
      resolvedTimeZone: 'UTC',
      shortZoneName: 'Local',
    };
  }
}

export function formatCurrentTime(
  date: Date,
  timeZone?: string,
  includeSeconds = true,
): string {
  const zoned = getZonedDateParts(date, timeZone);
  const h12 = zoned.hour % 12 === 0 ? 12 : zoned.hour % 12;
  const suffix = zoned.hour >= 12 ? 'PM' : 'AM';
  const mm = String(zoned.minute).padStart(2, '0');
  const ss = String(zoned.second).padStart(2, '0');
  const clock = includeSeconds ? `${h12}:${mm}:${ss} ${suffix}` : `${h12}:${mm} ${suffix}`;
  return `${clock} ${zoned.shortZoneName}`;
}

export function formatDateInTimeZone(
  isoOrDate: string | Date,
  timeZone?: string,
): string {
  const date = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
  const resolved = resolveEffectiveTimeZone(timeZone);
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: resolved,
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date);
  } catch {
    return date.toLocaleDateString();
  }
}

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
  fajr: number; // hours in selected timezone day (0..24)
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
  timeZone?: string,
): DailyPrayerTimes {
  const method = CALCULATION_METHODS[methodId];
  const zoned = getZonedDateParts(date, timeZone);
  const jd = julianDay(zoned.year, zoned.month, zoned.day);
  const { declination, eqTimeMinutes } = sunPosition(jd);

  // Express prayer times in the same selected timezone used for the current clock & countdown
  const effectiveOffsetHours = timeZone ? zoned.offsetHours : location.timezoneOffsetHours;
  const solarNoon =
    12 + effectiveOffsetHours - location.lon / 15 - eqTimeMinutes / 60;

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
  timeZone?: string,
): { nextPrayerId: PrayerId; label: string; timeStr: string; countdownStr: string } {
  const zoned = getZonedDateParts(now, timeZone);
  const currentHours = zoned.hour + zoned.minute / 60 + zoned.second / 3600;
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

export function formatHijriDate(date: Date, timeZone?: string): string {
  const resolved = resolveEffectiveTimeZone(timeZone);
  try {
    return new Intl.DateTimeFormat('en-TN-u-ca-islamic-umalqura', {
      timeZone: resolved,
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
  } catch {
    return 'Hijri calendar';
  }
}

export function formatGregorianDate(date: Date, timeZone?: string): string {
  const resolved = resolveEffectiveTimeZone(timeZone);
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: resolved,
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
  } catch {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
  }
}
