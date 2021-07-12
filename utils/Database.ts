import { DatabaseInitOption } from "./interfaces/DatabaseInitOption";
import { connect, connection, NativeError } from "mongoose";
import logCarrier, { error, warn } from "./Logger";
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
				error("Database won't connect because username is missing and you are not using localhost. Please specify required data and restart this instance.");
				this.fail = true;
				return;
			}
			if (!this.config.password) {
				error("Database won't connect because username is missing and you are not using localhost. Please specify required data and restart this instance.");
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
					error(`[Database] Failed to connect: Connection timed out.`);
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
			if (this.config.local) error(`[Local Database] A connection error has occured: \n"${e.message}"`);
			else
			{
				error(`[Remote Database] A connection error has occured: \n"${e.message}"`);
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
		if (!this.config.localUri) return warn('[Local Database] Fail to connect to remote database and you have no local URI to fallback. Incoming connection errors will be ignored.');
		failedLocal = true;
		this.uri = this.config.localUri;

		if (this.localFallback && failedLocal) return;
		if (this.localFallback) warn('[Local Database] Failed to connect to localhost. Incoming connection errors will be ignored.');

		return this.Connect();
	}

}