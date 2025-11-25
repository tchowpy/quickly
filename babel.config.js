module.exports = function (api) {
  api.cache(true);
  let plugins = [];

  plugins.push('react-native-worklets/plugin');
  plugins.push('react-native-reanimated/plugin');

  return {
    presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }], 'nativewind/babel'],

    plugins: [
      ['react-native-worklets/plugin', {}],
      ['react-native-reanimated/plugin', {}, 'unique'],  // 👈 OBLIGATOIRE
    ],
  };
};
