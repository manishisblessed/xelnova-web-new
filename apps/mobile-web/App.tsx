import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Button,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Constants from 'expo-constants';
import {
  configureTokenPersistence,
  setApiBaseURL,
  setAppRole,
  login,
  logout,
  hydrateAuthFromPersistence,
  type AuthUser,
} from '@xelnova/api';
import { customerTokenPersistence } from './src/lib/persistence';

setAppRole('CUSTOMER');

export default function App() {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const apiUrl = (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl;
    if (apiUrl) setApiBaseURL(apiUrl);
    configureTokenPersistence(customerTokenPersistence);
    hydrateAuthFromPersistence()
      .then(setUser)
      .finally(() => setReady(true));
  }, []);

  const onLogin = async () => {
    setError(null);
    setBusy(true);
    try {
      const res = await login(email.trim(), password);
      setUser(res.user);
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'response' in e
          ? (e as { response?: { data?: { message?: string } } }).response?.data?.message
          : null;
      setError(msg || 'Sign in failed');
    } finally {
      setBusy(false);
    }
  };

  const onLogout = async () => {
    setBusy(true);
    try {
      await logout();
      setUser(null);
    } finally {
      setBusy(false);
    }
  };

  if (!ready) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
        <StatusBar style="auto" />
      </View>
    );
  }

  if (user) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Xelnova</Text>
        <Text style={styles.sub}>Signed in as {user.email}</Text>
        <Text style={styles.muted}>Role: {user.role}</Text>
        <Button title="Sign out" onPress={onLogout} disabled={busy} />
        <StatusBar style="auto" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.title}>Xelnova</Text>
      <Text style={styles.sub}>Customer — sign in with your retail account</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button title={busy ? 'Signing in…' : 'Sign in'} onPress={onLogin} disabled={busy} />
      <StatusBar style="auto" />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'stretch',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 12,
  },
  title: { fontSize: 24, fontWeight: '700', textAlign: 'center' },
  sub: { fontSize: 14, color: '#444', textAlign: 'center', marginBottom: 8 },
  muted: { fontSize: 13, color: '#666', textAlign: 'center' },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  error: { color: '#b91c1c', fontSize: 14, textAlign: 'center' },
});
