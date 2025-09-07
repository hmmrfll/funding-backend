const fs = require('fs');
const path = require('path');
const NotificationRule = require('./model');
const { DatabaseErrors } = require('../user/error');

class NotificationStorage {
	constructor(db, logger) {
		this.db = db;
		this.logger = logger;
		this.queries = this.loadQueries();
	}

	loadQueries() {
		const queriesPath = path.join(__dirname, 'queries');
		const queries = {};

		try {
			if (fs.existsSync(queriesPath)) {
				const files = fs.readdirSync(queriesPath);
				files.forEach((file) => {
					if (file.endsWith('.sql')) {
						const queryName = file.replace('.sql', '');
						queries[queryName] = fs.readFileSync(path.join(queriesPath, file), 'utf8');
					}
				});
			}
		} catch (error) {
			this.logger.error('Error loading notification queries', error);
		}

		return queries;
	}

	async createNotificationRule(userId, ruleData) {
		const client = this.db.getClient();

		try {
			await client.connect();

			const result = await client.query(this.queries.createNotificationRule, [
				userId,
				ruleData.type,
				ruleData.symbol || null,
				ruleData.threshold,
				ruleData.enabled !== undefined ? ruleData.enabled : true,
			]);

			return NotificationRule.fromDatabase(result.rows[0]);
		} catch (error) {
			this.logger.error('Error creating notification rule:', error);
			throw DatabaseErrors.queryFailed(error);
		} finally {
			await client.end();
		}
	}

	async getUserNotificationRules(userId) {
		const client = this.db.getClient();

		try {
			await client.connect();

			const result = await client.query(this.queries.getUserNotificationRules, [userId]);

			return result.rows.map((row) => NotificationRule.fromDatabase(row));
		} catch (error) {
			this.logger.error('Error getting user notification rules:', error);
			throw DatabaseErrors.queryFailed(error);
		} finally {
			await client.end();
		}
	}

	async updateNotificationRule(ruleId, userId, updates) {
		const client = this.db.getClient();

		try {
			await client.connect();

			const result = await client.query(this.queries.updateNotificationRule, [
				ruleId,
				updates.enabled,
				updates.threshold,
				userId,
			]);

			if (result.rows.length === 0) {
				return null;
			}

			return NotificationRule.fromDatabase(result.rows[0]);
		} catch (error) {
			this.logger.error('Error updating notification rule:', error);
			throw DatabaseErrors.queryFailed(error);
		} finally {
			await client.end();
		}
	}

	async deleteNotificationRule(ruleId, userId) {
		const client = this.db.getClient();

		try {
			await client.connect();

			const result = await client.query(this.queries.deleteNotificationRule, [ruleId, userId]);

			return result.rows.length > 0;
		} catch (error) {
			this.logger.error('Error deleting notification rule:', error);
			throw DatabaseErrors.queryFailed(error);
		} finally {
			await client.end();
		}
	}

	async getActiveNotificationRules() {
		const client = this.db.getClient();

		try {
			await client.connect();

			const result = await client.query(this.queries.getActiveRules);
			const rules = result.rows.map((row) => NotificationRule.fromDatabase(row));

			return rules;
		} catch (error) {
			this.logger.error('❌ Error getting active notification rules:', error);
			throw DatabaseErrors.queryFailed(error);
		} finally {
			await client.end();
		}
	}

	async logSentNotification(userId, ruleId, symbol, profitThreshold, actualProfit) {
		const client = this.db.getClient();

		try {
			await client.connect();

			const result = await client.query(this.queries.logSentNotification, [
				userId,
				ruleId,
				symbol,
				profitThreshold,
				actualProfit,
			]);

			return result.rows.length > 0;
		} catch (error) {
			this.logger.error('❌ Error logging sent notification:', error);
			throw DatabaseErrors.queryFailed(error);
		} finally {
			await client.end();
		}
	}

	async hasRecentNotification(userId, ruleId, symbol) {
		const client = this.db.getClient();

		try {
			await client.connect();

			const result = await client.query(this.queries.checkRecentNotification, [userId, ruleId, symbol]);

			return result.rows.length > 0;
		} catch (error) {
			this.logger.error('❌ Error checking recent notification:', error);
			throw DatabaseErrors.queryFailed(error);
		} finally {
			await client.end();
		}
	}
}

module.exports = NotificationStorage;
