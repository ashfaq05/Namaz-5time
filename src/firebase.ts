import { initializeApp } from 'firebase/app';
import {
  GoogleAuthProvider,
  type User,
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocFromServer,
  getFirestore,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import type {
  LearningProgressState,
  MadhhabId,
  PlaybackSpeed,
  PoseId,
  PrayerId,
  UserPreferences,
  VoiceGender,
} from './types/namaz';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null,
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
void testConnection();

export function subscribeToAuth(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}

export async function signInWithGoogle(): Promise<User | null> {
  try {
    const cred = await signInWithPopup(auth, googleProvider);
    return cred.user;
  } catch (error) {
    const code = (error as { code?: string })?.code ?? '';
    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
      return null;
    }
    throw error;
  }
}

export async function signOutUser(): Promise<void> {
  await signOut(auth);
}

function sanitizeId(raw: string, fallback = 'item'): string {
  const clean = raw.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80);
  return clean.length > 0 ? clean : fallback;
}

export async function ensureUserProfileAndProgress(
  user: User,
  fallbackPrefs: UserPreferences,
): Promise<void> {
  const uid = user.uid;
  const userPath = `users/${uid}`;
  const userRef = doc(db, 'users', uid);

  let userSnap;
  try {
    userSnap = await getDoc(userRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, userPath);
  }

  const displayName = (user.displayName || user.email?.split('@')[0] || 'Learner').slice(0, 120);
  const email = (user.email || '').slice(0, 254);
  const photoURL = (user.photoURL || '').slice(0, 500);

  if (!userSnap.exists()) {
    try {
      await setDoc(userRef, {
        uid,
        displayName,
        email,
        photoURL,
        madhhab: fallbackPrefs.madhhab,
        primaryLanguage: fallbackPrefs.primaryLanguage,
        voiceGender: fallbackPrefs.voiceGender,
        playbackSpeed: fallbackPrefs.playbackSpeed,
        characterModel: fallbackPrefs.characterModel,
        theme: fallbackPrefs.theme,
        hasCompletedSetup: fallbackPrefs.hasCompletedSetup,
        timeZone: (fallbackPrefs.timeZone || 'auto').slice(0, 64),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, userPath);
    }
  } else {
    const existing = userSnap.data();
    if (
      existing.displayName !== displayName ||
      existing.email !== email ||
      (existing.photoURL ?? '') !== photoURL
    ) {
      try {
        await updateDoc(userRef, {
          displayName,
          email,
          photoURL,
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, userPath);
      }
    }
  }

  const summaryPath = `users/${uid}/progress/summary`;
  const summaryRef = doc(db, 'users', uid, 'progress', 'summary');
  let summarySnap;
  try {
    summarySnap = await getDoc(summaryRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, summaryPath);
  }

  if (!summarySnap.exists()) {
    try {
      await setDoc(summaryRef, {
        uid,
        learnedMovements: [],
        reviewedDuas: [],
        lastPrayerId: '',
        lastPrayerTypeId: '',
        lastRakatNumber: 0,
        lastStepIndex: 0,
        lastActivityTimestamp: '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, summaryPath);
    }
  }
}

export async function syncUserPreferencesToFirestore(
  uid: string,
  prefs: UserPreferences,
): Promise<void> {
  const path = `users/${uid}`;
  try {
    await updateDoc(doc(db, 'users', uid), {
      madhhab: prefs.madhhab,
      primaryLanguage: prefs.primaryLanguage,
      voiceGender: prefs.voiceGender,
      playbackSpeed: prefs.playbackSpeed,
      characterModel: prefs.characterModel,
      theme: prefs.theme,
      hasCompletedSetup: prefs.hasCompletedSetup,
      timeZone: (prefs.timeZone || 'auto').slice(0, 64),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function syncProgressSummaryToFirestore(
  uid: string,
  progress: LearningProgressState,
): Promise<void> {
  const path = `users/${uid}/progress/summary`;
  const learnedMovements = progress.learnedMovements
    .map((m) => String(m).slice(0, 32))
    .slice(0, 20);
  const reviewedDuas = progress.reviewedDuas.map((d) => String(d).slice(0, 64)).slice(0, 100);

  const payload: Record<string, unknown> = {
    learnedMovements,
    reviewedDuas,
    lastPrayerId: progress.lastActivity ? progress.lastActivity.prayerId.slice(0, 24) : '',
    lastPrayerTypeId: progress.lastActivity
      ? progress.lastActivity.prayerTypeId.slice(0, 80)
      : '',
    lastRakatNumber: progress.lastActivity
      ? Math.max(0, Math.min(20, Math.round(progress.lastActivity.rakatNumber)))
      : 0,
    lastStepIndex: progress.lastActivity
      ? Math.max(0, Math.min(300, Math.round(progress.lastActivity.stepIndex)))
      : 0,
    lastActivityTimestamp: progress.lastActivity
      ? progress.lastActivity.timestamp.slice(0, 40)
      : '',
    updatedAt: serverTimestamp(),
  };

  try {
    await updateDoc(doc(db, 'users', uid, 'progress', 'summary'), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function logCompletedSessionToFirestore(
  uid: string,
  session: {
    id: string;
    prayerId: PrayerId;
    prayerTypeId: string;
    categoryLabel: string;
    madhhab: MadhhabId;
    rakatCount: number;
    completedAt: string;
  },
): Promise<void> {
  const safeDocId = sanitizeId(session.id, `sess_${Date.now()}`);
  const path = `users/${uid}/sessions/${safeDocId}`;
  try {
    await setDoc(doc(db, 'users', uid, 'sessions', safeDocId), {
      uid,
      prayerId: session.prayerId,
      prayerTypeId: sanitizeId(session.prayerTypeId, session.prayerId),
      categoryLabel: session.categoryLabel.slice(0, 120) || 'Prayer Session',
      madhhab: session.madhhab,
      rakatCount: Math.max(1, Math.min(20, Math.round(session.rakatCount))),
      completedAt: session.completedAt.slice(0, 40),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function resetUserProgressInFirestore(
  uid: string,
  sessionIds: string[],
): Promise<void> {
  const summaryPath = `users/${uid}/progress/summary`;
  try {
    const batch = writeBatch(db);
    batch.update(doc(db, 'users', uid, 'progress', 'summary'), {
      learnedMovements: [],
      reviewedDuas: [],
      lastPrayerId: '',
      lastPrayerTypeId: '',
      lastRakatNumber: 0,
      lastStepIndex: 0,
      lastActivityTimestamp: '',
      updatedAt: serverTimestamp(),
    });
    for (const sid of sessionIds.slice(0, 450)) {
      const safeId = sanitizeId(sid, '');
      if (safeId) {
        batch.delete(doc(db, 'users', uid, 'sessions', safeId));
      }
    }
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, summaryPath);
  }
}

const VALID_SPEEDS: PlaybackSpeed[] = [0.25, 0.5, 0.75, 1, 1.25];
const VALID_MODELS = ['embroidered_thobe', 'gulf_ghutra', 'classic_emerald'] as const;

export function subscribeToUserAccount(
  uid: string,
  callbacks: {
    onPrefsLoaded: (patch: Partial<UserPreferences>) => void;
    onSummaryLoaded: (summary: {
      learnedMovements: PoseId[];
      reviewedDuas: string[];
      lastActivity: LearningProgressState['lastActivity'];
    }) => void;
    onSessionsLoaded: (sessions: LearningProgressState['completedSessions']) => void;
    onSyncError: (err: Error) => void;
  },
): () => void {
  const userPath = `users/${uid}`;
  const unsubUser = onSnapshot(
    doc(db, 'users', uid),
    (snap) => {
      if (!snap.exists()) return;
      const d = snap.data();
      const patch: Partial<UserPreferences> = {};
      if (
        d.madhhab === 'hanafi' ||
        d.madhhab === 'shafii' ||
        d.madhhab === 'maliki' ||
        d.madhhab === 'hanbali'
      ) {
        patch.madhhab = d.madhhab;
      }
      if (d.primaryLanguage === 'en' || d.primaryLanguage === 'hi' || d.primaryLanguage === 'ur') {
        patch.primaryLanguage = d.primaryLanguage;
      }
      if (d.voiceGender === 'male' || d.voiceGender === 'female') {
        patch.voiceGender = d.voiceGender as VoiceGender;
      }
      if (typeof d.playbackSpeed === 'number' && VALID_SPEEDS.includes(d.playbackSpeed as PlaybackSpeed)) {
        patch.playbackSpeed = d.playbackSpeed as PlaybackSpeed;
      }
      if (
        typeof d.characterModel === 'string' &&
        (VALID_MODELS as readonly string[]).includes(d.characterModel)
      ) {
        patch.characterModel = d.characterModel as UserPreferences['characterModel'];
      }
      if (d.theme === 'light' || d.theme === 'dark') {
        patch.theme = d.theme;
      }
      if (typeof d.hasCompletedSetup === 'boolean') {
        patch.hasCompletedSetup = d.hasCompletedSetup;
      }
      if (typeof d.timeZone === 'string' && d.timeZone.length >= 1 && d.timeZone.length <= 64) {
        patch.timeZone = d.timeZone;
      }
      callbacks.onPrefsLoaded(patch);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, userPath);
      } catch (e) {
        callbacks.onSyncError(e as Error);
      }
    },
  );

  const summaryPath = `users/${uid}/progress/summary`;
  const unsubSummary = onSnapshot(
    doc(db, 'users', uid, 'progress', 'summary'),
    (snap) => {
      if (!snap.exists()) return;
      const d = snap.data();
      const learnedMovements = Array.isArray(d.learnedMovements)
        ? (d.learnedMovements as PoseId[])
        : [];
      const reviewedDuas = Array.isArray(d.reviewedDuas) ? (d.reviewedDuas as string[]) : [];
      const lastActivity: LearningProgressState['lastActivity'] =
        d.lastPrayerId && d.lastPrayerTypeId
          ? {
              prayerId: d.lastPrayerId as PrayerId,
              prayerTypeId: String(d.lastPrayerTypeId),
              rakatNumber: typeof d.lastRakatNumber === 'number' ? d.lastRakatNumber : 1,
              stepIndex: typeof d.lastStepIndex === 'number' ? d.lastStepIndex : 0,
              timestamp:
                typeof d.lastActivityTimestamp === 'string' && d.lastActivityTimestamp
                  ? d.lastActivityTimestamp
                  : new Date().toISOString(),
            }
          : null;
      callbacks.onSummaryLoaded({
        learnedMovements,
        reviewedDuas,
        lastActivity,
      });
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, summaryPath);
      } catch (e) {
        callbacks.onSyncError(e as Error);
      }
    },
  );

  const sessionsPath = `users/${uid}/sessions`;
  const sessionsQuery = query(
    collection(db, 'users', uid, 'sessions'),
    where('uid', '==', uid),
    limit(100),
  );
  const unsubSessions = onSnapshot(
    sessionsQuery,
    (snap) => {
      const list: LearningProgressState['completedSessions'] = snap.docs
        .map((docSnap) => {
          const d = docSnap.data();
          return {
            id: docSnap.id,
            prayerId: (d.prayerId ?? 'fajr') as PrayerId,
            categoryLabel: String(d.categoryLabel ?? 'Prayer Session'),
            madhhab: (d.madhhab ?? 'hanafi') as MadhhabId,
            rakatCount: typeof d.rakatCount === 'number' ? d.rakatCount : 2,
            completedAt: String(d.completedAt ?? new Date().toISOString()),
          };
        })
        .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
        .slice(0, 50);
      callbacks.onSessionsLoaded(list);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, sessionsPath);
      } catch (e) {
        callbacks.onSyncError(e as Error);
      }
    },
  );

  return () => {
    unsubUser();
    unsubSummary();
    unsubSessions();
  };
}
