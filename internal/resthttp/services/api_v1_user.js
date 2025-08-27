const { AppError } = require('../../user/error');

class UserRestService {
    constructor(userService, authMiddleware, logger) {
        this.userService = userService;
        this.authMiddleware = authMiddleware;
        this.logger = logger;
    }

    async getCurrentUser(req, res) {
        try {
            let userData;

            if (req.telegramUser) {
                userData = req.telegramUser;
                this.logger.debug('Getting user by Telegram initData');
            } else if (req.jwtUser) {
                userData = req.jwtUser;
                this.logger.debug('Getting user by JWT token');
            } else {
                throw new AppError('Authentication required', 'AUTH_REQUIRED', 401);
            }

            const user = await this.userService.getOrCreateUserByTelegramData(userData);

            res.json(user);
        } catch (error) {
            if (error instanceof AppError && error.code === 'USER_NOT_FOUND') {
                this.logger.debug(`User not found: ${userData?.userId}`);
            } else {
                this.logger.error('Error in getCurrentUser REST', error);
            }
            this.handleError(res, error);
        }
    }

    async getUserById(req, res) {
        try {
            const { id } = req.params;
            const user = await this.userService.getUserById(id);
            res.json(user);
        } catch (error) {
            if (error instanceof AppError && error.code === 'USER_NOT_FOUND') {
                this.logger.debug(`User not found: ${req.params.id}`);
            } else {
                this.logger.error('Error in getUserById REST', error);
            }
            this.handleError(res, error);
        }
    }

    handleError(res, error) {
        const expectedErrors = [
            'USER_NOT_FOUND',
            'USER_ID_REQUIRED',
            'TELEGRAM_ID_REQUIRED',
            'INVALID_TELEGRAM_ID',
            'INVALID_AVATAR_URL',
            'AUTH_REQUIRED',
            'AUTHENTICATION_FAILED'
        ];

        if (error instanceof AppError) {
            if (expectedErrors.includes(error.code)) {
                this.logger.debug('Expected application error:', {
                    code: error.code,
                    message: error.message
                });
            } else {
                this.logger.warn('Unexpected application error:', {
                    message: error.message,
                    code: error.code,
                    stack: error.stack
                });
            }

            const response = {
                error: error.message,
                code: error.code,
            };

            if (error.details) {
                Object.assign(response, error.details);
            }

            return res.status(error.statusCode).json(response);
        }

        this.logger.error('Unexpected system error:', {
            message: error.message,
            stack: error.stack,
            name: error.name
        });

        res.status(500).json({
            error: 'Internal server error',
            code: 'INTERNAL_ERROR',
        });
    }

    getRoutes() {
        const auth = this.authMiddleware.validateAuth();

        return [
            {
                method: 'GET',
                path: '/user/me',
                handler: this.getCurrentUser.bind(this),
                middleware: auth,
            },
            {
                method: 'GET',
                path: '/user/:id',
                handler: this.getUserById.bind(this),
                middleware: auth,
            }
        ];
    }
}

module.exports = UserRestService;
