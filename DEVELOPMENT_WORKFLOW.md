# Development Workflow

This document outlines the standard workflow for any code changes (fixes, features, etc.).

## ⚠️ CRITICAL REQUIREMENT: 100% Test Passing

**MANDATORY**: All tests MUST pass with 100% success rate. No exceptions.

### Requirements:
- ✅ **ALL tests must pass** - Zero failures allowed
- ✅ **NO skipped tests** - All tests must be enabled and passing
- ✅ **100% test suite success** - All test suites must pass
- ❌ **DO NOT commit** if any test fails or is skipped
- ❌ **DO NOT proceed** until all tests pass

### Expected Test Output:
```
Test Suites: X passed, X total
Tests:       X passed, X total
```

**NOT ACCEPTABLE:**
- `Tests: X failed, Y passed` ❌
- `Tests: X skipped, Y passed` ❌
- `Test Suites: X failed` ❌

## Standard Workflow for Code Changes

Whenever you make any code change (fix a bug, add a feature, refactor, etc.), follow this sequence:

### 0. Update the Test Plan (MANDATORY)
- **Before writing tests**, update the test plan to reflect the change:
  - Add/modify relevant cases in `TEST_PLAN.md`
  - If the change touches a full user flow, also update `TEST_PLAN_E2E_USER_JOURNEY.md`
- For a **bug fix**, add a test plan case that describes:
  - Repro steps (pre-fix)
  - Expected behavior (post-fix)
  - Any regression scope (areas likely impacted)
- For a **feature**, add cases for:
  - Happy path
  - Validation & error states
  - Permissions (Firebase/Calendar/Notifications) where applicable
  - Offline/local fallback behavior (if relevant)

### 1. Write Tests for the Change (MANDATORY)
- Write tests that cover the exact behavior you changed
- If fixing a bug, add a test that **fails before** the fix and **passes after** the fix
- If adding/modifying a feature, add tests that verify:
  - User-visible behavior
  - Edge cases
  - Error handling (including non-`Error` throws/rejections)
- **Never skip tests** - If a test is flaky, fix it instead of skipping

### 2. Run Focused Tests First (MANDATORY)
```bash
npm test -- <path-to-test-file>
```

### 3. Fix Failures Immediately (MANDATORY)
- **MANDATORY**: If tests fail, you MUST fix them before proceeding
- Update tests if needed
- Re-run the tests until they pass
- **DO NOT skip failing tests**

### 4. Run Full Regression (MANDATORY)
```bash
npm test
```

### 5. Fix Any Regression Failures (MANDATORY)
- **MANDATORY**: If ANY tests fail, you MUST fix them
- Re-run all tests
- Repeat until **ALL tests pass with 0 failures and 0 skipped**

### 6. Verify 100% Test Passing AND 100% Code Coverage
```bash
npm test
npm run test:coverage
```
**Required output:**
- `Test Suites: X passed, X total` (no failures)
- `Tests: X passed, X total` (no failures, no skipped)
- **Code Coverage: 100% for all metrics** (statements, branches, lines, functions)

**If you see ANY failures, skipped tests, or coverage below 100%:**
- ❌ STOP immediately
- ❌ DO NOT commit
- ✅ Fix the issues
- ✅ Add missing tests to achieve 100% coverage
- ✅ Re-run tests
- ✅ Verify 100% passing AND 100% coverage
- ✅ Then proceed to commit

### 7. Commit to GitHub (ONLY after 100% test passing)
```bash
git add -A
git commit -m "Descriptive commit message"
git push
```

## Example Workflow

```bash
# 1. Make code changes
# ... edit files ...

# 2. Add/update tests
# ... edit test files ...

# 3. Run specific test
npm test -- app/__tests__/home.test.tsx

# 4. Check output - MUST see: "Tests: X passed, X total" (no failures, no skipped)
# If failures or skipped: FIX THEM NOW - DO NOT PROCEED

# 5. Fix failures if any
# ... fix code or tests ...
# Re-run: npm test -- app/__tests__/home.test.tsx
# Verify: 100% passing, 0 failures, 0 skipped

# 6. Run all tests
npm test

# 7. Check output - MUST see:
#    "Test Suites: X passed, X total"
#    "Tests: X passed, X total"
# If ANY failures or skipped: FIX THEM - DO NOT PROCEED

# 8. Fix any failures
# ... fix code or tests ...

# 9. Run all tests again
npm test

# 10. Verify 100% passing (0 failures, 0 skipped)
# Expected: "Test Suites: X passed, X total" and "Tests: X passed, X total"

# 11. ONLY after 100% passing: Commit
git add -A
git commit -m "Fix: Case-insensitive email filtering for current user profile exclusion"
git push
```

## Important Notes

- **100% Test Passing Required**: Never commit with failing or skipped tests
- **No Skipped Tests**: If a test is skipped, fix it or remove it - don't leave it skipped
- **Fix Flaky Tests**: If a test is flaky, investigate and fix the root cause instead of skipping
- **Test coverage**: Aim to maintain or improve test coverage with each change
- **Test quality**: Tests should be meaningful and verify actual functionality
- **Documentation**: Update relevant documentation if the change affects user-facing features

## Zero Tolerance Policy

- ❌ **Zero test failures allowed**
- ❌ **Zero skipped tests allowed**
- ✅ **100% passing rate required**
- ✅ **All test suites must pass**

If you cannot achieve 100% test passing, you must:
1. Investigate the root cause
2. Fix the issue (code or test)
3. Re-run tests
4. Verify 100% passing
5. Only then proceed with commit

## Quick Reference

```bash
# Run specific test file
npm test -- <test-file-path>

# Run all tests
npm test

# Run tests in watch mode (for development)
npm run test:watch

# Check test coverage
npm run test:coverage
```

## Automation

This workflow should be followed manually for now. In the future, consider:
- Pre-commit hooks to run tests
- CI/CD pipeline to run tests on every push
- Automated test coverage reporting
