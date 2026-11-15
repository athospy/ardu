/**
 * User Service
 * Handles user profile and settings operations
 */

import apiClient from '../client';
import { ENDPOINTS } from '../endpoints';

export const userService = {
  /**
   * Get user profile
   * @returns {Promise<Object>} User profile data
   */
  getProfile: async () => {
    try {
      const response = await apiClient.get(ENDPOINTS.USER.PROFILE);
      return response;
    } catch (error) {
      console.error('Get profile error:', error);
      throw error;
    }
  },

  /**
   * Update user profile
   * @param {Object} data - { name, email, motivation }
   * @returns {Promise<Object>} Updated profile
   */
  updateProfile: async (data) => {
    try {
      const response = await apiClient.put(ENDPOINTS.USER.UPDATE_PROFILE, data);
      return response;
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  },

  /**
   * Get user settings
   * @returns {Promise<Object>} User settings
   */
  getSettings: async () => {
    try {
      const response = await apiClient.get(ENDPOINTS.USER.SETTINGS);
      return response;
    } catch (error) {
      console.error('Get settings error:', error);
      throw error;
    }
  },

  /**
   * Update user motivation preferences
   * @param {Object} data - Motivation settings
   * @returns {Promise<Object>} Updated settings
   */
  updateMotivation: async (data) => {
    try {
      const response = await apiClient.put(ENDPOINTS.USER.MOTIVATION, data);
      return response;
    } catch (error) {
      console.error('Update motivation error:', error);
      throw error;
    }
  },

  /**
   * Register/Update push notification token
   * @param {string} token - Expo push token
   * @returns {Promise<Object>} Response
   */
  updatePushToken: async (expoPushToken) => {
    try {
      const response = await apiClient.put(ENDPOINTS.USER.PUSH_TOKEN, {
        expoPushToken,
      });
      return response;
    } catch (error) {
      console.error('Update push token error:', error);
      throw error;
    }
  },
};
