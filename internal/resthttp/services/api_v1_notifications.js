const { AppError } = require('../../user/error');

class NotificationRestService {
	constructor(notificationService, authMiddleware, logger) {
		this.notificationService = notificationService;
		this.authMiddleware = authMiddleware;
		this.logger = logger;
	}

	async createNotificationRule(req, res) {
		try {
			const userId = req.telegramUser?.userId || req.jwtUser?.userId;
			if (!userId) {
				throw new AppError('User ID required', 'USER_ID_REQUIRED', 401);
			}

			const { type, symbol, threshold } = req.body;

			const ruleData = {
				type,
				symbol: type === 'pair' ? symbol : null,
				threshold: parseFloat(threshold),
			};

			const rule = await this.notificationService.createNotificationRule(userId, ruleData);

			res.status(201).json(rule);
		} catch (error) {
			this.logger.error('Error in createNotificationRule REST:', error);
			this.handleError(res, error);
		}
	}

	async getUserNotificationRules(req, res) {
		try {
			const userId = req.telegramUser?.userId || req.jwtUser?.userId;
			if (!userId) {
				throw new AppError('User ID required', 'USER_ID_REQUIRED', 401);
			}

			const rules = await this.notificationService.getUserNotificationRules(userId);

			res.json(rules);
		} catch (error) {
			this.logger.error('Error in getUserNotificationRules REST:', error);
			this.handleError(res, error);
		}
	}

	async updateNotificationRule(req, res) {
		try {
			const userId = req.telegramUser?.userId || req.jwtUser?.userId;
			if (!userId) {
				throw new AppError('User ID required', 'USER_ID_REQUIRED', 401);
			}

			const { ruleId } = req.params;
			const { enabled, threshold } = req.body;

			const updates = {};
			if (enabled !== undefined) updates.enabled = enabled;
			if (threshold !== undefined) updates.threshold = parseFloat(threshold);

			const rule = await this.notificationService.updateNotificationRule(ruleId, userId, updates);

			res.json(rule);
		} catch (error) {
			this.logger.error('Error in updateNotificationRule REST:', error);
			this.handleError(res, error);
		}
	}

	async deleteNotificationRule(req, res) {
		try {
			const userId = req.telegramUser?.userId || req.jwtUser?.userId;
			if (!userId) {
				throw new AppError('User ID required', 'USER_ID_REQUIRED', 401);
			}

			const { ruleId } = req.params;

			const result = await this.notificationService.deleteNotificationRule(ruleId, userId);

			res.json(result);
		} catch (error) {
			this.logger.error('Error in deleteNotificationRule REST:', error);
			this.handleError(res, error);
		}
	}

	handleError(res, error) {
		if (error instanceof AppError) {
			return res.status(error.statusCode).json({
				error: error.message,
				code: error.code,
				...(error.details && { details: error.details }),
			});
		}

		this.logger.error('Unexpected system error:', error);
		res.status(500).json({
			error: 'Internal server error',
			code: 'INTERNAL_ERROR',
		});
	}

	getRoutes() {
		const auth = this.authMiddleware.validateAuth();

		return [
			{
				method: 'POST',
				path: '/notifications/rules',
				handler: this.createNotificationRule.bind(this),
				middleware: auth,
			},
			{
				method: 'GET',
				path: '/notifications/rules',
				handler: this.getUserNotificationRules.bind(this),
				middleware: auth,
			},
			{
				method: 'PUT',
				path: '/notifications/rules/:ruleId',
				handler: this.updateNotificationRule.bind(this),
				middleware: auth,
			},
			{
				method: 'DELETE',
				path: '/notifications/rules/:ruleId',
				handler: this.deleteNotificationRule.bind(this),
				middleware: auth,
			},
		];
	}
}

module.exports = NotificationRestService;
