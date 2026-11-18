import { Check } from 'lucide-react';
import { MADHHAB_META, PRAYERS, getPrayerTypesFor } from '../data/prayers';
import type { MadhhabId } from '../types/namaz';
import { Button, Surface } from './ui';

interface MadhhabComparisonViewProps {
  selectedMadhhab: MadhhabId;
  onSelectMadhhab: (madhhab: MadhhabId) => void;
}

const SCHOOLS: MadhhabId[] = ['hanafi', 'shafii', 'maliki', 'hanbali'];

export function MadhhabComparisonView({
  selectedMadhhab,
  onSelectMadhhab,
}: MadhhabComparisonViewProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-medium text-foreground">
          Madhhab Selection & Comparison
        </h1>
        <p className="text-sm text-muted mt-1 max-w-3xl">
          Namaz Companion maintains separate, independently reviewed configurations for each of the
          four Sunni schools of jurisprudence rather than blending practices into a single sequence.
        </p>
      </div>

      {/* Select Active School Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {SCHOOLS.map((id) => {
          const m = MADHHAB_META[id];
          const isActive = selectedMadhhab === id;
          return (
            <Surface
              key={id}
              className={`p-5 flex flex-col justify-between gap-4 ${
                isActive ? 'border-primary ring-1 ring-primary' : ''
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-lg font-semibold text-foreground">{m.name}</h2>
                  <span className="font-arabic text-xl text-primary">{m.arabicName}</span>
                </div>
                <p className="text-xs font-medium text-muted">{m.founder}</p>
                <p className="text-sm text-muted leading-relaxed">{m.overview}</p>
              </div>
              <Button
                tone={isActive ? 'primary' : 'quiet'}
                onClick={() => onSelectMadhhab(id)}
                className="w-full"
              >
                {isActive && <Check className="h-4 w-4" />}
                {isActive ? 'Active School' : `Select ${m.name}`}
              </Button>
            </Surface>
          );
        })}
      </div>

      {/* Scholarly Practice Comparison Table */}
      <Surface className="p-5 md:p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Key Practice Differences Across Schools
          </h2>
          <p className="text-xs text-muted mt-0.5">
            All four schools represent valid, time-honored Sunni scholarly traditions.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wider text-muted">
                <th className="py-3 pr-4 font-semibold">Aspect</th>
                {SCHOOLS.map((id) => (
                  <th
                    key={id}
                    className={`py-3 px-3 font-semibold ${
                      selectedMadhhab === id ? 'text-primary' : 'text-foreground'
                    }`}
                  >
                    {MADHHAB_META[id].name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {(
                [
                  { label: 'Qiyam Hand Placement', key: 'qiyamHands' },
                  { label: "Raising Hands (Raf' al-Yadayn)", key: 'rafAlYadayn' },
                  { label: 'Al-Fatiha Behind Imam', key: 'fatihaBehindImam' },
                  { label: 'Sitting Posture (Tashahhud)', key: 'sittingPosture' },
                  { label: 'Asr Time Shadow Rule', key: 'asrTiming' },
                  { label: 'Witr Prayer Structure', key: 'witrStructure' },
                  { label: 'Dua-e-Qunoot Practice', key: 'qunootPractice' },
                ] as const
              ).map((row) => (
                <tr key={row.key} className="align-top">
                  <td className="py-3.5 pr-4 font-medium text-foreground">{row.label}</td>
                  {SCHOOLS.map((id) => (
                    <td
                      key={id}
                      className={`py-3.5 px-3 text-xs leading-relaxed ${
                        selectedMadhhab === id ? 'text-foreground font-medium' : 'text-muted'
                      }`}
                    >
                      {MADHHAB_META[id][row.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Surface>

      {/* Five Daily Prayers Breakdown for Active Madhhab */}
      <Surface className="p-5 md:p-6 space-y-4">
        <h2 className="text-lg font-semibold text-foreground">
          Five Daily Prayers Rakat Configuration — {MADHHAB_META[selectedMadhhab].name}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {PRAYERS.map((prayer) => {
            const types = getPrayerTypesFor(prayer.id, selectedMadhhab);
            return (
              <div
                key={prayer.id}
                className="rounded-control border border-border/75 bg-surface-alt p-3.5 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground">{prayer.name}</span>
                  <span className="font-arabic text-base text-primary">{prayer.arabicName}</span>
                </div>
                <ul className="space-y-1 text-xs text-muted">
                  {types.map((t) => (
                    <li key={t.id} className="flex items-center justify-between gap-2">
                      <span className="truncate">{t.categoryLabel.split('(')[0].trim()}</span>
                      <span className="font-semibold text-foreground tabular-nums shrink-0">
                        {t.rakatCount} R
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </Surface>
    </div>
  );
}
