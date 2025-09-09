SELECT
	COUNT(*) as total_rates,
	COUNT(DISTINCT symbol) as unique_symbols,
	COUNT(DISTINCT exchange) as unique_exchanges,
	COUNT(CASE WHEN created_at >= NOW() - INTERVAL '2 hours' THEN 1 END) as recent_rates,
	MIN(created_at) as oldest_rate,
	MAX(created_at) as newest_rate
FROM funding_rates;
