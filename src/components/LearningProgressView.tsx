import type { User } from 'firebase/auth';
import { BookCheck, CheckCircle2, Cloud, Play, RotateCcw } from 'lucide-react';
import { MOVEMENT_LESSONS } from '../data/activities';
import { MADHHAB_META, PRAYERS } from '../data/prayers';
import type {
  LearningProgressState,
  PrayerTypeConfig,
  RecitationRecord,
} from '../types/namaz';
import { GoogleLogoIcon } from './AuthAccountBadge';
import { Button, Surface } from './ui';

interface LearningProgressViewProps {
  progress: LearningProgressState;
  recitationsMap: Record<string, RecitationRecord>;
  prayerConfigs: PrayerTypeConfig[];
  authUser: User | null;
  signingIn: boolean;
  onSignIn: () => void;
  onSignOut: () => void;
  onContinueLast: () => void;
  onReviewSession: (config: PrayerTypeConfig) => void;
  onNavigateMovements: () => void;
  onNavigateDuas: () => void;
  onResetProgress: () => void;
}

export function LearningProgressView({
  progress,
  recitationsMap,
  prayerConfigs,
  authUser,
  signingIn,
  onSignIn,
  onSignOut,
  onContinueLast,
  onReviewSession,
  onNavigateMovements,
  onNavigateDuas,
  onResetProgress,
}: LearningProgressViewProps) {
  const totalMovements = MOVEMENT_LESSONS.length;
  const totalDuas = Object.keys(recitationsMap).length;

  const lastConfig = progress.lastActivity
    ? prayerConfigs.find((c) => c.id === progress.lastActivity!.prayerTypeId)
    : undefined;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-medium text-foreground">
            Learning Progress
          </h1>
          <p className="text-sm text-muted mt-1">
            Track your guided prayer sessions, reviewed movements, and memorized Duas.
          </p>
        </div>

        <Button tone="quiet" onClick={onResetProgress}>
          <RotateCcw className="h-4 w-4" />
          Reset Progress
        </Button>
      </div>

      {/* Per-User Google Account Sync Banner */}
      <Surface className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
        {authUser ? (
          <>
            <div className="flex items-center gap-3 min-w-0">
              {authUser.photoURL ? (
                <img
                  src={authUser.photoURL}
                  alt={authUser.displayName || 'User'}
                  referrerPolicy="no-referrer"
                  className="h-10 w-10 rounded-full object-cover border border-border shrink-0"
                />
              ) : (
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold shrink-0">
                  {(authUser.displayName || authUser.email || 'U').slice(0, 1).toUpperCase()}
                </span>
              )}
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">
                  {authUser.displayName || 'Signed-in Learner'}
                </p>
                <p className="text-xs text-muted flex items-center gap-1.5 truncate">
                  <Cloud className="h-3.5 w-3.5 text-success shrink-0" />
                  <span>Progress synced to {authUser.email}</span>
                </p>
              </div>
            </div>
            <Button tone="quiet" onClick={onSignOut} className="min-h-9 px-3.5 text-xs">
              Sign out
            </Button>
          </>
        ) : (
          <>
            <div className="space-y-0.5 min-w-0">
              <p className="text-sm font-semibold text-foreground">
                Sign in with Google to save your progress
              </p>
              <p className="text-xs text-muted">
                Every completed prayer, learned posture, and reviewed Dua is logged privately to your account.
              </p>
            </div>
            <Button onClick={onSignIn} disabled={signingIn} className="min-h-10 px-4 text-xs">
              <GoogleLogoIcon className="h-4 w-4" />
              {signingIn ? 'Signing in…' : 'Sign in with Google'}
            </Button>
          </>
        )}
      </Surface>

      {/* Explicit specification notice (Screen 14 & Section 4) */}
      <div className="rounded-control border border-accent/45 bg-surface-alt px-4 py-3 text-sm text-foreground">
        <strong className="font-semibold">Educational Progress Only:</strong> Completing a guided
        lesson or reviewing movements tracks your learning activity inside Namaz Companion—it does
        not verify or serve as proof that a real-world prayer was performed.
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Surface className="p-5 space-y-1">
          <p className="text-xs font-medium text-muted">Completed Learning Sessions</p>
          <p className="text-3xl font-semibold text-foreground tabular-nums">
            {progress.completedSessions.length}
          </p>
          <p className="text-xs text-muted">Full guided prayer walkthroughs</p>
        </Surface>

        <Surface className="p-5 space-y-1">
          <p className="text-xs font-medium text-muted">Movements Learned</p>
          <p className="text-3xl font-semibold text-foreground tabular-nums">
            {progress.learnedMovements.length} / {totalMovements}
          </p>
          <button
            type="button"
            onClick={onNavigateMovements}
            className="text-xs font-medium text-primary hover:underline cursor-pointer"
          >
            Open Movements Studio →
          </button>
        </Surface>

        <Surface className="p-5 space-y-1">
          <p className="text-xs font-medium text-muted">Duas & Surahs Reviewed</p>
          <p className="text-3xl font-semibold text-foreground tabular-nums">
            {progress.reviewedDuas.length} / {totalDuas}
          </p>
          <button
            type="button"
            onClick={onNavigateDuas}
            className="text-xs font-medium text-primary hover:underline cursor-pointer"
          >
            Open Dua Library →
          </button>
        </Surface>
      </div>

      {/* Last Activity Card */}
      {progress.lastActivity && lastConfig && (
        <Surface className="p-5 md:p-6 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-primary">Resume Last Activity</p>
            <h2 className="text-lg font-semibold text-foreground">
              {PRAYERS.find((p) => p.id === lastConfig.prayerId)?.name} · {lastConfig.categoryLabel}
            </h2>
            <p className="text-xs text-muted">
              {MADHHAB_META[lastConfig.madhhab].name} School · Rakat {progress.lastActivity.rakatNumber} ·
              Step {progress.lastActivity.stepIndex + 1}
            </p>
          </div>
          <Button onClick={onContinueLast}>
            <Play className="h-4 w-4" />
            Continue Learning
          </Button>
        </Surface>
      )}

      {/* Completed Sessions Log */}
      <Surface className="p-5 md:p-6 space-y-4">
        <div className="flex items-center gap-2">
          <BookCheck className="h-4 w-4 text-primary" />
          <h2 className="text-base font-semibold text-foreground">Completed Learning Sessions</h2>
        </div>

        {progress.completedSessions.length === 0 ? (
          <p className="text-sm text-muted">
            No completed learning sessions yet. Start any prayer from the Home Dashboard to track your progress.
          </p>
        ) : (
          <div className="divide-y divide-border/70">
            {progress.completedSessions.map((sess) => {
              const pName = PRAYERS.find((p) => p.id === sess.prayerId)?.name ?? sess.prayerId;
              const matchConfig = prayerConfigs.find(
                (c) =>
                  c.prayerId === sess.prayerId &&
                  c.madhhab === sess.madhhab &&
                  c.categoryLabel === sess.categoryLabel,
              );
              return (
                <div
                  key={sess.id}
                  className="py-3.5 flex flex-wrap items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-success mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {pName} — {sess.categoryLabel}
                      </p>
                      <p className="text-xs text-muted">
                        {MADHHAB_META[sess.madhhab].name} · {sess.rakatCount} Rakat ·{' '}
                        {new Date(sess.completedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  {matchConfig && (
                    <Button tone="quiet" onClick={() => onReviewSession(matchConfig)} className="min-h-9 px-3 text-xs">
                      Review Again
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Surface>
    </div>
  );
}
