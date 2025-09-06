class NotificationError extends Error {
	constructor(message, code, statusCode = 500, details = {}) {
		super(message);
		this.name = 'NotificationError';
		this.code = code;
		this.statusCode = statusCode;
		this.details = details;
	}
}

class NotificationRuleNotFoundError extends NotificationError {
	constructor(ruleId) {
		super(`Notification rule not found`, 'RULE_NOT_FOUND', 404, { ruleId });
		this.name = 'NotificationRuleNotFoundError';
	}
}

class InvalidNotificationRuleError extends NotificationError {
	constructor(field, value) {
		super(`Invalid notification rule: ${field}`, 'INVALID_RULE', 400, { field, value });
		this.name = 'InvalidNotificationRuleError';
	}
}

module.exports = {
	NotificationError,
	NotificationRuleNotFoundError,
	InvalidNotificationRuleError,
};
