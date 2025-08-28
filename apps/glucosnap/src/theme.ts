import { StyleSheet } from 'react-native';

export const colors = {
  background: '#1F1246', // deep purple
  surface: '#251757',
  card: '#2B1A61',
  primary: '#6C2BD9',
  primaryDark: '#4C1D95',
  accent: '#22D3EE',
  text: '#F5F3FF',
  subtext: '#C4B5FD',
  border: '#3B2C7A',
  danger: '#EF4444',
};

export const spacing = (n: number) => n * 8;

export const theme = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing(2),
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

