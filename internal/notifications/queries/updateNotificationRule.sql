UPDATE user_notification_rules
SET
    enabled = COALESCE($2, enabled),
    threshold = COALESCE($3, threshold),
    cooldown_minutes = COALESCE($4, cooldown_minutes),
    updated_at = CURRENT_TIMESTAMP
WHERE id = $1 AND user_id = $5
RETURNING *;
