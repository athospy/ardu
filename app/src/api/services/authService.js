/**
 * Authentication Service
 * Handles user authentication operations
 */

import apiClient from '../client';
import { ENDPOINTS } from '../endpoints';
import {
  saveToken,
  saveRefreshToken,
  removeToken,
  removeRefreshToken,
  saveUser,
  removeUser,
  getRefreshToken,
  getToken,
} from '../../utils/storage';

export const authService = {
  /**
   * Register a new user
   * @param {Object} data - { email, password, name }
   * @returns {Promise<Object>} User data and tokens
   */
  register: async (data) => {
    try {
      const response = await apiClient.post(ENDPOINTS.AUTH.REGISTER, data);

      // Save tokens and user data
      if (response.data?.token) {
        await saveToken(response.data.token);
        await saveRefreshToken(response.data.refreshToken);
        
        // Verify token was saved successfully
        const savedToken = await getToken();
        if (!savedToken) {
          throw new Error('Failed to save authentication token');
        }
        
        console.log('✅ Token saved and verified');
      }

      if (response.data?.user) {
        await saveUser(response.data.user);
      }

      return response;
    } catch (error) {
      console.error('Register error:', error);
      throw error;
    }
  },

  /**
   * Login user
   * @param {Object} credentials - { email, password }
   * @returns {Promise<Object>} User data and tokens
   */
  login: async (credentials) => {
    try {
      const response = await apiClient.post(ENDPOINTS.AUTH.LOGIN, credentials);

      // Save tokens and user data
      if (response.data?.token) {
        await saveToken(response.data.token);
        await saveRefreshToken(response.data.refreshToken);
        
        // Verify token was saved successfully
        const savedToken = await getToken();
        if (!savedToken) {
          throw new Error('Failed to save authentication token');
        }
        
        console.log('✅ Token saved and verified');
      }

      if (response.data?.user) {
        await saveUser(response.data.user);
      }

      return response;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },

  /**
   * Logout user
   * @returns {Promise<void>}
   */
  logout: async () => {
    try {
      // Call backend logout endpoint
      await apiClient.post(ENDPOINTS.AUTH.LOGOUT);
    } catch (error) {
      // Continue logout even if API call fails
      console.error('Logout API error:', error);
    } finally {
      // Always clear local data
      await removeToken();
      await removeRefreshToken();
      await removeUser();
    }
  },

  /**
   * Refresh access token
   * @returns {Promise<string>} New access token
   */
  refreshToken: async () => {
    try {
      const refreshToken = await getRefreshToken();

      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await apiClient.post(ENDPOINTS.AUTH.REFRESH, {
        refreshToken,
      });

      if (response.data?.token) {
        await saveToken(response.data.token);
        return response.data.token;
      }

      throw new Error('No token in refresh response');
    } catch (error) {
      console.error('Token refresh error:', error);
      // If refresh fails, logout
      await authService.logout();
      throw error;
    }
  },
};
