import { TestIds } from 'react-native-google-mobile-ads';

// Ad Unit Configuration
export const AD_UNIT_IDS = {
  // Production ad unit IDs from your AdMob account
  PRODUCTION: {
    INTERSTITIAL: 'ca-app-pub-1514892537757211/1046211447',
    BANNER: 'ca-app-pub-1514892537757211/1046211448', // You'll need to create this in AdMob
  },
  
  // Test ad unit IDs for development
  TEST: {
    INTERSTITIAL: TestIds.INTERSTITIAL,
    BANNER: TestIds.BANNER,
  }
};

// App ID from your AdMob account
export const ADMOB_APP_ID = 'ca-app-pub-1514892537757211~8757180508';

// Determine which ad unit to use based on environment
export const getAdUnitId = (adType: 'INTERSTITIAL' | 'BANNER'): string => {
  // Use test ads in development, real ads in production
  const useTestAds = __DEV__;
  
  console.log(`🎯 Using ${useTestAds ? 'TEST' : 'PRODUCTION'} ad units`);
  
  if (useTestAds) {
    return AD_UNIT_IDS.TEST[adType];
  } else {
    return AD_UNIT_IDS.PRODUCTION[adType];
  }
};

// Helper to check if we're using test ads
export const isUsingTestAds = (): boolean => {
  return __DEV__;
};
