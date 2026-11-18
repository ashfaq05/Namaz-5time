# Security Specification — Namaz Companion

## 1. Data Invariants
1. **Strict Ownership & Verified Identity**: Every document under `/users/{userId}`, `/users/{userId}/progress/{progressId}`, and `/users/{userId}/sessions/{sessionId}` belongs exclusively to the verified Google account whose `request.auth.uid == userId` and `request.auth.token.email_verified == true`.
2. **PII Isolation**: User `email`, `displayName`, and `photoURL` live in `/users/{userId}` with `read` restricted strictly to the owner (`request.auth.uid == userId`); no blanket `isSignedIn()` reads exist anywhere.
3. **Master Gate for Subcollections**: Creating or updating `/users/{userId}/progress/{progressId}` or `/users/{userId}/sessions/{sessionId}` requires the parent `/users/{userId}` profile document to exist and have `uid == request.auth.uid`.
4. **Immutable Ownership & Timestamps**: `uid` and `createdAt` cannot be modified after creation (`incoming().uid == existing().uid && incoming().createdAt == existing().createdAt`); `createdAt` on create and `updatedAt` on update must equal `request.time`.
5. **Bounded Arrays & Strict Schemas**: `learnedMovements` (max 20 items) and `reviewedDuas` (max 100 items) have bounded lengths and element type checks; all strings have strict `.size()` bounds; ghost/shadow fields are rejected via `keys().hasOnly(...)` and `affectedKeys().hasOnly(...)`.
6. **Immutable Session Logs**: Completed prayer session records under `/users/{userId}/sessions/{sessionId}` are append-only (or deletable on progress reset by the owner), preventing post-hoc tampering with `prayerId`, `rakatCount`, or `createdAt`.

## 2. The "Dirty Dozen" Attack Payloads (All Must Return `PERMISSION_DENIED`)
1. **Unauthenticated Read/Write**: Read or write `/users/alice` with `request.auth == null`.
2. **Unverified Email Spoof**: Write `/users/alice` with `request.auth.uid == 'alice'` and `request.auth.token.email_verified == false`.
3. **Cross-User PII Snooping**: User `bob` (`uid: 'bob'`) tries `get(/users/alice)`.
4. **UID Spoofing on Create**: User `bob` writes `/users/bob` with `uid: 'alice'` in payload.
5. **Shadow / Ghost Field Injection**: User `alice` creates `/users/alice` with an extra field `isAdmin: true` or `role: 'admin'`.
6. **Path ID Poisoning**: User `alice` tries to write `/users/alice/sessions/invalid$id!` or a >128 char document ID.
7. **Unbounded Array / Resource Exhaustion**: User `alice` writes `/users/alice/progress/summary` with 25 items in `learnedMovements` or 101 items in `reviewedDuas`.
8. **Array Element Type Poisoning**: User `alice` writes `learnedMovements: [12345]` instead of strings.
9. **Client Timestamp Forgery**: User `alice` creates `/users/alice/sessions/s1` with a forged past `createdAt` instead of `request.time`.
10. **Immutable Field Mutation**: User `alice` updates `/users/alice` attempting to alter `createdAt` or `uid`.
11. **Orphaned Subcollection Write**: User `alice` creates `/users/alice/sessions/s1` before `/users/alice` profile exists (Master Gate blocks it).
12. **Cross-User Collection List Scraping**: User `bob` attempts `list(/users/alice/sessions)` — blocked because `request.auth.uid == userId` and `resource.data.uid == request.auth.uid` fail.
