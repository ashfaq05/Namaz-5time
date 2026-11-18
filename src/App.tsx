import { Component, type ErrorInfo, type ReactNode, useCallback, useEffect, useState } from 'react';
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
import type {
  LearningProgressState,
  PoseId,
  PrayerId,
  PrayerTypeConfig,
  RecitationRecord,
  UserPreferences,
} from './types/namaz';
import {
  DEFAULT_PROGRESS,
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

  // Sync display theme attribute on <html>
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', prefs.theme);
  }, [prefs.theme]);

  const updatePrefs = useCallback((patch: Partial<UserPreferences>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      savePreferences(next);
      return next;
    });
  }, []);

  const updateProgress = useCallback(
    (updater: (prev: LearningProgressState) => LearningProgressState) => {
      setProgress((prev) => {
        const next = updater(prev);
        saveProgress(next);
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
      updateProgress((prev) => ({
        ...prev,
        lastActivity: {
          prayerId: activeConfig.prayerId,
          prayerTypeId: activeConfig.id,
          rakatNumber,
          stepIndex,
          timestamp: new Date().toISOString(),
        },
      }));
    },
    [activeConfig, updateProgress],
  );

  const handleCompleteSession = useCallback(
    (config: PrayerTypeConfig) => {
      updateProgress((prev) => ({
        ...prev,
        completedSessions: [
          {
            id: `${config.id}_${Date.now()}`,
            prayerId: config.prayerId,
            categoryLabel: config.categoryLabel,
            madhhab: config.madhhab,
            rakatCount: config.rakatCount,
            completedAt: new Date().toISOString(),
          },
          ...prev.completedSessions,
        ].slice(0, 25),
      }));
    },
    [updateProgress],
  );

  const handleMarkMovementLearned = useCallback(
    (pose: PoseId) => {
      updateProgress((prev) =>
        prev.learnedMovements.includes(pose)
          ? prev
          : { ...prev, learnedMovements: [...prev.learnedMovements, pose] },
      );
    },
    [updateProgress],
  );

  const handleMarkDuaReviewed = useCallback(
    (id: string) => {
      updateProgress((prev) =>
        prev.reviewedDuas.includes(id)
          ? prev
          : { ...prev, reviewedDuas: [...prev.reviewedDuas, id] },
      );
    },
    [updateProgress],
  );

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

              {/* Desktop Navigation */}
              <nav aria-label="Primary Navigation" className="hidden md:flex items-center gap-1 flex-wrap justify-end">
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

              {/* Mobile Menu Toggle */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen((v) => !v)}
                aria-label="Toggle Menu"
                aria-expanded={mobileMenuOpen}
                className="md:hidden inline-flex h-11 w-11 items-center justify-center rounded-control border border-border bg-surface text-foreground cursor-pointer"
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
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
                onContinueLast={handleContinueLearning}
                onReviewSession={(cfg) => handleStartPrayerType(cfg, false, 0)}
                onNavigateMovements={() => navigate('movements')}
                onNavigateDuas={() => navigate('duas')}
                onResetProgress={() => {
                  setProgress(DEFAULT_PROGRESS);
                  saveProgress(DEFAULT_PROGRESS);
                }}
              />
            )}

            {route === 'settings' && (
              <SettingsAndAdminView
                prefs={prefs}
                recitationsMap={recitationsMap}
                prayerConfigs={prayerConfigs}
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
