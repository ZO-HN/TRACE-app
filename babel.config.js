module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
    // Reanimated 4 moved its babel plugin into the separate react-native-worklets
    // package — react-native-reanimated/plugin is the pre-v4 name and silently
    // no-ops on v4, which expo-doctor's dependency checks won't catch. Must be
    // listed last.
    plugins: ['react-native-worklets/plugin'],
  };
};
