SELECT
	COUNT(*) as periods_with_data,
	AVG(active_opportunities) as avg_opportunities,
	AVG(avg_spread) as avg_spread,
	MAX(max_profit_potential) as max_profit
FROM (
	SELECT
		DATE_TRUNC(
			CASE
				WHEN $1::text = '1h' THEN 'minute'
				WHEN $1::text = '4h' THEN 'hour'
				WHEN $1::text = '24h' THEN 'hour'
				WHEN $1::text = '7d' THEN 'hour'
			END,
			created_at
		) as period,
		COUNT(*) as active_opportunities,
		AVG(profit_potential) as avg_spread,
		MAX(profit_potential) as max_profit_potential
	FROM arbitrage_opportunities
	WHERE created_at >= CASE
		WHEN $1::text = '1h' THEN NOW() - INTERVAL '1 hour'
		WHEN $1::text = '4h' THEN NOW() - INTERVAL '4 hours'
		WHEN $1::text = '24h' THEN NOW() - INTERVAL '24 hours'
		WHEN $1::text = '7d' THEN NOW() - INTERVAL '7 days'
	END
	GROUP BY period
) subq;
