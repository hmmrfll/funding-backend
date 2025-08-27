const { validate, isValid } = require('@telegram-apps/init-data-node');
const jwt = require('jsonwebtoken');

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

    validateAuth() {
        return (req, res, next) => {
            try {
                const authHeader = req.headers['authorization'];

                if (!authHeader) {
                    return res.status(401).json({ error: 'Authorization header is missing' });
                }

                // Проверяем формат заголовка
                if (!authHeader.startsWith('Bearer ')) {
                    return res.status(401).json({ error: 'Invalid authorization format' });
                }

                const token = authHeader.substring(7); // Убираем 'Bearer ' (7 символов)

                this.logger.debug('Raw auth header:', authHeader.substring(0, 50) + '...');
                this.logger.debug('Extracted token:', token.substring(0, 50) + '...');

                // Улучшенная логика определения типа токена
                if (this.isJwtToken(token)) {
                    this.logger.debug('Detected JWT token');
                    return this.validateJwtToken(token, req, res, next);
                } else {
                    this.logger.debug('Detected Telegram initData');
                    return this.validateTelegramInitData(token, req, res, next);
                }

            } catch (error) {
                this.logger.error('Auth middleware error', error);
                return res.status(401).json({ error: 'Invalid token' });
            }
        };
    }

    isJwtToken(token) {
        // JWT токен состоит из трех частей разделенных точками
        const parts = token.split('.');
        if (parts.length !== 3) {
            this.logger.debug('Token parts count:', parts.length);
            return false;
        }

        // Проверяем, что каждая часть является base64url строкой
        try {
            for (let i = 0; i < parts.length; i++) {
                const part = parts[i];
                // JWT использует base64url кодирование
                if (!/^[A-Za-z0-9_-]+$/.test(part)) {
                    this.logger.debug(`Invalid base64url in part ${i}:`, part.substring(0, 20));
                    return false;
                }
            }

            // Дополнительная проверка - пытаемся декодировать header
            try {
                const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
                if (header.alg && header.typ === 'JWT') {
                    this.logger.debug('Valid JWT header detected:', header);
                    return true;
                }
            } catch (e) {
                this.logger.debug('Failed to decode JWT header');
                return false;
            }

            return true;
        } catch (error) {
            this.logger.debug('JWT format validation error:', error.message);
            return false;
        }
    }

    validateJwtToken(token, req, res, next) {
        try {
            this.logger.debug('Validating JWT token');
            const decoded = jwt.verify(token, this.config.jwt.secret);
            this.logger.debug('JWT decoded successfully for user:', decoded.userId);

            // Добавляем данные пользователя из JWT
            req.jwtUser = {
                userId: decoded.userId,
                firstName: decoded.firstName || '',
                lastName: decoded.lastName || '',
                username: decoded.username || '',
                languageCode: decoded.languageCode || '',
                photoUrl: decoded.photoUrl || ''
            };

            next();
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({
                    error: 'JWT token has expired',
                    code: 'TOKEN_EXPIRED'
                });
            }

            if (error.name === 'JsonWebTokenError') {
                this.logger.debug('JWT validation failed:', error.message);
                return res.status(401).json({ error: 'Invalid JWT token format' });
            }

            this.logger.error('JWT validation error', error);
            return res.status(401).json({ error: 'JWT validation failed' });
        }
    }

    validateTelegramInitData(initData, req, res, next) {
        try {
            this.logger.debug('Validating Telegram initData');
            this.logger.debug('InitData sample:', initData.substring(0, 100) + '...');

            if (!isValid(initData, this.config.telegram.botToken)) {
                this.logger.debug('Telegram initData validation failed');
                return res.status(401).json({ error: 'Invalid telegram authentication' });
            }

            const userData = this.parseInitData(initData);
            this.logger.debug('Telegram initData parsed successfully for user:', userData.userId);
            req.telegramUser = userData;

            next();
        } catch (error) {
            if (error && error.type === 'ERR_EXPIRED') {
                return res.status(401).json({
                    error: 'Authorization token has expired. Please reauthorize to continue.'
                });
            }

            this.logger.error('Telegram auth validation error', error);
            return res.status(401).json({ error: 'Invalid telegram initData format' });
        }
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
