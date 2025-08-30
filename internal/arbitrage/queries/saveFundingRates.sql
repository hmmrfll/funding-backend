INSERT INTO funding_rates (exchange, symbol, rate, timestamp)
VALUES ($1, $2, $3, $4)
ON CONFLICT (exchange, symbol, timestamp) DO UPDATE SET
    rate = EXCLUDED.rate,
    updated_at = CURRENT_TIMESTAMP
