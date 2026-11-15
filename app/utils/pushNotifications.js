/**
 * Push Notification Utilities
 * Handles Expo push notification registration and token management
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { userService } from '../src/api/services/userService';

const PUSH_TOKEN_KEY = '@expo_push_token';

/**
 * Register for push notifications and update backend
 * @returns {Promise<string|null>} Push token or null if failed
 */
export const registerForPushNotifications = async () => {
  try {
    // Check if physical device
    if (!Device.isDevice) {
      console.warn('⚠️ Push notifications require a physical device');
      return null;
    }

    // Request permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('⚠️ Push notification permissions denied');
      return null;
    }

    // Get Expo push token
    const projectId = Constants.expoConfig?.extra?.eas?.projectId || 
                      Constants.easConfig?.projectId;
    
    const token = (
      await Notifications.getExpoPushTokenAsync({
        projectId,
      })
    ).data;

    console.log('✅ Push Token obtained:', token);

    // Register with backend
    try {
      await userService.updatePushToken(token);
      console.log('✅ Push token registered with backend');
    } catch (error) {
      console.error('❌ Failed to register token with backend:', error);
      // Continue even if backend update fails
    }

    // Store locally for reference
    await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);

    return token;
  } catch (error) {
    console.error('❌ Failed to register push notifications:', error);
    return null;
  }
};

/**
 * Check if push token needs refresh and update if needed
 * @returns {Promise<boolean>} True if token was refreshed
 */
export const checkAndRefreshPushToken = async () => {
  try {
    const storedToken = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
    
    if (!Device.isDevice) {
      return false;
    }

    // Get current token
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      return false;
    }

    const projectId = Constants.expoConfig?.extra?.eas?.projectId || 
                      Constants.easConfig?.projectId;
    
    const currentToken = (
      await Notifications.getExpoPushTokenAsync({
        projectId,
      })
    ).data;

    // If token changed, update backend
    if (currentToken && storedToken !== currentToken) {
      console.log('🔄 Push token changed, updating...');
      
      await userService.updatePushToken(currentToken);
      await AsyncStorage.setItem(PUSH_TOKEN_KEY, currentToken);
      
      console.log('✅ Push token refreshed');
      return true;
    }

    return false;
  } catch (error) {
    console.error('❌ Token refresh failed:', error);
    return false;
  }
};

/**
 * Get stored push token
 * @returns {Promise<string|null>} Stored token or null
 */
export const getStoredPushToken = async () => {
  try {
    return await AsyncStorage.getItem(PUSH_TOKEN_KEY);
  } catch (error) {
    console.error('Failed to get stored push token:', error);
    return null;
  }
};

/**
 * Check if push notifications are enabled
 * @returns {Promise<boolean>} True if enabled
 */
export const arePushNotificationsEnabled = async () => {
  try {
    if (!Device.isDevice) {
      return false;
    }

    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Failed to check notification status:', error);
    return false;
  }
};

/**
 * Request push notification permissions
 * @returns {Promise<boolean>} True if granted
 */
export const requestPushPermissions = async () => {
  try {
    if (!Device.isDevice) {
      console.warn('Push notifications require a physical device');
      return false;
    }

    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Failed to request permissions:', error);
    return false;
  }
};

/**
 * Clear stored push token (e.g., on logout)
 */
export const clearPushToken = async () => {
  try {
    await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
    console.log('Push token cleared');
  } catch (error) {
    console.error('Failed to clear push token:', error);
  }
};
