import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSubscription } from '../state/subscription';
import { colors } from '../theme';

export const DailyUsageCard: React.FC = () => {
  const { subscriptionStatus } = useSubscription();

  if (!subscriptionStatus) {
    return null;
  }

  const { scansUsed, plan } = subscriptionStatus;
  const isPremium = plan === 'premium';
  const isFree = plan === 'free';
  const freeScansLeft = Math.max(0, 3 - scansUsed);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.leftSection}>
          <Text style={styles.scansCount}>{scansUsed}</Text>
          <Text style={styles.scansLabel}>scans today</Text>
        </View>
        
        <View style={styles.rightSection}>
          <View style={[styles.planBadge, isPremium ? styles.premiumBadge : styles.freeBadge]}>
            <Text style={[styles.planText, isPremium ? styles.premiumText : styles.freeText]}>
              {isPremium ? 'Premium' : 'Free'}
            </Text>
          </View>
          
          {isFree && (
            <Text style={styles.statusText}>
              {freeScansLeft > 0 ? `${freeScansLeft} free left` : 'Ads for unlimited'}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftSection: {
    alignItems: 'flex-start',
  },
  scansCount: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.primary,
    lineHeight: 32,
  },
  scansLabel: {
    fontSize: 14,
    color: colors.subtext,
    marginTop: -2,
  },
  rightSection: {
    alignItems: 'flex-end',
  },
  planBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 4,
    borderWidth: 1,
  },
  freeBadge: {
    backgroundColor: colors.surface,
    borderColor: colors.accent,
  },
  premiumBadge: {
    backgroundColor: colors.primary + '15',
    borderColor: colors.primary,
  },
  planText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  freeText: {
    color: colors.accent,
  },
  premiumText: {
    color: colors.primary,
  },
  statusText: {
    fontSize: 12,
    color: colors.subtext,
  },
});
