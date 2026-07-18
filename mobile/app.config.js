const googleMapsAndroidApiKey = process.env.GOOGLE_MAPS_ANDROID_API_KEY?.trim();

module.exports = ({ config }) => {
  const plugins = [...(config.plugins ?? [])].filter(
    (plugin) =>
      plugin !== 'react-native-maps' &&
      !(Array.isArray(plugin) && plugin[0] === 'react-native-maps')
  );

  if (googleMapsAndroidApiKey) {
    plugins.push([
      'react-native-maps',
      { androidGoogleMapsApiKey: googleMapsAndroidApiKey },
    ]);
  }

  return { ...config, plugins };
};
