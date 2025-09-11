WITH time_intervals AS (
    SELECT
        generate_series(
            CASE
                WHEN $1 = '1h' THEN NOW() - INTERVAL '1 hour'
                WHEN $1 = '4h' THEN NOW() - INTERVAL '4 hours'
                WHEN $1 = '24h' THEN NOW() - INTERVAL '24 hours'
                WHEN $1 = '7d' THEN NOW() - INTERVAL '7 days'
                ELSE NOW() - INTERVAL '24 hours'
            END,
            NOW(),
            INTERVAL '1 hour'
        ) AS interval_start
),
opportunities_by_hour AS (
    SELECT
        EXTRACT(HOUR FROM ao.created_at) AS hour,
        COUNT(*) AS count
    FROM arbitrage_opportunities ao
    WHERE ao.created_at >= (
        CASE
            WHEN $1 = '1h' THEN NOW() - INTERVAL '1 hour'
            WHEN $1 = '4h' THEN NOW() - INTERVAL '4 hours'
            WHEN $1 = '24h' THEN NOW() - INTERVAL '24 hours'
            WHEN $1 = '7d' THEN NOW() - INTERVAL '7 days'
            ELSE NOW() - INTERVAL '24 hours'
        END
    )
    AND ao.created_at <= NOW()
    GROUP BY EXTRACT(HOUR FROM ao.created_at)
)
SELECT
    COALESCE(obh.hour, 0)::INTEGER AS hour,
    COALESCE(obh.count, 0)::INTEGER AS count
FROM generate_series(0, 23) AS all_hours(hour)
LEFT JOIN opportunities_by_hour obh ON all_hours.hour = obh.hour
ORDER BY all_hours.hour;
