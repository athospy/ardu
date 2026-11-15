/**
 * Storage Utilities
 * Secure storage for tokens, user data, and app state
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  TOKEN: '@ardu_token',
  REFRESH_TOKEN: '@ardu_refresh_token',
  USER: '@ardu_user',
  QUOTES: 'quotes', // Keep existing key for backward compatibility
  NOTIFICATION_SCHEDULED: 'notificationsScheduled',
  NOTIFICATION_ONBOARDING: 'hasSeenNotificationOnboarding',
};

// ============ Token Management ============

export const saveToken = async (token) => {
  try {
    await AsyncStorage.setItem(KEYS.TOKEN, token);
  } catch (error) {
    console.error('Error saving token:', error);
  }
};

export const getToken = async () => {
  try {
    return await AsyncStorage.getItem(KEYS.TOKEN);
  } catch (error) {
    console.error('Error getting token:', error);
    return null;
  }
};

export const removeToken = async () => {
  try {
    await AsyncStorage.removeItem(KEYS.TOKEN);
  } catch (error) {
    console.error('Error removing token:', error);
  }
};

// ============ Refresh Token Management ============

export const saveRefreshToken = async (token) => {
  try {
    await AsyncStorage.setItem(KEYS.REFRESH_TOKEN, token);
  } catch (error) {
    console.error('Error saving refresh token:', error);
  }
};

export const getRefreshToken = async () => {
  try {
    return await AsyncStorage.getItem(KEYS.REFRESH_TOKEN);
  } catch (error) {
    console.error('Error getting refresh token:', error);
    return null;
  }
};

export const removeRefreshToken = async () => {
  try {
    await AsyncStorage.removeItem(KEYS.REFRESH_TOKEN);
  } catch (error) {
    console.error('Error removing refresh token:', error);
  }
};

// ============ User Data Management ============

export const saveUser = async (user) => {
  try {
    await AsyncStorage.setItem(KEYS.USER, JSON.stringify(user));
  } catch (error) {
    console.error('Error saving user:', error);
  }
};

export const getUser = async () => {
  try {
    const user = await AsyncStorage.getItem(KEYS.USER);
    return user ? JSON.parse(user) : null;
  } catch (error) {
    console.error('Error getting user:', error);
    return null;
  }
};

export const removeUser = async () => {
  try {
    await AsyncStorage.removeItem(KEYS.USER);
  } catch (error) {
    console.error('Error removing user:', error);
  }
};

// ============ Quotes Management (Legacy Support) ============

export const getData = async () => {
  try {
    const jsonValue = await AsyncStorage.getItem(KEYS.QUOTES);
    return jsonValue != null ? JSON.parse(jsonValue) : null;
  } catch (error) {
    console.error('Error reading quotes:', error);
    return null;
  }
};

export const storeData = async (value) => {
  try {
    const jsonValue = JSON.stringify(value);
    await AsyncStorage.setItem(KEYS.QUOTES, jsonValue);
  } catch (error) {
    console.error('Error saving quotes:', error);
  }
};

// ============ Clear All Data ============

export const clearAllData = async () => {
  try {
    await AsyncStorage.multiRemove([
      KEYS.TOKEN,
      KEYS.REFRESH_TOKEN,
      KEYS.USER,
    ]);
  } catch (error) {
    console.error('Error clearing data:', error);
  }
};

// ============ Helper to check if user is authenticated ============

export const isAuthenticated = async () => {
  const token = await getToken();
  return !!token;
};
