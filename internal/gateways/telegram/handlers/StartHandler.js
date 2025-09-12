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
			const firstName = user.first_name || 'User';

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

	async sendWelcomeMessage(chatId, firstName) {
		const welcomeMessage = this.templateEngine.render('welcome', {
			userName: firstName,
		});

		const keyboard = {
			inline_keyboard: [
				[
					{
						text: 'Open app',
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
