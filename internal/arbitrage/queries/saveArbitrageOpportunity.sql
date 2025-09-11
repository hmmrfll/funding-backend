INSERT INTO arbitrage_opportunities (
	symbol, extended_funding_rate, hyperliquid_funding_rate,
	profit_potential, volume_24h, risk_level, created_at
) VALUES ($1, $2, $3, $4, $6, $5, CURRENT_TIMESTAMP)
RETURNING *
