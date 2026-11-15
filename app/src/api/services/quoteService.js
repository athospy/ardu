/**
 * Quote Service
 * Handles all quote-related API operations
 */

import apiClient from '../client';
import { ENDPOINTS } from '../endpoints';

export const quoteService = {
  /**
   * Get all quotes for the authenticated user
   * @param {Object} params - { page, limit, search, category }
   * @returns {Promise<Object>} List of quotes
   */
  getQuotes: async (params = {}) => {
    try {
      const response = await apiClient.get(ENDPOINTS.QUOTES.LIST, { params });
      return response;
    } catch (error) {
      console.error('Get quotes error:', error);
      throw error;
    }
  },

  /**
   * Get a random quote
   * @returns {Promise<Object>} Random quote
   */
  getRandomQuote: async () => {
    try {
      const response = await apiClient.get(ENDPOINTS.QUOTES.RANDOM);
      return response;
    } catch (error) {
      console.error('Get random quote error:', error);
      throw error;
    }
  },

  /**
   * Initialize personalized quotes for user
   * Creates 7 curated quotes based on user's motivation
   * Safe to call multiple times - returns existing quotes if already initialized
   * @param {string} language - Language code (optional, defaults to user's language)
   * @returns {Promise<Object>} { quotes: Array, count: number, alreadyInitialized: boolean }
   */
  initializeQuotes: async (language) => {
    try {
      console.log('🔧 quoteService.initializeQuotes called with language:', language || 'default');
      const payload = language ? { language } : {};
      console.log('📤 Sending request to:', ENDPOINTS.QUOTES.INITIALIZE, 'payload:', payload);
      const response = await apiClient.post(ENDPOINTS.QUOTES.INITIALIZE, payload);
      console.log('📥 quoteService.initializeQuotes response received');
      return response;
    } catch (error) {
      console.error('❌ Initialize quotes error:');
      console.error('   Message:', error.message);
      console.error('   Status:', error.status);
      console.error('   Server Message:', error.fullError?.serverMessage);
      console.error('   Full Server Response:', JSON.stringify(error.data, null, 2));
      throw error;
    }
  },

  /**
   * Search quotes
   * @param {string} query - Search query
   * @returns {Promise<Object>} Search results
   */
  searchQuotes: async (query) => {
    try {
      const response = await apiClient.get(ENDPOINTS.QUOTES.SEARCH, {
        params: { q: query },
      });
      return response;
    } catch (error) {
      console.error('Search quotes error:', error);
      throw error;
    }
  },

  /**
   * Create a new quote
   * @param {Object} data - { text, author, category, isPublic }
   * @returns {Promise<Object>} Created quote
   */
  createQuote: async (data) => {
    try {
      const response = await apiClient.post(ENDPOINTS.QUOTES.CREATE, data);
      return response;
    } catch (error) {
      console.error('Create quote error:', error);
      throw error;
    }
  },

  /**
   * Update a quote
   * @param {string} id - Quote ID
   * @param {Object} data - { text, author, category, isPublic }
   * @returns {Promise<Object>} Updated quote
   */
  updateQuote: async (id, data) => {
    try {
      const response = await apiClient.put(ENDPOINTS.QUOTES.UPDATE(id), data);
      return response;
    } catch (error) {
      console.error('Update quote error:', error);
      throw error;
    }
  },

  /**
   * Delete a quote
   * @param {string} id - Quote ID
   * @returns {Promise<void>}
   */
  deleteQuote: async (id) => {
    try {
      const response = await apiClient.delete(ENDPOINTS.QUOTES.DELETE(id));
      return response;
    } catch (error) {
      console.error('Delete quote error:', error);
      throw error;
    }
  },

  /**
   * Get favorite quotes
   * @returns {Promise<Object>} List of favorite quotes
   */
  getFavorites: async () => {
    try {
      const response = await apiClient.get(ENDPOINTS.QUOTES.FAVORITES);
      return response;
    } catch (error) {
      console.error('Get favorites error:', error);
      throw error;
    }
  },

  /**
   * Toggle favorite status of a quote
   * @param {string} id - Quote ID
   * @returns {Promise<Object>} Updated quote
   */
  toggleFavorite: async (id) => {
    try {
      const response = await apiClient.post(ENDPOINTS.QUOTES.FAVORITE_TOGGLE(id));
      return response;
    } catch (error) {
      console.error('Toggle favorite error:', error);
      throw error;
    }
  },
};
