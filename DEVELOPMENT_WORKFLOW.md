# Development Workflow

This document outlines the standard workflow for any code changes (fixes, features, etc.).

## Standard Workflow for Code Changes

Whenever you make any code change (fix a bug, add a feature, refactor, etc.), follow this sequence:

### 1. Add Tests
- Write tests for the change you made
- If fixing a bug, add a test that reproduces the bug and verifies the fix
- If adding a feature, add tests that verify the feature works correctly

### 2. Run Tests for the Change
```bash
npm test -- <path-to-test-file>
```

### 3. Fix Test Failures
- If tests fail, fix the issues
- Update tests if needed
- Re-run the tests until they pass

### 4. Run All Tests
```bash
npm test
```

### 5. Fix Any Failures
- If any tests fail, fix them
- Re-run all tests
- Repeat until all tests pass

### 6. Verify All Tests Pass
```bash
npm test
```
Expected output: `Test Suites: X passed, X total` and `Tests: X passed, X total`

### 7. Commit to GitHub
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

# 4. Fix failures if any
# ... fix code or tests ...

# 5. Run all tests
npm test

# 6. Fix any failures
# ... fix code or tests ...

# 7. Run all tests again
npm test

# 8. Commit when all pass
git add -A
git commit -m "Fix: Case-insensitive email filtering for current user profile exclusion"
git push
```

## Important Notes

- **Never commit failing tests**: Always ensure all tests pass before committing
- **Test coverage**: Aim to maintain or improve test coverage with each change
- **Test quality**: Tests should be meaningful and verify actual functionality
- **Documentation**: Update relevant documentation if the change affects user-facing features

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
