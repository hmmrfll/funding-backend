INSERT INTO arbitrage_opportunities (
	symbol, extended_rate, hyperliquid_rate,
	profit_potential, risk_level, created_at
) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
RETURNING *
