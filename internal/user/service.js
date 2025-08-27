const { UserErrors } = require('./error');

class UserService {
    constructor(storage, logger) {
        this.storage = storage;
        this.logger = logger;
    }

    async getUserById(id) {
        if (!id) {
            throw UserErrors.userIdRequired();
        }

        const user = await this.storage.getUserById(id);
        if (!user) {
            throw UserErrors.userNotFound();
        }

        return user.toJSON();
    }

    async getOrCreateUserByTelegramData(telegramData) {
        if (!telegramData || !telegramData.userId) {
            throw UserErrors.telegramIdRequired();
        }

        try {
            // Сначала ищем пользователя по telegram_id
            let user = await this.storage.getUserByTelegramId(telegramData.userId);

            if (user) {
                this.logger.debug(`Found existing user: ${telegramData.userId}`);
                return user.toJSON();
            }

            // Если пользователь не найден, создаем нового
            this.logger.info(`Creating new user for telegram_id: ${telegramData.userId}`);

            const userData = {
                id: telegramData.userId.toString(), // используем telegram_id как основной id
                telegramId: telegramData.userId,
                name: this.buildUserName(telegramData),
                avatarUrl: telegramData.photoUrl || null
            };

            user = await this.storage.createUser(userData);
            this.logger.info(`User created successfully: ${telegramData.userId}`);

            return user.toJSON();

        } catch (error) {
            if (error instanceof Error && error.code && error.code.startsWith('USER_')) {
                throw error;
            }
            this.logger.error('Unexpected error in getOrCreateUserByTelegramData:', error);
            throw error;
        }
    }

    buildUserName(telegramData) {
        const parts = [];

        if (telegramData.firstName) {
            parts.push(telegramData.firstName);
        }

        if (telegramData.lastName) {
            parts.push(telegramData.lastName);
        }

        if (parts.length === 0 && telegramData.username) {
            return `@${telegramData.username}`;
        }

        return parts.join(' ') || 'User';
    }

    async updateUser(id, userData) {
        try {
            if (!id) {
                throw UserErrors.userIdRequired();
            }

            const user = await this.storage.updateUser(id, userData);
            if (!user) {
                throw UserErrors.userNotFound();
            }

            this.logger.info(`User updated successfully: ${id}`);
            return user.toJSON();

        } catch (error) {
            if (error instanceof Error && error.code && error.code.startsWith('USER_')) {
                throw error;
            }
            this.logger.error('Unexpected error in updateUser service:', error);
            throw error;
        }
    }
}

module.exports = UserService;
