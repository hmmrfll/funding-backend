const fs = require('fs');
const path = require('path');
const User = require('./model');
const { DatabaseErrors } = require('./error');

class UserStorage {
    constructor(db, logger) {
        this.db = db;
        this.logger = logger;
        this.queries = this.loadQueries();
    }

    loadQueries() {
        const queriesPath = path.join(__dirname, 'queries');
        const queries = {};

        try {
            const files = fs.readdirSync(queriesPath);
            files.forEach((file) => {
                if (file.endsWith('.sql')) {
                    const queryName = file.replace('.sql', '');
                    queries[queryName] = fs.readFileSync(path.join(queriesPath, file), 'utf8');
                }
            });
            this.logger.debug('Loaded user queries:', Object.keys(queries));
        } catch (error) {
            this.logger.error('Error loading user queries', error);
        }

        return queries;
    }

    async getUserById(id) {
        const client = this.db.getClient();
        try {
            await client.connect();
            const result = await client.query(this.queries.getUserById, [id]);
            return User.fromDatabase(result.rows[0]);
        } catch (error) {
            this.logger.error('Database error getting user by id', error);
            throw DatabaseErrors.queryFailed(error);
        } finally {
            await client.end();
        }
    }

    async getUserByTelegramId(telegramId) {
        const client = this.db.getClient();
        try {
            await client.connect();
            const result = await client.query(this.queries.getUserByTelegramId, [telegramId]);
            return User.fromDatabase(result.rows[0]);
        } catch (error) {
            this.logger.error('Database error getting user by telegram id', error);
            throw DatabaseErrors.queryFailed(error);
        } finally {
            await client.end();
        }
    }

    async createUser(userData) {
        const client = this.db.getClient();
        try {
            await client.connect();

            const result = await client.query(this.queries.createUser, [
                userData.id,
                userData.telegramId,
                userData.name || null,
                userData.avatarUrl || null
            ]);

            return User.fromDatabase(result.rows[0]);

        } catch (error) {
            this.logger.error('Database error creating user', error);
            throw DatabaseErrors.queryFailed(error);
        } finally {
            await client.end();
        }
    }

    async updateUser(id, userData) {
        const client = this.db.getClient();
        try {
            await client.connect();

            const result = await client.query(this.queries.updateUser, [
                id,
                userData.name,
                userData.avatarUrl,
                userData.extendedApiKey,
                userData.extendedApiSecret,
                userData.hyperliquidApiKey,
                userData.hyperliquidApiSecret
            ]);

            if (result.rows.length === 0) {
                return null;
            }

            return User.fromDatabase(result.rows[0]);
        } catch (error) {
            this.logger.error('Database error updating user', error);
            throw DatabaseErrors.queryFailed(error);
        } finally {
            await client.end();
        }
    }
}

module.exports = UserStorage;
