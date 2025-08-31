import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ActivityIndicator } from 'react-native';
import { colors } from '../theme';
import { 
  InterstitialAd, 
  AdEventType 
} from 'react-native-google-mobile-ads';
import { initializeAdMob } from '../services/adService';
import { getAdUnitId, isUsingTestAds } from '../config/ads';

interface RealAdDisplayProps {
  isVisible: boolean;
  onAdComplete: () => void;
  onAdSkip: () => void;
  onAdError: () => void;
}

// Initialize AdMob when component loads
initializeAdMob();

// Create the interstitial ad instance with the appropriate ad unit ID
const adUnitId = getAdUnitId('INTERSTITIAL');
console.log(`🎯 Creating interstitial ad with unit ID: ${adUnitId.slice(0, 20)}...`);

const interstitial = InterstitialAd.createForAdRequest(adUnitId, {
  requestNonPersonalizedAdsOnly: true,
});

export const RealAdDisplay: React.FC<RealAdDisplayProps> = ({
  isVisible,
  onAdComplete,
  onAdSkip,
  onAdError,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [adLoaded, setAdLoaded] = useState(false);
  const [adError, setAdError] = useState(false);
  const [showFallback, setShowFallback] = useState(false);

  useEffect(() => {
    if (isVisible && !adLoaded) {
      console.log('📺 Loading interstitial ad...');
      setIsLoading(true);
      setAdError(false);
      setShowFallback(false);
      
      // Set up ad event listeners
      const unsubscribeLoaded = interstitial.addAdEventListener(AdEventType.LOADED, () => {
        console.log('✅ Interstitial ad loaded successfully');
        setIsLoading(false);
        setAdLoaded(true);
        setAdError(false);
        
        // Show the ad immediately when loaded
        interstitial.show().catch((error: any) => {
          console.error('❌ Failed to show interstitial ad:', error);
          setAdError(true);
          setShowFallback(true);
        });
      });

      const unsubscribeError = interstitial.addAdEventListener(AdEventType.ERROR, (error: any) => {
        console.error('❌ Interstitial ad failed to load:', error);
        setIsLoading(false);
        setAdError(true);
        setShowFallback(true);
      });

      const unsubscribeClosed = interstitial.addAdEventListener(AdEventType.CLOSED, () => {
        console.log('📺 Interstitial ad closed');
        setAdLoaded(false);
        onAdComplete();
      });

      // Load the ad
      interstitial.load();

      // Fallback timeout - show fallback after 10 seconds if ad doesn't load
      const fallbackTimeout = setTimeout(() => {
        if (isLoading) {
          console.log('⏰ Ad loading timeout, showing fallback');
          setIsLoading(false);
          setShowFallback(true);
        }
      }, 10000);

      return () => {
        unsubscribeLoaded();
        unsubscribeError();
        unsubscribeClosed();
        clearTimeout(fallbackTimeout);
      };
    }
  }, [isVisible, adLoaded, onAdComplete]);

  const handleSkip = () => {
    console.log('⏭️ User skipped ad');
    onAdSkip();
  };

  const handleError = () => {
    console.log('❌ Ad error handled');
    onAdError();
  };

  // Don't show modal if real ad is loaded and will be shown by AdMob
  if (!isVisible || (adLoaded && !showFallback)) return null;

  return (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleSkip}
    >
      <View style={styles.overlay}>
        <View style={styles.adContainer}>
          {/* Ad Header */}
          <View style={styles.adHeader}>
            <Text style={styles.adTitle}>Advertisement</Text>
            <Text style={styles.adSubtitle}>Support GlucoSnap</Text>
          </View>

          {/* Ad Content Area */}
          <View style={styles.adContent}>
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Loading advertisement...</Text>
                <Text style={styles.loadingSubtext}>
                  {isUsingTestAds() ? 'Preparing test ad content' : 'Loading real ad from AdMob'}
                </Text>
              </View>
            ) : showFallback ? (
              adError ? (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorIcon}>⚠️</Text>
                  <Text style={styles.errorText}>Ad failed to load</Text>
                  <Text style={styles.errorSubtext}>No internet or ads unavailable</Text>
                  <TouchableOpacity style={styles.retryButton} onPress={handleError}>
                    <Text style={styles.retryButtonText}>Continue Without Ad</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.fallbackContainer}>
                  <Text style={styles.fallbackIcon}>⏰</Text>
                  <Text style={styles.fallbackText}>Ad Loading Timeout</Text>
                  <Text style={styles.fallbackSubtext}>Taking longer than expected</Text>
                  <TouchableOpacity style={styles.continueButton} onPress={handleSkip}>
                    <Text style={styles.continueButtonText}>Continue</Text>
                  </TouchableOpacity>
                </View>
              )
            ) : null}
          </View>

          {/* Close Button */}
          <TouchableOpacity style={styles.closeButton} onPress={handleSkip}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  adContainer: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 24,
    margin: 20,
    width: '90%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },

  // Ad Header
  adHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  adTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  adSubtitle: {
    fontSize: 14,
    color: colors.subtext,
  },

  // Ad Content
  adContent: {
    minHeight: 200,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  loadingContainer: {
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: colors.subtext,
    marginTop: 16,
  },
  loadingSubtext: {
    fontSize: 14,
    color: colors.subtext,
    marginTop: 8,
    opacity: 0.8,
  },
  errorContainer: {
    alignItems: 'center',
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 16,
    color: colors.error,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: 14,
    color: colors.subtext,
    marginBottom: 16,
    textAlign: 'center',
    opacity: 0.8,
  },
  retryButton: {
    backgroundColor: colors.error,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Fallback styles
  fallbackContainer: {
    alignItems: 'center',
  },
  fallbackIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  fallbackText: {
    fontSize: 16,
    color: colors.warning,
    marginBottom: 8,
    textAlign: 'center',
    fontWeight: '600',
  },
  fallbackSubtext: {
    fontSize: 14,
    color: colors.subtext,
    marginBottom: 16,
    textAlign: 'center',
    opacity: 0.8,
  },

  continueButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  continueButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },

  // Close Button
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: colors.subtext,
    fontWeight: '600',
  },
});
