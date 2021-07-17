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
import chalk from 'chalk';
import { watch, stat, readFileSync } from 'fs';
import { join } from 'path';
import { Types } from 'mongoose';

import logCarrier, { Error, bootstrap, Debug, Inform, Warn } from './Logger';
import Database from './Database';
import EmbedConstructor from './Embeds';
import Methods from './Methods';
import Loader, { IssueWarns, ParseCheck } from './Loader';

import AFKUser from './interfaces/AFKUser';
import Sayumi_Command from './interfaces/Command';
import Sayumi_Event from './interfaces/Event';
import Command_Group from './interfaces/CmdGroup';
import { DatabaseInitOption } from './interfaces/DatabaseInitOption';
import GuildData from './interfaces/GuildData';

import GuildDatabase from './database/methods/GuildActions';
import ClientBootstrap from './database/models/client_bootstrap';
import EvalInstance from './Eval';

const DefaultIntents: IntentsString[] = [
	'GUILDS',
	'GUILD_EMOJIS',
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
	core: {
		token: string;
		evtFolder?: string;
		cmdFolder?: string;
		bugChannelID?: string;
		MusicPlayerOptions?: ExtMusicPlayerOptions;
	}
	DSBotOptions?: ClientOptions;
	databaseOptions?: DatabaseInitOption;
}

abstract class Sayumi_BaseClient
{
	readonly ROOT_DIR: string;
	CommandList: Collection<string, Sayumi_Command>;
	CommandAliases: Collection<string[], string>;
	CommandCategories: Collection<string, Command_Group>;
	EvalSessions: Collection<string, EvalInstance>;

	CachedGuildSettings: Collection<string, GuildData>;
	AFKUsers: Collection<string, AFKUser>;
	Database: Database & {
		Guild: typeof GuildDatabase;
	}
	[key: string]: any;
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

	public HANDLED_EVENTS = 0;
	public CommandList = new Collection<string, Sayumi_Command>();
	public CommandAliases = new Collection<string[], string>();
	public CommandCategories = new Collection<string, Command_Group>();
	public CategoryCompare = new Collection<string, string[]>();
	public Cooldowns = new Collection<string, Collection<string, number>>();

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
	// #endregion
	constructor(readonly config: Sayumi_BotClientConfig)
	{
		let { core, DSBotOptions, databaseOptions } = config;
		console.clear();
		bootstrap();
		if (!DSBotOptions?.intents)
		{
			Warn([
				'[Sayumi] Missing intents in client configuration. Those will be applied to ensure minimum functionality.',
				chalk.hex('#9AA83A')(DefaultIntents.map(i => `  ${i}`).join('\n')),
				'You can overwrite this configuration by specifying intents via ' + chalk.hex('#9872A2')('DSBotOptions.intents') + ' property in class contructor.',
			].join('\n'));
			DSBotOptions = Object.assign(DSBotOptions || {}, { intents: DefaultIntents });
		}

		super(DSBotOptions);
		this.HandleProcessErrors();
		const { token, cmdFolder, evtFolder, bugChannelID, MusicPlayerOptions } = core;

		this.cmdDir = cmdFolder ?? 'executables';
		this.evtDir = evtFolder ?? 'events';

		this._bugChannelID = bugChannelID;
		this.MusicPlayer = new MusicPlayer(this, MusicPlayerOptions ?? this.DefaultMusicPlayerSettings);
		this.MusicPlayer.setMaxListeners(1);

		void this.login(token).then(() => this.BootstrapDBLog());
		this.EventListener();
		this.CommandInit();

		// To skip tsc compile logs
		this.setTimeout(() => this.WatchDog(this.ROOT_DIR), 6000);

		this.Database = Object.assign(new Database(databaseOptions), { Guild: GuildDatabase });
	}

	// #region Methods
	/** Initiates the event listener. */
	private EventListener(): void
	{
		new Loader(this as Sayumi, [this.evtDir, 'evt']);
	}

	/** Loads the executables from the library. */
	private CommandInit(): void
	{
		new Loader(this as Sayumi, [this.cmdDir, 'cmd']);
	}

	/** This is for handling some additional runtime errors and events. */
    private HandleProcessErrors(): void
    {
        process.on("uncaughtException", err => {
            Error(`[Uncaught Exception] ${err.message}\n${err.stack}`);
        });
        process.on("unhandledRejection", (err: Error) => {
            Error(`[Unhandled Promise Rejection] ${err.message}\n${err.stack}`);
        });
        process.on('exit', code => {
            logCarrier(`status ${code}`, `Process instance has exited with code ${code}.`);
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
		});

		const handleErrors = (err: NodeJS.ErrnoException, reqPath: string) => {
            if (!reqPath) return false;
            const PrintCSLPath = reqPath.split('\\').splice(3, reqPath.split('\\').length).join('\\');
            switch (err.code)
            {
                case 'ENOENT': return Debug(`[Reload > del] Removed: "${join(PrintCSLPath)}"`);
                case 'EISDIR': return;
                default: return Error(`[Reload / ${err.syscall || err.name || 'Error'}] ${err}`);
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
			if (err) return Error(`[Database > Client Init Sync] ${err}`);
		});
		return;
	}

	public BugReport(message: Message, eMessage: string): void
	{
		if (this._bugChannelID) return void (this.channels.cache.find(ch => ch.id === this._bugChannelID) as TextChannel)?.send({ embeds: [this.Embeds.error(message, eMessage)] });
	}
	// #endregion
}
