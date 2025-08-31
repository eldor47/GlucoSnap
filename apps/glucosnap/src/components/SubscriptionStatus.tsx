import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useSubscription } from '../state/subscription';
import { colors } from '../theme';

export const SubscriptionStatus: React.FC = () => {
  const { subscriptionStatus, isLoading, error, refreshSubscriptionStatus } = useSubscription();

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={styles.loadingText}>Loading subscription...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Error loading subscription</Text>
        <TouchableOpacity style={styles.retryButton} onPress={refreshSubscriptionStatus}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!subscriptionStatus) {
    return null;
  }

  const { plan, scansUsed, scansLimit, remainingScans, requiresAd } = subscriptionStatus;
  const isPremium = plan === 'premium';
  const isFree = plan === 'free';

  return (
    <View style={styles.container}>
      {/* Plan Badge */}
      <View style={[styles.planBadge, isPremium ? styles.premiumBadge : styles.freeBadge]}>
        <Text style={[styles.planText, isPremium ? styles.premiumText : styles.freeText]}>
          {isPremium ? '⭐ Premium' : '🆓 Free'}
        </Text>
      </View>

      {/* Usage Stats */}
      <View style={styles.usageContainer}>
        <Text style={styles.usageTitle}>Today's Usage</Text>
        
        <View style={styles.usageRow}>
          <Text style={styles.usageLabel}>Scans Used:</Text>
          <Text style={styles.usageValue}>{scansUsed}</Text>
        </View>
        
        <View style={styles.usageRow}>
          <Text style={styles.usageLabel}>Daily Limit:</Text>
          <Text style={styles.usageValue}>
            {isPremium ? '∞ Unlimited' : '∞ Unlimited*'}
          </Text>
        </View>
        
        {isFree && (
          <View style={styles.usageRow}>
            <Text style={styles.usageLabel}>Free Scans Left:</Text>
            <Text style={[
              styles.usageValue, 
              scansUsed >= 3 ? styles.noScansLeft : styles.scansLeft
            ]}>
              {scansUsed >= 3 ? '0 (ads required)' : Math.max(0, 3 - scansUsed)}
            </Text>
          </View>
        )}
      </View>

      {/* Ad Schedule for Free Users */}
      {isFree && (
        <View style={styles.adNotice}>
          <Text style={styles.adNoticeText}>
            📺 {scansUsed < 3 ? `${3 - scansUsed} free scans remaining` : 'Ad required before each scan'}
          </Text>
          <Text style={styles.adScheduleText}>
            {scansUsed < 3 ? 'After 3 free scans, watch ads to continue' : 'Watch ad before scanning to continue'}
          </Text>
        </View>
      )}

      {/* Upgrade CTA for Free Users */}
      {isFree && (
        <View style={styles.upgradeContainer}>
          <Text style={styles.upgradeTitle}>Upgrade to Premium</Text>
          <Text style={styles.upgradeSubtitle}>
            Skip all ads forever and get priority support
          </Text>
          <TouchableOpacity style={styles.upgradeButton}>
            <Text style={styles.upgradeButtonText}>$3.99/month</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Premium Benefits */}
      {isPremium && (
        <View style={styles.premiumContainer}>
          <Text style={styles.premiumTitle}>Premium Benefits</Text>
          <View style={styles.benefitRow}>
            <Text style={styles.benefitIcon}>✅</Text>
            <Text style={styles.benefitText}>Unlimited daily scans</Text>
          </View>
          <View style={styles.benefitRow}>
            <Text style={styles.benefitIcon}>✅</Text>
            <Text style={styles.benefitText}>No advertisements</Text>
          </View>
          <View style={styles.benefitRow}>
            <Text style={styles.benefitIcon}>✅</Text>
            <Text style={styles.benefitText}>Priority support</Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  
  // Plan Badge
  planBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
  },
  freeBadge: {
    backgroundColor: colors.secondary + '20',
  },
  premiumBadge: {
    backgroundColor: colors.primary + '20',
  },
  planText: {
    fontSize: 14,
    fontWeight: '700',
  },
  freeText: {
    color: colors.secondary,
  },
  premiumText: {
    color: colors.primary,
  },

  // Usage Stats
  usageContainer: {
    marginBottom: 16,
  },
  usageTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  usageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  usageLabel: {
    fontSize: 14,
    color: colors.subtext,
  },
  usageValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  noScansLeft: {
    color: colors.error,
  },
  scansLeft: {
    color: colors.success,
  },

  // Ad Notice
  adNotice: {
    backgroundColor: colors.warning + '20',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
  },
  adNoticeText: {
    fontSize: 14,
    color: colors.warning,
    fontWeight: '500',
    marginBottom: 4,
  },
  adScheduleText: {
    fontSize: 12,
    color: colors.subtext,
    fontStyle: 'italic',
  },

  // Upgrade CTA
  upgradeContainer: {
    backgroundColor: colors.primary + '10',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  upgradeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 4,
  },
  upgradeSubtitle: {
    fontSize: 14,
    color: colors.subtext,
    marginBottom: 12,
    lineHeight: 20,
  },
  upgradeButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  upgradeButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },

  // Premium Benefits
  premiumContainer: {
    backgroundColor: colors.success + '10',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.success + '30',
  },
  premiumTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.success,
    marginBottom: 12,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  benefitIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  benefitText: {
    fontSize: 14,
    color: colors.text,
  },

  // Loading & Error States
  loadingText: {
    fontSize: 14,
    color: colors.subtext,
    marginLeft: 8,
  },
  errorText: {
    fontSize: 14,
    color: colors.error,
    marginBottom: 8,
  },
  retryButton: {
    backgroundColor: colors.error,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  retryButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
});
