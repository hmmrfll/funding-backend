const { InvalidTimeframeError, DataProcessingError } = require('./error');

class DashboardService {
	constructor(dashboardStorage, logger) {
		this.dashboardStorage = dashboardStorage;
		this.logger = logger;
	}

	validateTimeframe(timeframe) {
		const validTimeframes = ['1h', '4h', '24h', '7d'];
		if (!validTimeframes.includes(timeframe)) {
			throw new InvalidTimeframeError(timeframe);
		}
	}

	async getMarketSummary() {
		try {
			const data = await this.dashboardStorage.getMarketSummary();

			const result = {
				totalVolume: parseFloat(data.total_volume) || 0,
				totalPairs: parseInt(data.total_pairs) || 0,
				avgSpread: parseFloat(data.avg_spread) || 0,
				topOpportunities: data.top_opportunities || [],
			};

			this.logger.info(
				`Market summary processed: ${result.totalPairs} pairs, ${result.topOpportunities.length} opportunities`,
			);

			return result;
		} catch (error) {
			this.logger.error('Error in getMarketSummary:', error);
			throw new DataProcessingError('getMarketSummary', error);
		}
	}

	async getMarketOverview(timeframe) {
		try {
			this.validateTimeframe(timeframe);

			const data = await this.dashboardStorage.getMarketOverview(timeframe);

			const result = data.map((row, index) => {
				const processedRow = {
					timestamp: row.timestamp,
					totalVolume: parseFloat(row.total_volume) || 0,
					activeOpportunities: parseInt(row.active_opportunities) || 0,
					avgSpread: parseFloat(row.avg_spread) || 0,
					maxProfitPotential: parseFloat(row.max_profit_potential) || 0,
				};

				if (
					isNaN(processedRow.totalVolume) ||
					isNaN(processedRow.activeOpportunities) ||
					isNaN(processedRow.avgSpread) ||
					isNaN(processedRow.maxProfitPotential)
				) {
					this.logger.warn(`Invalid data in row ${index}:`, {
						original: row,
						processed: processedRow,
					});
				}

				return processedRow;
			});

			this.logger.info(`Market overview processed: ${result.length} data points for ${timeframe}`);

			if (result.length === 0) {
				this.logger.warn(`No data points returned for timeframe: ${timeframe}`);
			}

			return result;
		} catch (error) {
			this.logger.error(`Error in getMarketOverview (${timeframe}):`, {
				message: error.message,
				stack: error.stack,
				timeframe: timeframe,
				errorType: error.constructor.name,
			});
			throw new DataProcessingError('getMarketOverview', error);
		}
	}

	async diagnoseMarketOverviewData(timeframe) {
		try {
			const diagnosis = await this.dashboardStorage.diagnoseMarketOverviewData(timeframe);

			const analysis = {
				timeframe: timeframe,
				timestamp: new Date().toISOString(),
				issues: [],
				recommendations: [],
			};

			if (diagnosis.opportunities.total_opportunities === 0) {
				analysis.issues.push('No arbitrage opportunities found in database');
				analysis.recommendations.push('Check if arbitrage data collection is working');
			} else if (diagnosis.opportunities.last_hour === 0) {
				analysis.issues.push('No recent arbitrage opportunities (last hour)');
				analysis.recommendations.push('Check arbitrage data collection frequency');
			}

			if (diagnosis.fundingRates.total_rates === 0) {
				analysis.issues.push('No funding rates found in database');
				analysis.recommendations.push('Check if funding rates collection is working');
			} else if (diagnosis.fundingRates.recent_rates === 0) {
				analysis.issues.push('No recent funding rates (last 2 hours)');
				analysis.recommendations.push('Check funding rates collection frequency');
			}

			if (diagnosis.timeIntervals.time_intervals_count === 0) {
				analysis.issues.push('No time intervals generated for timeframe');
				analysis.recommendations.push('Check timeframe parameter validation');
			}

			if (diagnosis.opportunitiesByTime.periods_with_data === 0) {
				analysis.issues.push('No data found for any time periods');
				analysis.recommendations.push('Check if arbitrage opportunities exist for the requested timeframe');
			}

			analysis.summary = {
				hasData: analysis.issues.length === 0,
				opportunitiesCount: diagnosis.opportunities.total_opportunities,
				fundingRatesCount: diagnosis.fundingRates.total_rates,
				timeIntervalsCount: diagnosis.timeIntervals.time_intervals_count,
				periodsWithData: diagnosis.opportunitiesByTime.periods_with_data,
			};

			return {
				diagnosis,
				analysis,
			};
		} catch (error) {
			this.logger.error(`Error in diagnoseMarketOverviewData:`, error);
			throw new DataProcessingError('diagnoseMarketOverviewData', error);
		}
	}
}

module.exports = DashboardService;
