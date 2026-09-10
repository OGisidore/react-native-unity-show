import * as React from 'react';

import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { multiply } from 'react-native-unity-show';

export default function App() {
  const [result, setResult] = React.useState<number | undefined>();
  const [error, setError] = React.useState<string | undefined>();

  React.useEffect(() => {
    multiply(3, 7).then(setResult).catch((nativeError: Error) => {
      setError(nativeError.message);
    });
  }, []);

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.container}>
        <Text style={styles.title}>react-native-unity-show</Text>
        <Text style={styles.label}>Native module smoke test</Text>
        <Text style={styles.result}>
          {error ? `Error: ${error}` : `multiply(3, 7): ${result ?? '...'}`}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f7f8fa',
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },
  title: {
    color: '#1b1f24',
    fontSize: 22,
    fontWeight: '700',
  },
  label: {
    color: '#59636e',
    fontSize: 15,
  },
  result: {
    color: '#1b1f24',
    fontSize: 17,
    textAlign: 'center',
  },
});
