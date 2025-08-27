class AuthRestService {
	constructor(databaseManager, logger) {
		this.db = databaseManager;
		this.logger = logger;
	}

	getRoutes() {
		return [
			{
				method: 'GET',
				path: '/auth/:sessionId',
				handler: this.handleWebAuth.bind(this),
			},
		];
	}

	async handleWebAuth(req, res) {
		try {
			const { sessionId } = req.params;
			const { token } = req.query;

			if (!sessionId || !token) {
				return res.status(400).json({ error: 'Missing sessionId or token' });
			}

			// Проверяем сессию в БД
			const client = this.db.getClient();
			try {
				await client.connect();
				const result = await client.query(
					`
						SELECT * FROM web_auth_sessions
						WHERE id = $1 AND jwt_token = $2 AND expires_at > CURRENT_TIMESTAMP AND used = false
					`,
					[sessionId, token],
				);

				if (result.rows.length === 0) {
					return res.status(401).json({ error: 'Invalid or expired session' });
				}

				// Помечаем сессию как использованную
				await client.query(
					`
						UPDATE web_auth_sessions
						SET used = true
						WHERE id = $1
					`,
					[sessionId],
				);

				// Редиректим на фронтенд с токеном в localStorage
				const html = `
					<!DOCTYPE html>
					<html>
					<head>
						<title>Authorization</title>
					</head>
					<body>
						<script>
							localStorage.setItem('auth_token', '${token}');
							window.location.href = '/';
						</script>
					</body>
					</html>
				`;

				res.send(html);
				this.logger.info(`Web auth completed for session ${sessionId}`);
			} finally {
				await client.end();
			}
		} catch (error) {
			this.logger.error('Error processing web auth', error);
			res.status(500).json({ error: 'Internal server error' });
		}
	}
}

module.exports = AuthRestService;
