WITH opportunities_by_hour AS (
    SELECT
        EXTRACT(HOUR FROM ao.created_at) AS hour,
        MAX(ao.profit_potential) AS max_profit,
        AVG(ao.profit_potential) AS avg_profit,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ao.profit_potential) AS median_profit
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
    AND ao.profit_potential IS NOT NULL
    AND ao.profit_potential > 0
    GROUP BY EXTRACT(HOUR FROM ao.created_at)
)
SELECT
    COALESCE(obh.hour, 0)::INTEGER AS hour,
    COALESCE(obh.max_profit, 0)::NUMERIC(10, 6) AS max_profit,
    COALESCE(obh.avg_profit, 0)::NUMERIC(10, 6) AS avg_profit,
    COALESCE(obh.median_profit, 0)::NUMERIC(10, 6) AS median_profit
FROM generate_series(0, 23) AS all_hours(hour)
LEFT JOIN opportunities_by_hour obh ON all_hours.hour = obh.hour
ORDER BY all_hours.hour;
