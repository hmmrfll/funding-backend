const { AppError } = require('../../user/error');

class ArbitrageRestService {
	constructor(arbitrageService, authMiddleware, logger) {
		this.arbitrageService = arbitrageService;
		this.authMiddleware = authMiddleware;
		this.logger = logger;
	}

	async getFundingRatesComparison(req, res) {
		try {
			const data = await this.arbitrageService.getFundingRatesComparison();
			res.json(data);
		} catch (error) {
			this.logger.error('Error in getFundingRatesComparison REST:', error);
			this.handleError(res, error);
		}
	}

	async getPairDetails(req, res) {
		try {
			const { symbol } = req.params;
			const { days } = req.query;

			if (!symbol) {
				throw new AppError('Symbol parameter is required', 'SYMBOL_REQUIRED', 400);
			}

			const data = await this.arbitrageService.getPairDetails(symbol.toUpperCase());
			res.json(data);
		} catch (error) {
			this.logger.error(`Error in getPairDetails REST for ${req.params.symbol}:`, error);
			this.handleError(res, error);
		}
	}

	async getArbitrageOpportunities(req, res) {
		try {
			const { limit = 10, offset = 0, min_profit = 0.0001 } = req.query;

			const limitNum = parseInt(limit);
			const offsetNum = parseInt(offset);

			const data = await this.arbitrageService.getFundingRatesComparison();
			const allOpportunities = data.opportunities
				.filter((opp) => opp.absRateDifference >= parseFloat(min_profit))
				.sort((a, b) => b.absRateDifference - a.absRateDifference);

			const totalCount = allOpportunities.length;
			const opportunities = allOpportunities.slice(offsetNum, offsetNum + limitNum);
			const hasMore = offsetNum + limitNum < totalCount;

			res.json({
				opportunities,
				pagination: {
					offset: offsetNum,
					limit: limitNum,
					total: totalCount,
					hasMore,
					nextOffset: hasMore ? offsetNum + limitNum : null,
				},
				timestamp: data.timestamp,
			});
		} catch (error) {
			this.logger.error('Error in getArbitrageOpportunities REST:', error);
			this.handleError(res, error);
		}
	}

	handleError(res, error) {
		if (error instanceof AppError) {
			const response = {
				error: error.message,
				code: error.code,
			};

			if (error.details) {
				Object.assign(response, error.details);
			}

			return res.status(error.statusCode).json(response);
		}

		this.logger.error('Unexpected system error:', {
			message: error.message,
			stack: error.stack,
			name: error.name,
		});

		res.status(500).json({
			error: 'Internal server error',
			code: 'INTERNAL_ERROR',
		});
	}

	getRoutes() {
		const auth = this.authMiddleware.validateAuth();

		return [
			{
				method: 'GET',
				path: '/arbitrage/funding-rates',
				handler: this.getFundingRatesComparison.bind(this),
				middleware: auth,
			},
			{
				method: 'GET',
				path: '/arbitrage/pair/:symbol',
				handler: this.getPairDetails.bind(this),
				middleware: auth,
			},
			{
				method: 'GET',
				path: '/arbitrage/opportunities',
				handler: this.getArbitrageOpportunities.bind(this),
				middleware: auth,
			},
		];
	}
}

module.exports = ArbitrageRestService;
