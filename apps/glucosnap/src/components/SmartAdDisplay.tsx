import React from 'react';
import Constants from 'expo-constants';

// Import mock ad component (always available)
import { MockAdDisplay } from './MockAdDisplay';

interface SmartAdDisplayProps {
  isVisible: boolean;
  onAdComplete: () => void;
  onAdSkip: () => void;
  onAdError: () => void;
}

// Helper function to detect if we're running in Expo Go
const isExpoGo = (): boolean => {
  return Constants.appOwnership === 'expo';
};

export const SmartAdDisplay: React.FC<SmartAdDisplayProps> = (props) => {
  const inExpoGo = isExpoGo();
  
  console.log(`🎯 SmartAdDisplay: Using ${inExpoGo ? 'MOCK' : 'REAL'} ads`);
  console.log(`🎯 Environment: ${inExpoGo ? 'Expo Go' : 'Native Build'}`);
  
  if (inExpoGo) {
    // In Expo Go, use mock ads
    return <MockAdDisplay {...props} />;
  } else {
    // In native builds, dynamically import real AdMob component
    // Only import when not in Expo Go to avoid warnings
    try {
      // Use dynamic import to prevent module loading in Expo Go
      const { RealAdDisplay } = require('./RealAdDisplay');
      return <RealAdDisplay {...props} />;
    } catch (error) {
      console.log('⚠️ Real AdMob not available, falling back to mock');
      return <MockAdDisplay {...props} />;
    }
  }
};
