import apiClient from '../src/api/client';
import { streakService } from './streakService';

/**
 * reflectionService - Manages user reflections and journal entries
 * Now syncs with backend API for cloud storage
 */
export const reflectionService = {
  /**
   * Save a new reflection
   * @param {Object} reflection - { quoteId, quoteText, author, reflection }
   * @returns {Promise<Object>} Saved reflection object from backend
   */
  async saveReflection(reflection) {
    try {
      // Send to backend
      const response = await apiClient.post('/api/reflections', {
        quoteId: reflection.quoteId,
        quoteText: reflection.quoteText,
        author: reflection.author || 'Unknown',
        reflection: reflection.reflection,
      });
      
      // Backend updates streak automatically, but we still call to sync local state
      await streakService.updateStreak();
      
      // Interceptor already unwraps response
      console.log('✅ Reflection saved to backend:', response.data.id);
      return response.data;
    } catch (error) {
      console.error('Failed to save reflection:', error);
      throw error;
    }
  },

  /**
   * Get all reflections from backend
   * @returns {Promise<Array>} Array of reflection objects
   */
  async getReflections() {
    try {
      const response = await apiClient.get('/api/reflections');
      console.log('📦 Full response object:', JSON.stringify(response.data, null, 2));
      
      // Interceptor already unwraps response, so response.data contains reflections directly
      const reflections = response.data?.reflections || [];
      
      if (reflections.length === 0) {
        console.log('ℹ️ No reflections found');
      }
      
      return reflections;
    } catch (error) {
      console.error('Failed to get reflections:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error message:', error.message);
      return [];
    }
  },

  /**
   * Get reflection count from backend
   * @returns {Promise<number>}
   */
  async getReflectionCount() {
    try {
      const response = await apiClient.get('/api/reflections/count');
      return response.data.count || 0;
    } catch (error) {
      console.error('Failed to get reflection count:', error);
      return 0;
    }
  },

  /**
   * Delete a specific reflection
   * @param {string} reflectionId
   * @returns {Promise<void>}
   */
  async deleteReflection(reflectionId) {
    try {
      await apiClient.delete(`/api/reflections/${reflectionId}`);
      console.log('✅ Reflection deleted from backend:', reflectionId);
    } catch (error) {
      console.error('Failed to delete reflection:', error);
      throw error;
    }
  },

  /**
   * Clear all reflections (for testing - not exposed in UI)
   * Note: Backend doesn't have a "delete all" endpoint for safety
   * @returns {Promise<void>}
   */
  async clearReflections() {
    try {
      console.warn('⚠️ clearReflections() called but not implemented on backend for safety');
      // Would need to delete each reflection individually if really needed
    } catch (error) {
      console.error('Failed to clear reflections:', error);
      throw error;
    }
  },

  /**
   * Get reflections for a specific quote
   * @param {string} quoteId
   * @returns {Promise<Array>}
   */
  async getReflectionsForQuote(quoteId) {
    try {
      const reflections = await this.getReflections();
      return reflections.filter(r => r.quoteId === quoteId);
    } catch (error) {
      console.error('Failed to get reflections for quote:', error);
      return [];
    }
  },

  /**
   * Get recent reflections (last N days)
   * @param {number} days - Number of days to look back
   * @returns {Promise<Array>}
   */
  async getRecentReflections(days = 7) {
    try {
      const reflections = await this.getReflections();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      
      return reflections.filter(r => {
        const reflectionDate = new Date(r.timestamp);
        return reflectionDate >= cutoffDate;
      });
    } catch (error) {
      console.error('Failed to get recent reflections:', error);
      return [];
    }
  },
};
