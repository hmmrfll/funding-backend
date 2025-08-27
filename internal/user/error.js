class AppError extends Error {
    constructor(message, code, statusCode = 400, details = null) {
        super(message);
        this.name = 'AppError';
        this.code = code;
        this.statusCode = statusCode;
        this.details = details;
    }
}

class UserErrors {
    static userNotFound() {
        return new AppError('User not found', 'USER_NOT_FOUND', 404);
    }

    static userIdRequired() {
        return new AppError('User ID is required', 'USER_ID_REQUIRED', 400);
    }

    static telegramIdRequired() {
        return new AppError('Telegram ID is required', 'TELEGRAM_ID_REQUIRED', 400);
    }

    static invalidTelegramId() {
        return new AppError('Invalid telegram ID', 'INVALID_TELEGRAM_ID', 400);
    }

    static invalidAvatarUrl() {
        return new AppError('Invalid avatar URL format', 'INVALID_AVATAR_URL', 400);
    }

    static authenticationFailed() {
        return new AppError('Authentication failed', 'AUTHENTICATION_FAILED', 401);
    }
}

class DatabaseErrors {
    static connectionFailed(originalError) {
        return new AppError('Database connection failed', 'DB_CONNECTION_FAILED', 500, { originalError });
    }

    static queryFailed(originalError) {
        return new AppError('Database query failed', 'DB_QUERY_FAILED', 500, { originalError });
    }
}

class ValidationErrors {
    static required(fieldName) {
        return new AppError(`${fieldName} is required`, 'FIELD_REQUIRED', 400, { field: fieldName });
    }

    static invalid(fieldName) {
        return new AppError(`Invalid ${fieldName}`, 'FIELD_INVALID', 400, { field: fieldName });
    }
}

module.exports = {
    AppError,
    UserErrors,
    DatabaseErrors,
    ValidationErrors,
};
