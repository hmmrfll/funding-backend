SELECT 1 FROM sent_notifications_log
WHERE user_id = $1
  AND rule_id = $2
  AND symbol = $3
  AND sent_at >= NOW() - INTERVAL '1 minute' * $4
LIMIT 1;
