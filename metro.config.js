const { getDefaultConfig } = require('expo/metro-config');
const { withUniwindConfig } = require('uniwind/metro');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Firebase JS SDK v10+ export maps resolver fix for Metro
config.resolver.sourceExts.push('cjs');

module.exports = withUniwindConfig(config, {
  cssEntryFile: './global.css',
});
