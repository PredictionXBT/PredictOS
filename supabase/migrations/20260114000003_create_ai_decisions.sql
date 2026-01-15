-- Migration: Create ai_decisions table
-- Description: Tracks AI decision-making and accuracy for self-calibration

CREATE TABLE IF NOT EXISTS ai_decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Foreign key to arbitrage_trades
    trade_id UUID NOT NULL REFERENCES arbitrage_trades(id) ON DELETE CASCADE,

    -- Decision details
    decision TEXT NOT NULL CHECK (decision IN (
        'execute',        -- AI recommended executing the trade
        'wait',           -- AI recommended waiting for better conditions
        'skip',           -- AI recommended skipping this opportunity
        'reprice',        -- AI recommended repricing the orders
        'unwind',         -- AI recommended unwinding a partial fill
        'scale_down'      -- AI recommended reducing position size
    )),

    -- Confidence and reasoning
    confidence_score DECIMAL(5, 4) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
    reasoning TEXT NOT NULL,

    -- Factors that influenced the decision (JSON for flexibility)
    decision_factors JSONB DEFAULT '{}',

    -- Accuracy tracking
    was_correct BOOLEAN,                          -- Set after trade outcome is known
    correctness_reason TEXT,                      -- Explanation of why decision was right/wrong

    -- AI model metadata
    model_used TEXT NOT NULL,
    tokens_used INTEGER,
    response_time_ms INTEGER,

    -- Historical context used in decision
    historical_fill_rate DECIMAL(5, 4),           -- Fill rate for similar conditions
    historical_sample_size INTEGER,               -- Number of similar trades in history
    confidence_adjustment DECIMAL(5, 4),          -- Adjustment based on historical accuracy

    -- Updated tracking
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for accuracy analysis
CREATE INDEX idx_ai_decisions_trade_id ON ai_decisions(trade_id);
CREATE INDEX idx_ai_decisions_created_at ON ai_decisions(created_at DESC);
CREATE INDEX idx_ai_decisions_decision ON ai_decisions(decision);
CREATE INDEX idx_ai_decisions_was_correct ON ai_decisions(was_correct) WHERE was_correct IS NOT NULL;
CREATE INDEX idx_ai_decisions_confidence ON ai_decisions(confidence_score);
CREATE INDEX idx_ai_decisions_model ON ai_decisions(model_used);

-- Composite index for accuracy calibration queries
CREATE INDEX idx_ai_decisions_calibration ON ai_decisions(
    decision,
    confidence_score,
    was_correct
) WHERE was_correct IS NOT NULL;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_ai_decisions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ai_decisions_updated_at
    BEFORE UPDATE ON ai_decisions
    FOR EACH ROW
    EXECUTE FUNCTION update_ai_decisions_updated_at();

-- Enable Row Level Security
ALTER TABLE ai_decisions ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE ai_decisions IS 'Tracks AI decision-making and accuracy for self-calibration';
COMMENT ON COLUMN ai_decisions.confidence_score IS 'AI confidence in the decision from 0 to 1';
COMMENT ON COLUMN ai_decisions.was_correct IS 'Set to true if the decision led to expected outcome, false otherwise';
COMMENT ON COLUMN ai_decisions.confidence_adjustment IS 'Adjustment factor based on historical accuracy for similar decisions';
