class User {
    constructor(data) {
        this.id = data.id;
        this.telegramId = data.telegram_id || data.telegramId;
        this.name = data.name;
        this.avatarUrl = data.avatar_url || data.avatarUrl;
        this.extendedApiKey = data.extended_api_key || data.extendedApiKey;
        this.extendedApiSecret = data.extended_api_secret || data.extendedApiSecret;
        this.hyperliquidApiKey = data.hyperliquid_api_key || data.hyperliquidApiKey;
        this.hyperliquidApiSecret = data.hyperliquid_api_secret || data.hyperliquidApiSecret;
        this.createdAt = data.created_at || data.createdAt;
        this.updatedAt = data.updated_at || data.updatedAt;
    }

    toJSON() {
        let avatarUrl = this.avatarUrl;

        // Если URL относительный, делаем его абсолютным
        if (avatarUrl && avatarUrl.startsWith('/uploads/')) {
            avatarUrl = `${process.env.SERVER_URL || ''}${avatarUrl}`;
        }

        return {
            id: this.id,
            telegramId: this.telegramId.toString(),
            name: this.name,
            avatarUrl: avatarUrl,
            hasExtendedKeys: !!(this.extendedApiKey && this.extendedApiSecret),
            hasHyperliquidKeys: !!(this.hyperliquidApiKey && this.hyperliquidApiSecret),
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }

    static fromDatabase(dbUser) {
        if (!dbUser) return null;
        return new User(dbUser);
    }
}

module.exports = User;
