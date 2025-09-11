const { AppError } = require('../../user/error');

class DashboardRestService {
	constructor(dashboardService, authMiddleware, logger) {
		this.dashboardService = dashboardService;
		this.authMiddleware = authMiddleware;
		this.logger = logger;
	}

	async getMarketSummary(req, res) {
		try {
			const { timeframe = '24h' } = req.query;

			const data = await this.dashboardService.getMarketSummary(timeframe);

			res.json(data);
		} catch (error) {
			this.logger.error('Error in getMarketSummary REST:', {
				message: error.message,
				stack: error.stack,
				timeframe: req.query.timeframe,
				errorType: error.constructor.name,
				requestId: req.id || 'unknown',
			});
			this.handleError(res, error);
		}
	}

	async getMarketOverview(req, res) {
		try {
			const { timeframe = '24h' } = req.query;

			const data = await this.dashboardService.getMarketOverview(timeframe);

			res.json(data);
		} catch (error) {
			this.logger.error('Error in getMarketOverview REST:', {
				message: error.message,
				stack: error.stack,
				timeframe: req.query.timeframe,
				errorType: error.constructor.name,
				requestId: req.id || 'unknown',
			});
			this.handleError(res, error);
		}
	}

	async getFundingComparison(req, res) {
		try {
			const { limit = 10 } = req.query;
			const data = await this.dashboardService.getFundingComparison(parseInt(limit));
			res.json(data);
		} catch (error) {
			this.logger.error('Error in getFundingComparison REST:', error);
			this.handleError(res, error);
		}
	}

	async getActivityByTime(req, res) {
		try {
			const { timeframe = '24h' } = req.query;

			const data = await this.dashboardService.getActivityByTime(timeframe);

			res.json(data);
		} catch (error) {
			this.logger.error('Error in getActivityByTime REST:', {
				message: error.message,
				stack: error.stack,
				timeframe: req.query.timeframe,
				errorType: error.constructor.name,
				requestId: req.id || 'unknown',
			});
			this.handleError(res, error);
		}
	}

	async getProfitabilityByTime(req, res) {
		try {
			const { timeframe = '24h' } = req.query;

			const data = await this.dashboardService.getProfitabilityByTime(timeframe);

			res.json(data);
		} catch (error) {
			this.logger.error('Error in getProfitabilityByTime REST:', {
				message: error.message,
				stack: error.stack,
				timeframe: req.query.timeframe,
				errorType: error.constructor.name,
				requestId: req.id || 'unknown',
			});
			this.handleError(res, error);
		}
	}

	async diagnoseMarketOverview(req, res) {
		try {
			const { timeframe = '24h' } = req.query;

			const diagnosis = await this.dashboardService.diagnoseMarketOverviewData(timeframe);

			res.json(diagnosis);
		} catch (error) {
			this.logger.error('Error in diagnoseMarketOverview REST:', {
				message: error.message,
				stack: error.stack,
				timeframe: req.query.timeframe,
				errorType: error.constructor.name,
				requestId: req.id || 'unknown',
			});
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
				path: '/charts/market-summary',
				handler: this.getMarketSummary.bind(this),
				middleware: auth,
			},
			{
				method: 'GET',
				path: '/charts/market-overview',
				handler: this.getMarketOverview.bind(this),
				middleware: auth,
			},
			{
				method: 'GET',
				path: '/charts/activity-by-time',
				handler: this.getActivityByTime.bind(this),
				middleware: auth,
			},
			{
				method: 'GET',
				path: '/charts/profitability-by-time',
				handler: this.getProfitabilityByTime.bind(this),
				middleware: auth,
			},
			{
				method: 'GET',
				path: '/charts/funding-comparison',
				handler: this.getFundingComparison.bind(this),
				middleware: auth,
			},
			{
				method: 'GET',
				path: '/charts/market-overview/diagnose',
				handler: this.diagnoseMarketOverview.bind(this),
				middleware: auth,
			},
		];
	}
}

module.exports = DashboardRestService;
