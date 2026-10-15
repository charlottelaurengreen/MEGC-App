import { Image } from 'expo-image';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Btn, Small } from '@/components/ui';
import { useSession } from '@/lib/session';
import { isConfigured } from '@/lib/supabase';
import { C, T } from '@/theme';

export default function SignIn() {
  const { signIn, resetPassword } = useSession();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!email || !password) return setError('Enter your email and password.');
    setBusy(true);
    setError(null);
    try {
      await signIn(email, password);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const forgot = async () => {
    if (!email) return setError('Enter your email above, then tap “Forgotten your password?” again.');
    try {
      await resetPassword(email);
      Alert.alert('Check your email', 'If that address is registered, we’ve sent a link to reset your password.');
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: C.blue }}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', gap: 36, paddingHorizontal: 28, paddingTop: insets.top + 48, paddingBottom: insets.bottom + 28 }}
        keyboardShouldPersistTaps="handled">
        <View style={{ alignItems: 'center', gap: 18 }}>
          <Image source={require('@/assets/brand/logo-full-gold.png')} style={{ width: 200, height: 78 }} contentFit="contain" accessibilityLabel="Merchants of Edinburgh Golf Club" />
          <Text style={[T.label, { color: C.gold }]}>Member app</Text>
        </View>

        <View style={{ gap: 16 }}>
          {!isConfigured && (
            <Small style={{ color: C.gold }}>
              The app isn’t connected to the club’s server yet. Add the Supabase keys to .env.local (see README).
            </Small>
          )}
          <View style={s.field}>
            <Text nativeID="email-l" style={[T.label, { color: C.dim }]}>Email</Text>
            <TextInput
              accessibilityLabelledBy="email-l"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              textContentType="username"
              style={s.input}
              placeholderTextColor="rgba(255,255,255,0.5)"
            />
          </View>
          <View style={s.field}>
            <Text nativeID="pw-l" style={[T.label, { color: C.dim }]}>Password</Text>
            <TextInput
              accessibilityLabelledBy="pw-l"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="current-password"
              textContentType="password"
              returnKeyType="go"
              onSubmitEditing={submit}
              style={s.input}
            />
          </View>
          {error && <Small style={{ color: C.white }} >{error}</Small>}
          <Btn label="Sign in" variant="gold" onPress={submit} loading={busy} style={{ marginTop: 8 }} />
          <Btn label="Visitors: book online" variant="onblue" onPress={() => WebBrowser.openBrowserAsync('https://visitors.brsgolf.com/merchantsofedinburgh#/course/1')} />
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 6 }}>
          <Pressable onPress={forgot} hitSlop={8}><Small style={{ color: C.gold }}>Forgotten your password?</Small></Pressable>
          <Small style={{ color: C.dim }}>·</Small>
          <Pressable onPress={() => WebBrowser.openBrowserAsync('https://www.merchantsgolf.com/membership/')} hitSlop={8}>
            <Small style={{ color: C.gold }}>Become a member</Small>
          </Pressable>
        </View>
        <Small style={{ textAlign: 'center', color: 'rgba(255,255,255,0.7)' }}>Golf in Morningside since 1907</Small>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  field: { gap: 6 },
  input: { fontSize: 15, paddingVertical: 13, paddingHorizontal: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.45)', borderRadius: 2, color: C.white },
});
