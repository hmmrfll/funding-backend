const fs = require('fs');
const path = require('path');
const { DatabaseQueryError } = require('./error');

class DashboardStorage {
	constructor(databaseManager, logger) {
		this.db = databaseManager;
		this.logger = logger;
		this.queries = this.loadQueries();
	}

	loadQueries() {
		const queriesDir = path.join(__dirname, 'queries');
		const queries = {};

		try {
			const files = fs.readdirSync(queriesDir);
			for (const file of files) {
				if (file.endsWith('.sql')) {
					const queryName = file.replace('.sql', '');
					const queryPath = path.join(queriesDir, file);
					queries[queryName] = fs.readFileSync(queryPath, 'utf8');
				}
			}
		} catch (error) {
			this.logger.error('Failed to load dashboard queries:', error);
			throw new Error('Failed to load dashboard queries');
		}

		return queries;
	}

	async getMarketSummary(timeframe = '24h') {
		const client = this.db.getClient();

		try {
			await client.connect();
			const result = await client.query(this.queries.getMarketSummary, [timeframe]);

			if (!result.rows[0]) {
				this.logger.warn('No market summary data found, returning defaults');
				return {
					total_volume: 0,
					total_pairs: 0,
					avg_spread: 0,
					top_opportunities: [],
				};
			}

			const data = result.rows[0];

			return data;
		} catch (error) {
			this.logger.error(`Error fetching market summary (${timeframe}):`, error);
			throw new DatabaseQueryError('getMarketSummary', error);
		} finally {
			await client.end();
		}
	}

	async getMarketOverview(timeframe) {
		const client = this.db.getClient();

		try {
			await client.connect();

			const result = await client.query(this.queries.getMarketOverview, [timeframe]);

			if (result.rows.length === 0) {
				this.logger.warn(`No data returned for market overview timeframe: ${timeframe}`);
			}

			return result.rows || [];
		} catch (error) {
			this.logger.error(`Error fetching market overview for ${timeframe}:`, {
				message: error.message,
				stack: error.stack,
				timeframe: timeframe,
			});
			throw new DatabaseQueryError('getMarketOverview', error);
		} finally {
			await client.end();
		}
	}

	async getActivityByTime(timeframe) {
		const client = this.db.getClient();

		try {
			await client.connect();

			const result = await client.query(this.queries.getActivityByTime, [timeframe]);

			return result.rows || [];
		} catch (error) {
			this.logger.error(`Error fetching activity by time for ${timeframe}:`, {
				message: error.message,
				stack: error.stack,
				timeframe: timeframe,
			});
			throw new DatabaseQueryError('getActivityByTime', error);
		} finally {
			await client.end();
		}
	}

	async getProfitabilityByTime(timeframe) {
		const client = this.db.getClient();

		try {
			await client.connect();

			const result = await client.query(this.queries.getProfitabilityByTime, [timeframe]);

			return result.rows || [];
		} catch (error) {
			this.logger.error(`Error fetching profitability by time for ${timeframe}:`, {
				message: error.message,
				stack: error.stack,
				timeframe: timeframe,
			});
			throw new DatabaseQueryError('getProfitabilityByTime', error);
		} finally {
			await client.end();
		}
	}

	async diagnoseMarketOverviewData(timeframe) {
		const client = this.db.getClient();

		try {
			await client.connect();

			const opportunitiesStats = await client.query(this.queries.diagnoseOpportunitiesStats);
			const fundingRatesStats = await client.query(this.queries.diagnoseFundingRatesStats);
			const timeIntervalsCheck = await client.query(this.queries.diagnoseTimeIntervalsCheck, [timeframe]);
			const opportunitiesByTimeCheck = await client.query(this.queries.diagnoseOpportunitiesByTimeCheck, [timeframe]);
			const joinCheck = await client.query(this.queries.diagnoseJoinCheck, [timeframe]);

			return {
				opportunities: opportunitiesStats.rows[0],
				fundingRates: fundingRatesStats.rows[0],
				timeIntervals: timeIntervalsCheck.rows[0],
				opportunitiesByTime: opportunitiesByTimeCheck.rows[0],
				joinCheck: joinCheck.rows[0],
			};
		} catch (error) {
			this.logger.error(`Error in diagnoseMarketOverviewData:`, error);
			throw error;
		} finally {
			await client.end();
		}
	}
}

module.exports = DashboardStorage;
