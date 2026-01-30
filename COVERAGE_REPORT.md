# Code Coverage Report

**Generated:** 2026-01-26  
**Test Status:** 1351 passing, 15 failing  
**Test Suites:** 43 passing, 7 failing

## Overall Coverage Summary

| Metric | Current | Target | Gap | Status |
|--------|---------|--------|-----|--------|
| **Statements** | 95.59% | 100% | 4.41% | ❌ |
| **Branches** | 84.84% | 100% | 15.16% | ❌ |
| **Functions** | 95.36% | 100% | 4.64% | ❌ |
| **Lines** | 96.48% | 100% | 3.52% | ❌ |

## Coverage by Module

### App Components

| File | Statements | Branches | Functions | Lines | Uncovered Lines |
|------|-----------|----------|-----------|-------|------------------|
| `app/(tabs)/profile.tsx` | 98% | 83.33% | 100% | 100% | 57, 80-81 |
| `app/profile/*` | 95.16% | 76.71% | 89.28% | 95.58% | Various |

### Services

| File | Statements | Branches | Functions | Lines | Uncovered Lines |
|------|-----------|----------|-----------|-------|------------------|
| `services/firebaseProfileService.ts` | 100% | 100% | 100% | 100% | ✅ Complete |
| `services/hybridProfileService.ts` | 100% | 93.1% | 100% | 100% | 114, 174, 201, 254 |
| `services/profileService.ts` | 92% | 76.31% | 83.33% | 91.3% | 86, 114-115, 135 |

### Utils

| File | Statements | Branches | Functions | Lines | Uncovered Lines |
|------|-----------|----------|-----------|-------|------------------|
| `utils/caspaProfiles.ts` | 100% | 80% | 100% | 100% | 371, 395 |
| `utils/profileOrdering.ts` | 96.87% | 90.9% | 100% | 96.49% | 75, 154 |

## Key Coverage Gaps

### 1. Branch Coverage (84.84% - Largest Gap)

**Priority:** HIGH  
**Gap:** 15.16%

**Areas Needing Attention:**
- Error handling branches in profile services
- Conditional logic in profile ordering
- Edge cases in request handling
- Fallback paths in hybrid services

### 2. Statement Coverage (95.59%)

**Priority:** MEDIUM  
**Gap:** 4.41%

**Areas Needing Attention:**
- Error paths in profile loading
- Edge cases in request validation
- Fallback logic in service layers

### 3. Function Coverage (95.36%)

**Priority:** MEDIUM  
**Gap:** 4.64%

**Areas Needing Attention:**
- Error handler functions
- Utility functions with edge cases
- Service fallback functions

### 4. Line Coverage (96.48%)

**Priority:** LOW  
**Gap:** 3.52%

**Areas Needing Attention:**
- Specific uncovered lines in profile services
- Error handling code paths
- Edge case validations

## Failing Tests (Blocking 100% Coverage)

The following 15 tests are currently failing and may be preventing full coverage:

1. `ViewProfileScreen - should handle action button presses (line 295)`
2. `SendRequestScreen - should handle profile load error (line 92)`
3. `SendRequestScreen - should handle profile load error paths (lines 122, 127, 134, 140, 152)`
4. `RequestsScreen - should handle request rendering with missing userEmail (lines 297-303)`
5. `RequestsScreen - should handle switch default cases (lines 366, 379)`
6. `MentorshipScreen - should handle no user data - early return (lines 74-77)`
7. `MentorshipScreen - should handle profile loading error (line 166)`
8. `ScheduleMeetingScreen - should handle date picker cancellation (lines 151-153)`
9. Additional error path tests in various components

## Recommendations

### Immediate Actions

1. **Fix Failing Tests** (Priority: HIGH)
   - Resolve the 15 failing tests
   - These tests cover important error paths and edge cases
   - Once fixed, they should improve branch coverage significantly

2. **Focus on Branch Coverage** (Priority: HIGH)
   - Branch coverage is the lowest at 84.84%
   - Add tests for:
     - All conditional branches (if/else, ternary, switch)
     - Error handling paths
     - Edge cases in validation logic
     - Fallback mechanisms

3. **Complete Service Layer Coverage** (Priority: MEDIUM)
   - `profileService.ts`: 92% statements, 76.31% branches
   - `hybridProfileService.ts`: Missing branches at lines 114, 174, 201, 254
   - Add tests for error paths and edge cases

4. **Utility Function Coverage** (Priority: MEDIUM)
   - `caspaProfiles.ts`: Missing branches at lines 371, 395
   - `profileOrdering.ts`: Missing branches at lines 75, 154
   - Add tests for edge cases in utility functions

### Long-term Actions

1. **Maintain 100% Coverage**
   - Set up pre-commit hooks to enforce coverage
   - Add coverage checks to CI/CD pipeline
   - Review coverage reports in code reviews

2. **Improve Test Quality**
   - Focus on meaningful tests, not just coverage numbers
   - Ensure tests cover real-world scenarios
   - Add integration tests for complex flows

## Progress Tracking

- ✅ Coverage analysis completed
- ✅ Test plan updated with coverage holes
- ✅ Initial tests written for coverage gaps
- ⏳ Fixing failing tests (15 remaining)
- ⏳ Achieving 100% coverage across all metrics

## Next Steps

1. Fix the 15 failing tests
2. Add tests for uncovered branches (especially in error paths)
3. Verify 100% coverage after fixes
4. Update test plan with any new test cases
5. Commit final coverage achievement

---

**Note:** This report is generated from the latest test run. Coverage may vary slightly between runs due to probabilistic tests and timing-dependent code paths.
