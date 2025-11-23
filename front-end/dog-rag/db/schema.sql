-- Dog Health Management Database Schema
-- PostgreSQL with pgvector extension for RAG

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- Enable pgvector extension for vector embeddings (for future RAG implementation)
CREATE EXTENSION IF NOT EXISTS "vector";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    hashed_password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Dog profiles table
CREATE TABLE IF NOT EXISTS dog_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    dog_name VARCHAR(100) NOT NULL,
    age INTEGER NOT NULL, -- in months
    height DECIMAL(5,2) NOT NULL, -- in cm
    weight DECIMAL(5,2) NOT NULL, -- in kg
    breed VARCHAR(100) NOT NULL,
    personality TEXT,
    stage_of_training VARCHAR(200),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Dog logs table
CREATE TABLE IF NOT EXISTS dog_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dog_id UUID NOT NULL REFERENCES dog_profiles(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    log_type VARCHAR(50) NOT NULL, -- 'toilet', 'food', 'sleep', 'walk', 'play', 'bark', 'custom', 'medication', 'consultation'
    log_data JSONB NOT NULL, -- Flexible JSON storage for different log types
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Weekly comments table
CREATE TABLE IF NOT EXISTS weekly_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dog_id UUID NOT NULL REFERENCES dog_profiles(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    week_start_date DATE NOT NULL,
    comment TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(dog_id, week_start_date)
);

-- Daily comments table
CREATE TABLE IF NOT EXISTS daily_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dog_id UUID NOT NULL REFERENCES dog_profiles(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    comment TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(dog_id, date)
);

-- RAG conversation history (for future evaluation system)
CREATE TABLE IF NOT EXISTS rag_conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    dog_id UUID REFERENCES dog_profiles(id) ON DELETE SET NULL,
    role VARCHAR(20) NOT NULL, -- 'user' or 'assistant'
    content TEXT NOT NULL,
    evaluation VARCHAR(10), -- 'good' or 'bad' (for future use)
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_dog_profiles_user_id ON dog_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_dog_logs_dog_id ON dog_logs(dog_id);
CREATE INDEX IF NOT EXISTS idx_dog_logs_user_id ON dog_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_dog_logs_created_at ON dog_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_dog_logs_log_type ON dog_logs(log_type);
CREATE INDEX IF NOT EXISTS idx_weekly_comments_dog_id ON weekly_comments(dog_id);
CREATE INDEX IF NOT EXISTS idx_weekly_comments_week_start ON weekly_comments(week_start_date);
CREATE INDEX IF NOT EXISTS idx_daily_comments_dog_id ON daily_comments(dog_id);
CREATE INDEX IF NOT EXISTS idx_daily_comments_date ON daily_comments(date);
CREATE INDEX IF NOT EXISTS idx_rag_conversations_user_id ON rag_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_rag_conversations_dog_id ON rag_conversations(dog_id);
CREATE INDEX IF NOT EXISTS idx_rag_conversations_timestamp ON rag_conversations(timestamp);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dog_profiles_updated_at BEFORE UPDATE ON dog_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dog_logs_updated_at BEFORE UPDATE ON dog_logs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_weekly_comments_updated_at BEFORE UPDATE ON weekly_comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daily_comments_updated_at BEFORE UPDATE ON daily_comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

