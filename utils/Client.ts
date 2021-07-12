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
	Channel,
	IntentsString,
	Message,
	MessageEmbed,
	User,
} from 'discord.js';
import { Player as MusicPlayer, PlayerOptions } from 'discord-player';
import chalk from 'chalk';
import { watch, stat, readFileSync } from 'fs';
import { join } from 'path';
import { Types } from 'mongoose';

import logCarrier, { error, bootstrap, debug, info, warn } from './Logger';
import AFKUser from './interfaces/AFKUser';
import Sayumi_Command from './interfaces/Command';
import Command_Group from './interfaces/CmdGroup';
import { DatabaseInitOption } from './interfaces/DatabaseInitOption';
import GuildData from './interfaces/GuildData';
import Database from './Database';
import Methods from './Methods';
import Loader, { IssueWarns, ParseCheck } from './Loader';
import GuildDatabase from './database/methods/GuildActions';
import ClientBootstrap from './database/models/client_bootstrap';
import Sayumi_Event from './interfaces/Event';
import EmbedConstructor from './Embeds';

const DefaultIntents: IntentsString[] = [
	'GUILDS',
	'GUILD_EMOJIS',
	'GUILD_INTEGRATIONS',
	'GUILD_INVITES',
	'GUILD_MEMBERS',
	'GUILD_MESSAGES',
	'GUILD_MESSAGE_REACTIONS',
	'GUILD_MESSAGE_TYPING',
	'GUILD_PRESENCES',
	'GUILD_VOICE_STATES',
	'GUILD_WEBHOOKS',
];

const red = (message: string) => chalk.hex('#E73B3B')(message);

export default class Sayumi extends DSClient implements Sayumi_BaseClient
{
	// #region Define
	readonly ROOT_DIR = `${__dirname}\\..`;
	readonly master = process.env.MASTER;
	public HANDLED_EVENTS = 0;
	public CommandList = new Collection<string, Sayumi_Command>();
	public CommandAliases = new Collection<string[], string>();
	public CommandCategories = new Collection<string, Command_Group>();
	public CategoryCompare = new Collection<string, string[]>();
	public Cooldowns = new Collection<string, Collection<string, number>>();

	public CachedGuildSettings = new Collection<string, GuildData>();
	public EvalSessions = new Collection<string, EvalSession>();
	public AFKUsers = new Collection<string, AFKUser>();

	public MusicPlayer: MusicPlayer;
	public Embeds = EmbedConstructor;

	public Database: Database & {
		Guild: typeof GuildDatabase,
	}

	public Methods = Methods;
	public Log = Object.assign(logCarrier, {
		error,
		debug,
		info,
		warn,
	})

	private cmdDir: string;
	private evtDir: string;
	private _bugChannelID: string;
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

	constructor({ core, DSBotOptions, databaseOptions }: Sayumi_BotClientConfig)
	{
		console.clear();
		bootstrap();
		if (!DSBotOptions?.intents)
		{
			warn([
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

		if (!databaseOptions) info(`[Database] Offline mode is active. Calling any methods under '${chalk.hex('#2186FA')('<client>')}.${red('Database')}' will raise an ${red('error')}.\nReason: Database initiate option was not specified.`);
		this.Database = Object.assign(new Database(databaseOptions), { Guild: GuildDatabase });
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
	}

	/** This is for handling some additional runtime errors and events. */
    private HandleProcessErrors(): void
    {
        process.on("uncaughtException", err => {
            error(`[Uncaught Exception] ${err.message}\n${err.stack}`);
        });
        process.on("unhandledRejection", (err: Error) => {
            error(`[Unhandled Promise Rejection] ${err.message}\n${err.stack}`);
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
				const printCSLPath = path.split('\\').splice(3, path.split('\\').length).join('\\');
				const { resolve } = require;
				const file = path.split('\\')[path.split('\\').length - 1];

				const print_change = (cmdOrEvt: Sayumi_Command | Sayumi_Event | Record<string, any>) => {
                    Object.keys(cmdOrEvt).length ?
                    debug(`[Reload > ud] Updated ${cmdOrEvt.name || 'something at'} [${printCSLPath.split('\\').join(' > ')}]`) :
                    debug(`[Reload > rg] Registered ${cmdOrEvt.name  || 'something at'} [${printCSLPath.split('\\').join(' > ')}]`);
                };

				const exePath = (path.match(/executables/g) || []).length > 0;
                const evtPath = (path.match(/events/g) || []).length > 0;

				if (evt === 'change')
				{
					stat(filename, (e, stats) => {

						if (e) error(`[Reload - FileStats error] Path: ${path}\n${e.message}`);
						if (!FSEventTimeout.get(path))
                        {
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

                                if (stats.mtimeMs > (cmd.loadTime || 0) && (exePath || evtPath))
                                {
                                    const dirIndex = { invalidNames: [], emptyFiles: [], noFunc: [], errored: [] };
                                    if (exePath)
                                    {
                                        if ((cmd.memWeight || 0) === stats.size) return;
                                        delete require.cache[resolve(path)];
                                        ParseCheck('cmd', this, path, dirIndex);
                                        print_change(cmd);
                                        IssueWarns(dirIndex, 'cmd');
                                    }
                                    if (evtPath)
                                    {
                                        delete require.cache[resolve(path)];
                                        ParseCheck('evt', this, path, dirIndex);
                                        this.HANDLED_EVENTS--;

                                        let obj;
                                        try {
                                            obj = require(path);
                                        }
                                        catch (err) { null; }

                                        print_change(obj || {});
                                        IssueWarns(dirIndex, 'evt');
                                    }
                                }
                                else debug(`[Reload > ld] Updated: "${printCSLPath}"`);
                                timeout(path);
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
                                debug(`[Reload > ad] Registered ${cmd.name  || 'something at'} ${printCSLPath}`);
                                IssueWarns(dirIndex, 'cmd');
                            }
                            if (evtPath)
                            {
                                ParseCheck('cmd', this, path, dirIndex);
                                debug(`[Reload > ad] Registered ${`"${require(path).name || 'something'}" at`} ${printCSLPath}`);
                                IssueWarns(dirIndex, 'evt');
                            }
                        }
                        else debug(`[Reload > ad] Added "${printCSLPath}"`);
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
                case 'ENOENT': return debug(`[Reload > del] Removed: "${join(PrintCSLPath)}"`);
                case 'EISDIR': return;
                default: return error(`[Reload / ${err.syscall || err.name || 'Error'}] ${err}`);
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
			if (err) return error(`[Database > Client Init Sync] ${err}`);
		});
		return;
	}
}

abstract class Sayumi_BaseClient
{
	readonly ROOT_DIR: string;
	CommandList: Collection<string, Sayumi_Command>;
	CommandAliases: Collection<string[], string>;
	CommandCategories: Collection<string, Command_Group>;
	EvalSessions: Collection<string, EvalSession>;

	CachedGuildSettings: Collection<string, GuildData>;
	AFKUsers: Collection<string, AFKUser>;
	Database: Database & {
		Guild: typeof GuildDatabase;
	}
	[key: string]: any;
}

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
		evtFolder: string;
		cmdFolder: string;
		bugChannelID?: string;
		MusicPlayerOptions?: ExtMusicPlayerOptions;
	}
	DSBotOptions?: ClientOptions;
	databaseOptions?: DatabaseInitOption;
}

abstract class EvalSession
{
	header: Message | null;
	readonly mainInstanceUserID: string;
	readonly InstanceID: string;
	readonly listenerChannel: Channel;
	readonly prefix: string;
	readonly sessionActiveString: string;
	readonly sessionDestroyedString: string;

	private _embed: MessageEmbed | null;
	private lastInput: Collection<string, Message>;
	private exceedBoolean: boolean;
	private outputWindows: Message[] | [];
	private flagArray: string[] | [];
	private diffTime: number;

	output: string | null;
	outputRaw: string | null;
	outputType: string | null;

	message: Message;
	destroyed: boolean;
	input: string;

	reactionFilter: (reaction: string, user: User) => boolean;
	userFilter: (user: User) => boolean;

	listener: () => Promise<void>;
	updateMainInstance: () => void;
	generateEmbeds: () => void;
	clearWindows: () => void;
	updateState: () => Promise<void>;
	resetState: () => void;
	destroy: () => void;
	resetUI: () => void;
}
