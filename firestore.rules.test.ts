export interface SecurityTestCase {
  id: number;
  name: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  path: string;
  auth: { uid: string; emailVerified: boolean } | null;
  payload?: Record<string, unknown>;
  expected: 'PERMISSION_DENIED' | 'ALLOWED';
  enforcingGate: string;
}

export const DIRTY_DOZEN_SECURITY_TESTS: SecurityTestCase[] = [
  {
    id: 1,
    name: 'Unauthenticated read on user profile',
    operation: 'get',
    path: '/users/alice',
    auth: null,
    expected: 'PERMISSION_DENIED',
    enforcingGate: 'isVerifiedUser() requires request.auth != null',
  },
  {
    id: 2,
    name: 'Unverified email spoof on user profile create',
    operation: 'create',
    path: '/users/alice',
    auth: { uid: 'alice', emailVerified: false },
    payload: { uid: 'alice', displayName: 'Alice', email: 'alice@example.com' },
    expected: 'PERMISSION_DENIED',
    enforcingGate: 'request.auth.token.email_verified == true',
  },
  {
    id: 3,
    name: 'Cross-user PII read attempt',
    operation: 'get',
    path: '/users/alice',
    auth: { uid: 'bob', emailVerified: true },
    expected: 'PERMISSION_DENIED',
    enforcingGate: 'isVerifiedOwner(userId) checks request.auth.uid == userId',
  },
  {
    id: 4,
    name: 'UID spoofing inside payload',
    operation: 'create',
    path: '/users/bob',
    auth: { uid: 'bob', emailVerified: true },
    payload: { uid: 'alice', displayName: 'Bob', email: 'bob@example.com' },
    expected: 'PERMISSION_DENIED',
    enforcingGate: 'data.uid == request.auth.uid',
  },
  {
    id: 5,
    name: 'Shadow ghost field injection (isAdmin)',
    operation: 'create',
    path: '/users/alice',
    auth: { uid: 'alice', emailVerified: true },
    payload: { uid: 'alice', displayName: 'Alice', email: 'alice@example.com', isAdmin: true },
    expected: 'PERMISSION_DENIED',
    enforcingGate: 'data.keys().hasOnly([...]) rejects undeclared fields',
  },
  {
    id: 6,
    name: 'Path ID poisoning on session creation',
    operation: 'create',
    path: '/users/alice/sessions/invalid$id!',
    auth: { uid: 'alice', emailVerified: true },
    expected: 'PERMISSION_DENIED',
    enforcingGate: "isValidId(sessionId) enforces ^[a-zA-Z0-9_\\-]+$ and <= 128 chars",
  },
  {
    id: 7,
    name: 'Unbounded array resource exhaustion in progress summary',
    operation: 'update',
    path: '/users/alice/progress/summary',
    auth: { uid: 'alice', emailVerified: true },
    payload: { learnedMovements: Array.from({ length: 25 }, (_, i) => `pose_${i}`) },
    expected: 'PERMISSION_DENIED',
    enforcingGate: 'data.learnedMovements.size() <= 20',
  },
  {
    id: 8,
    name: 'Array element type poisoning in progress summary',
    operation: 'update',
    path: '/users/alice/progress/summary',
    auth: { uid: 'alice', emailVerified: true },
    payload: { learnedMovements: [12345] },
    expected: 'PERMISSION_DENIED',
    enforcingGate: 'isValidString(data.learnedMovements[0], 1, 32)',
  },
  {
    id: 9,
    name: 'Client timestamp forgery on completed session',
    operation: 'create',
    path: '/users/alice/sessions/sess_1',
    auth: { uid: 'alice', emailVerified: true },
    payload: { createdAt: '2020-01-01T00:00:00Z' },
    expected: 'PERMISSION_DENIED',
    enforcingGate: 'incoming().createdAt == request.time',
  },
  {
    id: 10,
    name: 'Immutable createdAt mutation on profile update',
    operation: 'update',
    path: '/users/alice',
    auth: { uid: 'alice', emailVerified: true },
    payload: { createdAt: 'request.time' },
    expected: 'PERMISSION_DENIED',
    enforcingGate: 'incoming().createdAt == existing().createdAt',
  },
  {
    id: 11,
    name: 'Orphaned subcollection write without parent user profile',
    operation: 'create',
    path: '/users/alice/sessions/sess_1',
    auth: { uid: 'alice', emailVerified: true },
    expected: 'PERMISSION_DENIED',
    enforcingGate: 'Master Gate get(/databases/$(database)/documents/users/$(userId)).data.uid == request.auth.uid',
  },
  {
    id: 12,
    name: 'Cross-user session list scraping',
    operation: 'list',
    path: '/users/alice/sessions',
    auth: { uid: 'bob', emailVerified: true },
    expected: 'PERMISSION_DENIED',
    enforcingGate: 'isVerifiedOwner(userId) && resource.data.uid == request.auth.uid',
  },
];
