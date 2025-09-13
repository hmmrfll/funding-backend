class NotificationRule {
	constructor(data) {
		this.id = data.id;
		this.userId = data.user_id || data.userId;
		this.type = data.type;
		this.symbol = data.symbol;
		this.threshold = parseFloat(data.threshold);
		this.enabled = data.enabled;
		this.cooldownMinutes = data.cooldown_minutes || data.cooldownMinutes || 5;
		this.createdAt = data.created_at || data.createdAt;
		this.updatedAt = data.updated_at || data.updatedAt;
	}

	toJSON() {
		return {
			id: this.id,
			userId: this.userId,
			type: this.type,
			symbol: this.symbol,
			threshold: this.threshold,
			enabled: this.enabled,
			cooldownMinutes: this.cooldownMinutes,
			createdAt: this.createdAt,
			updatedAt: this.updatedAt,
		};
	}

	static fromDatabase(dbRule) {
		if (!dbRule) return null;
		return new NotificationRule(dbRule);
	}
}

module.exports = NotificationRule;
