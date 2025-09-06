SELECT *
FROM user_notification_rules
WHERE user_id = $1
ORDER BY created_at DESC;
