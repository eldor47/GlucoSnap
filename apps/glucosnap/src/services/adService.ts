import { MobileAds, AdsConsent, AdsConsentStatus } from 'react-native-google-mobile-ads';

let adMobInitialized = false;

export const initializeAdMob = async () => {
  if (adMobInitialized) {
    return;
  }

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
  }
};

export const isAdMobReady = () => adMobInitialized;
