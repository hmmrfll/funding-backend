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

	async getMarketSummary() {
		const client = this.db.getClient();

		try {
			await client.connect();
			const result = await client.query(this.queries.getMarketSummary);

			this.logger.info(`Market summary: ${result.rows.length} rows returned`);

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
			this.logger.info(`Market summary: ${data.total_pairs} pairs, avg spread: ${data.avg_spread}`);

			return data;
		} catch (error) {
			this.logger.error('Error fetching market summary:', error);
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

			this.logger.info(`Market overview (${timeframe}): ${result.rows.length} rows returned`);

			if (result.rows.length > 0) {
				const nullValues = result.rows.filter(
					(row) => row.timestamp === null || row.total_volume === null || row.active_opportunities === null,
				);

				if (nullValues.length > 0) {
					this.logger.warn(`Found ${nullValues.length} rows with null values in market overview data`);
				}
			} else {
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

	// Дополнительный метод для диагностики данных
	async diagnoseMarketOverviewData(timeframe) {
		const client = this.db.getClient();

		try {
			await client.connect();

			// 1. Проверяем данные в arbitrage_opportunities
			const opportunitiesStats = await client.query(`
				SELECT
					COUNT(*) as total_opportunities,
					COUNT(CASE WHEN created_at >= NOW() - INTERVAL '1 hour' THEN 1 END) as last_hour,
					COUNT(CASE WHEN created_at >= NOW() - INTERVAL '4 hours' THEN 1 END) as last_4_hours,
					COUNT(CASE WHEN created_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as last_24_hours,
					COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as last_7_days,
					MIN(created_at) as oldest,
					MAX(created_at) as newest,
					AVG(profit_potential) as avg_profit,
					MAX(profit_potential) as max_profit,
					MIN(profit_potential) as min_profit
				FROM arbitrage_opportunities
			`);

			// 2. Проверяем данные в funding_rates
			const fundingRatesStats = await client.query(`
				SELECT
					COUNT(*) as total_rates,
					COUNT(DISTINCT symbol) as unique_symbols,
					COUNT(DISTINCT exchange) as unique_exchanges,
					COUNT(CASE WHEN created_at >= NOW() - INTERVAL '2 hours' THEN 1 END) as recent_rates,
					MIN(created_at) as oldest_rate,
					MAX(created_at) as newest_rate
				FROM funding_rates
			`);

			// 3. Проверяем промежуточные результаты запроса
			const timeIntervalsCheck = await client.query(
				`
				WITH time_intervals AS (
					SELECT
						generate_series(
							CASE
								WHEN $1::text = '1h' THEN NOW() - INTERVAL '1 hour'
								WHEN $1::text = '4h' THEN NOW() - INTERVAL '4 hours'
								WHEN $1::text = '24h' THEN NOW() - INTERVAL '24 hours'
								WHEN $1::text = '7d' THEN NOW() - INTERVAL '7 days'
							END,
							NOW(),
							CASE
								WHEN $1::text = '1h' THEN INTERVAL '5 minutes'
								WHEN $1::text = '4h' THEN INTERVAL '30 minutes'
								WHEN $1::text = '24h' THEN INTERVAL '2 hours'
								WHEN $1::text = '7d' THEN INTERVAL '6 hours'
							END
						) as timestamp
				)
				SELECT COUNT(*) as time_intervals_count, MIN(timestamp) as first_interval, MAX(timestamp) as last_interval
				FROM time_intervals
			`,
				[timeframe],
			);

			// 4. Проверяем opportunities_by_time
			const opportunitiesByTimeCheck = await client.query(
				`
				SELECT
					COUNT(*) as periods_with_data,
					AVG(active_opportunities) as avg_opportunities,
					AVG(avg_spread) as avg_spread,
					MAX(max_profit_potential) as max_profit
				FROM (
					SELECT
						DATE_TRUNC(
							CASE
								WHEN $1::text = '1h' THEN 'minute'
								WHEN $1::text = '4h' THEN 'hour'
								WHEN $1::text = '24h' THEN 'hour'
								WHEN $1::text = '7d' THEN 'hour'
							END,
							created_at
						) as period,
						COUNT(*) as active_opportunities,
						AVG(profit_potential) as avg_spread,
						MAX(profit_potential) as max_profit_potential
					FROM arbitrage_opportunities
					WHERE created_at >= CASE
						WHEN $1::text = '1h' THEN NOW() - INTERVAL '1 hour'
						WHEN $1::text = '4h' THEN NOW() - INTERVAL '4 hours'
						WHEN $1::text = '24h' THEN NOW() - INTERVAL '24 hours'
						WHEN $1::text = '7d' THEN NOW() - INTERVAL '7 days'
					END
					GROUP BY period
				) subq
			`,
				[timeframe],
			);

			// 5. Проверяем JOIN между time_intervals и opportunities_by_time
			const joinCheck = await client.query(
				`
				WITH time_intervals AS (
					SELECT
						generate_series(
							CASE
								WHEN $1::text = '1h' THEN NOW() - INTERVAL '1 hour'
								WHEN $1::text = '4h' THEN NOW() - INTERVAL '4 hours'
								WHEN $1::text = '24h' THEN NOW() - INTERVAL '24 hours'
								WHEN $1::text = '7d' THEN NOW() - INTERVAL '7 days'
							END,
							NOW(),
							CASE
								WHEN $1::text = '1h' THEN INTERVAL '5 minutes'
								WHEN $1::text = '4h' THEN INTERVAL '30 minutes'
								WHEN $1::text = '24h' THEN INTERVAL '2 hours'
								WHEN $1::text = '7d' THEN INTERVAL '6 hours'
							END
						) as timestamp
				),
				opportunities_by_time AS (
					SELECT
						DATE_TRUNC(
							CASE
								WHEN $1::text = '1h' THEN 'minute'
								WHEN $1::text = '4h' THEN 'hour'
								WHEN $1::text = '24h' THEN 'hour'
								WHEN $1::text = '7d' THEN 'hour'
							END,
							created_at
						) as period,
						COUNT(*) as active_opportunities,
						AVG(profit_potential) as avg_spread,
						MAX(profit_potential) as max_profit_potential
					FROM arbitrage_opportunities
					WHERE created_at >= CASE
						WHEN $1::text = '1h' THEN NOW() - INTERVAL '1 hour'
						WHEN $1::text = '4h' THEN NOW() - INTERVAL '4 hours'
						WHEN $1::text = '24h' THEN NOW() - INTERVAL '24 hours'
						WHEN $1::text = '7d' THEN NOW() - INTERVAL '7 days'
					END
					GROUP BY period
				)
				SELECT
					COUNT(ti.timestamp) as total_intervals,
					COUNT(obt.period) as matched_periods,
					COUNT(ti.timestamp) - COUNT(obt.period) as unmatched_intervals
				FROM time_intervals ti
				LEFT JOIN opportunities_by_time obt ON DATE_TRUNC(
					CASE
						WHEN $1::text = '1h' THEN 'minute'
						WHEN $1::text = '4h' THEN 'hour'
						WHEN $1::text = '24h' THEN 'hour'
						WHEN $1::text = '7d' THEN 'hour'
					END,
					ti.timestamp
				) = obt.period
			`,
				[timeframe],
			);

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
