import { View, Text, Pressable, ActivityIndicator, TextInput, StyleSheet, Alert } from 'react-native';
import { useState, useCallback } from 'react';
import { useSession } from '../src/state/session';
import { router } from 'expo-router';
import { theme, colors } from '../src/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function Login() {
  const { signInWithEmail, signUpWithEmail } = useSession();
  const [isSignUp, setIsSignUp] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [usernameError, setUsernameError] = useState('');

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      setEmailError('Email is required');
      return false;
    } else if (!emailRegex.test(email)) {
      setEmailError('Please enter a valid email address');
      return false;
    } else {
      setEmailError('');
      return true;
    }
  };

  const validatePassword = (password: string) => {
    if (!password) {
      setPasswordError('Password is required');
      return false;
    } else if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return false;
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/.test(password)) {
      setPasswordError('Password must contain uppercase, lowercase, number, and special character');
      return false;
    } else {
      setPasswordError('');
      return true;
    }
  };

  const validateUsername = (username: string) => {
    if (isSignUp && !username) {
      setUsernameError('Username is required');
      return false;
    } else if (isSignUp && username.length < 3) {
      setUsernameError('Username must be at least 3 characters');
      return false;
    } else {
      setUsernameError('');
      return true;
    }
  };

  const handleAuth = useCallback(async () => {
    // Validate email for both modes
    const isEmailValid = validateEmail(email);
    
    // Validate password and username only for sign-up
    let isPasswordValid = true;
    let isUsernameValid = true;
    
    if (isSignUp) {
      isPasswordValid = validatePassword(password);
      isUsernameValid = validateUsername(username);
    } else {
      // For sign-in, just ensure password exists
      isPasswordValid = password.length > 0;
    }

    if (!isEmailValid || !isPasswordValid || !isUsernameValid) {
      setStatus('Please fix the errors above');
      return;
    }

    try {
      setStatus('');
      setBusy(true);
      
      if (isSignUp) {
        await signUpWithEmail(email, password, username);
        setStatus('Account created successfully!');
        // Redirect to home after successful signup
        router.replace('/home');
      } else {
        await signInWithEmail(email, password);
        router.replace('/home');
      }
    } catch (error: any) {
      setStatus(`Authentication failed: ${error.message || 'Unknown error'}`);
    } finally {
      setBusy(false);
    }
  }, [isSignUp, email, password, username, signInWithEmail, signUpWithEmail]);

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setStatus('');
    setEmail('');
    setPassword('');
    setUsername('');
    setEmailError('');
    setPasswordError('');
    setUsernameError('');
    
    // Clear password validation when switching to sign-in mode
    if (isSignUp) {
      setPasswordError('');
    }
  };

  return (
    <View style={[theme.screenContent, styles.center]}>
      <Text style={[theme.title, { marginBottom: 8 }]}>GlucoSnap</Text>
      <Text style={[theme.subtitle, { textAlign: 'center', marginBottom: 32 }]}>
        {isSignUp ? 'Create an account' : 'Sign in to your account'}
      </Text>

      <View style={styles.form}>
        {isSignUp && (
          <View style={styles.inputContainer}>
            <TextInput
              style={[styles.input, usernameError ? styles.inputError : null]}
              placeholder="Username"
              placeholderTextColor={colors.subtext}
              value={username}
              onChangeText={(text) => {
                setUsername(text);
                if (text) validateUsername(text);
              }}
              onBlur={() => validateUsername(username)}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {usernameError ? <Text style={styles.errorText}>{usernameError}</Text> : null}
          </View>
        )}
        
        <View style={styles.inputContainer}>
          <TextInput
            style={[styles.input, emailError ? styles.inputError : null]}
            placeholder="Email"
            placeholderTextColor={colors.subtext}
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              if (text) validateEmail(text);
            }}
            onBlur={() => validateEmail(email)}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
        </View>
        
        <View style={styles.inputContainer}>
          <TextInput
            style={[styles.input, isSignUp && passwordError ? styles.inputError : null]}
            placeholder="Password"
            placeholderTextColor={colors.subtext}
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              if (isSignUp && text) validatePassword(text);
            }}
            onBlur={() => isSignUp && validatePassword(password)}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />
          {isSignUp && passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
        </View>

        <Pressable
          disabled={busy}
          onPress={handleAuth}
          style={[theme.buttonPrimary, styles.button, { opacity: busy ? 0.6 : 1 }]}>
          {busy ? (
            <ActivityIndicator color={colors.text} style={{ marginRight: 8 }} />
          ) : (
            <MaterialCommunityIcons 
              name={isSignUp ? "account-plus" : "login"} 
              size={20} 
              color={colors.text} 
              style={{ marginRight: 8 }} 
            />
          )}
          <Text style={theme.buttonTextPrimary}>
            {isSignUp ? 'Create Account' : 'Sign In'}
          </Text>
        </Pressable>

        <Pressable
          disabled={busy}
          onPress={toggleMode}
          style={styles.toggleButton}>
          <Text style={styles.toggleText}>
            {isSignUp ? 'Already have an account? Sign In' : 'Need an account? Sign Up'}
          </Text>
        </Pressable>
      </View>

      {status ? <Text style={{ marginTop: 16, color: colors.danger }}>{String(status)}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  form: {
    width: '100%',
    maxWidth: 300,
    alignItems: 'center',
  },
  inputContainer: {
    width: '100%',
    marginBottom: 16,
  },
  input: {
    width: '100%',
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: colors.surface,
    color: colors.text,
  },
  inputError: {
    borderColor: colors.danger,
    borderWidth: 2,
  },
  errorText: {
    color: colors.danger,
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  button: {
    width: '100%',
    marginTop: 8,
  },
  toggleButton: {
    marginTop: 16,
    padding: 8,
  },
  toggleText: {
    color: colors.accent, // Changed from primary to accent for better visibility
    fontSize: 14,
    textDecorationLine: 'underline',
    fontWeight: '600',
  },
});

