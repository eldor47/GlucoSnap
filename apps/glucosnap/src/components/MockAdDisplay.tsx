import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ActivityIndicator } from 'react-native';
import { colors } from '../theme';

interface MockAdDisplayProps {
  isVisible: boolean;
  onAdComplete: () => void;
  onAdSkip: () => void;
  onAdError: () => void;
}

export const MockAdDisplay: React.FC<MockAdDisplayProps> = ({
  isVisible,
  onAdComplete,
  onAdSkip,
  onAdError,
}) => {
  const [countdown, setCountdown] = useState(15);
  const [isLoading, setIsLoading] = useState(true);
  const [showAd, setShowAd] = useState(false);

  useEffect(() => {
    if (isVisible) {
      console.log('📺 [MOCK] Loading simulated ad...');
      setCountdown(15);
      setIsLoading(true);
      setShowAd(false);
      
      // Simulate ad loading time (2-3 seconds)
      const loadingTimer = setTimeout(() => {
        console.log('✅ [MOCK] Simulated ad loaded');
        setIsLoading(false);
        setShowAd(true);
      }, 2500);

      return () => clearTimeout(loadingTimer);
    }
  }, [isVisible]);

  useEffect(() => {
    if (showAd && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [showAd, countdown]);

  const handleSkip = () => {
    console.log('⏭️ [MOCK] User skipped simulated ad');
    onAdSkip();
  };

  const handleComplete = () => {
    console.log('🎉 [MOCK] User completed simulated ad');
    onAdComplete();
  };

  if (!isVisible) return null;

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
            <Text style={styles.adTitle}>🧪 Mock Advertisement</Text>
            <Text style={styles.adSubtitle}>Testing in Expo Go</Text>
          </View>

          {/* Ad Content */}
          <View style={styles.adContent}>
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Loading simulated ad...</Text>
                <Text style={styles.loadingSubtext}>Mock ad for Expo Go testing</Text>
              </View>
            ) : (
              <View style={styles.mockAdContainer}>
                <Text style={styles.mockAdIcon}>📺</Text>
                <Text style={styles.mockAdTitle}>Sample Advertisement</Text>
                <Text style={styles.mockAdText}>
                  This is a simulated ad for testing in Expo Go.{'\n\n'}
                  In the real app, this would be a Google AdMob interstitial ad 
                  generating actual revenue.
                </Text>
                <View style={styles.brandingContainer}>
                  <Text style={styles.brandingText}>Powered by AdMob</Text>
                </View>
              </View>
            )}
          </View>

          {/* Countdown & Actions */}
          {showAd && (
            <>
              <View style={styles.countdownContainer}>
                <Text style={styles.countdownText}>
                  {countdown > 0 ? `${countdown}s remaining` : 'Ad complete!'}
                </Text>
                {countdown > 0 && (
                  <View style={styles.progressBar}>
                    <View 
                      style={[
                        styles.progressFill, 
                        { width: `${((15 - countdown) / 15) * 100}%` }
                      ]} 
                    />
                  </View>
                )}
              </View>

              <View style={styles.actionContainer}>
                {countdown > 0 ? (
                  <TouchableOpacity 
                    style={[
                      styles.skipButton,
                      countdown > 5 && styles.skipButtonDisabled
                    ]} 
                    onPress={handleSkip}
                    disabled={countdown > 5}
                  >
                    <Text style={[
                      styles.skipButtonText,
                      countdown > 5 && styles.skipButtonTextDisabled
                    ]}>
                      {countdown > 5 ? `Skip (${countdown - 5}s)` : 'Skip Ad'}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={styles.continueButton} onPress={handleComplete}>
                    <Text style={styles.continueButtonText}>Continue</Text>
                  </TouchableOpacity>
                )}
              </View>
            </>
          )}

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
  mockAdContainer: {
    alignItems: 'center',
    padding: 20,
  },
  mockAdIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  mockAdTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  mockAdText: {
    fontSize: 14,
    color: colors.subtext,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  brandingContainer: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.border + '30',
    borderRadius: 6,
  },
  brandingText: {
    fontSize: 12,
    color: colors.subtext,
    fontWeight: '500',
  },
  countdownContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  countdownText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 12,
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  actionContainer: {
    alignItems: 'center',
  },
  skipButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  skipButtonDisabled: {
    opacity: 0.5,
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.subtext,
  },
  skipButtonTextDisabled: {
    color: colors.border,
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
