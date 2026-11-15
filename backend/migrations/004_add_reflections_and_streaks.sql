-- Migration: Add Reflections and Streak System
-- Date: 2026-01-17
-- Description: Adds reflections table and streak tracking columns to users table

-- Create reflections table
CREATE TABLE IF NOT EXISTS reflections (
  id VARCHAR(255) PRIMARY KEY,
  user_id INT NOT NULL,
  quote_id INT,
  quote_text TEXT NOT NULL,
  author VARCHAR(255),
  reflection TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE SET NULL
);

-- Create indexes for reflections
CREATE INDEX IF NOT EXISTS idx_reflections_user_created ON reflections(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reflections_quote ON reflections(quote_id);

-- Add streak tracking columns to users table
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS current_streak INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS longest_streak INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_active_date DATE,
  ADD COLUMN IF NOT EXISTS total_reflections INT DEFAULT 0;

-- Create index for last_active_date
CREATE INDEX IF NOT EXISTS idx_users_last_active ON users(last_active_date);

-- Update trigger for reflections updated_at
CREATE OR REPLACE FUNCTION update_reflections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_reflections_updated_at
  BEFORE UPDATE ON reflections
  FOR EACH ROW
  EXECUTE FUNCTION update_reflections_updated_at();

-- Migration completed
COMMENT ON TABLE reflections IS 'User reflections on quotes for journal feature';
COMMENT ON COLUMN users.current_streak IS 'Current consecutive days streak';
COMMENT ON COLUMN users.longest_streak IS 'Best streak ever achieved';
COMMENT ON COLUMN users.last_active_date IS 'Last app check-in date for streak tracking';
COMMENT ON COLUMN users.total_reflections IS 'Total number of reflections created';
