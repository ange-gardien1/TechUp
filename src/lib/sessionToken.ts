import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const SESSION_TOKEN_KEY = 'teckup:session-token';
const SECURE_SESSION_TOKEN_KEY = 'teckup.session-token';

export async function getSessionToken() {
  if (Platform.OS === 'web') {
    return AsyncStorage.getItem(SESSION_TOKEN_KEY);
  }
  return SecureStore.getItemAsync(SECURE_SESSION_TOKEN_KEY);
}

export async function setSessionToken(token: string) {
  if (Platform.OS === 'web') {
    await AsyncStorage.setItem(SESSION_TOKEN_KEY, token);
    return;
  }
  await SecureStore.setItemAsync(SECURE_SESSION_TOKEN_KEY, token);
}

export async function clearSessionToken() {
  if (Platform.OS === 'web') {
    await AsyncStorage.removeItem(SESSION_TOKEN_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(SECURE_SESSION_TOKEN_KEY);
}
