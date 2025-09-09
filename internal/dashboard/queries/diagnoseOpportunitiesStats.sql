SELECT
	COUNT(*) as total_opportunities,
	COUNT(CASE WHEN created_at >= NOW() - INTERVAL '1 hour' THEN 1 END) as last_hour,
	COUNT(CASE WHEN created_at >= NOW() - INTERVAL '4 hours' THEN 1 END) as last_4_hours,
	COUNT(CASE WHEN created_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as last_24_hours,
	COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as last_7_days,
	MIN(created_at) as oldest,
	MAX(created_at) as newest,
	AVG(profit_potential) as avg_profit,
	MAX(profit_potential) as max_profit,
	MIN(profit_potential) as min_profit
FROM arbitrage_opportunities;
