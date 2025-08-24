const TelegramBot = require('node-telegram-bot-api');
const StartHandler = require('./handlers/StartHandler');
const TemplateEngine = require('./utils/templateEngine');
const path = require('path');

class TelegramService {
	constructor(telegramConfig, databaseManager, logger) {
		this.config = telegramConfig;
		this.logger = logger;
		this.bot = null;
		this.db = databaseManager;
		this.startHandler = null;
		this.templateEngine = new TemplateEngine(path.join(__dirname, 'templates'));
	}

	async init() {
		try {
			const useWebhook = this.config.webhookUrl;

			this.bot = new TelegramBot(this.config.botToken, {
				polling: !useWebhook,
			});

			if (useWebhook) {
				await this.bot.setWebHook(this.config.webhookUrl);
				this.logger.info(`Webhook set to: ${this.config.webhookUrl}`);
			} else {
				this.logger.info('Using long polling mode');
			}

			this.startHandler = new StartHandler(this.bot, this.config, this.logger, this.db, this.templateEngine);

			this.setupHandlers();
			this.logger.info('Telegram bot initialized successfully');
		} catch (error) {
			this.logger.error('Failed to initialize Telegram bot', error);
			throw error;
		}
	}

	setupHandlers() {
		this.bot.onText(/\/start/, (msg) => this.startHandler.handle(msg));

		this.bot.on('error', (error) => {
			this.logger.error('Telegram bot error', error);
		});
	}

	async sendTemplateMessage(recipients, templateName, data, options = {}) {
		if (!this.bot) {
			this.logger.error('Telegram bot not initialized');
			return;
		}

		try {
			const message = this.templateEngine.render(templateName, data);

			for (const recipient of recipients) {
				try {
					await this.bot.sendMessage(recipient.telegramId, message, {
						parse_mode: 'HTML',
						...options,
					});
					this.logger.info(`Template message sent to ${recipient.telegramId}`);
				} catch (error) {
					this.logger.error(`Failed to send template message to ${recipient.telegramId}`, error);
				}
			}
		} catch (error) {
			this.logger.error(`Error rendering template ${templateName}`, error);
		}
	}

	processUpdate(update) {
		if (this.bot) {
			this.bot.processUpdate(update);
		}
	}

	stop() {
		if (this.bot) {
			this.bot.stopPolling();
			this.logger.info('Telegram bot stopped');
		}
	}
}

module.exports = TelegramService;
