/**
 * Quote Store
 * Global state management for quotes using Zustand
 */

import { create } from 'zustand';
import { quoteService } from '../api/services/quoteService';

export const useQuoteStore = create((set, get) => ({
  // State
  quotes: [],
  favorites: [],
  loading: false,
  error: null,
  currentQuote: null,
  searchQuery: '',
  
  // Pagination
  page: 1,
  hasMore: true,
  totalQuotes: 0,

  // Actions

  /**
   * Fetch all quotes
   */
  fetchQuotes: async (params = {}) => {
    try {
      set({ loading: true, error: null });
      
      const response = await quoteService.getQuotes(params);
      const quotes = response.data.quotes || response.data || [];
      
      set({ 
        quotes,
        totalQuotes: response.data.total || quotes.length,
        loading: false 
      });
      
      return quotes;
    } catch (error) {
      console.error('Fetch quotes error:', error);
      set({ 
        error: error.message, 
        loading: false 
      });
      throw error;
    }
  },

  /**
   * Fetch random quote
   */
  fetchRandomQuote: async () => {
    try {
      const response = await quoteService.getRandomQuote();
      const quote = response.data;
      
      set({ currentQuote: quote });
      
      return quote;
    } catch (error) {
      console.error('Fetch random quote error:', error);
      throw error;
    }
  },

  /**
   * Search quotes
   */
  searchQuotes: async (query) => {
    try {
      set({ loading: true, error: null, searchQuery: query });
      
      const response = await quoteService.searchQuotes(query);
      const quotes = response.data.quotes || response.data || [];
      
      set({ 
        quotes,
        loading: false 
      });
      
      return quotes;
    } catch (error) {
      console.error('Search quotes error:', error);
      set({ 
        error: error.message, 
        loading: false 
      });
      throw error;
    }
  },

  /**
   * Create new quote
   */
  createQuote: async (data) => {
    try {
      set({ loading: true, error: null });
      
      const response = await quoteService.createQuote(data);
      const newQuote = response.data;
      
      // Add to local state
      const quotes = get().quotes;
      set({ 
        quotes: [newQuote, ...quotes],
        totalQuotes: get().totalQuotes + 1,
        loading: false 
      });
      
      return newQuote;
    } catch (error) {
      console.error('Create quote error:', error);
      set({ 
        error: error.message, 
        loading: false 
      });
      throw error;
    }
  },

  /**
   * Update quote
   */
  updateQuote: async (id, data) => {
    try {
      set({ loading: true, error: null });
      
      const response = await quoteService.updateQuote(id, data);
      const updatedQuote = response.data;
      
      // Update in local state
      const quotes = get().quotes.map(q => 
        q.id === id || q._id === id ? updatedQuote : q
      );
      
      set({ 
        quotes,
        loading: false 
      });
      
      return updatedQuote;
    } catch (error) {
      console.error('Update quote error:', error);
      set({ 
        error: error.message, 
        loading: false 
      });
      throw error;
    }
  },

  /**
   * Delete quote
   */
  deleteQuote: async (id) => {
    try {
      set({ loading: true, error: null });
      
      await quoteService.deleteQuote(id);
      
      // Remove from local state
      const quotes = get().quotes.filter(q => q.id !== id && q._id !== id);
      
      set({ 
        quotes,
        totalQuotes: get().totalQuotes - 1,
        loading: false 
      });
    } catch (error) {
      console.error('Delete quote error:', error);
      set({ 
        error: error.message, 
        loading: false 
      });
      throw error;
    }
  },

  /**
   * Fetch favorites
   */
  fetchFavorites: async () => {
    try {
      const response = await quoteService.getFavorites();
      const favorites = response.data.quotes || response.data || [];
      
      set({ favorites });
      
      return favorites;
    } catch (error) {
      console.error('Fetch favorites error:', error);
      throw error;
    }
  },

  /**
   * Toggle favorite status
   */
  toggleFavorite: async (id) => {
    try {
      const response = await quoteService.toggleFavorite(id);
      const updatedQuote = response.data;
      
      // Update in quotes list
      const quotes = get().quotes.map(q => 
        (q.id === id || q._id === id) ? updatedQuote : q
      );
      
      // Update favorites list
      const favorites = updatedQuote.isFavorite
        ? [...get().favorites, updatedQuote]
        : get().favorites.filter(q => q.id !== id && q._id !== id);
      
      set({ quotes, favorites });
      
      return updatedQuote;
    } catch (error) {
      console.error('Toggle favorite error:', error);
      throw error;
    }
  },

  /**
   * Clear error
   */
  clearError: () => set({ error: null }),

  /**
   * Reset store
   */
  reset: () => set({
    quotes: [],
    favorites: [],
    loading: false,
    error: null,
    currentQuote: null,
    searchQuery: '',
    page: 1,
    hasMore: true,
    totalQuotes: 0,
  }),
}));
