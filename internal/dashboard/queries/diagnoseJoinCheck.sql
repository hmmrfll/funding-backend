WITH time_intervals AS (
	SELECT
		generate_series(
			CASE
				WHEN $1::text = '1h' THEN NOW() - INTERVAL '1 hour'
				WHEN $1::text = '4h' THEN NOW() - INTERVAL '4 hours'
				WHEN $1::text = '24h' THEN NOW() - INTERVAL '24 hours'
				WHEN $1::text = '7d' THEN NOW() - INTERVAL '7 days'
			END,
			NOW(),
			CASE
				WHEN $1::text = '1h' THEN INTERVAL '5 minutes'
				WHEN $1::text = '4h' THEN INTERVAL '30 minutes'
				WHEN $1::text = '24h' THEN INTERVAL '2 hours'
				WHEN $1::text = '7d' THEN INTERVAL '6 hours'
			END
		) as timestamp
),
opportunities_by_time AS (
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
)
SELECT
	COUNT(ti.timestamp) as total_intervals,
	COUNT(obt.period) as matched_periods,
	COUNT(ti.timestamp) - COUNT(obt.period) as unmatched_intervals
FROM time_intervals ti
LEFT JOIN opportunities_by_time obt ON DATE_TRUNC(
	CASE
		WHEN $1::text = '1h' THEN 'minute'
		WHEN $1::text = '4h' THEN 'hour'
		WHEN $1::text = '24h' THEN 'hour'
		WHEN $1::text = '7d' THEN 'hour'
	END,
	ti.timestamp
) = obt.period;
