INSERT INTO funding_rates (exchange, symbol, rate, volume_24h, timestamp)
VALUES ($1, $2, $3, 0, $4)
ON CONFLICT (exchange, symbol, timestamp) DO UPDATE SET
    rate = EXCLUDED.rate,
    volume_24h = EXCLUDED.volume_24h,
    updated_at = CURRENT_TIMESTAMP
