const fs = require('fs');
const path = require('path');
const { DatabaseErrors } = require('../user/error');

class ArbitrageStorage {
	constructor(db, logger) {
		this.db = db;
		this.logger = logger;
		this.queries = this.loadQueries();
	}

	loadQueries() {
		const queriesPath = path.join(__dirname, 'queries');
		const queries = {};

		try {
			if (fs.existsSync(queriesPath)) {
				const files = fs.readdirSync(queriesPath);
				files.forEach((file) => {
					if (file.endsWith('.sql')) {
						const queryName = file.replace('.sql', '');
						queries[queryName] = fs.readFileSync(path.join(queriesPath, file), 'utf8');
					}
				});
			}
		} catch (error) {
			this.logger.error('Error loading arbitrage queries', error);
		}

		return queries;
	}

	async saveFundingRates(rates, exchange) {
		const client = this.db.getClient();

		try {
			await client.connect();

			const insertPromises = rates.map((rate) => {
				const timestamp = new Date();
				return client.query(this.queries.saveFundingRates, [
					exchange,
					rate.symbol,
					parseFloat(rate.fundingRate || 0),
					timestamp,
				]);
			});

			await Promise.all(insertPromises);
		} catch (error) {
			this.logger.error(`Error saving funding rates for ${exchange}:`, error);
			throw DatabaseErrors.queryFailed(error);
		} finally {
			await client.end();
		}
	}

	async saveArbitrageOpportunity(opportunity) {
		const client = this.db.getClient();

		try {
			await client.connect();

			const result = await client.query(this.queries.saveArbitrageOpportunity, [
				opportunity.symbol,
				opportunity.extendedRate,
				opportunity.hyperliquidRate,
				opportunity.absRateDifference,
				opportunity.riskLevel,
			]);

			return result.rows[0];
		} catch (error) {
			this.logger.error('Error saving arbitrage opportunity:', error);
			throw DatabaseErrors.queryFailed(error);
		} finally {
			await client.end();
		}
	}

	async getFundingRateHistory(symbol, startTime, endTime = new Date()) {
		const client = this.db.getClient();

		try {
			await client.connect();

			const result = await client.query(this.queries.getFundingRateHistory, [symbol, startTime, endTime]);

			return result.rows;
		} catch (error) {
			this.logger.error(`Error getting funding rate history for ${symbol}:`, error);
			throw DatabaseErrors.queryFailed(error);
		} finally {
			await client.end();
		}
	}

	async getLatestArbitrageOpportunities(limit = 10) {
		const client = this.db.getClient();

		try {
			await client.connect();

			const result = await client.query(this.queries.getLatestArbitrageOpportunities, [limit]);

			return result.rows;
		} catch (error) {
			this.logger.error('Error getting latest arbitrage opportunities:', error);
			throw DatabaseErrors.queryFailed(error);
		} finally {
			await client.end();
		}
	}
}

module.exports = ArbitrageStorage;
