WITH new_user AS (
    INSERT INTO users (
        id,
        telegram_id,
        name,
        avatar_url,
        created_at,
        updated_at
    ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    RETURNING *
)
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
FROM new_user;
