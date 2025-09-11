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
recent_opportunities AS (
    SELECT
        ao.symbol,
        ao.profit_potential as profit,
        COALESCE(ao.volume_24h, 0) as volume,
        ao.created_at
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
),
top_opportunities AS (
    SELECT
        symbol,
        profit,
        volume
    FROM recent_opportunities
    ORDER BY profit DESC
    LIMIT 5
),
debug_info AS (
    SELECT
        COUNT(*) as total_opportunities_count,
        SUM(volume) as total_volume_sum,
        AVG(volume) as avg_volume,
        MIN(volume) as min_volume,
        MAX(volume) as max_volume,
        COUNT(CASE WHEN volume > 0 THEN 1 END) as non_zero_volume_count,
        MIN(created_at) as earliest_opportunity,
        MAX(created_at) as latest_opportunity
    FROM recent_opportunities
)
SELECT
    COALESCE(di.total_volume_sum, 0) as total_volume,
    (SELECT COUNT(DISTINCT symbol) FROM latest_rates) as total_pairs,
    (SELECT COALESCE(AVG(spread), 0) FROM paired_rates) as avg_spread,
    (SELECT json_agg(
        json_build_object(
            'symbol', symbol,
            'profit', profit,
            'volume', volume
        )
    ) FROM top_opportunities) as top_opportunities
FROM debug_info di;
