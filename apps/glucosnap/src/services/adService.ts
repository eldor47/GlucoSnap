import { MobileAds, AdsConsent, AdsConsentStatus } from 'react-native-google-mobile-ads';

let adMobInitialized = false;
let initializationPromise: Promise<void> | null = null;

export const initializeAdMob = async () => {
  // If already initialized, return immediately
  if (adMobInitialized) {
    console.log('🎯 AdMob already initialized, skipping...');
    return;
  }

  // If initialization is in progress, wait for it to complete
  if (initializationPromise) {
    console.log('🎯 AdMob initialization already in progress, waiting...');
    return initializationPromise;
  }

  // Create new initialization promise
  initializationPromise = (async () => {
    try {
      console.log('🎯 Initializing AdMob...');
      
      // Initialize AdMob
      const adapterStatuses = await MobileAds().initialize();
      console.log('✅ AdMob initialized successfully:', adapterStatuses);
      
      // Request consent for personalized ads (GDPR compliance)
      try {
        const consentInfo = await AdsConsent.requestInfoUpdate();
        console.log('📋 Consent info:', consentInfo);
        
        if (consentInfo.status === AdsConsentStatus.REQUIRED) {
          console.log('📋 Showing consent form...');
          const { status } = await AdsConsent.showForm();
          console.log('📋 Consent form result:', status);
        }
      } catch (consentError) {
        console.log('📋 Consent handling failed (not required in dev):', consentError);
      }
      
      adMobInitialized = true;
      console.log('🎯 AdMob initialization complete');
      
    } catch (error) {
      console.error('❌ Failed to initialize AdMob:', error);
      // Reset promise on error so we can retry
      initializationPromise = null;
      throw error;
    } finally {
      // Clear the promise reference
      initializationPromise = null;
    }
  })();

  return initializationPromise;
};

export const isAdMobReady = () => adMobInitialized;
