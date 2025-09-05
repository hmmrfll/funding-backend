WITH latest_rates AS (
    SELECT DISTINCT ON (symbol, exchange)
        symbol,
        exchange,
        rate,
        created_at
    FROM funding_rates
    WHERE created_at >= NOW() - INTERVAL '2 hours'
    ORDER BY symbol, exchange, created_at DESC
),
paired_rates AS (
    SELECT
        e.symbol,
        e.rate as extended_rate,
        h.rate as hyperliquid_rate,
        ABS(e.rate - h.rate) as spread
    FROM latest_rates e
    INNER JOIN latest_rates h ON e.symbol = h.symbol
    WHERE e.exchange = 'extended' AND h.exchange = 'hyperliquid'
),
top_opportunities AS (
    SELECT
        ao.symbol,
        ao.profit_potential as profit,
        1000000 as volume
    FROM arbitrage_opportunities ao
    WHERE ao.created_at >= NOW() - INTERVAL '1 hour'
    ORDER BY ao.profit_potential DESC
    LIMIT 5
)
SELECT
    COALESCE(SUM(1000000), 0) as total_volume,
    (SELECT COUNT(DISTINCT symbol) FROM latest_rates) as total_pairs,
    COALESCE(AVG(pr.spread), 0) as avg_spread,
    COALESCE(
        json_agg(
            json_build_object(
                'symbol', top.symbol,
                'profit', top.profit,
                'volume', top.volume
            )
        ) FILTER (WHERE top.symbol IS NOT NULL),
        '[]'::json
    ) as top_opportunities
FROM paired_rates pr
LEFT JOIN top_opportunities top ON true;
