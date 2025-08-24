const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const { exec } = require('child_process');
const util = require('util');

class DatabaseManager {
	constructor(config, logger) {
		this.config = config.database;
		this.logger = logger || console;
		this.execAsync = util.promisify(exec);
	}

	async init() {
		try {
			await this.createDatabaseIfNotExists();
			await this.runInitialization();
			await this.runMigrations();
			this.logger.info('Database initialization completed successfully');
		} catch (error) {
			this.logger.error('Database initialization failed', error);
			throw error;
		}
	}

	async createDatabaseIfNotExists() {
		const adminClient = new Client({
			host: this.config.host,
			port: this.config.port,
			user: this.config.username,
			password: this.config.password,
			database: 'postgres',
		});

		try {
			await adminClient.connect();
			this.logger.info('Connected to PostgreSQL server');

			const dbExistsQuery = `SELECT 1 FROM pg_database WHERE datname = $1`;
			const result = await adminClient.query(dbExistsQuery, [this.config.database]);

			if (result.rows.length === 0) {
				this.logger.info(`Creating database: ${this.config.database}`);
				await adminClient.query(`CREATE DATABASE "${this.config.database}"`);
				this.logger.info(`Database ${this.config.database} created successfully`);
			} else {
				this.logger.info(`Database ${this.config.database} already exists`);
			}
		} catch (error) {
			this.logger.error('Error creating database', error);
			throw error;
		} finally {
			await adminClient.end();
		}
	}

	async runInitialization() {
		const client = new Client({
			host: this.config.host,
			port: this.config.port,
			user: this.config.username,
			password: this.config.password,
			database: this.config.database,
		});

		try {
			await client.connect();
			this.logger.info('Connected to application database');

			const hasTablesQuery = `
   			SELECT COUNT(*) as count
   			FROM information_schema.tables
   			WHERE table_schema = 'public'
   			AND table_type = 'BASE TABLE'
   		`;
			const result = await client.query(hasTablesQuery);
			const tablesCount = parseInt(result.rows[0].count);

			if (tablesCount === 0) {
				const initPath = path.join(__dirname, '../migrations/init.sql');

				if (fs.existsSync(initPath)) {
					const initSQL = fs.readFileSync(initPath, 'utf8');
					this.logger.info('Running database initialization (init.sql)...');
					await client.query(initSQL);
					this.logger.info('Database base schema initialization completed successfully');
				} else {
					this.logger.warn('No init.sql file found, skipping base schema creation');
				}
			} else {
				this.logger.info(`Found ${tablesCount} existing tables, skipping init.sql`);
			}

			await this.validateRequiredTables(client);
		} catch (error) {
			this.logger.error('Error running database initialization', error);
			throw error;
		} finally {
			await client.end();
		}
	}

	async validateRequiredTables(client) {
		const requiredTables = [];

		for (const table of requiredTables) {
			const checkQuery = `
   			SELECT EXISTS (
   				SELECT FROM information_schema.tables
   				WHERE table_schema = 'public'
   				AND table_name = $1
   			)
   		`;

			const result = await client.query(checkQuery, [table]);

			if (!result.rows[0].exists) {
				throw new Error(`Required table '${table}' does not exist. Please check init.sql`);
			}
		}

		this.logger.info('All required tables exist');
	}

	async runMigrations() {
		try {
			const migrationsPath = path.join(__dirname, '../migrations');

			if (!fs.existsSync(migrationsPath)) {
				this.logger.info('Migrations directory not found, skipping migrations');
				return;
			}

			const migrationFiles = fs
				.readdirSync(migrationsPath)
				.filter((file) => file.endsWith('.js') && !file.includes('init'));

			if (migrationFiles.length === 0) {
				this.logger.info('No Sequelize migrations found, skipping migration step');
				return;
			}

			this.logger.info('Running Sequelize migrations...');

			const sequelizercPath = path.join(__dirname, '../.sequelizerc');
			if (!fs.existsSync(sequelizercPath)) {
				this.logger.warn('.sequelizerc file not found, migrations may fail');
			}

			const { stdout, stderr } = await this.execAsync('npx sequelize-cli db:migrate', {
				env: {
					...process.env,
					NODE_ENV: process.env.NODE_ENV || 'development',
				},
				cwd: path.join(__dirname, '..'),
			});

			if (stderr && !stderr.includes('Loaded configuration file') && !stderr.includes('Executing')) {
				this.logger.warn('Migration warnings:', stderr);
			}

			if (stdout) {
				this.logger.info('Migration output:', stdout);
			}

			this.logger.info('Sequelize migrations completed successfully');
		} catch (error) {
			if (
				error.message.includes('No migrations were executed') ||
				error.message.includes('database schema was already up to date')
			) {
				this.logger.info('No new migrations to run');
				return;
			}

			if (error.message.includes('sequelize-cli') || error.message.includes('command not found')) {
				this.logger.warn('Sequelize CLI not properly configured, skipping migrations');
				return;
			}

			this.logger.error('Migration failed:', error.message);
			throw error;
		}
	}

	async testConnection() {
		const client = new Client({
			host: this.config.host,
			port: this.config.port,
			user: this.config.username,
			password: this.config.password,
			database: this.config.database,
		});

		try {
			await client.connect();
			await client.query('SELECT 1');
			this.logger.info('Database connection test successful');
			return true;
		} catch (error) {
			this.logger.error('Database connection test failed', error);
			return false;
		} finally {
			await client.end();
		}
	}

	getClient() {
		return new Client({
			host: this.config.host,
			port: this.config.port,
			user: this.config.username,
			password: this.config.password,
			database: this.config.database,
		});
	}

	getPool() {
		const { Pool } = require('pg');
		return new Pool({
			host: this.config.host,
			port: this.config.port,
			user: this.config.username,
			password: this.config.password,
			database: this.config.database,
			...this.config.pool,
		});
	}
}

module.exports = DatabaseManager;
