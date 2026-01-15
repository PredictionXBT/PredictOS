-- Migration: Create learned_patterns table
-- Description: Stores extracted patterns from historical trade data

CREATE TABLE IF NOT EXISTS learned_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Pattern identification
    pattern_type TEXT NOT NULL CHECK (pattern_type IN (
        'spread_fill_rate',           -- Fill rate based on orderbook spread
        'size_fill_rate',             -- Fill rate based on order size
        'time_of_day_fill_rate',      -- Fill rate based on time of day
        'volatility_fill_rate',       -- Fill rate based on market volatility
        'momentum_fill_rate',         -- Fill rate based on price momentum
        'combined_conditions',        -- Multi-factor pattern
        'unwind_success_rate',        -- Success rate of unwind operations
        'reprice_success_rate',       -- Success rate of reprice operations
        'ai_accuracy_by_confidence',  -- AI accuracy grouped by confidence level
        'market_specific'             -- Patterns specific to certain markets
    )),

    -- Pattern conditions (what triggers this pattern)
    conditions_json JSONB NOT NULL DEFAULT '{}',

    -- Pattern metrics
    avg_fill_time_ms INTEGER,                     -- Average time to fill under these conditions
    fill_rate_percent DECIMAL(5, 2) NOT NULL CHECK (fill_rate_percent >= 0 AND fill_rate_percent <= 100),
    sample_size INTEGER NOT NULL DEFAULT 0,       -- Number of trades this pattern is based on

    -- Statistical confidence
    standard_deviation DECIMAL(10, 4),            -- Variance in outcomes
    confidence_interval_lower DECIMAL(5, 2),      -- 95% CI lower bound
    confidence_interval_upper DECIMAL(5, 2),      -- 95% CI upper bound

    -- Temporal validity
    last_observed TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    observation_window_hours INTEGER DEFAULT 24,  -- How far back this pattern looks

    -- Pattern performance
    profit_when_followed DECIMAL(18, 6),          -- Total profit when pattern was followed
    loss_when_ignored DECIMAL(18, 6),             -- Total loss when pattern was ignored

    -- Decay and freshness
    decay_factor DECIMAL(5, 4) DEFAULT 1.0,       -- Weight reduction for older patterns
    is_active BOOLEAN DEFAULT TRUE,               -- Whether pattern is still valid

    -- Versioning
    version INTEGER DEFAULT 1,
    previous_version_id UUID REFERENCES learned_patterns(id)
);

-- Indexes for pattern lookup
CREATE INDEX idx_learned_patterns_type ON learned_patterns(pattern_type);
CREATE INDEX idx_learned_patterns_active ON learned_patterns(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_learned_patterns_sample_size ON learned_patterns(sample_size DESC);
CREATE INDEX idx_learned_patterns_fill_rate ON learned_patterns(fill_rate_percent);
CREATE INDEX idx_learned_patterns_updated ON learned_patterns(updated_at DESC);
CREATE INDEX idx_learned_patterns_conditions ON learned_patterns USING GIN (conditions_json);

-- Composite index for pattern matching queries
CREATE INDEX idx_learned_patterns_lookup ON learned_patterns(
    pattern_type,
    is_active,
    sample_size
) WHERE is_active = TRUE;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_learned_patterns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_learned_patterns_updated_at
    BEFORE UPDATE ON learned_patterns
    FOR EACH ROW
    EXECUTE FUNCTION update_learned_patterns_updated_at();

-- Enable Row Level Security
ALTER TABLE learned_patterns ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE learned_patterns IS 'Stores extracted patterns from historical trade data for the learning engine';
COMMENT ON COLUMN learned_patterns.conditions_json IS 'JSON object describing the conditions that define this pattern (e.g., {"spread_min": 0.01, "spread_max": 0.02})';
COMMENT ON COLUMN learned_patterns.decay_factor IS 'Weight reduction for older patterns, 1.0 = full weight, 0.0 = expired';
COMMENT ON COLUMN learned_patterns.observation_window_hours IS 'How many hours of historical data this pattern considers';
