WITH updated_user AS (
    UPDATE users
    SET
        name = COALESCE($2, name),
        avatar_url = COALESCE($3, avatar_url),
        extended_api_key = COALESCE($4, extended_api_key),
        extended_api_secret = COALESCE($5, extended_api_secret),
        hyperliquid_api_key = COALESCE($6, hyperliquid_api_key),
        hyperliquid_api_secret = COALESCE($7, hyperliquid_api_secret),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
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
FROM updated_user;
