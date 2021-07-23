import DatabaseInitOption from "./interfaces/DatabaseInitOption";
import { connect, connection, NativeError } from "mongoose";
import logCarrier, { Error, Inform, Warn } from "./Logger";
import chalk from "chalk";
let failedLocal = false;

export default class Database
{
	private retries = -1;
	private connection = connection;
	private uri: string;
	private fail = false;
	private localFallback = false;
	public disabled = false;

	constructor(private readonly config: DatabaseInitOption)
	{
		if (!config) {
			this.NotifyOffline('Database initiate option was not specified.');
			this.disabled = true;
			return;
		}
		this._constructURI();
		if (!this.fail) this.Connect();
	}

	_constructURI(): void
	{
		if (this.config.local) this.uri = this.config.uri;
		else
		{
			if (!this.config.username) {
				Error("Database won't connect because username is missing and you are not using localhost. Please specify required data and restart this instance.");
				this.fail = true;
				return;
			}
			if (!this.config.password) {
				Error("Database won't connect because username is missing and you are not using localhost. Please specify required data and restart this instance.");
				this.fail = true;
				return;
			}
			this.uri = this.config.uri
					.replace(/\${username}/, this.config.username)
					.replace(/\${password}/, this.config.password);
		}
	}

	private Connect(): void
	{
		const RetryConnection = (e: NativeError) =>
		{
			if (e.message === 'connection timed out')
			{
				if (this.retries > 3) {
					Error(`[Database] Failed to connect: Connection timed out.`);
					return this.FallbackToLocal();
				}
				this.retries++;
				return this.Connect();
			}
		};

		connect(this.uri, {
			keepAlive: true,
			connectTimeoutMS: 10000,
			useNewUrlParser: true,
			useUnifiedTopology: true,
		}).catch(e => RetryConnection);

		this.HandleConnection();
	}

	private HandleConnection(): void
	{
		this.connection.on('open', () => {
			if (this.config.local) logCarrier('Database', 'Using this machine as the host.');
			else logCarrier('Remote Database', `Status 200: Connected as "${this.config.username}"`);
		});

		this.connection.on('error', (e: NativeError) => {
			if (this.config.local) Error(`[Local Database] A connection error has occured: \n"${e.message}"`);
			else
			{
				Error(`[Remote Database] A connection error has occured: \n"${e.message}"`);
				if (this.config.localUri)
				{
					logCarrier('status: 500', 'This will use localhost instead.');
					this.FallbackToLocal();
				}
			}
		});

		this.connection.on('disconnect', () => {
			logCarrier('Database', `Disconnected from ${this.config.local ? 'local database' : 'remote database'}.`);
		});
	}

	private FallbackToLocal()
	{
		if (!this.config.localUri)
		{
			Warn('[Database] Fail to connect to remote database and you have no local URI to fallback. Incoming connection errors will be ignored.');
			this.NotifyOffline('Failed to establish connections.');
			return;
		}
		failedLocal = true;
		this.uri = this.config.localUri;

		if (this.localFallback && failedLocal) return;
		if (this.localFallback)
		{
			Warn('[Database] Failed to connect to localhost. Incoming connection errors will be ignored.');
			this.NotifyOffline('Failed to establish connections.');
		}

		return this.Connect();
	}

	public NotifyOffline(reason: string): void
	{
		Inform(`[Database] Offline mode is active. Calling any method under '${chalk.hex('#2186FA')('<client>')}.${red('Database')}' will raise an ${red('error')}.\nReason: ${reason}\n`);
		return;
	}
}
const red = (message: string) => chalk.hex('#E73B3B')(message);
