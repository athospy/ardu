// Generate random integer between min and max (inclusive)
const randomInt = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

// Shuffle array using Fisher-Yates algorithm
const shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// Format date to readable string
const formatDate = (date) => {
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Capitalize first letter of string
const capitalize = (str) => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};

// Clean and truncate text
const truncateText = (text, maxLength = 100) => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
};

// Generate a random delay in milliseconds
const randomDelay = (minMs = 1000, maxMs = 5000) => {
  return randomInt(minMs, maxMs);
};

// Sleep/delay function
const sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

// Check if string is valid JSON
const isValidJSON = (str) => {
  try {
    JSON.parse(str);
    return true;
  } catch (e) {
    return false;
  }
};

// Extract error message from error object
const getErrorMessage = (error) => {
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  if (error.message) {
    return error.message;
  }
  return 'An unexpected error occurred';
};

// Pagination helper
const getPagination = (page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  return { limit, offset };
};

// Calculate total pages
const getTotalPages = (totalCount, limit) => {
  return Math.ceil(totalCount / limit);
};

module.exports = {
  randomInt,
  shuffleArray,
  formatDate,
  capitalize,
  truncateText,
  randomDelay,
  sleep,
  isValidJSON,
  getErrorMessage,
  getPagination,
  getTotalPages,
};
