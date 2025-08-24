const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const config = {
	app: {
		port: process.env.BACKEND_LOCAL_PORT,
		env: process.env.NODE_ENV,
		frontendUrl: process.env.FRONTEND_URL,
	},

	database: {
		username: process.env.PG_USER,
		password: process.env.PG_PASSWORD,
		host: process.env.PG_HOST,
		database: process.env.PG_DATABASE,
		port: 5432,
		dialect: 'postgres',
		logging: process.env.NODE_ENV === 'development' ? console.log : false,
		pool: {
			max: 10,
			min: 0,
			acquire: 30000,
			idle: 10000,
		},
	},

	server: {
		port: 3001,
		host: '0.0.0.0',
	},

	telegram: {
		botToken: process.env.BOT_TOKEN,
		miniAppUrl: process.env.MINI_APP_URL,
		webhookUrl: process.env.SERVER_URL ? `${process.env.SERVER_URL}/webhook/telegram` : null,
	},

	jwt: {
		secret: process.env.JWT_SECRET,
		refreshSecret: process.env.JWT_REFRESH_SECRET,
		accessTokenExpiry: '15m',
		refreshTokenExpiry: '7d',
	},

	cors: {
		origin: process.env.FRONTEND_URL,
		methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
		allowedHeaders: ['Content-Type', 'Authorization'],
	},

	validate() {
		const errors = [];

		if (!this.telegram.botToken) {
			errors.push('BOT_TOKEN is required');
		}

		if (!this.telegram.miniAppUrl) {
			errors.push('MINI_APP_URL is required');
		}

		if (!this.database.username) {
			errors.push('PG_USER is required');
		}

		if (!this.database.database) {
			errors.push('PG_DATABASE is required');
		}

		if (errors.length > 0) {
			throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
		}

		return true;
	},
};

// Sequelize CLI конфигурация
module.exports = config;

module.exports.development = {
	username: process.env.PG_USER,
	password: process.env.PG_PASSWORD,
	database: process.env.PG_DATABASE,
	host: process.env.PG_HOST,
	port: parseInt(process.env.PG_PORT),
	dialect: 'postgres',
	logging: false,
	pool: {
		max: 5,
		min: 0,
		acquire: 30000,
		idle: 10000,
	},
};

module.exports.test = {
	username: process.env.PG_USER,
	password: process.env.PG_PASSWORD,
	database: process.env.PG_DATABASE_TEST,
	host: process.env.PG_HOST,
	port: 5432,
	dialect: 'postgres',
	logging: false,
};

module.exports.production = {
	username: process.env.PG_USER,
	password: process.env.PG_PASSWORD,
	database: process.env.PG_DATABASE,
	host: process.env.PG_HOST,
	port: 5432,
	dialect: 'postgres',
	logging: false,
	ssl: process.env.NODE_ENV === 'production',
	pool: {
		max: 10,
		min: 0,
		acquire: 30000,
		idle: 10000,
	},
};
