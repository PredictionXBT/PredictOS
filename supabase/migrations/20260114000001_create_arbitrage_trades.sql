-- Migration: Create arbitrage_trades table
-- Description: Stores all arbitrage trade attempts and outcomes for the self-learning system

CREATE TABLE IF NOT EXISTS arbitrage_trades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Market identification
    market_slug TEXT NOT NULL,

    -- Leg 1 details (first order in the arbitrage pair)
    leg1_token_id TEXT NOT NULL,
    leg1_side TEXT NOT NULL CHECK (leg1_side IN ('BUY', 'SELL')),
    leg1_price DECIMAL(10, 4) NOT NULL CHECK (leg1_price >= 0 AND leg1_price <= 1),
    leg1_size DECIMAL(18, 6) NOT NULL CHECK (leg1_size > 0),
    leg1_order_id TEXT,

    -- Leg 2 details (second order in the arbitrage pair)
    leg2_token_id TEXT NOT NULL,
    leg2_side TEXT NOT NULL CHECK (leg2_side IN ('BUY', 'SELL')),
    leg2_price DECIMAL(10, 4) NOT NULL CHECK (leg2_price >= 0 AND leg2_price <= 1),
    leg2_size DECIMAL(18, 6) NOT NULL CHECK (leg2_size > 0),
    leg2_order_id TEXT,

    -- Fill timing (milliseconds from order placement to fill)
    leg1_fill_time_ms INTEGER,
    leg2_fill_time_ms INTEGER,

    -- Trade outcome
    outcome TEXT NOT NULL DEFAULT 'pending' CHECK (outcome IN (
        'pending',
        'both_filled',
        'leg1_only',
        'leg2_only',
        'neither',
        'unwound'
    )),

    -- Financial results
    profit_loss_usdc DECIMAL(18, 6),

    -- AI prediction tracking
    ai_prediction_correct BOOLEAN,

    -- Additional metadata
    execution_strategy TEXT,
    error_message TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX idx_arbitrage_trades_created_at ON arbitrage_trades(created_at DESC);
CREATE INDEX idx_arbitrage_trades_market_slug ON arbitrage_trades(market_slug);
CREATE INDEX idx_arbitrage_trades_outcome ON arbitrage_trades(outcome);
CREATE INDEX idx_arbitrage_trades_ai_prediction ON arbitrage_trades(ai_prediction_correct) WHERE ai_prediction_correct IS NOT NULL;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_arbitrage_trades_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_arbitrage_trades_updated_at
    BEFORE UPDATE ON arbitrage_trades
    FOR EACH ROW
    EXECUTE FUNCTION update_arbitrage_trades_updated_at();

-- Enable Row Level Security (optional, for future multi-tenant support)
ALTER TABLE arbitrage_trades ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE arbitrage_trades IS 'Stores all arbitrage trade attempts and outcomes for the self-learning AI system';
COMMENT ON COLUMN arbitrage_trades.leg1_fill_time_ms IS 'Time in milliseconds from order placement to fill for leg 1';
COMMENT ON COLUMN arbitrage_trades.leg2_fill_time_ms IS 'Time in milliseconds from order placement to fill for leg 2';
COMMENT ON COLUMN arbitrage_trades.ai_prediction_correct IS 'Whether the AI prediction for this trade was correct';
