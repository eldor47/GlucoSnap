import React, { useState } from 'react';
import { View, Text, Button, ScrollView, StyleSheet, Alert } from 'react-native';
import { debugNetworkConnectivity, testSimpleApiCall } from '../services/debugApi';
import { colors } from '../theme';

export function NetworkDebug() {
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const runDiagnostics = async () => {
    setLoading(true);
    try {
      const debugResults = await debugNetworkConnectivity();
      setResults(debugResults);
      console.log('Network Debug Results:', JSON.stringify(debugResults, null, 2));
    } catch (error: any) {
      Alert.alert('Debug Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const testSimpleCall = async () => {
    setLoading(true);
    try {
      const result = await testSimpleApiCall();
      Alert.alert('API Test Result', JSON.stringify(result, null, 2));
    } catch (error: any) {
      Alert.alert('API Test Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Network Debugging</Text>
      
      <View style={styles.section}>
        <Button 
          title={loading ? "Running..." : "Run Network Diagnostics"} 
          onPress={runDiagnostics}
          disabled={loading}
        />
      </View>

      <View style={styles.section}>
        <Button 
          title={loading ? "Testing..." : "Test Simple API Call"} 
          onPress={testSimpleCall}
          disabled={loading}
        />
      </View>

      {results && (
        <View style={styles.results}>
          <Text style={styles.subtitle}>Results:</Text>
          <Text style={styles.info}>Platform: {results.platform}</Text>
          <Text style={styles.info}>API URL: {results.apiBaseUrl}</Text>
          
          {results.tests.map((test: any, index: number) => (
            <View key={index} style={[styles.test, test.success ? styles.success : styles.failure]}>
              <Text style={styles.testName}>{test.name}</Text>
              <Text style={styles.testStatus}>
                {test.success ? '✅ Success' : '❌ Failed'}
              </Text>
              {test.error && <Text style={styles.error}>Error: {test.error}</Text>}
              {test.response && <Text style={styles.response}>Response: {test.response}</Text>}
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: colors.text,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
    color: colors.text,
  },
  section: {
    marginBottom: 15,
  },
  results: {
    marginTop: 20,
  },
  info: {
    fontSize: 14,
    marginBottom: 5,
    color: colors.subtext,
  },
  test: {
    padding: 10,
    marginVertical: 5,
    borderRadius: 5,
    borderWidth: 1,
    backgroundColor: colors.surface,
  },
  success: {
    borderColor: colors.success,
  },
  failure: {
    borderColor: colors.error,
  },
  testName: {
    fontWeight: 'bold',
    fontSize: 16,
    color: colors.text,
  },
  testStatus: {
    fontSize: 14,
    marginTop: 2,
    color: colors.text,
  },
  error: {
    color: colors.error,
    fontSize: 12,
    marginTop: 5,
  },
  response: {
    color: colors.success,
    fontSize: 12,
    marginTop: 5,
  },
});






