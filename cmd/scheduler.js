const cron = require('node-cron');

class DataScheduler {
	constructor(arbitrageService, logger) {
		this.arbitrageService = arbitrageService;
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
			} catch (error) {
				this.logger.error('Error in scheduled funding rates update:', error);
			} finally {
				this.isRunning = false;
			}
		});

		this.logger.info('Data scheduler started - funding rates will update every 30 seconds');
	}
}

module.exports = DataScheduler;
