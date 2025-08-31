import React, { createContext, useContext, useState, useEffect, ReactNode, useRef, useCallback, useMemo } from 'react';
import { Alert } from 'react-native';
import { api } from '../services/api';

export interface SubscriptionStatus {
  plan: 'free' | 'premium';
  status: 'active' | 'cancelled' | 'past_due';
  scansUsed: number;
  scansLimit: number;
  remainingScans: number;
  canScan: boolean;
  requiresAd: boolean;
  subscriptionId?: string;
  currentPeriodEnd?: string;
}

export interface UsageSummary {
  totalScans: number;
  totalAds: number;
  averageScansPerDay: number;
  daysTracked: number;
}

interface SubscriptionContextType {
  subscriptionStatus: SubscriptionStatus | null;
  usageSummary: UsageSummary | null;
  isLoading: boolean;
  error: string | null;
  refreshSubscriptionStatus: () => Promise<void>;
  trackUsage: (action: 'scan' | 'ad_watched') => Promise<boolean>;
  getUsageHistory: () => Promise<void>;
  upgradeToPremium: (subscriptionId: string) => Promise<boolean>;
  // Debug functions
  resetScanUsage: () => void;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};

interface SubscriptionProviderProps {
  children: ReactNode;
}

export const SubscriptionProvider: React.FC<SubscriptionProviderProps> = ({ children }) => {
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [usageSummary, setUsageSummary] = useState<UsageSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const hasInitializedRef = useRef(false);

  const refreshSubscriptionStatus = useCallback(async () => {
    // Prevent multiple simultaneous calls
    if (isRefreshing) {
      console.log('🔄 Subscription refresh already in progress, skipping...');
      return;
    }
    
    try {
      console.log('🔄 Refreshing subscription status...');
      const globalToken = (globalThis as any).__glucosnap_token;
      console.log('🔑 Global token available:', !!globalToken);
      
      setIsRefreshing(true);
      setIsLoading(true);
      setError(null);
      
      const data = await api.getSubscriptionStatus();
      console.log('✅ Subscription status fetched:', data);
      setSubscriptionStatus(data);
    } catch (err: any) {
      console.log('❌ Error refreshing subscription status:', err.message);
      // If the backend isn't deployed yet, provide a default free plan
      if (err.message?.includes('fetch') || err.message?.includes('network')) {
        console.log('Backend not available, using default free plan');
        setSubscriptionStatus({
          plan: 'free',
          status: 'active',
          scansUsed: 0,
          scansLimit: 999999, // No daily limit - unlimited with ads after 3 free
          remainingScans: 999999,
          canScan: true,
          requiresAd: false,
        });
        setError(null);
      } else {
        setError(err.message);
        console.error('Failed to refresh subscription status:', err);
      }
    } finally {
      setIsRefreshing(false);
      setIsLoading(false);
    }
  }, [isRefreshing]);

  const trackUsage = useCallback(async (action: 'scan' | 'ad_watched'): Promise<boolean> => {
    try {
      setError(null);
      
      const data = await api.trackUsage({
        action,
        adWatched: action === 'ad_watched',
      });
      
      // Update local subscription status
      if (subscriptionStatus) {
        setSubscriptionStatus(prev => prev ? {
          ...prev,
          scansUsed: data.usage.scansUsed,
          remainingScans: data.usage.remainingScans,
        } : null);
      }
      
      return data.canContinue;
    } catch (err: any) {
      // If the backend isn't deployed yet, simulate usage tracking
      if (err.message?.includes('fetch') || err.message?.includes('network')) {
        console.log('Backend not available, simulating usage tracking');
        if (subscriptionStatus) {
          const newScansUsed = action === 'scan' ? subscriptionStatus.scansUsed + 1 : subscriptionStatus.scansUsed;
          const newRemainingScans = Math.max(0, subscriptionStatus.scansLimit - newScansUsed);
          
          setSubscriptionStatus(prev => prev ? {
            ...prev,
            scansUsed: newScansUsed,
            remainingScans: newRemainingScans,
            canScan: newRemainingScans > 0,
          } : null);
        }
        return true; // Allow the action to continue
      } else {
        setError(err.message);
        console.error('Failed to track usage:', err);
        return false;
      }
    }
  }, [subscriptionStatus]);

  const getUsageHistory = useCallback(async () => {
    try {
      setError(null);
      
      const data = await api.getUsageHistory();
      setUsageSummary(data.summary);
    } catch (err: any) {
      // If the backend isn't deployed yet, provide mock data
      if (err.message?.includes('fetch') || err.message?.includes('network')) {
        console.log('Backend not available, using mock usage data');
        setUsageSummary({
          totalScans: 0,
          totalAds: 0,
          averageScansPerDay: 0,
          daysTracked: 0,
        });
        setError(null);
      } else {
        setError(err.message);
        console.error('Failed to fetch usage history:', err);
      }
    }
  }, []);

  const upgradeToPremium = useCallback(async (subscriptionId: string): Promise<boolean> => {
    try {
      setError(null);
      setIsLoading(true);
      
      const data = await api.upgradeToPremium({
        subscriptionId,
        plan: 'premium',
      });
      
      // Refresh subscription status to get updated plan
      await refreshSubscriptionStatus();
      
      Alert.alert(
        'Welcome to Premium! 🎉',
        'You now have unlimited scans without ads. Enjoy!',
        [{ text: 'Awesome!' }]
      );
      
      return true;
    } catch (err: any) {
      // If the backend isn't deployed yet, simulate upgrade
      if (err.message?.includes('fetch') || err.message?.includes('network')) {
        console.log('Backend not available, simulating premium upgrade');
        setSubscriptionStatus({
          plan: 'premium',
          status: 'active',
          scansUsed: 0,
          scansLimit: 999999,
          remainingScans: 999999,
          canScan: true,
          requiresAd: false,
          subscriptionId: 'mock-premium-123',
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
        });
        
        Alert.alert(
          'Welcome to Premium! 🎉',
          'You now have unlimited scans without ads. Enjoy!',
          [{ text: 'Awesome!' }]
        );
        
        return true;
      } else {
        setError(err.message);
        console.error('Failed to upgrade to premium:', err);
        
        Alert.alert(
          'Upgrade Failed',
          'There was an issue processing your upgrade. Please try again.',
          [{ text: 'OK' }]
        );
        
        return false;
      }
    } finally {
      setIsLoading(false);
    }
  }, [refreshSubscriptionStatus]);

  // Debug function to reset scan usage for testing
  const resetScanUsage = useCallback(() => {
    console.log('🔧 DEBUG: Resetting scan usage for testing');
    setSubscriptionStatus(prev => prev ? {
      ...prev,
      scansUsed: 0,
      remainingScans: prev.scansLimit,
      canScan: true,
    } : null);
  }, []);

  // Load subscription status when global token is available
  useEffect(() => {
    // Prevent multiple initializations using ref
    if (hasInitializedRef.current) {
      console.log('🔄 Subscription provider already initialized, skipping...');
      return;
    }
    
    console.log('🔄 Subscription provider initializing...');
    hasInitializedRef.current = true;
    
    let attempts = 0;
    const maxAttempts = 20; // 10 seconds max (20 * 500ms)
    
    const checkAndLoad = () => {
      const globalToken = (globalThis as any).__glucosnap_token;
      if (globalToken) {
        console.log('✅ Global token available, fetching subscription status');
        refreshSubscriptionStatus();
      } else if (attempts < maxAttempts) {
        attempts++;
        console.log(`⏳ Waiting for global token... (attempt ${attempts}/${maxAttempts})`);
        // Check again in 500ms
        setTimeout(checkAndLoad, 500);
      } else {
        console.log('❌ Max attempts reached, using fallback subscription status');
        // Set a default free plan if token never becomes available
        setSubscriptionStatus({
          plan: 'free',
          status: 'active',
          scansUsed: 0,
          scansLimit: 999999, // No daily limit - unlimited with ads after 3 free
          remainingScans: 999999,
          canScan: true,
          requiresAd: false,
        });
      }
    };
    
    const timeoutId = setTimeout(checkAndLoad, 0);
    
    return () => {
      clearTimeout(timeoutId);
    };
  }, []); // Empty dependency array to run only once

  const value: SubscriptionContextType = useMemo(() => ({
    subscriptionStatus,
    usageSummary,
    isLoading,
    error,
    refreshSubscriptionStatus,
    trackUsage,
    getUsageHistory,
    upgradeToPremium,
    resetScanUsage,
  }), [
    subscriptionStatus,
    usageSummary,
    isLoading,
    error,
    refreshSubscriptionStatus,
    trackUsage,
    getUsageHistory,
    upgradeToPremium,
    resetScanUsage,
  ]);

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};
