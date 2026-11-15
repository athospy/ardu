import apiClient from '../src/api/client';

/**
 * Streak tracking service for Ardu app
 * Tracks consecutive days of app usage and reflections
 * Now syncs with backend API for cloud storage
 */

export const streakService = {
  /**
   * Get current streak data from backend
   */
  async getStreak() {
    try {
      const response = await apiClient.get('/api/users/streak');
      console.log('🔍 Raw response.data:', JSON.stringify(response.data, null, 2));
      
      // Interceptor already unwraps response, so response.data contains the streak data directly
      const streakData = {
        currentStreak: response.data.currentStreak || 0,
        longestStreak: response.data.longestStreak || 0,
        lastActiveDate: response.data.lastActiveDate || null,
        totalReflections: response.data.totalReflections || 0,
      };
      
      console.log('✅ Streak data extracted:', streakData);
      return streakData;
    } catch (error) {
      console.error('Error getting streak:', error);
      return {
        currentStreak: 0,
        longestStreak: 0,
        lastActiveDate: null,
        totalReflections: 0,
      };
    }
  },

  /**
   * Update streak when app is opened (check-in)
   * Backend automatically calculates streak based on last_active_date
   */
  async updateStreak() {
    try {
      // Check in first
      await apiClient.post('/api/users/streak/checkin');
      // Then get full streak data (includes totalReflections and lastActiveDate)
      return await this.getStreak();
    } catch (error) {
      console.error('Error updating streak:', error);
      // Fallback to get current streak
      return await this.getStreak();
    }
  },

  /**
   * Get reflection count from backend
   */
  async getReflectionCount() {
    try {
      const response = await apiClient.get('/api/reflections/count');
      // Backend returns { success: true, count: number }
      return response.data?.count ?? 0;
    } catch (error) {
      console.error('Error getting reflection count:', error);
      return 0;
    }
  },

  /**
   * Increment reflection count (no longer needed - backend handles this automatically)
   * Kept for backwards compatibility but does nothing
   * @deprecated Backend increments count automatically when reflection is saved
   */
  async incrementReflectionCount() {
    // Backend handles this automatically when saving a reflection
    // This method is kept for backwards compatibility but does nothing
    console.log('ℹ️ incrementReflectionCount() called but not needed - backend handles automatically');
  },

  /**
   * Reset streak (for testing - not exposed in UI)
   * Note: Backend doesn't have a reset endpoint for safety
   */
  async resetStreak() {
    try {
      console.warn('⚠️ resetStreak() called but not implemented on backend for safety');
      // Would need to be implemented on backend if really needed
    } catch (error) {
      console.error('Error resetting streak:', error);
    }
  },
};
