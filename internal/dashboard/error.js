class DashboardError extends Error {
	constructor(message, code, statusCode = 500, details = {}) {
		super(message);
		this.name = 'DashboardError';
		this.code = code;
		this.statusCode = statusCode;
		this.details = details;
	}
}

class DataNotFoundError extends DashboardError {
	constructor(resource, identifier) {
		super(`${resource} not found`, 'DATA_NOT_FOUND', 404, { resource, identifier });
		this.name = 'DataNotFoundError';
	}
}

class InvalidTimeframeError extends DashboardError {
	constructor(timeframe) {
		super(`Invalid timeframe: ${timeframe}`, 'INVALID_TIMEFRAME', 400, { timeframe });
		this.name = 'InvalidTimeframeError';
	}
}

class DatabaseQueryError extends DashboardError {
	constructor(query, originalError) {
		super(`Database query failed: ${originalError.message}`, 'DATABASE_QUERY_ERROR', 500, {
			query,
			originalError: originalError.message,
		});
		this.name = 'DatabaseQueryError';
	}
}

class DataProcessingError extends DashboardError {
	constructor(operation, originalError) {
		super(`Data processing failed for ${operation}: ${originalError.message}`, 'DATA_PROCESSING_ERROR', 500, {
			operation,
			originalError: originalError.message,
		});
		this.name = 'DataProcessingError';
	}
}

module.exports = {
	DashboardError,
	DataNotFoundError,
	InvalidTimeframeError,
	DatabaseQueryError,
	DataProcessingError,
};
