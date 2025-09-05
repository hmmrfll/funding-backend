const axios = require('axios');

class ExtendedAPI {
	constructor(logger) {
		this.logger = logger;
		this.baseURL = 'https://api.starknet.extended.exchange';
		this.client = axios.create({
			baseURL: this.baseURL,
			headers: {
				'Content-Type': 'application/json',
				'User-Agent': 'FundingArbitrageBot/1.0.0',
			},
			timeout: 15000,
		});

		this.supportedMarkets = null;

		this.setupInterceptors();
	}

	setupInterceptors() {
		this.client.interceptors.request.use(
			(config) => config,
			(error) => {
				this.logger.error('Extended API Request Error:', error);
				return Promise.reject(error);
			},
		);

		this.client.interceptors.response.use(
			(response) => response,
			(error) => {
				this.logger.error('Extended API Response Error:', error.response?.data || error.message);
				return Promise.reject(error);
			},
		);
	}

	async getFundingRates() {
		try {
			const marketsData = await this.getAllMarketsInfo();
			if (marketsData.length > 0) {
				return marketsData;
			}

			return await this.getFallbackFundingRates();
		} catch (error) {
			this.logger.error('Error fetching Extended funding rates:', error);
			return [];
		}
	}

	async getAllMarketsInfo() {
		try {
			const response = await this.client.get('/api/v1/info/markets');

			if (response.data && response.data.status === 'OK' && response.data.data) {
				const markets = response.data.data;
				const fundingData = [];

				markets.forEach((market) => {
					try {
						const stats = market.marketStats || {};
						const symbol = this.normalizeSymbol(market.name);

						if (!stats.fundingRate && stats.fundingRate !== 0) {
							return;
						}

						const fundingRate = this.parseNumeric(stats.fundingRate);

						if (fundingRate === null) {
							return;
						}

						fundingData.push({
							symbol: symbol,
							fundingRate: fundingRate,
							markPrice: this.parseNumeric(stats.markPrice),
							nextFundingTime: stats.nextFundingRate ? new Date(stats.nextFundingRate) : null,
							market: market.name,
						});
					} catch (error) {
						this.logger.error(`Extended: Error processing market ${market.name}:`, error);
					}
				});

				return fundingData;
			}

			return [];
		} catch (error) {
			this.logger.error('Error fetching Extended markets info:', error);
			throw error;
		}
	}

	async getFallbackFundingRates() {
		try {
			const marketsResponse = await this.client.get('/api/v1/info/markets');

			if (!marketsResponse.data || !marketsResponse.data.data) {
				return [];
			}

			const markets = marketsResponse.data.data.map((m) => m.name);
			const endTime = Date.now();
			const startTime = endTime - 60 * 60 * 1000;

			const promises = markets.map((market) => this.getMarketFundingRate(market, startTime, endTime));

			const results = await Promise.allSettled(promises);

			const fundingData = results
				.filter((result) => result.status === 'fulfilled' && result.value)
				.map((result) => result.value)
				.filter((data) => data && data.fundingRate !== null);

			return fundingData;
		} catch (error) {
			this.logger.error('Error in Extended fallback funding rates fetch:', error);
			return [];
		}
	}

	async getMarketFundingRate(market, startTime, endTime) {
		try {
			const response = await this.client.get(`/api/v1/info/${market}/funding`, {
				params: {
					startTime: startTime,
					endTime: endTime,
				},
			});

			if (response.data && response.data.status === 'OK' && response.data.data && response.data.data.length > 0) {
				const latestFunding = response.data.data[0];

				const fundingRate = this.parseNumeric(latestFunding.f);
				if (fundingRate === null) {
					return null;
				}

				return {
					symbol: this.normalizeSymbol(market),
					fundingRate: fundingRate,
					markPrice: null,
					nextFundingTime: null,
					market: market,
					timestamp: latestFunding.T,
				};
			}

			return null;
		} catch (error) {
			return null;
		}
	}

	normalizeSymbol(market) {
		if (!market) return null;
		return market.split('-')[0].toUpperCase();
	}

	parseNumeric(value) {
		if (value === null || value === undefined || value === '') return null;
		const parsed = parseFloat(value);
		if (isNaN(parsed)) {
			return null;
		}
		return parsed;
	}

	async getMarketData() {
		try {
			const response = await this.client.get('/api/v1/info/markets');
			return response.data;
		} catch (error) {
			this.logger.error('Error fetching Extended market data:', error);
			throw error;
		}
	}

	async getSymbolFundingRate(symbol) {
		const market = `${symbol}-USD`;
		const endTime = Date.now();
		const startTime = endTime - 60 * 60 * 1000;

		return await this.getMarketFundingRate(market, startTime, endTime);
	}

	async getFundingRateHistory(symbol, startTime, endTime) {
		const market = `${symbol}-USD`;

		try {
			const response = await this.client.get(`/api/v1/info/${market}/funding`, {
				params: {
					startTime: startTime.getTime ? startTime.getTime() : startTime,
					endTime: endTime.getTime ? endTime.getTime() : endTime,
				},
			});

			if (response.data && response.data.status === 'OK') {
				return response.data.data.map((item) => ({
					symbol: symbol,
					fundingRate: this.parseNumeric(item.f),
					timestamp: new Date(item.T),
					market: market,
				}));
			}

			return [];
		} catch (error) {
			this.logger.error(`Error fetching Extended funding rate history for ${symbol}:`, error);
			throw error;
		}
	}
}

module.exports = ExtendedAPI;
