-- Создание базовой схемы для Funding Arbitrage Bot
-- Версия: 1.0
-- Дата: 2024-08-25

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Таблица пользователей
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(255) PRIMARY KEY,
    telegram_id BIGINT UNIQUE NOT NULL,
    name VARCHAR(255),
    avatar_url TEXT,
    extended_api_key TEXT,
    extended_api_secret TEXT,
    hyperliquid_api_key TEXT,
    hyperliquid_api_secret TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Индексы для таблицы users
CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- Таблица истории funding rates
CREATE TABLE IF NOT EXISTS funding_rates (
    id SERIAL PRIMARY KEY,
    exchange VARCHAR(50) NOT NULL CHECK (exchange IN ('extended', 'hyperliquid')),
    symbol VARCHAR(50) NOT NULL,
    rate DECIMAL(10, 6) NOT NULL,
    volume_24h DECIMAL(15, 2) DEFAULT 0,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Индексы для таблицы funding_rates
CREATE INDEX IF NOT EXISTS idx_funding_rates_exchange_symbol ON funding_rates(exchange, symbol);
CREATE INDEX IF NOT EXISTS idx_funding_rates_timestamp ON funding_rates(timestamp);
CREATE INDEX IF NOT EXISTS idx_funding_rates_symbol_timestamp ON funding_rates(symbol, timestamp);

CREATE UNIQUE INDEX IF NOT EXISTS idx_funding_rates_unique ON funding_rates(exchange, symbol, timestamp);

-- Таблица арбитражных возможностей
CREATE TABLE IF NOT EXISTS arbitrage_opportunities (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(50) NOT NULL,
    extended_funding_rate DECIMAL(10, 6) NOT NULL,
    hyperliquid_funding_rate DECIMAL(10, 6) NOT NULL,
    profit_potential DECIMAL(10, 4) NOT NULL,
    volume_24h DECIMAL(15, 2) DEFAULT 0,
    risk_level VARCHAR(20) CHECK (risk_level IN ('low', 'medium', 'high')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Индексы для таблицы arbitrage_opportunities
CREATE INDEX IF NOT EXISTS idx_arbitrage_opportunities_symbol ON arbitrage_opportunities(symbol);
CREATE INDEX IF NOT EXISTS idx_arbitrage_opportunities_created_at ON arbitrage_opportunities(created_at);
CREATE INDEX IF NOT EXISTS idx_arbitrage_opportunities_profit_potential ON arbitrage_opportunities(profit_potential DESC);

-- Таблица настроек алертов пользователей
CREATE TABLE IF NOT EXISTS user_alerts (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    symbol VARCHAR(50) NOT NULL,
    min_profit_threshold DECIMAL(10, 4) NOT NULL DEFAULT 0.1,
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Уникальность алерта по пользователю и символу
    UNIQUE(user_id, symbol)
);

-- Индексы для таблицы user_alerts
CREATE INDEX IF NOT EXISTS idx_user_alerts_user_id ON user_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_alerts_enabled ON user_alerts(enabled) WHERE enabled = true;
CREATE INDEX IF NOT EXISTS idx_user_alerts_symbol ON user_alerts(symbol);

-- Таблица истории уведомлений
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('funding_alert', 'arbitrage_opportunity', 'system_notification')),
    title VARCHAR(255),
    message TEXT NOT NULL,
    data JSONB,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP WITH TIME ZONE
);

-- Индексы для таблицы notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_sent_at ON notifications(sent_at);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_sent_at ON notifications(user_id, sent_at DESC);


-- Таблицы остаются пустыми - данные будут добавляться через API

-- Добавить в конец файла migrations/init.sql

-- Таблица пользовательских уведомлений
CREATE TABLE IF NOT EXISTS user_notification_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('global', 'pair')),
    symbol VARCHAR(50), -- NULL для global правил
    threshold DECIMAL(10, 6) NOT NULL,
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Ограничения
    CONSTRAINT check_pair_has_symbol CHECK (
        (type = 'global' AND symbol IS NULL) OR
        (type = 'pair' AND symbol IS NOT NULL)
    )
);

-- Индексы для таблицы user_notification_rules
CREATE INDEX IF NOT EXISTS idx_user_notification_rules_user_id ON user_notification_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notification_rules_enabled ON user_notification_rules(enabled) WHERE enabled = true;
CREATE INDEX IF NOT EXISTS idx_user_notification_rules_type ON user_notification_rules(type);
CREATE INDEX IF NOT EXISTS idx_user_notification_rules_symbol ON user_notification_rules(symbol) WHERE symbol IS NOT NULL;

-- Таблица для логирования отправленных уведомлений (чтобы не спамить)
CREATE TABLE IF NOT EXISTS sent_notifications_log (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rule_id UUID NOT NULL REFERENCES user_notification_rules(id) ON DELETE CASCADE,
    symbol VARCHAR(50) NOT NULL,
    profit_threshold DECIMAL(10, 6) NOT NULL,
    actual_profit DECIMAL(10, 6) NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Уникальность по пользователю, правилу и символу
    UNIQUE(user_id, rule_id, symbol)
);

-- Индексы для таблицы sent_notifications_log
CREATE INDEX IF NOT EXISTS idx_sent_notifications_log_user_id ON sent_notifications_log(user_id);
CREATE INDEX IF NOT EXISTS idx_sent_notifications_log_sent_at ON sent_notifications_log(sent_at);
CREATE INDEX IF NOT EXISTS idx_sent_notifications_log_rule_id ON sent_notifications_log(rule_id);
