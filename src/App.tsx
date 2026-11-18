import { Component, type ErrorInfo, type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { type User } from 'firebase/auth';
import { MotionConfig } from 'motion/react';
import {
  BookOpen,
  Clock,
  Compass,
  GraduationCap,
  Home,
  Menu,
  PersonStanding,
  Scale,
  Settings,
  X,
} from 'lucide-react';
import { PRAYER_TYPE_CONFIGS } from './data/prayers';
import { RECITATIONS } from './data/recitations';
import { AuthAccountBadge } from './components/AuthAccountBadge';
import { DuaLibraryView } from './components/DuaLibraryView';
import { GuidedPrayerPlayer } from './components/GuidedPrayerPlayer';
import { HomeDashboardView } from './components/HomeDashboardView';
import { LearningProgressView } from './components/LearningProgressView';
import { MadhhabComparisonView } from './components/MadhhabComparisonView';
import { MovementsLibraryView } from './components/MovementsLibraryView';
import { PrayerTimingsQiblaView } from './components/PrayerTimingsQiblaView';
import { SettingsAndAdminView } from './components/SettingsAndAdminView';
import { WelcomeSetupView } from './components/WelcomeSetupView';
import { Button, Surface } from './components/ui';
import {
  ensureUserProfileAndProgress,
  logCompletedSessionToFirestore,
  resetUserProgressInFirestore,
  signInWithGoogle,
  signOutUser,
  subscribeToAuth,
  subscribeToUserAccount,
  syncProgressSummaryToFirestore,
  syncUserPreferencesToFirestore,
} from './firebase';
import type {
  LearningProgressState,
  PoseId,
  PrayerId,
  PrayerTypeConfig,
  RecitationRecord,
  UserPreferences,
} from './types/namaz';
import {
  EMPTY_PROGRESS,
  loadCustomPrayerTypes,
  loadCustomRecitations,
  loadPreferences,
  loadProgress,
  saveCustomPrayerTypes,
  saveCustomRecitations,
  savePreferences,
  saveProgress,
} from './utils/storage';

type RouteId =
  | 'home'
  | 'player'
  | 'movements'
  | 'duas'
  | 'madhhabs'
  | 'timings'
  | 'qibla'
  | 'progress'
  | 'settings'
  | 'welcome';

class AppErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; message: string }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error.message || 'An unexpected error occurred.' };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Namaz Companion ErrorBoundary:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-dvh bg-background text-foreground flex items-center justify-center p-6">
          <Surface className="max-w-md w-full p-6 space-y-4" role="alert">
            <h1 className="font-display text-xl font-medium text-foreground">
              Something went wrong
            </h1>
            <p className="text-sm text-muted">{this.state.message}</p>
            <Button onClick={() => window.location.reload()}>Reload Application</Button>
          </Surface>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [signingIn, setSigningIn] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [prefs, setPrefs] = useState<UserPreferences>(() => loadPreferences());
  const [progress, setProgress] = useState<LearningProgressState>(() => loadProgress());
  const [recitationsMap, setRecitationsMap] = useState<Record<string, RecitationRecord>>(
    () => loadCustomRecitations() ?? RECITATIONS,
  );
  const [prayerConfigs, setPrayerConfigs] = useState<PrayerTypeConfig[]>(
    () => loadCustomPrayerTypes() ?? PRAYER_TYPE_CONFIGS,
  );

  const [route, setRoute] = useState<RouteId>('home');
  const [selectedPrayerId, setSelectedPrayerId] = useState<PrayerId | null>(null);
  const [activeConfig, setActiveConfig] = useState<PrayerTypeConfig | null>(null);
  const [playerInitialStep, setPlayerInitialStep] = useState<number>(0);
  const [playerStartPrep, setPlayerStartPrep] = useState<boolean>(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const authUidRef = useRef<string | null>(null);
  const stepSyncTimerRef = useRef<number | null>(null);

  // Sync display theme attribute on <html>
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', prefs.theme);
  }, [prefs.theme]);

  // Listen for Google Authentication changes
  useEffect(() => {
    const unsub = subscribeToAuth((user) => {
      authUidRef.current = user?.uid ?? null;
      setAuthUser(user);
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  // Load local per-user cache and attach Firestore real-time listeners when authenticated
  useEffect(() => {
    if (authLoading) return;

    if (!authUser) {
      setPrefs(loadPreferences(null));
      setProgress(loadProgress(null));
      return;
    }

    const uid = authUser.uid;
    const cachedPrefs = loadPreferences(uid);
    setPrefs(cachedPrefs);
    setProgress(loadProgress(uid));

    let cancelled = false;
    let unsubAccount: (() => void) | null = null;

    void (async () => {
      try {
        await ensureUserProfileAndProgress(authUser, cachedPrefs);
        if (cancelled) return;
        setAuthError(null);
        unsubAccount = subscribeToUserAccount(uid, {
          onPrefsLoaded: (patch) => {
            if (cancelled) return;
            setPrefs((prev) => {
              const next = { ...prev, ...patch };
              savePreferences(next, uid);
              return next;
            });
          },
          onSummaryLoaded: (summary) => {
            if (cancelled) return;
            setProgress((prev) => {
              const next = {
                ...prev,
                learnedMovements: summary.learnedMovements,
                reviewedDuas: summary.reviewedDuas,
                lastActivity: summary.lastActivity,
              };
              saveProgress(next, uid);
              return next;
            });
          },
          onSessionsLoaded: (sessions) => {
            if (cancelled) return;
            setProgress((prev) => {
              const next = {
                ...prev,
                completedSessions: sessions,
              };
              saveProgress(next, uid);
              return next;
            });
          },
          onSyncError: (err) => {
            if (!cancelled) {
              setAuthError(err.message);
            }
          },
        });
      } catch (err) {
        if (!cancelled) {
          setAuthError(err instanceof Error ? err.message : 'Unable to sync account progress.');
        }
      }
    })();

    return () => {
      cancelled = true;
      unsubAccount?.();
      if (stepSyncTimerRef.current !== null) {
        window.clearTimeout(stepSyncTimerRef.current);
        stepSyncTimerRef.current = null;
      }
    };
  }, [authUser, authLoading]);

  const handleGoogleSignIn = useCallback(async () => {
    setSigningIn(true);
    setAuthError(null);
    try {
      await signInWithGoogle();
    } catch (err) {
      setAuthError(
        err instanceof Error ? err.message : 'Google sign-in failed. Please try again.',
      );
    } finally {
      setSigningIn(false);
    }
  }, []);

  const handleSignOut = useCallback(async () => {
    setAuthError(null);
    try {
      await signOutUser();
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Unable to sign out right now.');
    }
  }, []);

  const updatePrefs = useCallback((patch: Partial<UserPreferences>) => {
    const uid = authUidRef.current;
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      savePreferences(next, uid);
      if (uid) {
        void syncUserPreferencesToFirestore(uid, next).catch((err) => {
          setAuthError(err instanceof Error ? err.message : 'Failed to save preferences.');
        });
      }
      return next;
    });
  }, []);

  const updateProgress = useCallback(
    (updater: (prev: LearningProgressState) => LearningProgressState) => {
      const uid = authUidRef.current;
      setProgress((prev) => {
        const next = updater(prev);
        saveProgress(next, uid);
        return next;
      });
    },
    [],
  );

  const handleStartPrayerType = (config: PrayerTypeConfig, startPrep = true, stepIdx = 0) => {
    setActiveConfig(config);
    setPlayerInitialStep(stepIdx);
    setPlayerStartPrep(startPrep);
    setRoute('player');
    setMobileMenuOpen(false);
  };

  const handleContinueLearning = () => {
    if (progress.lastActivity) {
      const match = prayerConfigs.find((c) => c.id === progress.lastActivity!.prayerTypeId);
      if (match) {
        handleStartPrayerType(match, false, progress.lastActivity.stepIndex);
        return;
      }
    }
    const defaultFajr =
      prayerConfigs.find((c) => c.prayerId === 'fajr' && c.madhhab === prefs.madhhab) ??
      prayerConfigs[0];
    handleStartPrayerType(defaultFajr, true, 0);
  };

  const handleStepChange = useCallback(
    (rakatNumber: number, stepIndex: number) => {
      if (!activeConfig) return;
      const uid = authUidRef.current;
      setProgress((prev) => {
        const next: LearningProgressState = {
          ...prev,
          lastActivity: {
            prayerId: activeConfig.prayerId,
            prayerTypeId: activeConfig.id,
            rakatNumber,
            stepIndex,
            timestamp: new Date().toISOString(),
          },
        };
        saveProgress(next, uid);

        if (uid) {
          if (stepSyncTimerRef.current !== null) {
            window.clearTimeout(stepSyncTimerRef.current);
          }
          stepSyncTimerRef.current = window.setTimeout(() => {
            void syncProgressSummaryToFirestore(uid, next).catch((err) => {
              setAuthError(err instanceof Error ? err.message : 'Failed to sync step progress.');
            });
          }, 500);
        }
        return next;
      });
    },
    [activeConfig],
  );

  const handleCompleteSession = useCallback((config: PrayerTypeConfig) => {
    const uid = authUidRef.current;
    const completedAt = new Date().toISOString();
    const sessionId = `${config.id}_${Date.now()}`;
    const newEntry = {
      id: sessionId,
      prayerId: config.prayerId,
      categoryLabel: config.categoryLabel,
      madhhab: config.madhhab,
      rakatCount: config.rakatCount,
      completedAt,
    };

    setProgress((prev) => {
      const next: LearningProgressState = {
        ...prev,
        completedSessions: [newEntry, ...prev.completedSessions].slice(0, 50),
      };
      saveProgress(next, uid);
      return next;
    });

    if (uid) {
      void logCompletedSessionToFirestore(uid, {
        ...newEntry,
        prayerTypeId: config.id,
      }).catch((err) => {
        setAuthError(err instanceof Error ? err.message : 'Failed to log completed prayer.');
      });
    }
  }, []);

  const handleMarkMovementLearned = useCallback((pose: PoseId) => {
    const uid = authUidRef.current;
    setProgress((prev) => {
      if (prev.learnedMovements.includes(pose)) return prev;
      const next: LearningProgressState = {
        ...prev,
        learnedMovements: [...prev.learnedMovements, pose],
      };
      saveProgress(next, uid);
      if (uid) {
        void syncProgressSummaryToFirestore(uid, next).catch((err) => {
          setAuthError(err instanceof Error ? err.message : 'Failed to sync movement progress.');
        });
      }
      return next;
    });
  }, []);

  const handleMarkDuaReviewed = useCallback((id: string) => {
    const uid = authUidRef.current;
    setProgress((prev) => {
      if (prev.reviewedDuas.includes(id)) return prev;
      const next: LearningProgressState = {
        ...prev,
        reviewedDuas: [...prev.reviewedDuas, id],
      };
      saveProgress(next, uid);
      if (uid) {
        void syncProgressSummaryToFirestore(uid, next).catch((err) => {
          setAuthError(err instanceof Error ? err.message : 'Failed to sync Dua progress.');
        });
      }
      return next;
    });
  }, []);

  const handleResetProgress = useCallback(() => {
    const uid = authUidRef.current;
    const existingIds = progress.completedSessions.map((s) => s.id);
    updateProgress(() => EMPTY_PROGRESS);
    if (uid) {
      void resetUserProgressInFirestore(uid, existingIds).catch((err) => {
        setAuthError(err instanceof Error ? err.message : 'Failed to reset cloud progress.');
      });
    }
  }, [progress.completedSessions, updateProgress]);

  const handleUpdateRecitation = (id: string, patch: Partial<RecitationRecord>) => {
    setRecitationsMap((prev) => {
      const next = { ...prev, [id]: { ...prev[id], ...patch } };
      saveCustomRecitations(next);
      return next;
    });
  };

  const handleUpdatePrayerConfig = (id: string, patch: Partial<PrayerTypeConfig>) => {
    setPrayerConfigs((prev) => {
      const next = prev.map((c) => (c.id === id ? { ...c, ...patch } : c));
      saveCustomPrayerTypes(next);
      return next;
    });
  };

  const handleResetAdminContent = () => {
    setRecitationsMap(RECITATIONS);
    setPrayerConfigs(PRAYER_TYPE_CONFIGS);
    saveCustomRecitations(RECITATIONS);
    saveCustomPrayerTypes(PRAYER_TYPE_CONFIGS);
  };

  const navItems: Array<{ id: RouteId; label: string; icon: typeof Home }> = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'movements', label: 'Movements', icon: PersonStanding },
    { id: 'duas', label: 'Duas & Surahs', icon: BookOpen },
    { id: 'madhhabs', label: 'Madhhabs', icon: Scale },
    { id: 'timings', label: 'Timings', icon: Clock },
    { id: 'qibla', label: 'Qibla', icon: Compass },
    { id: 'progress', label: 'Progress', icon: GraduationCap },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const navigate = (nextRoute: RouteId) => {
    if (nextRoute === 'home') {
      setSelectedPrayerId(null);
    }
    setRoute(nextRoute);
    setMobileMenuOpen(false);
  };

  return (
    <AppErrorBoundary>
      <MotionConfig reducedMotion="user">
        <div className="min-h-dvh flex flex-col bg-background text-foreground">
          {/* Primary Single-Shell Top Bar */}
          <header className="sticky top-0 z-30 border-b border-border/80 bg-surface">
            <div className="mx-auto flex max-w-[90rem] items-center justify-between gap-4 px-4 sm:px-6 py-2.5">
              <button
                type="button"
                onClick={() => navigate('home')}
                className="flex items-center gap-2.5 text-left shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-primary rounded-control"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-control bg-primary text-primary-foreground font-arabic text-xl">
                  ص
                </span>
                <div>
                  <span className="block text-base font-semibold text-foreground leading-tight whitespace-nowrap">
                    Namaz Companion
                  </span>
                  <span className="block text-[11px] text-muted leading-tight whitespace-nowrap">
                    Learn. Listen. Pray.
                  </span>
                </div>
              </button>

              {/* Desktop Navigation + Google Account */}
              <div className="hidden md:flex items-center gap-2 flex-wrap justify-end">
                <nav aria-label="Primary Navigation" className="flex items-center gap-1 flex-wrap justify-end">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const active =
                      route === item.id ||
                      (route === 'player' && item.id === 'home');
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => navigate(item.id)}
                        className={`inline-flex min-h-10 items-center gap-1.5 whitespace-nowrap rounded-control px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                          active
                            ? 'bg-primary text-primary-foreground'
                            : 'text-foreground hover:bg-surface-alt'
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {item.label}
                      </button>
                    );
                  })}
                </nav>
                <AuthAccountBadge
                  user={authUser}
                  authLoading={authLoading}
                  signingIn={signingIn}
                  onSignIn={handleGoogleSignIn}
                  onSignOut={handleSignOut}
                />
              </div>

              {/* Mobile Controls */}
              <div className="md:hidden flex items-center gap-2">
                <AuthAccountBadge
                  user={authUser}
                  authLoading={authLoading}
                  signingIn={signingIn}
                  onSignIn={handleGoogleSignIn}
                  onSignOut={handleSignOut}
                />
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen((v) => !v)}
                  aria-label="Toggle Menu"
                  aria-expanded={mobileMenuOpen}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-control border border-border bg-surface text-foreground cursor-pointer"
                >
                  {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Mobile Dropdown Nav */}
            {mobileMenuOpen && (
              <nav
                aria-label="Mobile Navigation"
                className="md:hidden border-t border-border/70 bg-surface px-4 py-3 grid grid-cols-2 gap-2"
              >
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const active = route === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => navigate(item.id)}
                      className={`inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-control px-3 text-xs font-medium border cursor-pointer ${
                        active
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-surface-alt text-foreground border-border/70'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </button>
                  );
                })}
              </nav>
            )}
          </header>

          {/* Main Workspace */}
          <main className="mx-auto w-full max-w-[90rem] flex-1 px-4 sm:px-6 py-6">
            {authError && (
              <div
                role="alert"
                className="mb-4 rounded-control border border-accent/60 bg-surface-alt px-4 py-2.5 text-xs text-foreground flex items-center justify-between gap-3"
              >
                <span>Account sync notice: {authError}</span>
                <button
                  type="button"
                  onClick={() => setAuthError(null)}
                  className="text-primary font-medium hover:underline cursor-pointer shrink-0"
                >
                  Dismiss
                </button>
              </div>
            )}

            {route === 'welcome' && (
              <WelcomeSetupView
                prefs={prefs}
                onUpdatePrefs={updatePrefs}
                onComplete={() => navigate('home')}
              />
            )}

            {route === 'home' && (
              <HomeDashboardView
                prefs={prefs}
                progress={progress}
                prayerConfigs={prayerConfigs}
                selectedPrayerId={selectedPrayerId}
                onSelectPrayer={setSelectedPrayerId}
                onStartPrayerType={(cfg) => handleStartPrayerType(cfg, true, 0)}
                onContinueLearning={handleContinueLearning}
                onOpenMovements={() => navigate('movements')}
                onOpenDuas={() => navigate('duas')}
                onOpenTimings={() => navigate('timings')}
                onOpenQibla={() => navigate('qibla')}
                onOpenMadhhabs={() => navigate('madhhabs')}
                onOpenWelcomeSetup={() => navigate('welcome')}
              />
            )}

            {route === 'player' && activeConfig && (
              <GuidedPrayerPlayer
                config={activeConfig}
                prefs={prefs}
                recitationsMap={recitationsMap}
                initialStepIndex={playerInitialStep}
                startInPrep={playerStartPrep}
                onUpdatePrefs={updatePrefs}
                onStepChange={handleStepChange}
                onCompleteSession={handleCompleteSession}
                onBack={() => {
                  setRoute('home');
                }}
              />
            )}

            {route === 'movements' && (
              <MovementsLibraryView
                prefs={prefs}
                learnedMovements={progress.learnedMovements}
                onUpdatePrefs={updatePrefs}
                onMarkLearned={handleMarkMovementLearned}
              />
            )}

            {route === 'duas' && (
              <DuaLibraryView
                recitationsMap={recitationsMap}
                prefs={prefs}
                reviewedDuas={progress.reviewedDuas}
                onMarkReviewed={handleMarkDuaReviewed}
              />
            )}

            {route === 'madhhabs' && (
              <MadhhabComparisonView
                selectedMadhhab={prefs.madhhab}
                onSelectMadhhab={(m) => updatePrefs({ madhhab: m })}
              />
            )}

            {(route === 'timings' || route === 'qibla') && (
              <PrayerTimingsQiblaView
                prefs={prefs}
                initialTab={route === 'qibla' ? 'qibla' : 'timings'}
                onUpdatePrefs={updatePrefs}
              />
            )}

            {route === 'progress' && (
              <LearningProgressView
                progress={progress}
                recitationsMap={recitationsMap}
                prayerConfigs={prayerConfigs}
                authUser={authUser}
                signingIn={signingIn}
                onSignIn={handleGoogleSignIn}
                onSignOut={handleSignOut}
                onContinueLast={handleContinueLearning}
                onReviewSession={(cfg) => handleStartPrayerType(cfg, false, 0)}
                onNavigateMovements={() => navigate('movements')}
                onNavigateDuas={() => navigate('duas')}
                onResetProgress={handleResetProgress}
              />
            )}

            {route === 'settings' && (
              <SettingsAndAdminView
                prefs={prefs}
                recitationsMap={recitationsMap}
                prayerConfigs={prayerConfigs}
                authUser={authUser}
                signingIn={signingIn}
                onSignIn={handleGoogleSignIn}
                onSignOut={handleSignOut}
                onUpdatePrefs={updatePrefs}
                onUpdateRecitation={handleUpdateRecitation}
                onUpdatePrayerConfig={handleUpdatePrayerConfig}
                onResetAdminContent={handleResetAdminContent}
                onOpenSetupWizard={() => navigate('welcome')}
              />
            )}
          </main>

          {/* Calm Sanctuary Footer */}
          <footer className="border-t border-border/70 bg-surface py-4 px-4 sm:px-6 text-xs text-muted">
            <div className="mx-auto max-w-[90rem] flex flex-wrap items-center justify-between gap-2">
              <span>
                Namaz Companion · Visual & audio educational guide for the five daily prayers
              </span>
              <span>
                Educational practice companion — does not replace an Imam or verify real-world prayer validity
              </span>
            </div>
          </footer>
        </div>
      </MotionConfig>
    </AppErrorBoundary>
  );
}
