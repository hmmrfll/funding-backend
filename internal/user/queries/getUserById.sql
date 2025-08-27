WITH user_data AS (
    SELECT
        id,
        telegram_id,
        name,
        avatar_url,
        extended_api_key,
        extended_api_secret,
        hyperliquid_api_key,
        hyperliquid_api_secret,
        created_at,
        updated_at
    FROM users
    WHERE id = $1
)
SELECT * FROM user_data;
