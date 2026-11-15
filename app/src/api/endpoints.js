/**
 * API Endpoints Configuration
 * Centralized endpoint definitions for the Ardu Backend API
 */

export const ENDPOINTS = {
  // Authentication
  AUTH: {
    REGISTER: '/api/auth/register',
    LOGIN: '/api/auth/login',
    LOGOUT: '/api/auth/logout',
    REFRESH: '/api/auth/refresh',
  },

  // User Management
  USER: {
    PROFILE: '/api/users/profile',
    UPDATE_PROFILE: '/api/users/profile',
    SETTINGS: '/api/users/settings',
    MOTIVATION: '/api/users/motivation',
    PUSH_TOKEN: '/api/users/push-token',
  },

  // Quotes
  QUOTES: {
    LIST: '/api/quotes',
    RANDOM: '/api/quotes/random',
    SEARCH: '/api/quotes/search',
    CREATE: '/api/quotes',
    INITIALIZE: '/api/quotes/initialize',
    FAVORITES: '/api/quotes/favorites',
    FAVORITE_TOGGLE: (id) => `/api/quotes/${id}/favorite`,
    DELETE: (id) => `/api/quotes/${id}`,
    UPDATE: (id) => `/api/quotes/${id}`,
  },

  // AI
  AI: {
    RECOMMENDED: '/api/ai/recommended-quote',
    STATUS: '/api/ai/status',
  },

  // Notifications
  NOTIFICATIONS: {
    HISTORY: '/api/notifications/history',
    STATS: '/api/notifications/stats',
    TEST: '/api/notifications/test',
  },
};
