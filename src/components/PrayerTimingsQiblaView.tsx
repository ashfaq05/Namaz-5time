import { useEffect, useState } from 'react';
import { Bell, BellOff, Compass, MapPin, Navigation } from 'lucide-react';
import type { CalculationMethodId, PrayerId, UserPreferences } from '../types/namaz';
import {
  CALCULATION_METHODS,
  PRESET_CITIES,
  computeDailyPrayerTimes,
  computeDistanceToMakkahKm,
  computeQiblaBearing,
  formatGregorianDate,
  formatHijriDate,
  formatHourFloat,
  getNextPrayerCountdown,
} from '../utils/astronomy';
import { Button, Field, SelectInput, Surface } from './ui';

interface PrayerTimingsQiblaViewProps {
  prefs: UserPreferences;
  initialTab?: 'timings' | 'qibla';
  onUpdatePrefs: (patch: Partial<UserPreferences>) => void;
}

export function PrayerTimingsQiblaView({
  prefs,
  initialTab = 'timings',
  onUpdatePrefs,
}: PrayerTimingsQiblaViewProps) {
  const [tab, setTab] = useState<'timings' | 'qibla'>(initialTab);
  const [now, setNow] = useState(() => new Date());
  const [deviceHeading, setDeviceHeading] = useState<number>(0);
  const [sensorActive, setSensorActive] = useState(false);
  const [geoStatus, setGeoStatus] = useState<string>('');

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!sensorActive || typeof window === 'undefined') return;
    const handler = (ev: DeviceOrientationEvent) => {
      const webkitHeading = (ev as unknown as { webkitCompassHeading?: number }).webkitCompassHeading;
      if (typeof webkitHeading === 'number' && Number.isFinite(webkitHeading)) {
        setDeviceHeading(Math.round(webkitHeading));
      } else if (typeof ev.alpha === 'number' && Number.isFinite(ev.alpha)) {
        setDeviceHeading(Math.round((360 - ev.alpha) % 360));
      }
    };
    window.addEventListener('deviceorientation', handler, true);
    return () => window.removeEventListener('deviceorientation', handler, true);
  }, [sensorActive]);

  const times = computeDailyPrayerTimes(
    now,
    prefs.location,
    prefs.calculationMethod,
    prefs.asrMethod,
  );
  const nextInfo = getNextPrayerCountdown(now, times);
  const qiblaBearing = computeQiblaBearing(prefs.location.lat, prefs.location.lon);
  const makkahDistKm = computeDistanceToMakkahKm(prefs.location.lat, prefs.location.lon);

  const handleUseDeviceLocation = () => {
    if (!navigator.geolocation) {
      setGeoStatus('Geolocation is unavailable in this browser.');
      return;
    }
    setGeoStatus('Requesting coordinates...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const tzHours = -new Date().getTimezoneOffset() / 60;
        onUpdatePrefs({
          location: {
            id: 'custom_gps',
            name: 'Current Location',
            country: `${pos.coords.latitude.toFixed(2)}°, ${pos.coords.longitude.toFixed(2)}°`,
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
            timezoneOffsetHours: tzHours,
          },
        });
        setGeoStatus('Updated prayer timings and Qibla bearing to your coordinates.');
      },
      () => {
        setGeoStatus('Location permission declined. Use manual city selection below.');
      },
      { timeout: 6000 },
    );
  };

  const handleEnableCompassSensor = async () => {
    try {
      const ctor = DeviceOrientationEvent as unknown as {
        requestPermission?: () => Promise<'granted' | 'denied'>;
      };
      if (typeof ctor?.requestPermission === 'function') {
        const res = await ctor.requestPermission();
        if (res !== 'granted') return;
      }
      setSensorActive((v) => !v);
    } catch {
      setSensorActive((v) => !v);
    }
  };

  const timeRows: Array<{ id: PrayerId | 'sunrise'; name: string; arabic: string; hour: number; canNotify: boolean }> = [
    { id: 'fajr', name: 'Fajr', arabic: 'الفجر', hour: times.fajr, canNotify: true },
    { id: 'sunrise', name: 'Sunrise (Shuruq)', arabic: 'الشروق', hour: times.sunrise, canNotify: false },
    { id: 'zuhr', name: 'Zuhr', arabic: 'الظهر', hour: times.zuhr, canNotify: true },
    { id: 'asr', name: 'Asr', arabic: 'العصر', hour: times.asr, canNotify: true },
    { id: 'maghrib', name: 'Maghrib', arabic: 'المغرب', hour: times.maghrib, canNotify: true },
    { id: 'isha', name: 'Isha', arabic: 'العشاء', hour: times.isha, canNotify: true },
  ];

  // Angle of Qibla relative to top of device dial
  const relativeQiblaDeg = (qiblaBearing - deviceHeading + 360) % 360;
  const alignedWithQibla = relativeQiblaDeg <= 6 || relativeQiblaDeg >= 354;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-medium text-foreground">
            Prayer Timings & Qibla Compass
          </h1>
          <p className="text-sm text-muted mt-1">
            {formatGregorianDate(now)} · {formatHijriDate(now)}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            tone={tab === 'timings' ? 'primary' : 'quiet'}
            onClick={() => setTab('timings')}
          >
            Prayer Timings
          </Button>
          <Button
            tone={tab === 'qibla' ? 'primary' : 'quiet'}
            onClick={() => setTab('qibla')}
          >
            <Compass className="h-4 w-4" />
            Qibla Compass
          </Button>
        </div>
      </div>

      {/* Location & Method Controls Bar */}
      <Surface className="p-4 md:p-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <Field label="City / Coordinates" id="city-select">
            <SelectInput
              id="city-select"
              value={prefs.location.id}
              onChange={(e) => {
                const city = PRESET_CITIES.find((c) => c.id === e.target.value);
                if (city) onUpdatePrefs({ location: city });
              }}
            >
              {prefs.location.id === 'custom_gps' && (
                <option value="custom_gps">
                  {prefs.location.name} ({prefs.location.country})
                </option>
              )}
              {PRESET_CITIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}, {c.country}
                </option>
              ))}
            </SelectInput>
          </Field>

          <Field label="Calculation Method" id="calc-method">
            <SelectInput
              id="calc-method"
              value={prefs.calculationMethod}
              onChange={(e) =>
                onUpdatePrefs({ calculationMethod: e.target.value as CalculationMethodId })
              }
            >
              {Object.values(CALCULATION_METHODS).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </SelectInput>
          </Field>

          <div className="flex flex-wrap items-center gap-2">
            <Button tone="quiet" onClick={handleUseDeviceLocation} className="flex-1">
              <MapPin className="h-4 w-4" />
              Use GPS Location
            </Button>
            <button
              type="button"
              onClick={() =>
                onUpdatePrefs({
                  asrMethod: prefs.asrMethod === 'hanafi' ? 'standard' : 'hanafi',
                })
              }
              className="min-h-11 rounded-control border border-border bg-surface px-3 text-xs font-medium text-foreground hover:bg-surface-alt cursor-pointer"
            >
              Asr: {prefs.asrMethod === 'hanafi' ? 'Hanafi (2×)' : 'Standard (1×)'}
            </button>
          </div>
        </div>
        {geoStatus && (
          <p role="status" className="mt-2 text-xs text-primary">
            {geoStatus}
          </p>
        )}
      </Surface>

      {tab === 'timings' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Next Prayer Countdown Card */}
          <Surface className="lg:col-span-5 p-6 space-y-4">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-primary">Next Prayer</p>
              <h2 className="font-display text-3xl font-medium text-foreground">
                {nextInfo.label} · {nextInfo.timeStr}
              </h2>
            </div>

            <div className="rounded-control bg-surface-alt border border-border/70 p-4">
              <p className="text-xs text-muted">Time Remaining</p>
              <p className="text-3xl font-semibold text-foreground tabular-nums mt-1">
                {nextInfo.countdownStr}
              </p>
            </div>

            <div className="space-y-1 text-xs text-muted pt-1">
              <p>
                <strong className="text-foreground">Location:</strong> {prefs.location.name},{' '}
                {prefs.location.country}
              </p>
              <p>
                <strong className="text-foreground">Method:</strong>{' '}
                {CALCULATION_METHODS[prefs.calculationMethod].name}
              </p>
              <p>{CALCULATION_METHODS[prefs.calculationMethod].regionNote}</p>
            </div>
          </Surface>

          {/* Daily Schedule Table */}
          <Surface className="lg:col-span-7 divide-y divide-border/70">
            {timeRows.map((row) => {
              const isNext = row.id === nextInfo.nextPrayerId;
              const notifyOn = row.id !== 'sunrise' && prefs.notifications[row.id];
              return (
                <div
                  key={row.id}
                  className={`flex items-center justify-between gap-4 px-5 py-4 ${
                    isNext ? 'bg-surface-alt' : ''
                  }`}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div>
                      <p className="text-base font-semibold text-foreground">
                        {row.name}
                        {isNext && (
                          <span className="ml-2 text-xs font-medium text-primary">· Upcoming</span>
                        )}
                      </p>
                      <p className="font-arabic text-base text-muted">{row.arabic}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <span className="text-lg font-semibold text-foreground tabular-nums">
                      {formatHourFloat(row.hour)}
                    </span>
                    {row.canNotify && (
                      <button
                        type="button"
                        onClick={() => {
                          const pId = row.id as PrayerId;
                          onUpdatePrefs({
                            notifications: {
                              ...prefs.notifications,
                              [pId]: !prefs.notifications[pId],
                            },
                          });
                        }}
                        aria-label={`Toggle ${row.name} reminder`}
                        className={`inline-flex h-10 w-10 items-center justify-center rounded-control border transition-colors cursor-pointer ${
                          notifyOn
                            ? 'border-primary/40 bg-primary/10 text-primary'
                            : 'border-border bg-surface text-muted'
                        }`}
                      >
                        {notifyOn ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </Surface>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Interactive Qibla Compass Dial */}
          <Surface className="lg:col-span-6 p-6 flex flex-col items-center gap-5">
            <div className="text-center">
              <p className="text-xs font-semibold text-primary">
                {alignedWithQibla ? 'Aligned with Qibla' : 'Rotate toward the Qibla needle'}
              </p>
              <h2 className="font-display text-2xl font-medium text-foreground mt-1">
                {Math.round(qiblaBearing)}° from True North
              </h2>
              <p className="text-xs text-muted mt-0.5">
                {makkahDistKm.toLocaleString()} km to Al-Masjid al-Haram, Makkah
              </p>
            </div>

            <div className="w-full max-w-[320px]">
              <svg viewBox="0 0 300 300" className="w-full h-auto" role="img" aria-label="Qibla Compass Dial">
                <circle
                  cx="150"
                  cy="150"
                  r="134"
                  fill="var(--color-surface-alt)"
                  stroke="var(--color-border)"
                  strokeWidth="2"
                />
                <circle
                  cx="150"
                  cy="150"
                  r="102"
                  fill="none"
                  stroke="var(--color-border)"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />

                {/* Rotating Compass Rose according to device heading */}
                <g transform={`rotate(${-deviceHeading} 150 150)`}>
                  <text
                    x="150"
                    y="36"
                    textAnchor="middle"
                    fontSize="14"
                    fontWeight="600"
                    fill="var(--color-primary)"
                  >
                    N
                  </text>
                  <text x="264" y="155" textAnchor="middle" fontSize="13" fill="var(--color-muted)">
                    E
                  </text>
                  <text x="150" y="274" textAnchor="middle" fontSize="13" fill="var(--color-muted)">
                    S
                  </text>
                  <text x="36" y="155" textAnchor="middle" fontSize="13" fill="var(--color-muted)">
                    W
                  </text>

                  {/* Qibla Bearing Vector */}
                  <g transform={`rotate(${qiblaBearing} 150 150)`}>
                    <line
                      x1="150"
                      y1="150"
                      x2="150"
                      y2="52"
                      stroke="var(--color-primary)"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                    />
                    <polygon points="150,38 140,60 160,60" fill="var(--color-primary)" />
                    <rect
                      x="140"
                      y="64"
                      width="20"
                      height="20"
                      rx="3"
                      fill="var(--color-accent)"
                      stroke="var(--color-foreground)"
                      strokeWidth="1.5"
                    />
                  </g>
                </g>

                {/* Center pivot */}
                <circle cx="150" cy="150" r="8" fill="var(--color-foreground)" />
                {/* Fixed top device index */}
                <polygon points="150,6 144,18 156,18" fill="var(--color-accent)" />
              </svg>
            </div>

            <div className="w-full space-y-2">
              <div className="flex items-center justify-between text-xs text-muted">
                <label htmlFor="heading-slider">Simulated / Manual Compass Heading</label>
                <span className="tabular-nums font-medium text-foreground">{deviceHeading}°</span>
              </div>
              <input
                id="heading-slider"
                type="range"
                min={0}
                max={359}
                value={deviceHeading}
                onChange={(e) => setDeviceHeading(Number(e.target.value))}
                className="w-full accent-primary cursor-pointer"
              />
            </div>
          </Surface>

          {/* Calibration & Sensor Info */}
          <Surface className="lg:col-span-6 p-6 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-foreground">Compass Calibration & Guidance</h2>
              <Button tone={sensorActive ? 'primary' : 'quiet'} onClick={handleEnableCompassSensor}>
                <Navigation className="h-4 w-4" />
                {sensorActive ? 'Sensor Active' : 'Enable Device Sensor'}
              </Button>
            </div>

            <div className="space-y-3 text-sm text-muted leading-relaxed">
              <p>
                <strong className="text-foreground">How to calibrate:</strong> Hold your device flat
                and move it gently in a figure-eight motion three times before reading the bearing.
              </p>
              <p>
                <strong className="text-foreground">Magnetic interference notice:</strong> Metal
                desk frames, magnetic phone cases, speakers, and reinforced concrete can deflect
                electronic magnetometers. Step slightly away from metal fixtures for reliable
                readings.
              </p>
              <div className="rounded-control bg-surface-alt border border-border/70 p-4 space-y-1 text-xs">
                <p>
                  <strong className="text-foreground">Selected Coordinates:</strong>{' '}
                  {prefs.location.name} ({prefs.location.lat.toFixed(4)}°,{' '}
                  {prefs.location.lon.toFixed(4)}°)
                </p>
                <p>
                  <strong className="text-foreground">Ka‘bah Coordinates:</strong> 21.4225° N,
                  39.8262° E
                </p>
                <p>
                  <strong className="text-foreground">Great-Circle Bearing:</strong>{' '}
                  {qiblaBearing.toFixed(1)}° clockwise from True North
                </p>
              </div>
            </div>
          </Surface>
        </div>
      )}
    </div>
  );
}
