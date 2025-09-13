INSERT INTO user_notification_rules (
    user_id,
    type,
    symbol,
    threshold,
    enabled,
    cooldown_minutes
) VALUES ($1, $2, $3, $4, $5, $6)
RETURNING *;
