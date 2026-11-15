// Expo app config. Values that are tied to a real account (AdMob) come from
// .env; without them the app builds with Google's public sample AdMob app IDs.
// Expo CLI loads .env into process.env before reading this file.
const GOOGLE_SAMPLE_ADMOB_APP_ID_IOS = 'ca-app-pub-3940256099942544~1458002511';
const GOOGLE_SAMPLE_ADMOB_APP_ID_ANDROID = 'ca-app-pub-3940256099942544~3347511713';

module.exports = {
  expo: {
    name: 'ardu',
    slug: 'ardu',
    version: '1.0.0',
    entryPoint: './index.js',
    icon: './assets/images/icono-square.png',
    orientation: 'portrait',
    assetBundlePatterns: ['**/*'],
    ios: {
      bundleIdentifier: 'dev.santiagomorel.ardu',
      icon: './assets/images/icono-square.png',
      requireFullScreen: true,
      infoPlist: {
        UIBackgroundModes: ['remote-notification'],
        UISupportedInterfaceOrientations: ['UIInterfaceOrientationPortrait'],
        'UISupportedInterfaceOrientations~ipad': ['UIInterfaceOrientationPortrait'],
        NSUserTrackingUsageDescription:
          'We show relevant ads to keep the app free. Your data is never sold.',
        NSPhotoLibraryUsageDescription:
          'We need access to your photo library to allow you to share quotes as images.',
      },
    },
    android: {
      package: 'dev.santiagomorel.ardu',
      adaptiveIcon: {
        foregroundImage: './assets/images/icono-square.png',
        backgroundColor: '#F3BB3E',
      },
      permissions: [],
      screenOrientation: 'portrait',
    },
    plugins: [
      'expo-router',
      'react-native-localize',
      [
        'expo-notifications',
        {
          icon: './assets/images/icono-square.png',
          color: '#F3BB3E',
          defaultChannel: 'default',
        },
      ],
      [
        'react-native-google-mobile-ads',
        {
          iosAppId: process.env.ADMOB_APP_ID_IOS || GOOGLE_SAMPLE_ADMOB_APP_ID_IOS,
          androidAppId: process.env.ADMOB_APP_ID_ANDROID || GOOGLE_SAMPLE_ADMOB_APP_ID_ANDROID,
        },
      ],
    ],
    extra: {
      router: {},
      eas: {
        projectId: process.env.EAS_PROJECT_ID,
      },
    },
  },
};
