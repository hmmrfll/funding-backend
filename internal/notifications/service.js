const { InvalidNotificationRuleError, NotificationRuleNotFoundError } = require('./error');

class NotificationService {
	constructor(notificationStorage, logger) {
		this.notificationStorage = notificationStorage;
		this.logger = logger;
	}

	validateNotificationRule(ruleData) {
		if (!ruleData.type || !['global', 'pair'].includes(ruleData.type)) {
			throw new InvalidNotificationRuleError('type', ruleData.type);
		}

		if (ruleData.type === 'pair' && !ruleData.symbol) {
			throw new InvalidNotificationRuleError('symbol', 'required for pair type');
		}

		if (ruleData.type === 'global' && ruleData.symbol) {
			throw new InvalidNotificationRuleError('symbol', 'should be null for global type');
		}

		if (!ruleData.threshold || ruleData.threshold <= 0 || ruleData.threshold > 1) {
			throw new InvalidNotificationRuleError('threshold', 'must be between 0 and 1');
		}
	}

	async createNotificationRule(userId, ruleData) {
		this.validateNotificationRule(ruleData);

		const rule = await this.notificationStorage.createNotificationRule(userId, ruleData);

		this.logger.info(`Notification rule created for user ${userId}:`, rule.toJSON());

		return rule.toJSON();
	}

	async getUserNotificationRules(userId) {
		const rules = await this.notificationStorage.getUserNotificationRules(userId);

		return rules.map((rule) => rule.toJSON());
	}

	async updateNotificationRule(ruleId, userId, updates) {
		if (updates.threshold !== undefined) {
			if (updates.threshold <= 0 || updates.threshold > 1) {
				throw new InvalidNotificationRuleError('threshold', 'must be between 0 and 1');
			}
		}

		const rule = await this.notificationStorage.updateNotificationRule(ruleId, userId, updates);

		if (!rule) {
			throw new NotificationRuleNotFoundError(ruleId);
		}

		this.logger.info(`Notification rule updated: ${ruleId}`);

		return rule.toJSON();
	}

	async deleteNotificationRule(ruleId, userId) {
		const deleted = await this.notificationStorage.deleteNotificationRule(ruleId, userId);

		if (!deleted) {
			throw new NotificationRuleNotFoundError(ruleId);
		}

		this.logger.info(`Notification rule deleted: ${ruleId}`);

		return { success: true };
	}

	async checkAndSendNotifications(opportunities, telegramService, userStorage) {
		try {
			const activeRules = await this.notificationStorage.getActiveNotificationRules();

			if (activeRules.length === 0) {
				return [];
			}

			const notificationsSent = [];

			for (const rule of activeRules) {
				try {
					const matchingOpportunities = this.findMatchingOpportunities(rule, opportunities);

					for (const opportunity of matchingOpportunities) {
						const shouldSend = await this.shouldSendNotification(rule, opportunity);

						if (shouldSend) {
							await this.sendNotification(rule, opportunity, telegramService, userStorage);
							notificationsSent.push({
								userId: rule.userId,
								ruleId: rule.id,
								symbol: opportunity.symbol,
								profit: opportunity.absRateDifference,
							});
						}
					}
				} catch (error) {
					this.logger.error(`❌ Error processing rule ${rule.id}:`, error);
				}
			}

			if (notificationsSent.length > 0) {
				this.logger.info(
					`📨 Sent ${notificationsSent.length} notifications: ${notificationsSent
						.map((n) => `${n.symbol}: ${(n.profit * 100).toFixed(4)}%`)
						.join(', ')}`,
				);
			}

			return notificationsSent;
		} catch (error) {
			this.logger.error('❌ Error in checkAndSendNotifications:', error);
			return [];
		}
	}

	findMatchingOpportunities(rule, opportunities) {
		return opportunities.filter((opportunity) => {
			if (opportunity.absRateDifference < rule.threshold) {
				return false;
			}

			if (rule.type === 'global') {
				return true;
			}

			if (rule.type === 'pair') {
				return opportunity.symbol === rule.symbol;
			}

			return false;
		});
	}

	async shouldSendNotification(rule, opportunity) {
		const hasRecent = await this.notificationStorage.hasRecentNotification(rule.userId, rule.id, opportunity.symbol);

		return !hasRecent;
	}

	async sendNotification(rule, opportunity, telegramService, userStorage) {
		try {
			const user = await userStorage.getUserById(rule.userId);
			if (!user) {
				this.logger.warn(`⚠️ User not found for notification: ${rule.userId}`);
				return;
			}

			const message = this.formatNotificationMessage(rule, opportunity);

			await telegramService.sendTemplateMessage([{ telegramId: user.telegramId }], 'arbitrage_alert', {
				message: message,
			});

			await this.notificationStorage.logSentNotification(
				rule.userId,
				rule.id,
				opportunity.symbol,
				rule.threshold,
				opportunity.absRateDifference,
			);
		} catch (error) {
			this.logger.error(`❌ Error sending notification to user ${rule.userId} for ${opportunity.symbol}:`, error);
		}
	}

	formatNotificationMessage(rule, opportunity) {
		const profitPercent = (opportunity.absRateDifference * 100).toFixed(4);
		const extendedRate = (opportunity.extendedRate * 100).toFixed(4);
		const hyperliquidRate = (opportunity.hyperliquidRate * 100).toFixed(4);

		const strategy =
			opportunity.extendedRate > opportunity.hyperliquidRate
				? 'SHORT Extended, LONG Hyperliquid'
				: 'LONG Extended, SHORT Hyperliquid';

		return `🚨 Arbitrage Alert!

💱 Pair: ${opportunity.symbol}
📈 Extended: ${extendedRate >= 0 ? '+' : ''}${extendedRate}%
📉 Hyperliquid: ${hyperliquidRate >= 0 ? '+' : ''}${hyperliquidRate}%
💰 Potential: ~${profitPercent}%
📊 Strategy: ${strategy}

⚡ ${rule.type === 'global' ? 'Global' : 'Pair'} Alert (≥${(rule.threshold * 100).toFixed(2)}%)`;
	}
}

module.exports = NotificationService;
