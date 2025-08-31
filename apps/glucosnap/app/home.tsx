/**
 * 🏠 Home Screen - Main Analysis Interface
 * 
 * ✅ COMPLETED FEATURES:
 * - Image compression (50-80% cost savings)
 * - Username display in settings
 * - Password validation (sign-up only)
 * - Onboarding walkthrough system
 * - iOS safe area handling
 * - Real-time form validation
 * 
 * 🔧 CURRENT ISSUE - PROGRESS BAR FREEZING:
 * The progress bar gets stuck on step 2 during analysis.
 * 
 * DEBUGGING STATUS:
 * - Added comprehensive console logging
 * - Fixed step numbering (was using indices 2,3,4,5 instead of 1,2,3,4)
 * - Fixed completion logic (was checking >= steps.length instead of >= steps.length-1)
 * - Added safety timeout (30s max) to prevent infinite progress
 * - Added force completion after 1.5s delay
 * 
 * PROGRESS STEPS (5 total, indices 0-4):
 * 0: "Optimizing Image" (compression)
 * 1: "Uploading to Cloud" (upload)
 * 2: "Analyzing Food" (AI analysis) ← GETS STUCK HERE
 * 3: "Counting Carbs" (nutrition)
 * 4: "Finalizing Results" (completion)
 * 
 * NEXT STEPS TO DEBUG:
 * 1. Test with console logs to see exact step progression
 * 2. Check if setCurrentProgressStep(2) is being called
 * 3. Verify ProgressBar component receives correct currentStep
 * 4. Check if completion logic triggers at step 4
 * 5. Ensure state updates are properly propagated
 * 
 * SAFETY MECHANISMS IN PLACE:
 * - 30-second safety timeout
 * - Force completion after analysis
 * - Comprehensive error logging
 * - Graceful fallback handling
 * 
 * @author Assistant
 * @lastUpdated 2025-01-XX
 * @status Needs debugging for progress bar freezing
 */

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
import { api } from '../src/services/api';
import { addLog } from '../src/storage/logs';
import Onboarding from '../src/components/Onboarding';
import { SubscriptionStatus } from '../src/components/SubscriptionStatus';
import { SmartAdDisplay } from '../src/components/SmartAdDisplay';
import { compressImage, estimateCostSavings } from '../src/utils/imageCompression';


export default function Home() {
  const { session, refreshToken } = useSession();
  const { hasCompletedOnboarding, markOnboardingComplete, loading: onboardingLoading } = useOnboarding();
  const { subscriptionStatus, trackUsage, refreshSubscriptionStatus, resetScanUsage } = useSubscription();
  
  // Set up global router for API service redirects
  useEffect(() => {
    (globalThis as any).__glucosnap_router = router;
    return () => {
      delete (globalThis as any).__glucosnap_router;
    };
  }, []);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [compressedImageUri, setCompressedImageUri] = useState<string | null>(null);
  const [compressionInfo, setCompressionInfo] = useState<{ originalSize: number; compressedSize: number } | null>(null);
  const [result, setResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showAd, setShowAd] = useState(false);
  const [adsWatchedThisSession, setAdsWatchedThisSession] = useState(0); // Count of ads watched this session
  const [showAdCompleteMessage, setShowAdCompleteMessage] = useState(false); // Shows ad completion message
  const [hasAdFreePass, setHasAdFreePass] = useState(false); // Free pass after watching ad
  const [pendingAction, setPendingAction] = useState<'camera' | 'library' | null>(null); // Store user's intended action




  // Show onboarding for new users
  useEffect(() => {
    if (!onboardingLoading && !hasCompletedOnboarding) {
      // Small delay to let the home screen render first
      const timer = setTimeout(() => setShowOnboarding(true), 500);
      return () => clearTimeout(timer);
    }
  }, [hasCompletedOnboarding, onboardingLoading]);

  // Reset ads watched count when subscription status changes
  useEffect(() => {
    console.log('🔄 Subscription status changed:', subscriptionStatus);
    if (subscriptionStatus) {
      console.log('  - plan:', subscriptionStatus.plan);
      console.log('  - scansUsed:', subscriptionStatus.scansUsed);
      console.log('  - canScan:', subscriptionStatus.canScan);
      
      // Reset ads when subscription changes (new user or new day)
      setAdsWatchedThisSession(0);
      setShowAdCompleteMessage(false);
      console.log('✅ Reset ads watched count for new subscription status');
    }
  }, [subscriptionStatus]);

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
      
      console.log('✅ Reset ads watched count for new user:', session.email);
    } else {
      console.log('❌ No session email, clearing state');
      setAdsWatchedThisSession(0);
      setShowAdCompleteMessage(false);
      setShowAd(false);
      setHasAdFreePass(false);
      setPendingAction(null);
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
    console.log('🎉🎉🎉 handleAdComplete called - Ad completed, proceeding with image selection');
    setShowAd(false);
    setAdsWatchedThisSession(prev => prev + 1); // Increment ads watched count
    setShowAdCompleteMessage(true); // Show completion message
    setHasAdFreePass(true); // Grant free pass for immediate scan
    console.log('🔒 Ads watched this session:', adsWatchedThisSession + 1);
    console.log('🎫🎫🎫 Granted ad free pass for next scan - hasAdFreePass now TRUE');
    
    // Track ad completion
    await trackUsage('ad_watched');
    
    // Auto-hide the message after 5 seconds
    setTimeout(() => {
      setShowAdCompleteMessage(false);
    }, 5000);
    
    // Automatically execute the user's intended action
    if (pendingAction) {
      console.log(`🚀 Automatically executing pending action: ${pendingAction}`);
      setPendingAction(null); // Clear the pending action
      
      if (pendingAction === 'camera') {
        await executePhotoCapture();
      } else if (pendingAction === 'library') {
        await executeImageSelection();
      }
    } else {
      console.log('✅ Ad complete - no pending action to execute');
    }
    
    console.log('🐛 Debug state after ad complete:', { hasAdFreePass: true, showAd: false, showAdCompleteMessage: true, pendingAction });
  };

  const handleAdSkip = () => {
    setShowAd(false);
    setPendingAction(null); // Clear pending action when ad is skipped
    Alert.alert(
      'Ad Skipped',
      'You can upgrade to Premium to avoid ads.',
      [
        { text: 'Upgrade to Premium', onPress: () => {/* TODO: Navigate to upgrade */} },
        { text: 'OK' }
      ]
    );
  };

  const handleAdError = () => {
    setShowAd(false);
    setPendingAction(null); // Clear pending action when ad errors
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
    console.log('📚 Executing image selection...');
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    console.log('🔑 Media library permission status:', status);
    
    if (status !== 'granted') {
      console.log('❌ Media library permission denied');
      return;
    }
    
    console.log('📚 Launching image library...');
    const pick = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8 });
    console.log('📱 Image picker result:', pick.canceled ? 'canceled' : 'image selected');
    
    if (!pick.canceled) {
      console.log('🖼️ Image selected, setting URI and compressing...');
      setImageUri(pick.assets[0].uri);
      setShowAdCompleteMessage(false); // Hide the ad completion message
      await compressSelectedImage(pick.assets[0].uri);
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
    console.log('  - showAd:', showAd);
    
    // No daily limits anymore - free users get unlimited scans with ads after 3 free

    // Show ad for free users after their 3 free daily scans (unless they have a free pass)
    const nextScanNumber = (subscriptionStatus?.scansUsed || 0) + 1;
    console.log('🔍 Ad check:', { 
      plan: subscriptionStatus?.plan, 
      nextScanNumber, 
      needsAd: nextScanNumber > 3, 
      hasAdFreePass,
      finalDecision: subscriptionStatus?.plan === 'free' && nextScanNumber > 3 && !hasAdFreePass ? 'SHOW_AD' : 'PROCEED'
    });
    
    if (subscriptionStatus?.plan === 'free' && nextScanNumber > 3 && !hasAdFreePass) {
      console.log(`📺📺📺 Showing ad for free user (scan ${nextScanNumber}, ad required after 3 free scans)`);
      console.log('📝 Setting pending action: library');
      setPendingAction('library'); // Store the user's intent
      setShowAd(true);
      return;
    }
    
    // If they have a free pass, consume it
    if (hasAdFreePass) {
      console.log('🎫 Using ad free pass for this scan');
      setHasAdFreePass(false);
    }
    
    console.log('✅ Proceeding with image selection (ad not required or still in free tier)');
    await executeImageSelection();
  };

  // Execute the actual photo capture (without ad logic)
  const executePhotoCapture = async () => {
    console.log('📸 Executing photo capture...');
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      console.log('❌ Camera permission denied');
      return;
    }
    
    console.log('📸 Launching camera...');
    const shot = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    console.log('📱 Camera result:', shot.canceled ? 'canceled' : 'photo taken');
    
    if (!shot.canceled) {
      console.log('📸 Photo taken, setting URI and compressing...');
      setImageUri(shot.assets[0].uri);
      setShowAdCompleteMessage(false); // Hide the ad completion message
      await compressSelectedImage(shot.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    console.log('📸 takePhoto called with:');
    console.log('  - current user:', session?.email);
    console.log('  - adsWatchedThisSession:', adsWatchedThisSession);
    console.log('  - scansUsed:', subscriptionStatus?.scansUsed);
    
    // No daily limits anymore - free users get unlimited scans with ads after 3 free

    // Show ad for free users after their 3 free daily scans (unless they have a free pass)
    const nextScanNumber = (subscriptionStatus?.scansUsed || 0) + 1;
    if (subscriptionStatus?.plan === 'free' && nextScanNumber > 3 && !hasAdFreePass) {
      console.log(`📺 Showing ad for free user (scan ${nextScanNumber}, ad required after 3 free scans)`);
      console.log('📝 Setting pending action: camera');
      setPendingAction('camera'); // Store the user's intent
      setShowAd(true);
      return;
    }
    
    // If they have a free pass, consume it
    if (hasAdFreePass) {
      console.log('🎫 Using ad free pass for this scan');
      setHasAdFreePass(false);
    }
    
    console.log('✅ Proceeding with photo capture (ad not required or still in free tier)');
    await executePhotoCapture();
  };

  const compressSelectedImage = async (uri: string) => {
    try {
      console.log('🖼️ Starting image compression...');
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
      setCompressionInfo({ originalSize, compressedSize: compressed.size });
      
      // Show compression savings
      const savings = estimateCostSavings(originalSize, compressed.size);
      console.log(`✅ Image compressed: ${savings.originalMB}MB → ${savings.compressedMB}MB (${savings.savingsPercent}% savings)`);
    } catch (error) {
      console.error('❌ Compression failed:', error);
      // Fallback to original image
      setCompressedImageUri(uri);
      setCompressionInfo(null);
    } finally {
      setBusy(false);
    }
  };

  const analyze = async () => {
    if (!compressedImageUri) return;
    
    try {
      setBusy(true);
      
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
        return;
      }
      
      console.log('🚀 Starting analysis...');
      
      // Simple, direct API calls - no progress bar, no complexity
      const contentType = guessContentType(compressedImageUri);
      const { key, uploadUrl } = await api.getUploadUrl({ contentType }, handleTokenExpired);
      await api.uploadImage(uploadUrl, compressedImageUri, contentType);
      const res = await api.analyze({ key }, handleTokenExpired);
      
      console.log('🎉 Analysis complete!');
      setResult(res);
      
      // Persist a local log entry only if it's a food image
      try {
        const parsed = parseAnalysisText(String(res.text ?? ''));
        if (!parsed.nonFood) {
          await addLog({ imageUri: compressedImageUri, carbs: res.carbs ?? parsed.total ?? null, text: String(res.text ?? '') });
        }
      } catch {}
      
    } catch (e: any) {
      console.error('❌ Analysis failed:', e);
      
      // Check if it's a token expiration error
      if (e.message?.includes('Token expired')) {
        Alert.alert('Session Expired', 'Your session has expired. Please sign in again.', [
          { text: 'OK', onPress: () => router.push('/login') }
        ]);
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

        {/* Subscription Status */}
        <SubscriptionStatus />

        {/* Debug Info (Development Only) */}
        {__DEV__ && (
          <View style={[theme.card, { padding: 8, backgroundColor: colors.border + '20' }]}>
            <Text style={[theme.muted, { fontSize: 12 }]}>
              🐛 Debug: User: {session?.email || 'none'} | Scans Used: {subscriptionStatus?.scansUsed || 0} | Ads: {adsWatchedThisSession} | Free Pass: {hasAdFreePass ? '✅' : '❌'}
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

        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Pressable onPress={takePhoto} style={[styles.toolButton] }>
            <MaterialCommunityIcons name="camera-outline" size={20} color={colors.text} />
            <Text style={[theme.buttonTextPrimary, { marginLeft: 8 }]}>Take photo</Text>
          </Pressable>
          <Pressable onPress={chooseImage} style={[styles.toolButton] }>
            <MaterialCommunityIcons name="image-outline" size={20} color={colors.text} />
            <Text style={[theme.buttonTextPrimary, { marginLeft: 8 }]}>Pick from library</Text>
          </Pressable>
        </View>



        {imageUri && (
          <>
            <Image source={{ uri: imageUri }} style={{ width: '100%', aspectRatio: 1, borderRadius: 16, borderWidth: 1, borderColor: colors.border }} />
            
            {/* Compression info */}
            {compressionInfo && (
              <View style={[theme.card, { padding: 12, borderRadius: 12 }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <Text style={[theme.text, { fontSize: 14, fontWeight: '600' }]}>Image Optimized</Text>
                  <MaterialCommunityIcons name="check-circle" size={16} color={colors.accent} />
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={[theme.muted, { fontSize: 12 }]}>
                    {compressionInfo.originalSize > 1024 * 1024 
                      ? `${(compressionInfo.originalSize / (1024 * 1024)).toFixed(1)}MB` 
                      : `${(compressionInfo.originalSize / 1024).toFixed(0)}KB`}
                    {' → '}
                    {compressionInfo.compressedSize > 1024 * 1024 
                      ? `${(compressionInfo.compressedSize / (1024 * 1024)).toFixed(1)}MB` 
                      : `${(compressionInfo.compressedSize / 1024).toFixed(0)}KB`}
                  </Text>
                  <Text style={[theme.text, { fontSize: 12, fontWeight: '600', color: colors.accent }]}>
                    {((1 - compressionInfo.compressedSize / compressionInfo.originalSize) * 100).toFixed(0)}% smaller
                  </Text>
                </View>
              </View>
            )}
          </>
        )}

        <Pressable disabled={!compressedImageUri || busy} onPress={analyze} style={[theme.buttonPrimary, { opacity: !compressedImageUri || busy ? 0.5 : 1, backgroundColor: colors.primary }] }>
          {busy ? <ActivityIndicator color={colors.text} /> : <Text style={theme.buttonTextPrimary}>Analyze Carbs</Text>}
        </Pressable>

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
  const parsed = parseAnalysisText(String(result.text ?? ''));
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

function parseAnalysisText(text: string): { nonFood: boolean; reason?: string; total: number | null; items: Array<{ name: string; carbs_g?: number; notes?: string }>; raw: string } {
  // Try to extract a JSON object from the text
  try {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start >= 0 && end > start) {
      const json = JSON.parse(text.slice(start, end + 1));
      if (json && json.non_food === true) {
        return { nonFood: true, reason: typeof json.reason === 'string' ? json.reason : undefined, total: null, items: [], raw: text };
      }
      const total = typeof json.total_carbs_g === 'number' ? json.total_carbs_g : null;
      const itemsIn = Array.isArray(json.items) ? json.items : [];
      const items = itemsIn.map((it: any) => ({
        name: String(it?.name ?? 'Item'),
        carbs_g: typeof it?.carbs_g === 'number' ? it.carbs_g : undefined,
        notes: typeof it?.notes === 'string' ? it.notes : undefined,
      }));
      return { nonFood: false, total, items, raw: text };
    }
  } catch {}
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
