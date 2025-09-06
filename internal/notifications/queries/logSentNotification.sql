INSERT INTO sent_notifications_log (
    user_id,
    rule_id,
    symbol,
    profit_threshold,
    actual_profit
) VALUES ($1, $2, $3, $4, $5)
ON CONFLICT (user_id, rule_id, symbol, date_trunc('hour', sent_at))
DO NOTHING
RETURNING id;
