module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Required for react-native-reanimated and VisionCamera frame processors
      'react-native-reanimated/plugin',
    ],
  };
};
