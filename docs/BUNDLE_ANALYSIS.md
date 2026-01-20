# Bundle Size Analysis Guide

## Overview
This document explains how to analyze the bundle size of the MentorMatch app to identify optimization opportunities.

## Available Scripts

### Analyze Bundle Size
```bash
npm run analyze:bundle
```

This command:
1. Exports the app with source maps
2. Analyzes the JavaScript bundle
3. Generates an HTML report (`bundle-report.html`)

## Manual Analysis

### Using Expo CLI
```bash
# Build for web to analyze bundle
npx expo export --dump-sourcemap

# Analyze with source-map-explorer
npx source-map-explorer .expo/web-build/static/js/*.js
```

### Using Metro Bundle Analyzer
```bash
# Install analyzer
npm install --save-dev metro-bundle-analyzer

# Analyze bundle
npx react-native bundle --platform android --dev false --entry-file index.js --bundle-output /tmp/bundle.js --sourcemap-output /tmp/bundle.map
npx metro-bundle-analyzer /tmp/bundle.map
```

## Optimization Strategies

1. **Code Splitting**: Split large components into smaller chunks
2. **Tree Shaking**: Remove unused code and dependencies
3. **Lazy Loading**: Load components only when needed
4. **Image Optimization**: Compress and optimize images
5. **Remove Unused Dependencies**: Regularly audit and remove unused packages

## Current Optimizations

- ✅ Memoized render functions
- ✅ Limited profile loading (MAX_PROFILES_TO_LOAD)
- ✅ Reusable components (ProfileFormFields)
- ✅ Service layer separation
- ✅ Centralized utilities

## Target Bundle Sizes

- **Android APK**: < 50MB
- **iOS IPA**: < 50MB
- **JavaScript Bundle**: < 2MB (gzipped)

## Monitoring

Regular bundle size analysis should be performed:
- Before major releases
- After adding new dependencies
- When bundle size increases significantly
