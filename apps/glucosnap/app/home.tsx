
import { View, Text, Image, Pressable, TouchableOpacity, ActivityIndicator, Alert, StyleSheet, ScrollView, TextInput } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { theme, colors, spacing } from '../src/theme';
import * as ImagePicker from 'expo-image-picker';
import { useState, useEffect } from 'react';
import Constants from 'expo-constants';
import { useSession } from '../src/state/session';
import { useOnboarding } from '../src/state/onboarding';
import { useSubscription } from '../src/state/subscription';
import { useDebug } from '../src/state/debug';
import { api } from '../src/services/api';
import { addLog } from '../src/storage/logs';
import Onboarding from '../src/components/Onboarding';
import { DailyUsageCard } from '../src/components/DailyUsageCard';
import { SmartAdDisplay } from '../src/components/SmartAdDisplay';
import { compressImage, estimateCostSavings } from '../src/utils/imageCompression';


export default function Home() {
  const { session, refreshToken } = useSession();
  const { hasCompletedOnboarding, markOnboardingComplete, loading: onboardingLoading } = useOnboarding();
  const { subscriptionStatus, trackUsage, refreshSubscriptionStatus, resetScanUsage } = useSubscription();
  const { debugSettings, isExpoGo } = useDebug();
  
  // Set up global router for API service redirects
  useEffect(() => {
    (globalThis as any).__glucosnap_router = router;
    return () => {
      delete (globalThis as any).__glucosnap_router;
    };
  }, []);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [compressedImageUri, setCompressedImageUri] = useState<string | null>(null);
  // Compression info removed - no longer displayed in UI
  const [result, setResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showAd, setShowAd] = useState(false);
  const [adsWatchedThisSession, setAdsWatchedThisSession] = useState(0); // Count of ads watched this session
  const [showAdCompleteMessage, setShowAdCompleteMessage] = useState(false); // Shows ad completion message
  const [hasAdFreePass, setHasAdFreePass] = useState(false); // Free pass after watching ad
  const [pendingAction, setPendingAction] = useState<'camera' | 'library' | null>(null); // Store user's intended action
  const [buttonsEnabled, setButtonsEnabled] = useState(true); // Controls if camera/library buttons are enabled




  // Show onboarding for new users
  useEffect(() => {
    if (!onboardingLoading && !hasCompletedOnboarding) {
      // Small delay to let the home screen render first
      const timer = setTimeout(() => setShowOnboarding(true), 500);
      return () => clearTimeout(timer);
    }
  }, [hasCompletedOnboarding, onboardingLoading]);

  // Reset ads watched count when subscription status changes and update button state
  useEffect(() => {
    console.log('🔄 Subscription status changed:', subscriptionStatus);
    if (subscriptionStatus) {
      console.log('  - plan:', subscriptionStatus.plan);
      console.log('  - scansUsed:', subscriptionStatus.scansUsed);
      console.log('  - canScan:', subscriptionStatus.canScan);
      
      // Reset ads when subscription changes (new user or new day)
      setAdsWatchedThisSession(0);
      setShowAdCompleteMessage(false);
      
      // Update button state based on subscription and usage
      const nextScanNumber = (subscriptionStatus.scansUsed || 0) + 1;
      const needsAd = subscriptionStatus.plan === 'free' && nextScanNumber > 3 && !hasAdFreePass;
      setButtonsEnabled(!needsAd);
      
      console.log('✅ Reset ads watched count for new subscription status');
      console.log(`📱 Buttons enabled: ${!needsAd} (needs ad: ${needsAd})`);
    }
  }, [subscriptionStatus, hasAdFreePass]);

  // Reset ads watched count when session changes (new user)
  useEffect(() => {
    console.log('🔄 Session changed:', session?.email);
    if (session?.email) {
      // Force refresh subscription status for new user
      refreshSubscriptionStatus();
      
      // Clear all ad-related state
      setAdsWatchedThisSession(0);
      setShowAdCompleteMessage(false);
      setShowAd(false);
      setHasAdFreePass(false);
      setPendingAction(null);
      setButtonsEnabled(true); // Enable buttons for new user initially
      
      console.log('✅ Reset ads watched count for new user:', session.email);
    } else {
      console.log('❌ No session email, clearing state');
      setAdsWatchedThisSession(0);
      setShowAdCompleteMessage(false);
      setShowAd(false);
      setHasAdFreePass(false);
      setPendingAction(null);
      setButtonsEnabled(true);
    }
  }, [session?.email]); // Removed refreshSubscriptionStatus dependency

  const handleOnboardingComplete = async () => {
    setShowOnboarding(false);
    await markOnboardingComplete();
  };

  const handleOnboardingSkip = async () => {
    setShowOnboarding(false);
    await markOnboardingComplete();
  };

  const handleAdComplete = async () => {
    console.log('🎉🎉🎉 handleAdComplete called - Ad completed, enabling buttons');
    setShowAd(false);
    setAdsWatchedThisSession(prev => prev + 1); // Increment ads watched count
    setShowAdCompleteMessage(true); // Show completion message
    setHasAdFreePass(true); // Grant free pass for immediate scan
    setButtonsEnabled(true); // Enable camera and library buttons
    setPendingAction(null); // Clear any pending action since we're not auto-executing
    
    console.log('🔒 Ads watched this session:', adsWatchedThisSession + 1);
    console.log('🎫🎫🎫 Granted ad free pass for next scan - hasAdFreePass now TRUE');
    console.log('📱 Buttons now enabled after ad completion');
    
    // Track ad completion
    await trackUsage('ad_watched');
    
    // Auto-hide the message after 5 seconds
    setTimeout(() => {
      setShowAdCompleteMessage(false);
    }, 5000);
    
    console.log('🐛 Debug state after ad complete:', { hasAdFreePass: true, showAd: false, showAdCompleteMessage: true, buttonsEnabled: true });
  };

  const handleAdSkip = async () => {
    setShowAd(false);
    
    // Execute the user's intended action even if ad was skipped
    const actionToExecute = pendingAction;
    setPendingAction(null); // Clear pending action
    
    if (actionToExecute) {
      console.log(`🚀 Executing skipped action: ${actionToExecute}`);
      
      // Use setTimeout to ensure this runs in the next event loop with proper user context
      setTimeout(async () => {
        if (actionToExecute === 'camera') {
          await executePhotoCapture();
        } else if (actionToExecute === 'library') {
          await executeImageSelection();
        }
      }, 100);
    }
    
    // Show upgrade prompt after executing the action
    Alert.alert(
      'Ad Skipped',
      'You can upgrade to Premium to avoid ads.',
      [
        { text: 'Upgrade to Premium', onPress: () => {/* TODO: Navigate to upgrade */} },
        { text: 'OK' }
      ]
    );
  };

  const handleAdError = async () => {
    setShowAd(false);
    
    // Execute the user's intended action even if ad failed
    const actionToExecute = pendingAction;
    setPendingAction(null); // Clear pending action
    
    if (actionToExecute) {
      console.log(`🚀 Executing action after ad error: ${actionToExecute}`);
      
      // Use setTimeout to ensure this runs in the next event loop with proper user context
      setTimeout(async () => {
        if (actionToExecute === 'camera') {
          await executePhotoCapture();
        } else if (actionToExecute === 'library') {
          await executeImageSelection();
        }
      }, 100);
    }
    
    // Show error prompt after executing the action
    Alert.alert(
      'Ad Error',
      'There was an issue loading the ad. Please try again or upgrade to Premium.',
      [
        { text: 'Try Again', onPress: () => setShowAd(true) },
        { text: 'Upgrade to Premium', onPress: () => {/* TODO: Navigate to upgrade */} },
        { text: 'Cancel' }
      ]
    );
  };



  // Execute the actual image selection (without ad logic)
  const executeImageSelection = async () => {
    try {
      console.log('📚 Executing image selection...');
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      console.log('🔑 Media library permission status:', status);
      
      if (status !== 'granted') {
        console.log('❌ Media library permission denied');
        Alert.alert('Permission Required', 'Please allow access to your photo library to select images.');
        return;
      }
      
      console.log('📚 Launching image library...');
      const pick = await ImagePicker.launchImageLibraryAsync();
      
      console.log('📱 Image picker result:', pick.canceled ? 'canceled' : 'image selected');
      
      if (!pick.canceled && pick.assets && pick.assets.length > 0) {
        console.log('🖼️ Image selected, setting URI and compressing...');
        setImageUri(pick.assets[0].uri);
        setShowAdCompleteMessage(false); // Hide the ad completion message
        await compressSelectedImage(pick.assets[0].uri);
      } else {
        console.log('📚 Image selection was canceled or no assets returned');
      }
    } catch (error) {
      console.error('❌ Error in executeImageSelection:', error);
      Alert.alert('Error', 'Failed to open image library. Please try again.');
    }
  };

  const chooseImage = async () => {
    console.log('🖼️🖼️🖼️ chooseImage called with:');
    console.log('  - current user:', session?.email);
    console.log('  - subscriptionStatus:', subscriptionStatus);
    console.log('  - adsWatchedThisSession:', adsWatchedThisSession);
    console.log('  - canScan:', subscriptionStatus?.canScan);
    console.log('  - plan:', subscriptionStatus?.plan);
    console.log('  - scansUsed:', subscriptionStatus?.scansUsed);
    console.log('  - hasAdFreePass:', hasAdFreePass);
    console.log('  - buttonsEnabled:', buttonsEnabled);

    // If buttons are disabled, do nothing (user should watch ad first)
    if (!buttonsEnabled) {
      console.log('❌ Buttons disabled - user needs to watch ad first');
      return;
    }
    
    // If they have a free pass, consume it
    if (hasAdFreePass) {
      console.log('🎫 Using ad free pass for this scan');
      setHasAdFreePass(false);
      
      // Check if we need to disable buttons for next scan
      const nextScanNumber = (subscriptionStatus?.scansUsed || 0) + 2; // +2 because this scan will increment it
      const needsAdNext = subscriptionStatus?.plan === 'free' && nextScanNumber > 3;
      setButtonsEnabled(!needsAdNext);
    }
    
    console.log('✅ Proceeding with image selection');
    await executeImageSelection();
  };

  // Execute the actual photo capture (without ad logic)
  const executePhotoCapture = async () => {
    try {
      console.log('📸 Executing photo capture...');
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        console.log('❌ Camera permission denied');
        Alert.alert('Permission Required', 'Please allow access to your camera to take photos.');
        return;
      }
      
      console.log('📸 Launching camera...');
      const shot = await ImagePicker.launchCameraAsync();
      console.log('📱 Camera result:', shot.canceled ? 'canceled' : 'photo taken');
      
      if (!shot.canceled && shot.assets && shot.assets.length > 0) {
        console.log('📸 Photo taken, setting URI and compressing...');
        setImageUri(shot.assets[0].uri);
        setShowAdCompleteMessage(false); // Hide the ad completion message
        await compressSelectedImage(shot.assets[0].uri);
      } else {
        console.log('📸 Photo capture was canceled or no assets returned');
      }
    } catch (error) {
      console.error('❌ Error in executePhotoCapture:', error);
      Alert.alert('Error', 'Failed to open camera. Please try again.');
    }
  };

  const takePhoto = async () => {
    console.log('📸 takePhoto called with:');
    console.log('  - current user:', session?.email);
    console.log('  - adsWatchedThisSession:', adsWatchedThisSession);
    console.log('  - scansUsed:', subscriptionStatus?.scansUsed);
    console.log('  - buttonsEnabled:', buttonsEnabled);
    
    // If buttons are disabled, do nothing (user should watch ad first)
    if (!buttonsEnabled) {
      console.log('❌ Buttons disabled - user needs to watch ad first');
      return;
    }
    
    // If they have a free pass, consume it
    if (hasAdFreePass) {
      console.log('🎫 Using ad free pass for this scan');
      setHasAdFreePass(false);
      
      // Check if we need to disable buttons for next scan
      const nextScanNumber = (subscriptionStatus?.scansUsed || 0) + 2; // +2 because this scan will increment it
      const needsAdNext = subscriptionStatus?.plan === 'free' && nextScanNumber > 3;
      setButtonsEnabled(!needsAdNext);
    }
    
    console.log('✅ Proceeding with photo capture');
    await executePhotoCapture();
  };

  const watchAd = async () => {
    console.log('📺 Watch Ad button pressed');
    const nextScanNumber = (subscriptionStatus?.scansUsed || 0) + 1;
    
    if (subscriptionStatus?.plan === 'free' && nextScanNumber > 3 && !hasAdFreePass) {
      console.log(`📺 Showing ad for free user (scan ${nextScanNumber}, ad required after 3 free scans)`);
      setShowAd(true);
    } else {
      console.log('❌ Ad not required - this should not happen');
    }
  };

  const compressSelectedImage = async (uri: string) => {
    try {
      console.log('🖼️ Starting image compression and analysis...');
      setBusy(true);
      
      // Clear previous results
      setResult(null);
      
      // Get original file size
      console.log('📏 Getting original file size...');
      const response = await fetch(uri);
      const blob = await response.blob();
      const originalSize = blob.size;
      console.log(`📊 Original size: ${(originalSize / 1024 / 1024).toFixed(2)}MB`);
      
      // Compress the image
      console.log('🗜️ Compressing image...');
      const compressed = await compressImage(uri, { maxWidth: 1024, maxHeight: 1024, quality: 0.8 });
      
      setCompressedImageUri(compressed.uri);
      
      // Show compression savings
      const savings = estimateCostSavings(originalSize, compressed.size);
      console.log(`✅ Image compressed: ${savings.originalMB}MB → ${savings.compressedMB}MB (${savings.savingsPercent}% savings)`);
      
      // Automatically start analysis after compression
      await analyzeCompressedImage(compressed.uri);
      
    } catch (error) {
      console.error('❌ Compression failed:', error);
      // Fallback to original image
      setCompressedImageUri(uri);
      setBusy(false);
    }
  };

  const analyzeCompressedImage = async (imageUri: string) => {
    try {
      // Track scan usage
      const canContinue = await trackUsage('scan');
      if (!canContinue) {
        Alert.alert(
          'Daily Limit Reached',
          'You\'ve reached your daily scan limit. Upgrade to Premium for unlimited scans.',
          [
            { text: 'Upgrade to Premium', onPress: () => {/* TODO: Navigate to upgrade */} },
            { text: 'OK' }
          ]
        );
        setBusy(false);
        return;
      }
      
      console.log('🚀 Starting automatic analysis...');
      
      // API calls for analysis
      const contentType = guessContentType(imageUri);
      const { key, uploadUrl } = await api.getUploadUrl({ contentType }, handleTokenExpired);
      await api.uploadImage(uploadUrl, imageUri, contentType);
      const res = await api.analyze({ key }, handleTokenExpired);
      
      console.log('🎉 Analysis complete!');
      setResult(res);
      
      // Persist a local log entry only if it's a food image
      try {
        const parsed = parseAnalysisText(String(res.text ?? ''));
        if (!parsed.nonFood) {
          await addLog({ imageUri: imageUri, carbs: res.carbs ?? parsed.total ?? null, text: String(res.text ?? '') });
        }
      } catch {}
      
    } catch (e: any) {
      console.error('❌ Analysis failed:', e);
      
      // Check if it's a token expiration error
      if (e.message?.includes('Token expired')) {
        Alert.alert('Session Expired', 'Your session has expired. Please sign in again.', [
          { text: 'OK', onPress: () => router.push('/login') }
        ]);
        setBusy(false);
        return;
      }
      
      Alert.alert('Analysis Error', e?.message || 'Failed to analyze image');
    } finally {
      setBusy(false);
    }
  };

  // Handle token expiration by attempting refresh first
  const handleTokenExpired = async (): Promise<boolean> => {
    console.log('🔄 Token expired, attempting refresh...');
    
    try {
      const success = await refreshToken();
      
      if (success) {
        console.log('✅ Token refreshed, retrying operation...');
        // Token was refreshed, the operation can be retried
        return true;
      } else {
        console.log('❌ Token refresh failed, redirecting to login');
        // Don't show alert here - let the API service handle the redirect
        return false;
      }
    } catch (error) {
      console.error('❌ Error during token refresh:', error);
      return false;
    }
  };

  return (
    <>
      <ScrollView style={theme.screenContent} contentContainerStyle={{ gap: 12, paddingBottom: spacing(4) }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={[theme.title, { fontSize: 22 }]}>GlucoSnap</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable onPress={() => router.push('/logs')} style={{ padding: 6, borderRadius: 8 }}>
              <MaterialCommunityIcons name="history" size={22} color={colors.text} />
            </Pressable>
            <Pressable onPress={() => router.push('/settings')} style={{ padding: 6, borderRadius: 8 }}>
              <MaterialCommunityIcons name="cog-outline" size={22} color={colors.text} />
            </Pressable>
          </View>
        </View>

        {/* Daily Usage */}
        <DailyUsageCard />

        {/* Debug Info (Only when enabled in settings and running in Expo Go) */}
        {isExpoGo && debugSettings.showDebugInfo && (
          <View style={[theme.card, { padding: 8, backgroundColor: colors.border + '20' }]}>
            <Text style={[theme.muted, { fontSize: 12 }]}>
              🐛 Debug: User: {session?.email || 'none'} | Scans Used: {subscriptionStatus?.scansUsed || 0} | Ads: {adsWatchedThisSession} | Free Pass: {hasAdFreePass ? '✅' : '❌'} | Buttons: {buttonsEnabled ? '✅' : '❌'}
            </Text>
            <Text style={[theme.muted, { fontSize: 12 }]}>
              Ad strategy: {(subscriptionStatus?.scansUsed || 0) < 3 ? `${3 - (subscriptionStatus?.scansUsed || 0)} free scans left` : 'Ad before each scan'} | Environment: {Constants.appOwnership === 'expo' ? 'Expo Go (Mock)' : 'Native (Real)'}
            </Text>
            <TouchableOpacity 
              style={{ marginTop: 8, padding: 8, backgroundColor: colors.error, borderRadius: 4 }}
              onPress={() => {
                console.log('🔄 Manual ad counter reset triggered');
                setAdsWatchedThisSession(0);
                setHasAdFreePass(false);
                setShowAdCompleteMessage(false);
                setButtonsEnabled(true);
                console.log('✅ Manual ad counter reset completed');
              }}
            >
              <Text style={{ color: colors.white, fontSize: 12, textAlign: 'center' }}>
                🔄 Reset Ad Counter
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={{ marginTop: 4, padding: 8, backgroundColor: colors.success, borderRadius: 4 }}
              onPress={() => {
                console.log('🔧 Reset scan usage triggered');
                resetScanUsage();
                setAdsWatchedThisSession(0);
                setHasAdFreePass(false);
                setShowAdCompleteMessage(false);
                setButtonsEnabled(true);
                console.log('✅ Scan usage reset completed');
              }}
            >
              <Text style={{ color: colors.white, fontSize: 12, textAlign: 'center' }}>
                🔧 Reset Scan Usage
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={{ marginTop: 4, padding: 8, backgroundColor: colors.primary, borderRadius: 4 }}
              onPress={() => {
                console.log('🔄 Manual subscription refresh triggered');
                refreshSubscriptionStatus();
                console.log('✅ Manual subscription refresh completed');
              }}
            >
              <Text style={{ color: colors.white, fontSize: 12, textAlign: 'center' }}>
                🔄 Refresh Subscription Status
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={{ marginTop: 4, padding: 8, backgroundColor: colors.warning, borderRadius: 4 }}
              onPress={() => {
                console.log('🐛 Current state debug:');
                console.log('  - Session:', session);
                console.log('  - Subscription Status:', subscriptionStatus);
                console.log('  - Ads Watched:', adsWatchedThisSession);
                console.log('  - Show Ad:', showAd);
                console.log('  - Show Message:', showAdCompleteMessage);
              }}
            >
              <Text style={{ color: colors.white, fontSize: 12, textAlign: 'center' }}>
                🐛 Debug Current State
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Ad Completion Indicator */}
        {showAdCompleteMessage && (
          <View style={[theme.card, { padding: 12, backgroundColor: colors.success + '20', borderColor: colors.success }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <MaterialCommunityIcons name="check-circle" size={20} color={colors.success} />
              <Text style={[theme.text, { color: colors.success, fontWeight: '600' }]}>
                Ad completed! {(subscriptionStatus?.scansUsed || 0) < 2 ? `${3 - (subscriptionStatus?.scansUsed || 0) - 1} more free scans today.` : 'Watch ad before each future scan.'}
              </Text>
            </View>
          </View>
        )}

        {/* Watch Ad Button - only show when buttons are disabled */}
        {!buttonsEnabled && (
          <Pressable onPress={watchAd} style={[styles.watchAdButton]}>
            <MaterialCommunityIcons name="play-circle-outline" size={20} color={colors.white} />
            <Text style={[styles.watchAdButtonText, { marginLeft: 8 }]}>Watch Ad to Continue</Text>
          </Pressable>
        )}

        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Pressable 
            onPress={takePhoto} 
            disabled={!buttonsEnabled}
            style={[
              styles.toolButton,
              !buttonsEnabled && styles.toolButtonDisabled
            ]}
          >
            <MaterialCommunityIcons 
              name="camera-outline" 
              size={20} 
              color={buttonsEnabled ? colors.text : colors.subtext} 
            />
            <Text style={[
              theme.buttonTextPrimary, 
              { marginLeft: 8 },
              !buttonsEnabled && { color: colors.subtext }
            ]}>
              Take photo
            </Text>
          </Pressable>
          <Pressable 
            onPress={chooseImage} 
            disabled={!buttonsEnabled}
            style={[
              styles.toolButton,
              !buttonsEnabled && styles.toolButtonDisabled
            ]}
          >
            <MaterialCommunityIcons 
              name="image-outline" 
              size={20} 
              color={buttonsEnabled ? colors.text : colors.subtext} 
            />
            <Text style={[
              theme.buttonTextPrimary, 
              { marginLeft: 8 },
              !buttonsEnabled && { color: colors.subtext }
            ]}>
              Pick from library
            </Text>
          </Pressable>
        </View>



        {imageUri && (
          <Image source={{ uri: imageUri }} style={{ width: '100%', aspectRatio: 1, borderRadius: 16, borderWidth: 1, borderColor: colors.border }} />
        )}

        {/* Analysis Status */}
        {busy && imageUri && (
          <View style={[theme.card, { padding: 16, alignItems: 'center', backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' }]}>
            <ActivityIndicator size="small" color={colors.primary} style={{ marginBottom: 8 }} />
            <Text style={[theme.text, { color: colors.primary, fontWeight: '600' }]}>Analyzing your image...</Text>
            <Text style={[theme.muted, { fontSize: 12, textAlign: 'center', marginTop: 4 }]}>
              This will only take a few seconds
            </Text>
          </View>
        )}

        {result && <ResultView result={result} imageUri={imageUri} />}
      </ScrollView>

      {/* Onboarding walkthrough */}
      <Onboarding
        visible={showOnboarding}
        onComplete={handleOnboardingComplete}
        onSkip={handleOnboardingSkip}
      />

      {/* Ad Display Modal */}
      <SmartAdDisplay
        isVisible={showAd}
        onAdComplete={handleAdComplete}
        onAdSkip={handleAdSkip}
        onAdError={handleAdError}
      />
    </>
  );
}

function guessContentType(uri: string) {
  if (uri.endsWith('.png')) return 'image/png';
  if (uri.endsWith('.webp')) return 'image/webp';
  if (uri.endsWith('.heic')) return 'image/heic';
  return 'image/jpeg';
}

function ResultView({ result, imageUri }: { result: any; imageUri: string | null }) {
  const { debugSettings, isExpoGo } = useDebug();
  const parsed = parseAnalysisText(String(result.text ?? ''), isExpoGo && debugSettings.showDebugInfo);
  
  return (
    <View style={{ marginTop: 12, gap: 12 }}>
      {parsed.nonFood ? (
        <View style={[theme.card, { padding: 16 }]}>
          <Text style={[theme.text, { fontSize: 16, fontWeight: '700', marginBottom: 6 }]}>No meal detected</Text>
          <Text style={theme.muted}>{parsed.reason || 'The image does not appear to contain food.'}</Text>
        </View>
      ) : (
        <View style={[theme.card, { padding: 16 }]}>
          <Text style={[theme.muted, { marginBottom: 4 }]}>Estimated Carbs</Text>
          <Text style={[theme.text, { fontSize: 32, fontWeight: '800' }]}>
            {(result.carbs ?? parsed.total ?? '—')}<Text style={{ fontSize: 16, fontWeight: '700', color: colors.subtext }}> g</Text>
          </Text>
        </View>
      )}

      {!parsed.nonFood && parsed.items?.length ? (
        <View style={[theme.card, { padding: 14, gap: 10 }]}>
          <Text style={[theme.text, { fontSize: 14, fontWeight: '700', marginBottom: 4 }]}>Items</Text>
          {parsed.items.map((it, idx) => (
            <View key={idx} style={{ paddingVertical: 8, borderBottomWidth: idx < parsed.items.length - 1 ? 1 : 0, borderBottomColor: colors.border }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={[theme.text, { fontSize: 16, fontWeight: '600' }]}>{it.name || 'Item'}</Text>
                {typeof it.carbs_g === 'number' ? (
                  <Text style={[theme.text, { fontSize: 16, fontWeight: '700' }]}>{it.carbs_g} g</Text>
                ) : (
                  <Text style={[theme.muted, { fontSize: 14 }]}>—</Text>
                )}
              </View>
              {typeof it.notes === 'string' && it.notes.length > 0 ? (
                <Text style={[theme.muted, { marginTop: 4 }]}>{it.notes}</Text>
              ) : null}
            </View>
          ))}
        </View>
      ) : null}

      {!parsed.nonFood && !parsed.items?.length && (
        <View style={[theme.card, { padding: 12, borderRadius: 12 }]}>
          <Text style={[theme.muted, { fontSize: 12, marginBottom: 6 }]}>Details</Text>
          <Text style={theme.text}>{parsed.raw}</Text>
        </View>
      )}

      {/* Feedback Section */}
      <FeedbackSection result={result} imageUri={imageUri} />
    </View>
  );
}

function parseAnalysisText(text: string, debugEnabled: boolean = false): { nonFood: boolean; reason?: string; total: number | null; items: Array<{ name: string; carbs_g?: number; notes?: string }>; raw: string } {
  // Try to extract a JSON object from the text
  try {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start >= 0 && end > start) {
      const jsonString = text.slice(start, end + 1);
      if (debugEnabled) {
        console.log('🔍 Parsing JSON:', jsonString);
      }
      const json = JSON.parse(jsonString);
      if (debugEnabled) {
        console.log('🔍 Parsed JSON:', json);
      }
      
      if (json && json.non_food === true) {
        return { nonFood: true, reason: typeof json.reason === 'string' ? json.reason : undefined, total: null, items: [], raw: text };
      }
      const total = typeof json.total_carbs_g === 'number' ? json.total_carbs_g : null;
      const itemsIn = Array.isArray(json.items) ? json.items : [];
      if (debugEnabled) {
        console.log('🔍 Raw items from JSON:', itemsIn);
      }
      
      const items = itemsIn.map((it: any) => {
        const item = {
          name: String(it?.name ?? 'Item'),
          carbs_g: typeof it?.carbs_g === 'number' ? it.carbs_g : undefined,
          notes: typeof it?.notes === 'string' ? it.notes : undefined,
        };
        if (debugEnabled) {
          console.log('🔍 Mapped item:', item);
        }
        return item;
      });
      
      if (debugEnabled) {
        console.log('🔍 Final parsed items:', items);
      }
      return { nonFood: false, total, items, raw: text };
    }
  } catch (error) {
    if (debugEnabled) {
      console.log('🔍 JSON parsing error:', error);
    }
  }
  // Fallback: attempt to find a grams number
  let total: number | null = null;
  const m = text.match(/(\d+\.?\d*)\s*g(?![a-zA-Z])/);
  if (m) total = Number(m[1]);
  return { nonFood: false, total, items: [], raw: text };
}

function FeedbackSection({ result, imageUri }: { result: any; imageUri: string | null }) {
  const [feedback, setFeedback] = useState<'positive' | 'negative' | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleFeedback = async (type: 'positive' | 'negative') => {
    setFeedback(type);
    
    if (type === 'positive') {
      // Submit positive feedback immediately
      await submitFeedback(type, '');
    } else {
      // Show feedback form for negative feedback
      setShowFeedbackForm(true);
    }
  };

  const submitFeedback = async (type: 'positive' | 'negative', text: string) => {
    if (!imageUri || !result) return;
    
    setSubmitting(true);
    try {
      // Send feedback to backend API
      const feedbackData = {
        type,
        text,
        imageUri,
        result,
      };
      
      await api.submitFeedback(feedbackData);
      
      // Show success message
      Alert.alert('Thank you!', 'Your feedback has been submitted.');
      
      // Reset form
      setFeedback(null);
      setFeedbackText('');
      setShowFeedbackForm(false);
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      Alert.alert('Error', 'Failed to submit feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const submitNegativeFeedback = async () => {
    if (!feedbackText.trim()) {
      Alert.alert('Feedback Required', 'Please explain why the result was not helpful.');
      return;
    }
    
    await submitFeedback('negative', feedbackText.trim());
  };

  if (!result) return null;

  return (
    <View style={[theme.card, { padding: 16 }]}>
      <Text style={[theme.text, { fontSize: 16, fontWeight: '600', marginBottom: 12 }]}>
        Was this analysis helpful?
      </Text>
      
      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
        <Pressable
          onPress={() => handleFeedback('positive')}
          disabled={submitting}
          style={[
            styles.feedbackButton,
            feedback === 'positive' && { backgroundColor: colors.accent, borderColor: colors.accent }
          ]}
        >
          <MaterialCommunityIcons 
            name="thumb-up" 
            size={20} 
            color={feedback === 'positive' ? colors.text : colors.subtext} 
          />
          <Text style={[
            styles.feedbackButtonText,
            feedback === 'positive' && { color: colors.text }
          ]}>
            Yes
          </Text>
        </Pressable>
        
        <Pressable
          onPress={() => handleFeedback('negative')}
          disabled={submitting}
          style={[
            styles.feedbackButton,
            feedback === 'negative' && { backgroundColor: colors.danger, borderColor: colors.danger }
          ]}
        >
          <MaterialCommunityIcons 
            name="thumb-down" 
            size={20} 
            color={feedback === 'negative' ? colors.text : colors.subtext} 
          />
          <Text style={[
            styles.feedbackButtonText,
            feedback === 'negative' && { color: colors.text }
          ]}>
            No
          </Text>
        </Pressable>
      </View>

      {showFeedbackForm && (
        <View style={{ gap: 12 }}>
          <Text style={[theme.text, { fontSize: 14 }]}>
            Please explain why this analysis wasn't helpful:
          </Text>
          <TextInput
            value={feedbackText}
            onChangeText={setFeedbackText}
            placeholder="e.g., Wrong food items, inaccurate carb count, poor image quality..."
            placeholderTextColor={colors.subtext}
            multiline
            numberOfLines={3}
            style={[
              styles.feedbackInput,
              { borderColor: colors.border, color: colors.text }
            ]}
          />
          <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'flex-end' }}>
            <Pressable
              onPress={() => {
                setShowFeedbackForm(false);
                setFeedback(null);
                setFeedbackText('');
              }}
              style={[styles.feedbackButton, { backgroundColor: colors.surface }]}
            >
              <Text style={styles.feedbackButtonText}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={submitNegativeFeedback}
              disabled={submitting || !feedbackText.trim()}
              style={[
                styles.feedbackButton,
                { backgroundColor: colors.danger, borderColor: colors.danger },
                (!feedbackText.trim() || submitting) && { opacity: 0.5 }
              ]}
            >
              <Text style={[styles.feedbackButtonText, { color: colors.text }]}>
                {submitting ? 'Submitting...' : 'Submit'}
              </Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  toolButton: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    flex: 1,
  },
  toolButtonDisabled: {
    backgroundColor: colors.surface + '50',
    borderColor: colors.border + '50',
    opacity: 0.6,
  },
  watchAdButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  watchAdButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  feedbackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  feedbackButtonText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
    color: colors.subtext, // Use lighter color for better readability
  },
  feedbackInput: {
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.text,
  },
});
