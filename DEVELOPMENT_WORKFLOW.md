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

### 1. Add Tests
- Write tests for the change you made
- If fixing a bug, add a test that reproduces the bug and verifies the fix
- If adding a feature, add tests that verify the feature works correctly
- **Never skip tests** - If a test is flaky, fix it instead of skipping

### 2. Run Tests for the Change
```bash
npm test -- <path-to-test-file>
```

### 3. Fix Test Failures
- **MANDATORY**: If tests fail, you MUST fix them before proceeding
- Update tests if needed
- Re-run the tests until they pass
- **DO NOT skip failing tests**

### 4. Run All Tests
```bash
npm test
```

### 5. Fix Any Failures
- **MANDATORY**: If ANY tests fail, you MUST fix them
- Re-run all tests
- Repeat until **ALL tests pass with 0 failures and 0 skipped**

### 6. Verify 100% Test Passing
```bash
npm test
```
**Required output:**
- `Test Suites: X passed, X total` (no failures)
- `Tests: X passed, X total` (no failures, no skipped)

**If you see ANY failures or skipped tests:**
- ❌ STOP immediately
- ❌ DO NOT commit
- ✅ Fix the issues
- ✅ Re-run tests
- ✅ Verify 100% passing
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
