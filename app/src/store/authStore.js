/**
 * Authentication Store
 * Global state management for authentication using Zustand
 */

import { create } from 'zustand';
import { authService } from '../api/services/authService';
import { clearPushToken } from '../../utils/pushNotifications';
import { userService } from '../api/services/userService';
import { getToken, getUser, saveUser, clearAllData } from '../utils/storage';

export const useAuthStore = create((set, get) => ({
  // State
  user: null,
  loading: false,
  error: null,
  isAuthenticated: false,
  initialized: false,

  // Actions
  
  /**
   * Initialize auth state on app startup
   */
  initialize: async () => {
    try {
      set({ loading: true, error: null });
      
      const token = await getToken();
      
      if (token) {
        // Try to get cached user first
        let user = await getUser();
        
        if (!user) {
          // Fetch fresh user data from API
          const response = await userService.getProfile();
          user = response.data;
          await saveUser(user);
        }
        
        set({ 
          user, 
          isAuthenticated: true,
          initialized: true,
          loading: false 
        });
      } else {
        set({ 
          user: null, 
          isAuthenticated: false,
          initialized: true,
          loading: false 
        });
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
      // Clear potentially corrupted data
      await clearAllData();
      set({ 
        user: null, 
        isAuthenticated: false,
        initialized: true,
        loading: false,
        error: error.message 
      });
    }
  },

  /**
   * Register new user
   */
  register: async (data) => {
    try {
      set({ loading: true, error: null });
      
      const response = await authService.register(data);
      const user = response.data.user;
      
      set({ 
        user, 
        isAuthenticated: true,
        loading: false 
      });
      
      return response;
    } catch (error) {
      set({ 
        error: error.message, 
        loading: false 
      });
      throw error;
    }
  },

  /**
   * Login user
   */
  login: async (credentials) => {
    try {
      set({ loading: true, error: null });
      
      const response = await authService.login(credentials);
      const user = response.data.user;
      
      set({ 
        user, 
        isAuthenticated: true,
        loading: false 
      });
      
      return response;
    } catch (error) {
      set({ 
        error: error.message, 
        loading: false 
      });
      throw error;
    }
  },

  /**
   * Logout user
   */
  logout: async () => {
    try {
      set({ loading: true });
      
      await authService.logout();
      
      // Clear push token from storage
      await clearPushToken();
      
      set({ 
        user: null, 
        isAuthenticated: false,
        loading: false,
        error: null 
      });
    } catch (error) {
      console.error('Logout error:', error);
      // Force logout on client even if server call fails
      await clearPushToken();
      set({ 
        user: null, 
        isAuthenticated: false,
        loading: false 
      });
    }
  },

  /**
   * Update user data in store
   */
  updateUser: async (updates) => {
    const currentUser = get().user;
    if (currentUser) {
      const updatedUser = { ...currentUser, ...updates };
      set({ user: updatedUser });
      await saveUser(updatedUser);
    }
  },

  /**
   * Clear error
   */
  clearError: () => set({ error: null }),
}));
