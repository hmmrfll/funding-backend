const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');
const config = require('./config');
const Logger = require('../internal/shared/logger');
const TelegramService = require('../internal/gateways/telegram');
const DatabaseManager = require('./db');

const UserStorage = require('../internal/user/storage');
const UserService = require('../internal/user/service');
const UserRestService = require('../internal/resthttp/services/api_v1_user');
const AuthRestService = require('../internal/resthttp/services/api_v1_auth');

const AuthMiddleware = require('../internal/shared/middleware/auth');

const logger = new Logger();

async function startApplication() {
	try {
		config.validate();
		logger.info('Configuration validated successfully');

		const db = new DatabaseManager(config, logger);
		await db.init();

		const authMiddleware = new AuthMiddleware(config, logger);

		const userStorage = new UserStorage(db, logger);
		const userService = new UserService(userStorage, logger);
		const userRestService = new UserRestService(userService, authMiddleware, logger);
		const authRestService = new AuthRestService(db, logger);

		const telegramService = new TelegramService(config.telegram, db, logger);
		await telegramService.init();

		const app = express();

		app.set('trust proxy', 1);

		app.use(
			cors({
				origin: true,
				credentials: true,
				methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
				allowedHeaders: ['Content-Type', 'Authorization'],
				allowedHosts: ['priority.sesin.ru', 'api.priority.sesin.ru', 'localhost', '127.0.0.1'],
			}),
		);

		app.use(express.json());
		app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

		const limiter = rateLimit({
			windowMs: 15 * 60 * 1000,
			max: 1000,
		});
		app.use(limiter);

		app.get('/health', async (req, res) => {
			const dbStatus = await db.testConnection();
			res.json({
				status: dbStatus ? 'OK' : 'ERROR',
				database: dbStatus ? 'connected' : 'disconnected',
				timestamp: new Date().toISOString(),
			});
		});

		const allRoutes = [...userRestService.getRoutes(), ...authRestService.getRoutes()];

		allRoutes.forEach((route) => {
			if (route.middleware) {
				app[route.method.toLowerCase()](route.path, route.middleware, route.handler);
			} else {
				app[route.method.toLowerCase()](route.path, route.handler);
			}
		});

		app.post('/webhook/telegram', (req, res) => {
			telegramService.processUpdate(req.body);
			res.sendStatus(200);
		});

		const server = app.listen(config.server.port, config.server.host, () => {
			logger.info(`Server running on ${config.server.host}:${config.server.port}`);
		});

		process.on('SIGTERM', async () => {
			logger.info('SIGTERM received, shutting down gracefully');
			server.close(() => {
				telegramService.stop();
				process.exit(0);
			});
		});

		process.on('SIGINT', async () => {
			logger.info('SIGINT received, shutting down gracefully');
			server.close(() => {
				telegramService.stop();
				process.exit(0);
			});
		});
	} catch (error) {
		logger.error('Failed to start application', error);
		process.exit(1);
	}
}

startApplication();
