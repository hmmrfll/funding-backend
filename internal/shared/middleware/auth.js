const { validate, isValid } = require('@telegram-apps/init-data-node');

class AuthMiddleware {
    constructor(config, logger) {
        this.config = config;
        this.logger = logger;
    }

    validateTelegramAuth() {
        return (req, res, next) => {
            try {
                const authHeader = req.headers['authorization'];

                if (!authHeader) {
                    return res.status(401).json({ error: 'Authorization header is missing' });
                }

                const initData = authHeader.replace('Bearer ', '');

                if (!isValid(initData, this.config.telegram.botToken)) {
                    return res.status(401).json({ error: 'Invalid telegram authentication' });
                }

                const userData = this.parseInitData(initData);
                req.telegramUser = userData;

                next();
            } catch (error) {
                if (error && error.type === 'ERR_EXPIRED') {
                    return res.status(401).json({
                        error: 'Authorization token has expired. Please reauthorize to continue.'
                    });
                }

                this.logger.error('Auth middleware error', error);
                return res.status(401).json({ error: 'Invalid token' });
            }
        };
    }

    parseInitData(initData) {
        try {
            const params = Object.fromEntries(new URLSearchParams(initData));

            if (!params.user) {
                throw new Error('User data is missing in initData');
            }

            const user = JSON.parse(decodeURIComponent(params.user));

            return {
                userId: user.id,
                firstName: user.first_name || '',
                lastName: user.last_name || '',
                username: user.username || '',
                languageCode: user.language_code || '',
                photoUrl: user.photo_url || ''
            };
        } catch (error) {
            throw new Error('Failed to parse init data');
        }
    }

    getUserIdFromInitData(initData) {
        try {
            const userData = this.parseInitData(initData);
            return userData.userId;
        } catch (error) {
            return null;
        }
    }
}

module.exports = AuthMiddleware;
