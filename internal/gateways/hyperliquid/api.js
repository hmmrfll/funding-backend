const axios = require('axios');

class HyperliquidAPI {
	constructor(logger) {
		this.logger = logger;
		this.baseURL = 'https://api.hyperliquid.xyz';
		this.client = axios.create({
			baseURL: this.baseURL,
			headers: {
				'Content-Type': 'application/json',
			},
			timeout: 10000,
		});

		this.setupInterceptors();
	}

	setupInterceptors() {
		this.client.interceptors.request.use(
			(config) => {
				this.logger.debug(`Hyperliquid API Request: ${config.method.toUpperCase()} ${config.url}`);
				return config;
			},
			(error) => {
				this.logger.error('Hyperliquid API Request Error:', error);
				return Promise.reject(error);
			},
		);

		this.client.interceptors.response.use(
			(response) => {
				this.logger.debug(`Hyperliquid API Response: ${response.status} for ${response.config.url}`);
				return response;
			},
			(error) => {
				this.logger.error('Hyperliquid API Response Error:', error.response?.data || error.message);
				return Promise.reject(error);
			},
		);
	}

	async getPerpsMetadata() {
		try {
			const response = await this.client.post('/info', {
				type: 'meta',
			});
			return response.data;
		} catch (error) {
			this.logger.error('Error fetching Hyperliquid perps metadata:', error);
			throw error;
		}
	}

	async getAllMids() {
		try {
			const response = await this.client.post('/info', {
				type: 'allMids',
			});
			return response.data;
		} catch (error) {
			this.logger.error('Error fetching Hyperliquid all mids:', error);
			throw error;
		}
	}

	async getFundingRates() {
		try {
			const response = await this.client.post('/info', {
				type: 'metaAndAssetCtxs',
			});

			if (response.data && response.data.length > 1) {
				const assetCtxs = response.data[1];
				return assetCtxs.map((ctx, index) => ({
					symbol: response.data[0].universe[index]?.name,
					fundingRate: ctx.funding,
					markPrice: ctx.markPx,
					openInterest: ctx.openInterest,
					nextFundingTime: null,
				}));
			}
			return [];
		} catch (error) {
			this.logger.error('Error fetching Hyperliquid funding rates:', error);
			throw error;
		}
	}

	async getFundingHistory(coin, startTime) {
		try {
			const response = await this.client.post('/info', {
				type: 'fundingHistory',
				coin: coin,
				startTime: startTime,
			});
			return response.data;
		} catch (error) {
			this.logger.error(`Error fetching Hyperliquid funding history for ${coin}:`, error);
			throw error;
		}
	}

	async getPredictedFunding(coin) {
		try {
			const response = await this.client.post('/info', {
				type: 'predictedFundings',
				coin: coin,
			});
			return response.data;
		} catch (error) {
			this.logger.error(`Error fetching Hyperliquid predicted funding for ${coin}:`, error);
			throw error;
		}
	}
}

module.exports = HyperliquidAPI;
