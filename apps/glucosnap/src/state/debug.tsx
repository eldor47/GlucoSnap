import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

const DEBUG_SETTINGS_KEY = 'glucosnap_debug_settings_v1';

type DebugSettings = {
  showDebugInfo: boolean;
};

const DebugContext = createContext<{
  debugSettings: DebugSettings;
  updateDebugSettings: (settings: Partial<DebugSettings>) => Promise<void>;
  isExpoGo: boolean;
} | null>(null);

export function DebugProvider({ children }: { children: React.ReactNode }) {
  const [debugSettings, setDebugSettings] = useState<DebugSettings>({
    showDebugInfo: false,
  });

  const isExpoGo = Constants.appOwnership === 'expo';

  // Load debug settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const stored = await SecureStore.getItemAsync(DEBUG_SETTINGS_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          setDebugSettings(parsed);
        }
      } catch (error) {
        console.log('Failed to load debug settings:', error);
      }
    };

    loadSettings();
  }, []);

  const updateDebugSettings = async (newSettings: Partial<DebugSettings>) => {
    const updatedSettings = { ...debugSettings, ...newSettings };
    setDebugSettings(updatedSettings);
    
    try {
      await SecureStore.setItemAsync(DEBUG_SETTINGS_KEY, JSON.stringify(updatedSettings));
    } catch (error) {
      console.log('Failed to save debug settings:', error);
    }
  };

  const value = {
    debugSettings,
    updateDebugSettings,
    isExpoGo,
  };

  return <DebugContext.Provider value={value}>{children}</DebugContext.Provider>;
}

export function useDebug() {
  const ctx = useContext(DebugContext);
  if (!ctx) throw new Error('useDebug must be used within DebugProvider');
  return ctx;
}
