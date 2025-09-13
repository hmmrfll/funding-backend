'use strict';

module.exports = {
	async up(queryInterface, Sequelize) {
		console.log('Migration executed: 20241219120000-add-cooldown-minutes-to-notification-rules');

		await queryInterface.addColumn('user_notification_rules', 'cooldown_minutes', {
			type: Sequelize.INTEGER,
			allowNull: false,
			defaultValue: 5,
			comment: 'Интервал в минутах между повторными уведомлениями для одного символа и правила',
		});

		console.log('Successfully added cooldown_minutes column to user_notification_rules table');
	},

	async down(queryInterface, Sequelize) {
		console.log('Rolling back migration: 20241219120000-add-cooldown-minutes-to-notification-rules');

		await queryInterface.removeColumn('user_notification_rules', 'cooldown_minutes');

		console.log('Successfully removed cooldown_minutes column from user_notification_rules table');
	},
};
