import React, { useEffect } from 'react';

// Simple fallback component for Expo Go
export const AdDisplay: React.FC<{
  isVisible: boolean;
  onAdComplete: () => void;
  onAdSkip: () => void;
  onAdError: () => void;
}> = ({ isVisible, onAdComplete, onAdSkip, onAdError }) => {
  console.log('⚠️ AdDisplay: This is a fallback component for Expo Go');
  
  useEffect(() => {
    if (isVisible) {
      console.log('❌ Real AdMob not available in Expo Go - calling onAdError');
      // Immediately call error handler so SmartAdDisplay shows MockAd
      setTimeout(() => onAdError(), 100);
    }
  }, [isVisible, onAdError]);

  // Don't render anything - let the SmartAdDisplay handle the UI
  return null;
};