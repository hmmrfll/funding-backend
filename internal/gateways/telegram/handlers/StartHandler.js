const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

class StartHandler {
	constructor(bot, config, logger, db, templateEngine) {
		this.bot = bot;
		this.config = config;
		this.logger = logger;
		this.db = db;
		this.templateEngine = templateEngine;
	}

	async handle(msg) {
		try {
			const chatId = msg.chat.id;
			const user = msg.from;
			const text = msg.text || '';
			const firstName = user.first_name || 'Пользователь';

			const startParam = this.extractStartParam(text);

			if (startParam && startParam.startsWith('web_auth_')) {
				await this.handleWebAuth(chatId, user, startParam);
				return;
			}

			await this.sendWelcomeMessage(chatId, firstName);

		} catch (error) {
			this.logger.error('Error handling /start command', error);

			try {
				await this.bot.sendMessage(msg.chat.id, 'Произошла ошибка. Попробуйте позже.');
			} catch (sendError) {
				this.logger.error('Error sending error message', sendError);
			}
		}
	}

	extractStartParam(text) {
		const match = text.match(/\/start\s+(.+)/);
		return match ? match[1] : null;
	}

	async handleWebAuth(chatId, user, startParam) {
		try {
			const sessionId = startParam.replace('web_auth_', '');

			const jwtPayload = {
				userId: user.id,
				firstName: user.first_name || '',
				lastName: user.last_name || '',
				username: user.username || '',
				languageCode: user.language_code || '',
				photoUrl: user.photo_url || ''
			};

			const jwtToken = jwt.sign(jwtPayload, this.config.jwtSecret, {
				expiresIn: '1h'
			});

			const client = this.db.getClient();
			try {
				await client.connect();
				await client.query(`
					INSERT INTO web_auth_sessions (
						id,
						telegram_user_id,
						jwt_token,
						expires_at,
						created_at
					) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
				`, [
					sessionId,
					user.id,
					jwtToken,
					new Date(Date.now() + 60 * 60 * 1000)
				]);

				this.logger.info(`Web auth session created for user ${user.id}`);
			} finally {
				await client.end();
			}

			const message = this.templateEngine.render('web_auth', {
				userName: user.first_name || 'Пользователь',
			});

			const keyboard = {
				inline_keyboard: [
					[
						{
							text: 'Открыть приложение в браузере',
							url: `${this.config.webAppUrl}/auth/${sessionId}?token=${jwtToken}`
						},
					],
				],
			};

			await this.bot.sendMessage(chatId, message, {
				reply_markup: keyboard,
				parse_mode: 'Markdown',
			});

		} catch (error) {
			this.logger.error('Error handling web auth', error);
			throw error;
		}
	}

	async sendWelcomeMessage(chatId, firstName) {
		const welcomeMessage = this.templateEngine.render('welcome', {
			userName: firstName,
		});

		const keyboard = {
			inline_keyboard: [
				[
					{
						text: 'Открыть приложение',
						web_app: {
							url: this.config.miniAppUrl,
						},
					},
				],
			],
		};

		await this.bot.sendMessage(chatId, welcomeMessage, {
			reply_markup: keyboard,
			parse_mode: 'Markdown',
		});

		this.logger.info(`Start command handled for user ${chatId} (${firstName})`);
	}
}

module.exports = StartHandler;
