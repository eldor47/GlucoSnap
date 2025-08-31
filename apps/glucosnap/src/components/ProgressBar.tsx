/**
 * 🎯 Progress Bar Component - Multi-step Analysis Progress
 * 
 * ✅ FEATURES:
 * - Animated progress bar with smooth transitions
 * - Step-by-step progress with icons and descriptions
 * - Pulse animation for current step
 * - Visual step indicators (dots)
 * - Auto-completion when reaching final step
 * 
 * 🔧 DEBUGGING ADDED:
 * - Console logging for step changes
 * - Completion trigger logging
 * - Render state logging
 * 
 * KNOWN ISSUES:
 * - Progress bar freezes on step 2 during analysis
 * - Need to verify step progression logic
 * 
 * COMPLETION LOGIC:
 * - Triggers when currentStep >= steps.length - 1
 * - For 5 steps (indices 0-4), completion at step 4
 * - 1-second delay before calling onComplete
 * 
 * ANIMATIONS:
 * - Progress bar: Smooth width animation
 * - Step transitions: Fade and scale effects
 * - Icon pulse: Gentle breathing animation
 * 
 * @author Assistant
 * @lastUpdated 2025-01-XX
 * @status Working but needs debugging for freezing issue
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing } from '../theme';

const { width: screenWidth } = Dimensions.get('window');

export interface ProgressStep {
  id: string;
  title: string;
  description: string;
  icon: string;
  duration?: number; // in milliseconds
}

export interface ProgressBarProps {
  steps: ProgressStep[];
  currentStep: number;
  visible: boolean;
  onComplete?: () => void;
}

export default function ProgressBar({ 
  steps, 
  currentStep, 
  visible, 
  onComplete 
}: ProgressBarProps) {
  const progressAnim = useRef(new Animated.Value(0)).current;
  const stepAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      console.log(`🎯 ProgressBar: Starting animation for step ${currentStep}`);
      
      // Animate progress bar
      Animated.timing(progressAnim, {
        toValue: (currentStep + 1) / steps.length,
        duration: 800,
        useNativeDriver: false,
      }).start();

      // Animate current step
      Animated.sequence([
        Animated.timing(stepAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
        Animated.timing(stepAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start();

      // Pulse animation for current step
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [visible, currentStep, steps.length]);

  useEffect(() => {
    console.log(`🎯 ProgressBar: currentStep=${currentStep}, steps.length=${steps.length}`);
    
    if (currentStep >= steps.length - 1 && onComplete) {
      console.log('🎉 ProgressBar: Triggering completion');
      // Small delay to show completion
      const timer = setTimeout(() => {
        onComplete();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [currentStep, steps.length, onComplete]);

  if (!visible) return null;

  const currentStepData = steps[currentStep] || steps[steps.length - 1];
  const progress = ((currentStep + 1) / steps.length) * 100;
  
  console.log(`🎨 ProgressBar render: currentStep=${currentStep}, stepData=${currentStepData?.title}, progress=${progress}%`);

  return (
    <View style={styles.container}>
      {/* Progress bar background */}
      <View style={styles.progressContainer}>
        <Animated.View
          style={[
            styles.progressFill,
            {
              width: progressAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      </View>

      {/* Current step display */}
      <Animated.View
        style={[
          styles.stepContainer,
          {
            opacity: stepAnim,
            transform: [
              {
                scale: stepAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.8, 1],
                }),
              },
            ],
          },
        ]}
      >
        {/* Step icon with pulse animation */}
        <Animated.View
          style={[
            styles.iconContainer,
            {
              transform: [{ scale: pulseAnim }],
            },
          ]}
        >
          <MaterialCommunityIcons
            name={currentStepData.icon as any}
            size={32}
            color={colors.accent}
          />
        </Animated.View>

        {/* Step content */}
        <View style={styles.stepContent}>
          <Text style={styles.stepTitle}>{currentStepData.title}</Text>
          <Text style={styles.stepDescription}>{currentStepData.description}</Text>
        </View>

        {/* Step counter */}
        <View style={styles.stepCounter}>
          <Text style={styles.stepNumber}>{currentStep + 1}</Text>
          <Text style={styles.stepTotal}>/{steps.length}</Text>
        </View>
      </Animated.View>

      {/* Step indicators */}
      <View style={styles.stepIndicators}>
        {steps.map((step, index) => (
          <View
            key={step.id}
            style={[
              styles.stepDot,
              index === currentStep && styles.stepDotActive,
              index < currentStep && styles.stepDotCompleted,
            ]}
          >
            {index < currentStep && (
              <MaterialCommunityIcons
                name="check"
                size={12}
                color={colors.text}
              />
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: spacing(3),
    marginHorizontal: spacing(2),
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
  progressContainer: {
    height: 8,
    backgroundColor: colors.surface,
    borderRadius: 4,
    marginBottom: spacing(3),
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: 4,
  },
  stepContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing(3),
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing(2),
    borderWidth: 2,
    borderColor: colors.accent,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing(0.5),
  },
  stepDescription: {
    fontSize: 14,
    color: colors.subtext,
    lineHeight: 20,
  },
  stepCounter: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 40,
  },
  stepNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.accent,
  },
  stepTotal: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.subtext,
  },
  stepIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing(1),
  },
  stepDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepDotActive: {
    backgroundColor: colors.accent,
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  stepDotCompleted: {
    backgroundColor: colors.primary,
    width: 16,
    height: 16,
    borderRadius: 8,
  },
});
