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
)
SELECT COUNT(*) as time_intervals_count, MIN(timestamp) as first_interval, MAX(timestamp) as last_interval
FROM time_intervals;
