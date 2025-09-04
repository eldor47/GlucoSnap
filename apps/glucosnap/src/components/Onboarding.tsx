import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  Animated,
  Dimensions,
  StyleSheet,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing } from '../theme';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: string;
  highlightTarget?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  position?: 'top' | 'bottom' | 'center';
}

interface OnboardingProps {
  visible: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

const onboardingSteps: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to GlucoSnap! 👋',
    description: 'Your personal carb counting assistant. Let\'s take a quick tour to get you started!',
    icon: 'hand-wave',
    position: 'center',
  },
  {
    id: 'camera',
    title: 'Take Photos 📸',
    description: 'Tap the camera button to take a photo of your meal. Our AI will analyze it and estimate the carbs for you.',
    icon: 'camera',
    position: 'top',
  },
  {
    id: 'gallery',
    title: 'Or Choose from Gallery 🖼️',
    description: 'You can also select photos from your gallery if you already have pictures of your meals.',
    icon: 'image',
    position: 'top',
  },
  {
    id: 'analysis',
    title: 'AI Analysis 🤖',
    description: 'Our AI will identify food items and estimate carbohydrates. Review and adjust the results as needed.',
    icon: 'brain',
    position: 'center',
  },
  {
    id: 'logs',
    title: 'Track Your History 📊',
    description: 'View your meal history in the logs section. Track your carb intake over time.',
    icon: 'history',
    position: 'top',
  },
  {
    id: 'settings',
    title: 'Customize Settings ⚙️',
    description: 'Access settings to customize your experience and manage your account.',
    icon: 'cog',
    position: 'top',
  },
  {
    id: 'ready',
    title: 'You\'re All Set! 🎉',
    description: 'Start by taking a photo of your meal or browsing your previous logs. Happy carb counting!',
    icon: 'check-circle',
    position: 'center',
  },
];

export default function Onboarding({ visible, onComplete, onSkip }: OnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, currentStep]);

  const nextStep = () => {
    if (currentStep < onboardingSteps.length - 1) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.8,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setCurrentStep(currentStep + 1);
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.spring(scaleAnim, {
            toValue: 1,
            tension: 100,
            friction: 8,
            useNativeDriver: true,
          }),
        ]).start();
      });
    } else {
      onComplete();
    }
  };

  const previousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const step = onboardingSteps[currentStep];
  const isLastStep = currentStep === onboardingSteps.length - 1;
  const isFirstStep = currentStep === 0;

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        {/* Semi-transparent background */}
        <View style={styles.backdrop} />
        
        {/* Main content */}
        <Animated.View
          style={[
            styles.container,
            step.position === 'top' && styles.containerTop,
            step.position === 'bottom' && styles.containerBottom,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <View style={styles.card}>
            {/* Header with icon */}
            <View style={styles.header}>
              <View style={styles.iconContainer}>
                <MaterialCommunityIcons
                  name={step.icon as any}
                  size={32}
                  color={colors.accent}
                />
              </View>
              <Pressable onPress={onSkip} style={styles.skipButton}>
                <MaterialCommunityIcons name="close" size={20} color={colors.subtext} />
              </Pressable>
            </View>

            {/* Content */}
            <View style={styles.content}>
              <Text style={styles.title}>{step.title}</Text>
              <Text style={styles.description}>{step.description}</Text>
            </View>

            {/* Progress indicator */}
            <View style={styles.progressContainer}>
              {onboardingSteps.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.progressDot,
                    index === currentStep && styles.progressDotActive,
                    index < currentStep && styles.progressDotCompleted,
                  ]}
                />
              ))}
            </View>

            {/* Navigation */}
            <View style={styles.navigation}>
              <Pressable
                onPress={previousStep}
                style={[styles.navButton, styles.navButtonSecondary]}
                disabled={isFirstStep}
              >
                <MaterialCommunityIcons
                  name="arrow-left"
                  size={18}
                  color={isFirstStep ? colors.subtext : colors.text}
                />
                <Text style={[styles.navButtonText, isFirstStep && styles.navButtonTextDisabled]}>
                  Back
                </Text>
              </Pressable>

              <Pressable onPress={nextStep} style={[styles.navButton, styles.navButtonPrimary]}>
                <Text style={styles.navButtonTextPrimary}>
                  {isLastStep ? 'Get Started' : 'Next'}
                </Text>
                <MaterialCommunityIcons
                  name={isLastStep ? 'check' : 'arrow-right'}
                  size={18}
                  color={colors.text}
                />
              </Pressable>
            </View>

            {/* Skip option */}
            {!isLastStep && (
              <Pressable onPress={onSkip} style={styles.skipTextContainer}>
                <Text style={styles.skipText}>Skip Tutorial</Text>
              </Pressable>
            )}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  container: {
    maxWidth: screenWidth - 40,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  containerTop: {
    position: 'absolute',
    top: '20%',
  },
  containerBottom: {
    position: 'absolute',
    bottom: '20%',
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: spacing(3),
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing(2),
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipButton: {
    padding: spacing(1),
    borderRadius: 20,
  },
  content: {
    marginBottom: spacing(3),
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing(1),
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: colors.subtext,
    lineHeight: 20,
    textAlign: 'center',
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing(3),
    gap: spacing(1),
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  progressDotActive: {
    backgroundColor: colors.accent,
    width: 24,
  },
  progressDotCompleted: {
    backgroundColor: colors.primary,
  },
  navigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing(2),
  },
  navButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing(1.5),
    paddingHorizontal: spacing(2),
    borderRadius: 12,
    gap: spacing(1),
  },
  navButtonSecondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  navButtonPrimary: {
    backgroundColor: colors.primary,
  },
  navButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  navButtonTextDisabled: {
    color: colors.subtext,
  },
  navButtonTextPrimary: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  skipTextContainer: {
    marginTop: spacing(2),
    alignItems: 'center',
  },
  skipText: {
    fontSize: 12,
    color: colors.subtext,
    textDecorationLine: 'underline',
  },
});








