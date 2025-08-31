import React, { createContext, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';

const ONBOARDING_KEY = 'glucosnap_onboarding_completed_v1';

interface OnboardingContextType {
  hasCompletedOnboarding: boolean;
  loading: boolean;
  markOnboardingComplete: () => Promise<void>;
  resetOnboarding: () => Promise<void>; // For testing or manual restart
}

const OnboardingContext = createContext<OnboardingContextType | null>(null);

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const completed = await SecureStore.getItemAsync(ONBOARDING_KEY);
        setHasCompletedOnboarding(completed === 'true');
      } catch (error) {
        console.warn('Failed to load onboarding state:', error);
        setHasCompletedOnboarding(false);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const markOnboardingComplete = async () => {
    try {
      await SecureStore.setItemAsync(ONBOARDING_KEY, 'true');
      setHasCompletedOnboarding(true);
    } catch (error) {
      console.warn('Failed to save onboarding state:', error);
    }
  };

  const resetOnboarding = async () => {
    try {
      await SecureStore.deleteItemAsync(ONBOARDING_KEY);
      setHasCompletedOnboarding(false);
    } catch (error) {
      console.warn('Failed to reset onboarding state:', error);
    }
  };

  const value = {
    hasCompletedOnboarding,
    loading,
    markOnboardingComplete,
    resetOnboarding,
  };

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
}






