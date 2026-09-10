const reactNativeConfig = require('@react-native/eslint-config/flat');

const reactNativeConfigWithoutFlow = reactNativeConfig.filter(
  (config) => !config.plugins?.['ft-flow']
);

module.exports = [
  {
    ignores: [
      'lib/**',
      'node_modules/**',
      'example/node_modules/**',
      'example/ios/Pods/**',
      'coverage/**',
    ],
  },
  ...reactNativeConfigWithoutFlow,
];
