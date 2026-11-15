/**
 * Axios API Client Configuration
 * Handles HTTP requests with authentication and error handling
 */

import axios from 'axios';
import { API_BASE_URL } from '@env';
import { getToken, removeToken, getRefreshToken, saveToken, removeRefreshToken } from '../utils/storage';
import { ENDPOINTS } from './endpoints';

// Log the API_BASE_URL on initialization
console.log('🔧 API Client initialized with:');
console.log('   API_BASE_URL from .env:', API_BASE_URL);
console.log('   Final baseURL:', API_BASE_URL || 'http://localhost:3000');

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL || 'http://localhost:3000',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add auth token
apiClient.interceptors.request.use(
  async (config) => {
    const token = await getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Log request in development
    if (__DEV__) {
      const fullUrl = `${config.baseURL}${config.url}`;
      console.log(`🌐 ${config.method.toUpperCase()} ${fullUrl}`, config.data || '');
      console.log(`   Base URL: ${config.baseURL}`);
      console.log(`   Endpoint: ${config.url}`);
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors and token refresh
apiClient.interceptors.response.use(
  (response) => {
    // Log response in development
    if (__DEV__) {
      console.log(`✅ Response from ${response.config.url}:`, response.data);
    }
    
    // Return just the data object
    return response.data;
  },
  async (error) => {
    const originalRequest = error.config;

    // Log error in development with full details
    if (__DEV__) {
      console.error(`❌ Error from ${originalRequest?.url}:`);
      console.error(`   Status: ${error.response?.status || 'No Response'}`);
      console.error(`   Status Text: ${error.response?.statusText || 'N/A'}`);
      console.error(`   Response Data:`, JSON.stringify(error.response?.data, null, 2));
      console.error(`   Error Message:`, error.message);
      if (!error.response) {
        console.error(`   ⚠️ This is a network error - server might be unreachable`);
      }
    }

    // Handle 401 Unauthorized - Try token refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = await getRefreshToken();
        
        if (refreshToken) {
          // Call refresh endpoint
          const response = await axios.post(
            `${API_BASE_URL || 'http://localhost:3000'}${ENDPOINTS.AUTH.REFRESH}`,
            { refreshToken }
          );
          
          if (response.data?.data?.token) {
            // Save new token
            await saveToken(response.data.data.token);
            
            // Retry original request with new token
            originalRequest.headers.Authorization = `Bearer ${response.data.data.token}`;
            return apiClient(originalRequest);
          }
        }
      } catch (refreshError) {
        // Refresh failed - clear tokens and force logout
        console.error('Token refresh failed:', refreshError);
        await removeToken();
        await removeRefreshToken();
        
        // You can emit an event here to trigger app-wide logout
        // EventEmitter.emit('UNAUTHORIZED');
        
        return Promise.reject(error);
      }
    }

    // Handle network errors (no response from server)
    if (!error.response) {
      return Promise.reject({
        message: 'Network error. Please check your connection.',
        type: 'NETWORK_ERROR',
        originalError: error,
        errorDetails: error.message,
      });
    }

    // Special handling: Backend sometimes returns 500 for auth failures
    // Treat these as 401 (user error, not server error)
    const isAuthError = error.response?.status === 500 && 
      error.response?.data?.message?.toLowerCase().includes('invalid');
    
    const effectiveStatus = isAuthError ? 401 : error.response?.status;
    const errorType = isAuthError ? 'AUTH_ERROR' : 
                     error.response?.status >= 500 ? 'SERVER_ERROR' : 'CLIENT_ERROR';

    // Return formatted error with full server response
    return Promise.reject({
      message: error.response?.data?.message || error.message || 'An error occurred',
      status: effectiveStatus,
      statusText: error.response?.statusText,
      data: error.response?.data,
      type: errorType,
      originalError: error,
      // Include detailed error for debugging
      fullError: {
        url: originalRequest?.url,
        method: originalRequest?.method,
        status: error.response?.status,
        effectiveStatus: effectiveStatus,
        serverMessage: error.response?.data?.message,
        serverData: error.response?.data,
      }
    });
  }
);

export default apiClient;
