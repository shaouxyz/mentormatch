# Newly Added Tests – Run Report

**Generated:** 2026-02-06  
**Command:** `npx jest components/__tests__/ErrorBoundary.test.tsx services/__tests__/hybridRequestService.test.ts app/__tests__/mentorship.test.tsx --runInBand --no-coverage --verbose`

---

## Summary

| Metric | Value |
|--------|--------|
| **Result** | All passed |
| **Test Suites** | 3 passed, 3 total |
| **Tests** | 61 passed, 61 total |
| **Snapshots** | 0 |
| **Time** | ~3.4 s |

---

## Test Suites & Tests

### 1. `app/__tests__/mentorship.test.tsx` (MentorshipScreen)

| # | Test | Status |
|---|------|--------|
| 1 | should render mentors and mentees sections | PASS |
| 2 | should display mentors when user has accepted requests | PASS |
| 3 | should display mentees when user accepted requests | PASS |
| 4 | should show empty state when no mentors | PASS |
| 5 | should show empty state when no mentees | PASS |
| 6 | should navigate to profile view when mentor card is pressed | PASS |
| 7 | should navigate to profile view when mentee card is pressed | PASS |
| 8 | Unmatch (5.1.12): call hybridUpdateRequestStatus(declined) and reload when Unmatch mentor confirmed | PASS |
| 9 | Unmatch (5.1.13): call hybridUpdateRequestStatus(declined) when Unmatch mentee confirmed | PASS |
| 10 | Unmatch (5.1.14): do not call hybridUpdateRequestStatus when Cancel tapped | PASS |
| 11 | Unmatch (5.1.15): show error alert when hybridUpdateRequestStatus fails | PASS |
| … | (other existing mentorship tests) | PASS |

**Newly added in this run:** Unmatch block 5.1.12–5.1.15 (4 tests).

### 2. `services/__tests__/hybridRequestService.test.ts` (Hybrid Request Service – Section 26.19.5)

| # | Test | Status |
|---|------|--------|
| 1 | should return local requests when Firebase is not configured | PASS |
| 2 | should use Firebase when configured and return merged data | PASS |
| 3 | should fallback to local when Firebase fails | PASS |
| 4 | should update local request status when Firebase not configured | PASS |
| 5 | should call declineFirebaseRequest when Firebase configured and status is declined | PASS |
| 6 | should not throw when Firebase sync fails after local update | PASS |
| 7 | should throw when local update fails | PASS |
| 8 | should return local requests by status when Firebase not configured | PASS |
| 9 | should fallback to local when Firebase get by status fails | PASS |
| 10 | should return local request when Firebase not configured (getById) | PASS |
| 11 | should return null for nonexistent id | PASS |
| 12 | isFirebaseSyncAvailable: return false when Firebase not configured | PASS |
| 13 | isFirebaseSyncAvailable: return true when Firebase configured | PASS |

### 3. `components/__tests__/ErrorBoundary.test.tsx` (ErrorBoundary – Section 8.3)

| # | Test | Status |
|---|------|--------|
| 1 | should catch child error and show default fallback UI | PASS |
| 2 | should render children when no error | PASS |
| 3 | should reset state and re-render children when Try Again is pressed | PASS |
| 4 | should have accessibility labels on Retry button | PASS |
| 5 | should render custom fallback when provided | PASS |
| 6 | should show error message and componentStack when __DEV__ is true | PASS |

---

## Failed Tests

**None.** All 61 tests passed.

---

## Key Log / Debug Info for Later

Use this when debugging future failures in these tests.

### Environment

- **Runner:** Jest, `--runInBand` (single worker).
- **Mocks in play:**
  - `config/firebase.config`: `isFirebaseConfigured` (default `false` in most tests).
  - `services/firebaseRequestService`: full mock (no real Firebase) in `hybridRequestService.test.ts`.
  - `services/hybridRequestService`: `hybridGetAllRequestsForUser`, `hybridUpdateRequestStatus` in `mentorship.test.tsx`.
  - `Alert.alert`: mocked in mentorship Unmatch tests so confirm/cancel can be invoked.

### Mentorship / Unmatch

- **Alert.alert calls:** `(title, message, buttons)`. Confirm = `buttons[1].onPress()`, Cancel = `buttons[0]`.
- **Unmatch flow:** Tap "Unmatch mentor" or "Unmatch mentee" (by `accessibilityLabel`) → Alert → confirm calls `hybridUpdateRequestStatus(requestId, 'declined')` then `loadConnections()` (so `hybridGetAllRequestsForUser` is called again).
- **Failure case:** If `hybridUpdateRequestStatus` rejects, expect `Alert.alert('Error', 'Failed to unmatch. Please try again.')` and `logger.error('Unmatch failed', ...)`.

### Hybrid Request Service

- **Firebase not loaded:** `firebaseRequestService` is mocked with an explicit factory so `firebase/firestore` (ESM) is never required; otherwise Jest can throw "Unexpected token 'export'".
- **Local storage key:** `STORAGE_KEYS.MENTORSHIP_REQUESTS` (e.g. `mentorshipRequests`) for request list in AsyncStorage.
- **Request shape:** Must include `id`, `requesterEmail`, `mentorEmail`, `status`, etc., for `requestService.updateRequestStatus` / schema.

### ErrorBoundary

- **Throwing child:** Use a component that throws when a prop (e.g. `shouldThrow`) is true so the boundary catches and shows fallback.
- **__DEV__:** Set `(global as any).__DEV__` in test if you need to assert on DEV-only error details; default in Jest setup is often `true`.

### Re-run Only These Tests

```bash
npx jest components/__tests__/ErrorBoundary.test.tsx services/__tests__/hybridRequestService.test.ts app/__tests__/mentorship.test.tsx --runInBand --no-coverage --verbose
```

### If Something Fails Next Time

1. Check **failed test name** and **file:line** in Jest output.
2. For **mentorship:** ensure `hybridUpdateRequestStatus` and `hybridGetAllRequestsForUser` are mocked and `Alert.alert` mock is in place; confirm button = second button.
3. For **hybridRequestService:** ensure `firebaseRequestService` is mocked with a **factory** (not just `jest.mock('../firebaseRequestService')`) so Firebase is never loaded.
4. For **ErrorBoundary:** ensure a child component actually throws during render (e.g. conditional throw); class component lifecycle (getDerivedStateFromError, componentDidCatch) runs only on child throw.

---

**End of report.**
