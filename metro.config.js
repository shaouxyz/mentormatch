// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Configure path aliases for Metro bundler
config.resolver = {
  ...config.resolver,
  alias: {
    '@': path.resolve(__dirname),
  },
};

module.exports = config;
