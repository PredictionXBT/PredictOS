-- Migration: Create market_snapshots table
-- Description: Stores market condition snapshots at time of trade for pattern learning

CREATE TABLE IF NOT EXISTS market_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Foreign key to arbitrage_trades
    trade_id UUID NOT NULL REFERENCES arbitrage_trades(id) ON DELETE CASCADE,

    -- Snapshot timing and type
    snapshot_type TEXT NOT NULL CHECK (snapshot_type IN (
        'pre_trade',      -- Snapshot before placing orders
        'leg1_placed',    -- Snapshot after leg 1 is placed
        'leg2_placed',    -- Snapshot after leg 2 is placed
        'leg1_filled',    -- Snapshot when leg 1 fills
        'leg2_filled',    -- Snapshot when leg 2 fills
        'post_trade'      -- Final snapshot after trade completes
    )),

    -- Orderbook metrics
    orderbook_spread DECIMAL(10, 6),              -- Bid-ask spread
    orderbook_depth_at_price DECIMAL(18, 6),      -- Liquidity at our price level
    orderbook_total_bids DECIMAL(18, 6),          -- Total bid liquidity
    orderbook_total_asks DECIMAL(18, 6),          -- Total ask liquidity

    -- Price metrics
    mid_price DECIMAL(10, 6),                     -- Mid-market price
    best_bid DECIMAL(10, 6),                      -- Best bid price
    best_ask DECIMAL(10, 6),                      -- Best ask price

    -- Volatility and momentum
    volatility_1min DECIMAL(10, 6),               -- 1-minute price volatility
    volatility_5min DECIMAL(10, 6),               -- 5-minute price volatility
    price_momentum DECIMAL(10, 6),                -- Recent price direction (-1 to 1)

    -- Timing context
    time_of_day TIME NOT NULL,                    -- Time without date for pattern matching
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),

    -- Additional context
    token_id TEXT,
    market_activity_score DECIMAL(10, 6),         -- Normalized trading activity (0-1)
    seconds_since_last_trade INTEGER              -- Time since last trade on this market
);

-- Indexes for efficient pattern analysis
CREATE INDEX idx_market_snapshots_trade_id ON market_snapshots(trade_id);
CREATE INDEX idx_market_snapshots_snapshot_type ON market_snapshots(snapshot_type);
CREATE INDEX idx_market_snapshots_created_at ON market_snapshots(created_at DESC);
CREATE INDEX idx_market_snapshots_time_of_day ON market_snapshots(time_of_day);
CREATE INDEX idx_market_snapshots_spread ON market_snapshots(orderbook_spread);
CREATE INDEX idx_market_snapshots_volatility ON market_snapshots(volatility_1min);

-- Composite index for pattern queries
CREATE INDEX idx_market_snapshots_pattern_query ON market_snapshots(
    snapshot_type,
    time_of_day,
    orderbook_spread,
    volatility_1min
);

-- Enable Row Level Security
ALTER TABLE market_snapshots ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE market_snapshots IS 'Stores market condition snapshots at time of trade for the learning engine';
COMMENT ON COLUMN market_snapshots.volatility_1min IS 'Price volatility over the last 1 minute, calculated as standard deviation of price changes';
COMMENT ON COLUMN market_snapshots.price_momentum IS 'Recent price direction from -1 (strongly falling) to 1 (strongly rising)';
COMMENT ON COLUMN market_snapshots.market_activity_score IS 'Normalized trading activity score from 0 (inactive) to 1 (highly active)';
