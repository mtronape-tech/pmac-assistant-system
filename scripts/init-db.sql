-- Инициализация базы данных PMAC Assistant System

-- Включение расширения TimescaleDB
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Создание таблицы для временных рядов данных PMAC
CREATE TABLE IF NOT EXISTS pmac_data (
    timestamp TIMESTAMPTZ NOT NULL,
    machine_id TEXT NOT NULL,
    variable_type CHAR(1),
    variable_address INTEGER,
    value DOUBLE PRECISION,
    quality TEXT DEFAULT 'good',
    collection_job_id TEXT,
    metadata JSONB DEFAULT '{}'
);

-- Создание hypertable для оптимизации временных рядов
SELECT create_hypertable('pmac_data', 'timestamp', if_not_exists => TRUE);

-- Индексы для производительности
CREATE INDEX IF NOT EXISTS idx_pmac_data_machine_time ON pmac_data (machine_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_pmac_data_variable_time ON pmac_data (variable_type, variable_address, timestamp DESC);

-- Политики сжатия для оптимизации хранения (сжимать данные старше 1 дня)
SELECT add_compression_policy('pmac_data', INTERVAL '1 day', if_not_exists => TRUE);

-- Политика удаления старых данных (удалять данные старше 30 дней)
SELECT add_retention_policy('pmac_data', INTERVAL '30 days', if_not_exists => TRUE);

-- Настройка параллельной обработки для лучшей производительности
ALTER TABLE pmac_data SET (
    timescaledb.compress = TRUE,
    timescaledb.compress_segmentby = 'machine_id, variable_type'
);

-- Таблица документов для базы знаний
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Таблица фрагментов документов для векторного поиска
CREATE TABLE IF NOT EXISTS document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    embeddings VECTOR(1536),
    page_number INTEGER,
    section TEXT,
    start_index INTEGER,
    end_index INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Таблица пользователей
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'operator',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Таблица сессий
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Таблица рекомендаций
CREATE TABLE IF NOT EXISTS recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'medium',
    title TEXT NOT NULL,
    description TEXT,
    actions JSONB,
    reasoning TEXT,
    confidence DOUBLE PRECISION,
    expected_impact TEXT,
    risks JSONB,
    status TEXT DEFAULT 'pending',
    applied_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Таблица конфигураций сбора данных
CREATE TABLE IF NOT EXISTS collection_configs (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    enabled BOOLEAN DEFAULT true,
    interval_ms INTEGER NOT NULL,
    batch_size INTEGER DEFAULT 100,
    timeout_ms INTEGER DEFAULT 10000,
    retry_attempts INTEGER DEFAULT 3,
    retry_delay_ms INTEGER DEFAULT 5000,
    variables JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Таблица заданий сбора данных
CREATE TABLE IF NOT EXISTS collection_jobs (
    id TEXT PRIMARY KEY,
    config_id TEXT REFERENCES collection_configs(id),
    status TEXT NOT NULL,
    type TEXT NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    duration_ms INTEGER,
    records_collected INTEGER DEFAULT 0,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    last_heartbeat TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Таблица аудита операций
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    action TEXT NOT NULL,
    resource_type TEXT,
    resource_id TEXT,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Создание пользователя по умолчанию (пароль: admin123)
INSERT INTO users (username, email, password_hash, role) 
VALUES ('admin', 'admin@pmac-assistant.com', '$2b$10$rQZ8K9mN2pL4vX7wY1sA3eR6tU8iO0pQ1wE2rT3yU4iI5oP6aA7sS8dD9fF', 'admin')
ON CONFLICT (username) DO NOTHING;

-- Создание индексов для производительности
CREATE INDEX IF NOT EXISTS idx_document_chunks_document_id ON document_chunks (document_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions (token);
CREATE INDEX IF NOT EXISTS idx_recommendations_status ON recommendations (status);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log (created_at);
CREATE INDEX IF NOT EXISTS idx_collection_configs_enabled ON collection_configs (enabled);
CREATE INDEX IF NOT EXISTS idx_collection_configs_type ON collection_configs (type);
CREATE INDEX IF NOT EXISTS idx_collection_jobs_config_id ON collection_jobs (config_id);
CREATE INDEX IF NOT EXISTS idx_collection_jobs_status ON collection_jobs (status);
CREATE INDEX IF NOT EXISTS idx_collection_jobs_start_time ON collection_jobs (start_time);
CREATE INDEX IF NOT EXISTS idx_collection_jobs_type ON collection_jobs (type);

-- Функция для обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггеры для автоматического обновления updated_at
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_collection_configs_updated_at BEFORE UPDATE ON collection_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
