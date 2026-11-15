const { generateMotivationalQuote, testConnection } = require('../config/ollama');
const db = require('../config/database');
const logger = require('../utils/logger');

class AIService {
  // Generate AI-recommended quote for user
  async generateRecommendedQuote(userId) {
    // Get user's motivation
    const userResult = await db.query(
      'SELECT motivation, language FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      throw new Error('User not found');
    }

    const user = userResult.rows[0];
    const motivation = user.motivation || 'personal growth and success';
    const language = user.language || 'en';

    // Check if Ollama is available
    // const isAvailable = await testConnection();
    // if (!isAvailable) {
    //   throw new Error('AI service is currently unavailable');
    // }

    try {
      // Generate quote using Ollama (returns { text, category, author })
      const quoteData = await generateMotivationalQuote(motivation, language);

      // Save the AI-generated quote with category and author
      // Ensure author is NULL (not string 'null') when no author is provided
      const quoteResult = await db.query(
        'INSERT INTO quotes (text, author, category, is_default, language) VALUES ($1, $2, $3, false, $4) RETURNING *',
        [quoteData.text, quoteData.author || null, quoteData.category, language]
      );

      const quote = quoteResult.rows[0];
      
      logger.info(`AI quote generated: "${quoteData.text}" [${quoteData.category}]${quoteData.author ? ' - ' + quoteData.author : ''}`);

      // Link to user as AI-generated
      await db.query(
        'INSERT INTO user_quotes (user_id, quote_id, is_ai_generated) VALUES ($1, $2, true)',
        [userId, quote.id]
      );

      logger.info(`AI quote generated for user ${userId}`);

      return {
        ...quote,
        is_ai_generated: true,
      };
    } catch (error) {
      logger.error('Error generating AI quote:', error);
      throw new Error('Failed to generate AI quote');
    }
  }

  // Generate multiple AI quotes for user
  async generateBatchQuotes(userId, count = 3) {
    const quotes = [];

    for (let i = 0; i < count; i++) {
      try {
        const quote = await this.generateRecommendedQuote(userId);
        quotes.push(quote);
        
        // Small delay between generations
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        logger.error(`Error generating quote ${i + 1}:`, error);
        // Continue generating other quotes even if one fails
      }
    }

    return quotes;
  }

  // Get user's AI-generated quotes
  async getUserAIQuotes(userId, limit = 10) {
    const result = await db.query(
      `SELECT q.id, q.text, q.language, q.created_at,
              CASE WHEN uq.is_favorite THEN true ELSE false END as is_favorite
       FROM quotes q
       JOIN user_quotes uq ON q.id = uq.quote_id
       WHERE uq.user_id = $1 AND uq.is_ai_generated = true
       ORDER BY q.created_at DESC
       LIMIT $2`,
      [userId, limit]
    );

    return result.rows;
  }

  // Get a random AI-generated quote for user
  async getRandomAIQuote(userId) {
    const result = await db.query(
      `SELECT q.id, q.text, q.language, q.created_at,
              CASE WHEN uq.is_favorite THEN true ELSE false END as is_favorite
       FROM quotes q
       JOIN user_quotes uq ON q.id = uq.quote_id
       WHERE uq.user_id = $1 AND uq.is_ai_generated = true
       ORDER BY RANDOM()
       LIMIT 1`,
      [userId]
    );

    return result.rows[0] || null;
  }

  // Regenerate quote (create a new one based on same motivation)
  async regenerateQuote(userId) {
    return await this.generateRecommendedQuote(userId);
  }

  // Check if AI service is available
  async checkAvailability() {
    return await testConnection();
  }
}

module.exports = new AIService();
