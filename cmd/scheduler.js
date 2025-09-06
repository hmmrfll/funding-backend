const cron = require('node-cron');

class DataScheduler {
	constructor(arbitrageService, notificationService, telegramService, userStorage, logger) {
		this.arbitrageService = arbitrageService;
		this.notificationService = notificationService;
		this.telegramService = telegramService;
		this.userStorage = userStorage;
		this.logger = logger;
		this.isRunning = false;
	}

	start() {
		cron.schedule('*/30 * * * * *', async () => {
			if (this.isRunning) {
				return;
			}

			try {
				this.isRunning = true;
				const result = await this.arbitrageService.getFundingRatesComparison();

				this.logger.info(
					`Scheduled update: ${Object.keys(result.comparison).length} pairs, ${
						result.opportunities.length
					} opportunities`,
				);

				await this.notificationService.checkAndSendNotifications(
					result.opportunities,
					this.telegramService,
					this.userStorage,
				);
			} catch (error) {
				this.logger.error('Error in scheduled update:', error);
			} finally {
				this.isRunning = false;
			}
		});

		this.logger.info('Data scheduler started - funding rates and notifications will update every 30 seconds');
	}
}

module.exports = DataScheduler;
