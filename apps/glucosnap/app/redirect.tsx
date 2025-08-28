import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';

export default function Redirect() {
  useEffect(() => {
    WebBrowser.maybeCompleteAuthSession();
    router.replace('/home');
  }, []);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator />
    </View>
  );
}
