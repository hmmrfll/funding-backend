const ExtendedAPI = require('../gateways/extended/api');
const HyperliquidAPI = require('../gateways/hyperliquid/api');

class ArbitrageService {
	constructor(storage, logger) {
		this.storage = storage;
		this.logger = logger;
		this.extendedAPI = new ExtendedAPI(logger);
		this.hyperliquidAPI = new HyperliquidAPI(logger);

		this.supportedPairs = null;
	}

	async getFundingRatesComparison() {
		try {
			const extendedEnabled = true;

			const promises = [
				extendedEnabled ? this.extendedAPI.getFundingRates() : Promise.resolve([]),
				this.hyperliquidAPI.getFundingRates(),
			];

			const [extendedRates, hyperliquidRates] = await Promise.allSettled(promises);

			if (extendedRates.status === 'rejected') {
				this.logger.error('Extended API failed:', extendedRates.reason);
			}

			if (hyperliquidRates.status === 'rejected') {
				this.logger.error('Hyperliquid API failed:', hyperliquidRates.reason);
			}

			const extendedData = extendedRates.status === 'fulfilled' ? extendedRates.value : [];
			const hyperliquidData = hyperliquidRates.status === 'fulfilled' ? hyperliquidRates.value : [];

			const comparison = this.createComparisonTable(extendedData, hyperliquidData);

			if (extendedData.length > 0) {
				await this.saveFundingRates(extendedData, 'extended');
			}
			if (hyperliquidData.length > 0) {
				await this.saveFundingRates(hyperliquidData, 'hyperliquid');
			}

			const opportunities = this.findArbitrageOpportunities(comparison);

			if (opportunities.length > 0) {
				await this.saveArbitrageOpportunities(opportunities);
			}

			return {
				comparison,
				opportunities,
				timestamp: new Date().toISOString(),
			};
		} catch (error) {
			this.logger.error('Error in getFundingRatesComparison:', error);
			throw error;
		}
	}

	createComparisonTable(extendedData, hyperliquidData) {
		const comparison = {};

		const extendedMap = new Map();
		const hyperliquidMap = new Map();

		extendedData.forEach((item) => {
			if (item.symbol) {
				extendedMap.set(item.symbol, item);
			}
		});

		hyperliquidData.forEach((item) => {
			if (item.symbol) {
				hyperliquidMap.set(item.symbol, item);
			}
		});

		const allSymbols = new Set([...extendedMap.keys(), ...hyperliquidMap.keys()]);

		allSymbols.forEach((symbol) => {
			const extendedRate = extendedMap.get(symbol);
			const hyperliquidRate = hyperliquidMap.get(symbol);

			if (extendedRate || hyperliquidRate) {
				comparison[symbol] = {
					symbol: symbol,
					extended: {
						fundingRate: extendedRate?.fundingRate || null,
						markPrice: extendedRate?.markPrice || null,
						nextFundingTime: extendedRate?.nextFundingTime || null,
					},
					hyperliquid: {
						fundingRate: hyperliquidRate?.fundingRate || null,
						markPrice: hyperliquidRate?.markPrice || null,
						openInterest: hyperliquidRate?.openInterest || null,
					},
					available: {
						extended: !!extendedRate,
						hyperliquid: !!hyperliquidRate,
						both: !!(extendedRate && hyperliquidRate),
					},
				};
			}
		});

		return comparison;
	}

	findArbitrageOpportunities(comparison) {
		const opportunities = [];

		Object.values(comparison).forEach((pair) => {
			if (!pair.available.both) return;

			const extendedRate = parseFloat(pair.extended.fundingRate || 0);
			const hyperliquidRate = parseFloat(pair.hyperliquid.fundingRate || 0);

			const rateDiff = extendedRate - hyperliquidRate;
			const absRateDiff = Math.abs(rateDiff);

			const minThreshold = 0.00001;

			if (absRateDiff > minThreshold) {
				const strategy = rateDiff > 0 ? 'SHORT Extended, LONG Hyperliquid' : 'LONG Extended, SHORT Hyperliquid';

				const hourlyProfit = absRateDiff / 8;
				const dailyProfit = hourlyProfit * 24;
				const annualizedProfit = dailyProfit * 365;

				opportunities.push({
					symbol: pair.symbol,
					extendedRate: extendedRate,
					hyperliquidRate: hyperliquidRate,
					rateDifference: rateDiff,
					absRateDifference: absRateDiff,
					strategy: strategy,
					potentialProfit: {
						hourly: hourlyProfit,
						daily: dailyProfit,
						annualized: annualizedProfit,
					},
					riskLevel: this.calculateRiskLevel(absRateDiff),
					created_at: new Date().toISOString(),
				});
			}
		});

		opportunities.sort((a, b) => b.absRateDifference - a.absRateDifference);

		return opportunities;
	}

	calculateRiskLevel(rateDifference) {
		if (rateDifference > 0.005) return 'high';
		if (rateDifference > 0.001) return 'medium';
		return 'low';
	}

	async saveFundingRates(rates, exchange) {
		if (!rates || rates.length === 0) return;

		try {
			await this.storage.saveFundingRates(rates, exchange);
		} catch (error) {
			this.logger.error(`Error saving funding rates for ${exchange}:`, error);
		}
	}

	async saveArbitrageOpportunities(opportunities) {
		if (!opportunities || opportunities.length === 0) return;

		try {
			for (const opportunity of opportunities) {
				await this.storage.saveArbitrageOpportunity(opportunity);
			}
		} catch (error) {
			this.logger.error(`Error saving arbitrage opportunities:`, error);
		}
	}

	async getPairHistory(symbol, hours = 24) {
		try {
			const endTime = new Date();
			const startTime = new Date(endTime.getTime() - hours * 60 * 60 * 1000);

			return await this.storage.getFundingRateHistory(symbol, startTime, endTime);
		} catch (error) {
			this.logger.error(`Error getting pair history for ${symbol}:`, error);
			throw error;
		}
	}

	async getPairDetails(symbol) {
		try {
			const comparison = await this.getFundingRatesComparison();
			const pairData = comparison.comparison[symbol];

			if (!pairData) {
				throw new Error(`Pair ${symbol} not found`);
			}

			const history = await this.getPairHistory(symbol);
			const stats = this.calculatePairStats(history);

			return {
				current: pairData,
				history: history,
				statistics: stats,
				opportunities: comparison.opportunities.filter((opp) => opp.symbol === symbol),
			};
		} catch (error) {
			this.logger.error(`Error getting pair details for ${symbol}:`, error);
			throw error;
		}
	}

	calculatePairStats(history) {
		if (!history || history.length === 0) {
			return {
				avgExtended: 0,
				avgHyperliquid: 0,
				maxSpread: 0,
				minSpread: 0,
				avgSpread: 0,
			};
		}

		const spreads = history.map((h) => {
			const extRate = parseFloat(h.extended_rate || 0);
			const hlRate = parseFloat(h.hyperliquid_rate || 0);
			return extRate - hlRate;
		});

		const extendedRates = history.map((h) => parseFloat(h.extended_rate || 0));
		const hyperliquidRates = history.map((h) => parseFloat(h.hyperliquid_rate || 0));

		return {
			avgExtended: extendedRates.reduce((a, b) => a + b, 0) / extendedRates.length,
			avgHyperliquid: hyperliquidRates.reduce((a, b) => a + b, 0) / hyperliquidRates.length,
			maxSpread: Math.max(...spreads),
			minSpread: Math.min(...spreads),
			avgSpread: spreads.reduce((a, b) => a + b, 0) / spreads.length,
		};
	}
}

module.exports = ArbitrageService;
