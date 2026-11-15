-- Fix AI quotes architecture: move AI metadata to quotes table
-- This maintains proper normalization where:
--   quotes table = all quotes (default, custom, AI-generated)
--   user_quotes table = junction table only

-- Allow NULL text for AI quotes (text gets filled during generation)
ALTER TABLE quotes ALTER COLUMN text DROP NOT NULL;

-- Add AI generation columns to quotes table
ALTER TABLE quotes
ADD COLUMN IF NOT EXISTS ai_generation_status VARCHAR(20) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS ai_generate_on DATE,
ADD COLUMN IF NOT EXISTS ai_generated_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS ai_error_message TEXT;

-- Add index for night job query on quotes table
CREATE INDEX IF NOT EXISTS idx_quotes_ai_pending ON quotes(ai_generation_status, ai_generate_on)
WHERE ai_generation_status IS NOT NULL;

-- Migrate any existing AI quotes from user_quotes to quotes table
DO $$
DECLARE
    ai_quote RECORD;
    new_quote_id INT;
BEGIN
    FOR ai_quote IN 
        SELECT id, user_id, text, author, category, 
               ai_generation_status, ai_generate_on, ai_generated_at, ai_error_message,
               created_at
        FROM user_quotes
        WHERE is_ai_generated = true
    LOOP
        -- Create entry in quotes table
        INSERT INTO quotes (text, author, category, is_default, language, 
                           ai_generation_status, ai_generate_on, ai_generated_at, ai_error_message,
                           created_at)
        VALUES (ai_quote.text, ai_quote.author, ai_quote.category, false, 'en',
                ai_quote.ai_generation_status, ai_quote.ai_generate_on, 
                ai_quote.ai_generated_at, ai_quote.ai_error_message,
                ai_quote.created_at)
        RETURNING id INTO new_quote_id;
        
        -- Update user_quotes to point to the new quote
        UPDATE user_quotes
        SET quote_id = new_quote_id,
            text = NULL,
            author = NULL,
            category = NULL,
            ai_generation_status = NULL,
            ai_generate_on = NULL,
            ai_generated_at = NULL,
            ai_error_message = NULL
        WHERE id = ai_quote.id;
    END LOOP;
END $$;

-- Remove AI columns from user_quotes (they now live in quotes table)
ALTER TABLE user_quotes
DROP COLUMN IF EXISTS text,
DROP COLUMN IF EXISTS author,
DROP COLUMN IF EXISTS category,
DROP COLUMN IF EXISTS ai_generation_status,
DROP COLUMN IF EXISTS ai_generate_on,
DROP COLUMN IF EXISTS ai_generated_at,
DROP COLUMN IF EXISTS ai_error_message;

-- Drop old index
DROP INDEX IF EXISTS idx_ai_pending;

-- Add comments
COMMENT ON COLUMN quotes.ai_generation_status IS 'Status: NULL (not AI), pending, processing, completed, failed';
COMMENT ON COLUMN quotes.ai_generate_on IS 'Date when AI should generate this quote text';
COMMENT ON COLUMN quotes.ai_generated_at IS 'Timestamp when AI completed generation';
COMMENT ON COLUMN user_quotes.is_ai_generated IS 'True if the linked quote was AI-generated for this user';
