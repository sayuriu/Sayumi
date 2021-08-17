/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/no-empty-interface */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-namespace */
/* eslint-disable @typescript-eslint/no-explicit-any */

type T = {
	[key: string]: any;
}
declare function require(id:string): T;
declare namespace require {
	export const cache: string[];
	export const resolve: (id: string, options?: { paths?: string[]; }) => string;
}

import {
	Client as DSClient,
	ClientOptions,
	Collection,
	IntentsString,
	Message,
	TextChannel,
} from 'discord.js';
import { Player as MusicPlayer, PlayerOptions } from 'discord-player';
import { watch, stat, readFileSync } from 'fs';
import { join } from 'path';
import { Types } from 'mongoose';
import chalk from 'chalk';
import { spawn } from 'child_process';

import logCarrier, { Error, bootstrap, Debug, Inform, Warn } from './Logger';
import Database from './Database';
import EvalInstance from './Eval';
import EmbedConstructor from './Embeds';
import Methods from './Methods';
import Loader, { IssueWarns, ParseCheck } from './Loader-old';

import AFKUser from '@interfaces/AFKUser';
import Sayumi_Command from '@interfaces/Command';
import Sayumi_SlashCommand from '@interfaces/SlashCommand';
import Sayumi_Event from '@interfaces/Event';
import Command_Group from '@interfaces/CmdGroup';
import DatabaseInitOption  from '@interfaces/DatabaseInitOption';
import GuildData from '@interfaces/GuildData';

import GuildDatabase from '@dbMethods/GuildActions';
import ClientBootstrap from '@dbModels/client_bootstrap';
import { MessageBasedExecutable, InteractionBasedExecutable } from './abstract/executables';

const DefaultIntents: IntentsString[] = [
	'GUILDS',
	'GUILD_EMOJIS_AND_STICKERS',
	'GUILD_INVITES',
	'GUILD_MEMBERS',
	'GUILD_MESSAGES',
	'GUILD_MESSAGE_REACTIONS',
	'GUILD_VOICE_STATES',
];

interface ExtMusicPlayerOptions extends PlayerOptions
{
	enableLive?: boolean;
	fetchBeforeQueued?: boolean;
	leaveOnEndCooldown?: number;
}

interface Sayumi_BotClientConfig
{
	/* Core options. */
	core: {
		/* Discord bot token. Refer to [your app's page](https://discord.com/developers/applications) for more details.*/
		token: string;
		evtFolder?: string;
		cmdFolder?: string;
		tempFolder?: string;
		bugChannelID?: string;
		MusicPlayerOptions?: ExtMusicPlayerOptions;
	}
	DSBotOptions?: ClientOptions;
	databaseOptions?: DatabaseInitOption;
}

abstract class Sayumi_BaseClient
{
	readonly ROOT_DIR: string;
	CommandList: Collection<string, MessageBasedExecutable>;
	CommandAliases: Collection<string[], string>;
	CommandCategories: Collection<string, Command_Group>;
	SlashCommands: Collection<string, InteractionBasedExecutable>;
	EvalSessions: Collection<string, EvalInstance>;

	CachedGuildSettings: Collection<string, GuildData>;
	AFKUsers: Collection<string, AFKUser>;
	Database: Database & {
		Guild: typeof GuildDatabase;
	}
	[key: string]: any;
}

interface ExceptionLevels {
	'WARN': 0,
	'ERROR': 1,
	'FATAL': 2,
}

export default class Sayumi extends DSClient implements Sayumi_BaseClient
{
	// #region Define
	public readonly ROOT_DIR = `${__dirname}\\..`;
	public readonly master = process.env.MASTER ?? null;
	public readonly Embeds = EmbedConstructor;
	public readonly Methods = Methods;

	public readonly Database: Database & {
		Guild: typeof GuildDatabase,
	};

	public readonly Log = Object.assign(logCarrier, {
		Error,
		Debug,
		Inform,
		Warn,
	});

	public readonly cmdDir: string;
	public readonly evtDir: string;
	private readonly _bugChannelID: string;
	private exitReason: string;

	public HANDLED_EVENTS = 0;
	public CommandList = new Collection<string, MessageBasedExecutable>();
	public CommandAliases = new Collection<string[], string>();
	public CommandCategories = new Collection<string, Command_Group>();
	public SlashCommands = new Collection<string, InteractionBasedExecutable>();
	public CategoryCompare = new Collection<string, string[]>();
	public Cooldowns = new Collection<string, Collection<string, Collection<string, number>>>();

	public CachedGuildSettings = new Collection<string, GuildData>();
	public EvalSessions = new Collection<string, EvalInstance>();
	public AFKUsers = new Collection<string, AFKUser>();

	public MusicPlayer: MusicPlayer;

	get DefaultMusicPlayerSettings(): ExtMusicPlayerOptions {
		return {
			enableLive: true,
			fetchBeforeQueued: true,
			leaveOnEmpty: true,
			leaveOnEmptyCooldown: 60000,
			leaveOnEnd: true,
			leaveOnEndCooldown: 60000,
			ytdlOptions: {
				quality: 'highest',
				filter: 'audioonly',
			},
		};
	}

	get ExceptionCode(): ExceptionLevels
	{
		return {
			'WARN': 0,
			'ERROR': 1,
			'FATAL': 2,
		};
	}

	// #endregion
	constructor(readonly config: Sayumi_BotClientConfig)
	{
		let { core, DSBotOptions, databaseOptions } = config;
		console.clear();
		bootstrap();
		if (!DSBotOptions?.intents)
		{
			Warn([
				`[Client] Missing intents in client configuration. Those will be applied to ensure minimum functionality.`,
				chalk.hex('#9AA83A')(DefaultIntents.map(i => `  ${i}`).join('\n')),
				'You can overwrite this configuration by specifying intents via ' + chalk.hex('#9872A2')('DSBotOptions.intents') + ' property in class contructor.',
			].join('\n'));
			DSBotOptions = Object.assign(DSBotOptions || {}, { intents: DefaultIntents });
		}

		super(DSBotOptions);
		this.HandleProcessErrors();
		const { token, cmdFolder, evtFolder, bugChannelID, MusicPlayerOptions } = core;

		this.TokenVerif(token);
		this.cmdDir = cmdFolder ?? 'executables';
		this.evtDir = evtFolder ?? 'events';

		this._bugChannelID = bugChannelID;
		this.MusicPlayer = new MusicPlayer(this, MusicPlayerOptions ?? this.DefaultMusicPlayerSettings);
		this.MusicPlayer.setMaxListeners(1);

		void this.login(token).then(() => this.BootstrapDBLog());
		this.EventListener();
		this.CommandInit();

		// To skip tsc compile logs
		setTimeout(() => this.WatchDog(this.ROOT_DIR), 6000);
		this.Database = Object.assign(new Database(databaseOptions), { Guild: GuildDatabase });
	}

	// #region Methods
	private TokenVerif(token: string): void
	{
		if (!token.length)
		{
			this.RaiseException(`[${this.constructor.name}] Token is possibly invalid.`, 'WARN');
			console.log('Yes, it definitely is.');
			this.RaiseException(`[${this.constructor.name}] An empty string is not a token.\nConsider getting one via https://discord.com/developers/applications.`);
			this.RaiseException(`[${this.constructor.name}] Empty bot token.`, 'FATAL');
		}

		if (
				this.Methods.Common.SearchString(/\./g, token).length !== 2 ||
				(token[24] !== '.' && token[31] !== '.') ||
				token.length < 59
			)
		{
			this.RaiseException(`[${this.constructor.name}] Token is possibly invalid.`, 'WARN');
			process.stdout.write('Yes, it definitely is.\n');
			process.stdout.write('Consider rechecking via https://discord.com/developers/applications.\n');
			this.RaiseException(`[${this.constructor.name}] Invalid token format.`, 'FATAL');
		}
		return;
	}

	// expandable
	public RaiseException(message: string, type: keyof ExceptionLevels = 'ERROR'): void
	{
		if (
			message.includes('An invalid token was provided.') &&
			message.includes('WebSocketManager.connect') &&
			message.includes(`${this.constructor.name}.login`)
		) type = 'FATAL';
		const severityLevel = this.ExceptionCode[type];
		switch(severityLevel)
		{
			case 0:
				this.Log.Warn(message);
				break;
			case 1:
				this.Log.Error(message);
				break;
			case 2:
				this.Log.Error(message);
				this.exitReason = `[fatal] ${message.substr(0, message.indexOf('\n') > 0 ? message.indexOf('\n') : message.length).trim()}`;
				return process.exit(1);
			default: break;
		}
		return;
	}

	/** Initiates the event listener. */
	private EventListener(): void
	{
		new Loader(this as Sayumi, [this.evtDir, 'evt']);
	}

	/** Loads the executables from the library. */
	private CommandInit(): void
	{
		new Loader(this as Sayumi, [this.cmdDir, 'cmd']);
		new Loader(this as Sayumi, ['slash', 'slash']);
	}

	/** This is for handling some additional runtime errors and events. */
    private HandleProcessErrors(): void
    {
        process.on("uncaughtException", err => {
            this.RaiseException(`[Uncaught Exception] ${err.message}\n${err.stack}`);
        });
        process.on("unhandledRejection", (err: Error) => {
            this.RaiseException(`[Unhandled Promise Rejection] ${err.message}\n${err.stack}`);
        });
        process.on('exit', code => {
            logCarrier(`status ${code}`, `Process instance has exited with code ${code}.\nReason: ${this.exitReason ?? 'Process exception [node]'}`);
        });
    }

	/** Hot reload! */
	private WatchDog(rootDir: string): void
	{
		const FSEventTimeout = new Map<string, boolean>();
		watch(rootDir, { recursive: true }, (evt, filename) => {
			if (filename)
			{
				const path = join(rootDir, filename);

				// hardcoded: disk/folder/bot
				const printCSLPath = path.split('\\').splice(3, path.split('\\').length).join('\\');

				const { resolve } = require;
				const file = path.split('\\')[path.split('\\').length - 1];

				const print_change = (cmdOrEvt: Sayumi_Command | Sayumi_Event | Record<string, any>) => {
					if (!FSEventTimeout.get(path))
					{
						Object.keys(cmdOrEvt).length ?
							Debug(`[Reload > ud] Updated ${cmdOrEvt.name || 'something at'} [${printCSLPath.split('\\').join(' > ')}]`) :
							Debug(`[Reload > rg] Registered ${cmdOrEvt.name  || 'something at'} [${printCSLPath.split('\\').join(' > ')}]`);
						timeout(path);
					}
                };

				const exePath = (path.match(/executables/g) || []).length > 0;
                const evtPath = (path.match(/events/g) || []).length > 0;

				if (evt === 'change')
				{
					stat(filename, (e, stats) => {

						if (e) handleErrors(e, path);
						if (file.endsWith('.js'))
						{
							if (path.match(/node_modules/g)) return 'ignore node_modules dir';
							if (path.match(/^(\.git)/g)) return 'ignore git dir';

							let cmd: Record<string, any>;
							try {
								cmd = exePath ? this.CommandList.get(require(path).name) || {} : {};
							} catch (err) {
								cmd = {};
							}

							const options = {
								asAbsolute: true,
								hotReload: true,
							};

							if (stats.mtimeMs > (cmd.loadTime || 0) && (exePath || evtPath))
							{
								const data = { dirIndex: { invalidNames: [], emptyFiles: [], noFunc: [], errored: [] } };
								if (exePath)
								{
									const resolved = resolve(path);
									delete require.cache[resolve(path)];
									ParseCheck('cmd', this, path, data, options);
									print_change(cmd);
									IssueWarns(data.dirIndex, 'cmd');
								}
								if (evtPath)
								{
									delete require.cache[resolve(path)];
									ParseCheck('evt', this, path, data, options);
									this.HANDLED_EVENTS--;

									let obj: Record<string, any>;
									try {
										obj = require(path);
									}
									catch (err) { null; }

									print_change(obj || {});
									IssueWarns(data.dirIndex, 'evt');
								}
								return;
							}
							else if (!FSEventTimeout.get(path))
							{
								Debug(`[Reload > ld] Updated: "${printCSLPath}"`);
								timeout(path);
							}
						}

						'only scans utils/json folder';
						if (file.endsWith('.json') && path.split('\\').some(n => n === 'json'))
						{
							// deal with CommandCategories
							const object = require(path);
							object;
							if (stats.mtimeMs > (object.lastUpdated || 0))
							{
								// do something here, or do we actually need to do it?
							}
						}

					});
				}

				if (evt === 'rename')
                {
                    const dirIndex = { invalidNames: [], emptyFiles: [], noFunc: [], erroed: [] };
                    try {
                        readFileSync(path);
                        if (file.endsWith('.js'))
                        {
                            if (exePath)
                            {
                                const cmd = this.CommandList.get(require(path).name) || { name: null };
                                ParseCheck('cmd', this, path, dirIndex);
                                Debug(`[Reload > ad] Registered ${cmd.name  || 'something at'} ${printCSLPath}`);
                                IssueWarns(dirIndex, 'cmd');
                            }
                            if (evtPath)
                            {
                                ParseCheck('cmd', this, path, dirIndex);
                                Debug(`[Reload > ad] Registered ${`"${require(path).name || 'something'}" at`} ${printCSLPath}`);
                                IssueWarns(dirIndex, 'evt');
                            }
                        }
                        else Debug(`[Reload > ad] Added "${printCSLPath}"`);
                    } catch (err) {
                        // ln 150: do something? [disable entry, etc etc...]
                        // if (cache(resolve(path))) null;
                        handleErrors(err, path);
                    } finally {
                        timeout(path);
                    }
                }
			}
			return;
		});

		const handleErrors = (err: NodeJS.ErrnoException, reqPath: string) => {
            if (!reqPath) return false;
            const PrintCSLPath = reqPath.split('\\').splice(3, reqPath.split('\\').length).join('\\');
            switch (err.code)
            {
                case 'ENOENT': return Debug(`[Reload > del] Removed: "${join(PrintCSLPath)}"`);
                case 'EISDIR': return;
                default: return this.RaiseException(`[Reload / ${err.syscall ?? err.name ?? 'Error'}] ${err}`);
            }
        };

		const timeout = (pathName: string) => {
            FSEventTimeout.set(pathName, true);
            setTimeout(() => FSEventTimeout.delete(pathName), 500);
        };
	}

	private BootstrapDBLog(): void
	{
		if (this.Database.disabled) return;
		new ClientBootstrap({
			_id: Types.ObjectId(),
			host: `${process.env.USERDOMAIN} as ${process.env.USERNAME}`,
			shardCount: this.ws.shards.size,
			readyAt: this.readyAt,
			readyTimestamp: this.readyTimestamp,
			ping: this.ws.ping,
			wsStatus: this.ws.status,
			gateway: this.ws.gateway,
			cmds: this.CommandList.size,
			events: this.HANDLED_EVENTS,
			cachedUsers: this.users.cache.size,
			cachedGuilds: this.guilds.cache.size,
		})
		.save({}, (err) => {
			if (err) return this.RaiseException(`[Database > Client Init Sync] ${err}`);
		});
		return;
	}

	public BugReport(message: Message, eMessage: string): void
	{
		if (this._bugChannelID) return void (this.channels.cache.find(ch => ch.id === this._bugChannelID) as TextChannel)?.send({ embeds: [this.Embeds.error(message, eMessage)] });
	}
	// #endregion
}