DELETE FROM user_notification_rules
WHERE id = $1 AND user_id = $2
RETURNING *;
