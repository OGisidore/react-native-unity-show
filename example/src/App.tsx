import * as React from 'react';

import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  UnityShowView,
  addUnityEventListener,
  loadUnity,
  sendMessage,
  type UnityShowErrorEvent,
  type UnityShowLifecycleState,
  type UnityShowMessageEvent,
} from 'react-native-unity-show';

const unitySource = {
  projectId: 'example',
  initialScene: 'Main',
};

export default function App() {
  const [state, setState] = React.useState<UnityShowLifecycleState>('idle');
  const [logs, setLogs] = React.useState<string[]>([]);

  const addLog = React.useCallback((message: string) => {
    setLogs((currentLogs) => [message, ...currentLogs].slice(0, 8));
  }, []);

  React.useEffect(() => {
    const subscriptions = [
      addUnityEventListener('stateChange', (event) => {
        setState(event.state);
        addLog(`state: ${event.state}`);
      }),
      addUnityEventListener('message', (event: UnityShowMessageEvent) => {
        addLog(`message: ${event.name ?? 'unnamed'}`);
      }),
      addUnityEventListener('error', (event: UnityShowErrorEvent) => {
        setState('error');
        addLog(`${event.code}: ${event.message}`);
      }),
    ];

    loadUnity(unitySource).catch((error: Error) => {
      setState('error');
      addLog(error.message);
    });

    return () => {
      subscriptions.forEach((subscription) => subscription.remove());
    };
  }, [addLog]);

  const sendPing = React.useCallback(() => {
    sendMessage({
      gameObject: 'Bridge',
      methodName: 'ReceiveMessage',
      payload: {
        name: 'ping',
        sentAt: new Date().toISOString(),
      },
    }).catch((error: Error) => {
      setState('error');
      addLog(error.message);
    });
  }, [addLog]);

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>react-native-unity-show</Text>
        <Text style={styles.status}>{state}</Text>
      </View>
      <UnityShowView
        source={unitySource}
        style={styles.unity}
        onReady={(event) => {
          setState('loaded');
          addLog(`ready: ${event.unityVersion ?? 'unknown Unity version'}`);
        }}
        onError={(event) => {
          setState('error');
          addLog(`${event.code}: ${event.message}`);
        }}
      />
      <View style={styles.footer}>
        <Pressable style={styles.button} onPress={sendPing}>
          <Text style={styles.buttonText}>Send ping</Text>
        </Pressable>
        <ScrollView style={styles.logs}>
          {logs.map((log, index) => (
            <Text key={`${index}-${log}`} style={styles.logLine}>
              {log}
            </Text>
          ))}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#101418',
  },
  header: {
    minHeight: 84,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  title: {
    color: '#f5f7fa',
    fontSize: 22,
    fontWeight: '700',
  },
  status: {
    color: '#9fb0c0',
    fontSize: 14,
    marginTop: 4,
    textTransform: 'uppercase',
  },
  unity: {
    flex: 1,
    backgroundColor: '#05070a',
  },
  footer: {
    minHeight: 172,
    gap: 12,
    padding: 16,
    backgroundColor: '#161c22',
    borderTopColor: '#26313a',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    borderRadius: 6,
    backgroundColor: '#f0b429',
  },
  buttonText: {
    color: '#101418',
    fontSize: 16,
    fontWeight: '700',
  },
  logs: {
    maxHeight: 92,
  },
  logLine: {
    color: '#d9e2ec',
    fontSize: 13,
    lineHeight: 19,
  },
});
