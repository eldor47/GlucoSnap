import { StyleSheet } from 'react-native';

export const colors = {
  background: '#1F1246', // deep purple
  surface: '#2A1B5C', // Slightly lighter for better input contrast
  card: '#2B1A61',
  primary: '#6C2BD9',
  primaryDark: '#4C1D95',
  accent: '#22D3EE',
  text: '#FFFFFF', // Pure white for maximum readability
  subtext: '#D1C7F7', // Lighter purple for better contrast
  border: '#4A3B8A', // Lighter border for better visibility
  danger: '#FF5555', // Slightly brighter red
  // Additional colors that were missing
  white: '#FFFFFF',
  error: '#FF5555', // Same as danger for consistency
  success: '#10B981', // Green for success states
  warning: '#F59E0B', // Orange for warning states
};

export const spacing = (n: number) => n * 8;

export const theme = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing(2),
  },
  screenContent: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing(2),
    paddingBottom: spacing(2),
    paddingTop: spacing(1), // Reduced top padding since SafeAreaView handles safe area
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.subtext,
    fontSize: 14,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonPrimary: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  buttonTextPrimary: {
    color: colors.text,
    fontWeight: '700',
  },
  text: {
    color: colors.text,
  },
  muted: {
    color: colors.subtext,
  },
});

