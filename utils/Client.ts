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
import * as chalk from 'chalk';
import { watch, stat, readFileSync } from 'fs';
import { join } from 'path';

import logCarrier, { error, bootstrap, debug, info, warn } from './Logger';
import Sayumi_Command from './interfaces/Command';
import Command_Group from './interfaces/CmdGroup';
import { Database } from './abstract/db';
import GuildDatabase, { GuildData } from './abstract/guilddb';
import Methods from './Methods';
import Loader, { IssueWarns, ParseCheck, Sayumi_CMDorEVT } from './Loader';

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

export default class Sayumi extends DSClient implements Sayumi_BaseClient
{
	// #region Define
	readonly ROOT_DIR = __dirname;
	public HANDLED_EVENTS = 0;
	public CommandList = new Collection<string, Sayumi_Command>();
	public CommandAliases = new Collection<string[], string>();
	public CommandCategories = new Collection<string, Command_Group>();
	public CategoryCompare = new Collection<string, string[]>();

	public CachedGuildSettings = new Collection<string, GuildData>();
	public EvalSessions = new Collection<string, EvalSession>();
	public AFKUsers = new Collection<string, AFKUser>();

	public MusicPlayer: MusicPlayer;

	public Database = Object.assign(Database, {
		Guild: GuildDatabase,
	})

	public Methods = Methods;
	public Log = Object.assign(logCarrier, {
		error,
		debug,
		info,
		warn,
	})

	// #endregion

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

	constructor({ core, DSBotOptions }: Sayumi_BotClientConfig)
	{
		super(DSBotOptions);
		console.clear();
		this.HandleProcessErrors();
		bootstrap();
		if (!DSBotOptions.intents)
		{
			warn([
				'Missing intents in client configuration This causes me to have soome problems.',
				'Recommended intents:',
				chalk.hex('9AA83A')(DefaultIntents.toString()),
				'You can overwrite this configuration by specifying intents via' + chalk.hex('#9872A2')('DSBotOptions.intents') + 'property in class contructor.',
			].join('\n'));
			DSBotOptions.intents = DefaultIntents;
		}

		if (!core.MusicPlayerOptions) core.MusicPlayerOptions = this.DefaultMusicPlayerSettings;
		// this._bugChannelID = core.bugChannelID;

		this.MusicPlayer = new MusicPlayer(this, core.MusicPlayerOptions);
		this.MusicPlayer.setMaxListeners(1);

		void this.login(core.token);
		this.EventListener();
		this.CommandInit();
		this.WatchDog(this.ROOT_DIR);
	}

	/** Initiates the event listener. */
	private EventListener(): void
	{
		new Loader(this, ['events', 'evt']);
	}

	/** Loads the executables from the library. */
	private CommandInit(): void
	{
		new Loader(this, ['executables', 'cmd']);
	}

	/** This is for handling some additional runtime errors and events. */
    private HandleProcessErrors(): void
    {
        process.on("uncaughtException", err => {
            error(`[Uncaught Exception] ${err.message}\n${err.stack}`);
        });
        process.on("unhandledRejection", (err: UnhandledPromiseRejection) => {
            error(`[Unhandled Promise Rejection] ${err.message}\n${err.stack}`);
        });
        process.on('exit', code => {
            logCarrier(`status ${code}`, `Process instance has exited with code ${code}.`);
        });
    }

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

				const print_change = (cmdOrEvt: Sayumi_CMDorEVT | Record<string, any>) => {
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
}

export interface Sayumi_Main extends Sayumi {}

abstract class Sayumi_BaseClient
{
	readonly ROOT_DIR: string;
	CommandList: Collection<string, Sayumi_Command>;
	CommandAliases: Collection<string[], string>;
	CommandCategories: Collection<string, Command_Group>;
	EvalSessions: Collection<string, EvalSession>;

	CachedGuildSettings: Collection<string, GuildData>;
	AFKUsers: Collection<string, AFKUser>;
	Database: typeof Database & {
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
		bugChannelID?: string;
		MusicPlayerOptions?: ExtMusicPlayerOptions
	}
	DSBotOptions: ClientOptions
}

interface UnhandledPromiseRejection extends Error {
	message: string;
	stack: string;
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

interface AFKUser
{
	name: string;
	id: string;
	reason: string;
	AFKTimestamp: number;
	lastChannel: string;
}
