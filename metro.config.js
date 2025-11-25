const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

// Récupère la config par défaut d'Expo
const config = getDefaultConfig(__dirname);

// ✅ Étend la config du transformer pour SVG
config.transformer = {
  ...config.transformer,
  babelTransformerPath: require.resolve("react-native-svg-transformer"),
};

// ✅ Étend la config du resolver pour inclure "svg"
config.resolver = {
  ...config.resolver,
  assetExts: config.resolver.assetExts.filter((ext) => ext !== "svg"),
  sourceExts: [...config.resolver.sourceExts, "svg"],
};

// ✅ Applique NativeWind à la config finale
module.exports = withNativeWind(config, { input: "./global.css" });
