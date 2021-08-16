import Sayumi_MsgCommandStruct from '@interfaces/Command';
import Sayumi_IntCommandStruct from '@interfaces/SlashCommand';
import { ExtInteraction, ExtMessage } from '@interfaces/Extended';
import Sayumi from 'core:client';
import { PlayerEvents } from 'discord-player';
import { ApplicationCommandOptionData, ClientEvents, Collection, PermissionString } from 'discord.js';

interface BaseExecutableMetadata
{
	name: string;
	client: Sayumi;
	description?: string;
}

abstract class BaseExecutable
{
	abstract name: string;
	client: Sayumi;
	description? = 'No description available, yet!';
	abstract update(data: BaseExecutableMetadata): void;
	abstract destroy(): void;
	abstract assign(data: unknown): void;
	constructor(data: BaseExecutableMetadata)
	{
		for (const key in data)
			if (data[key] !== undefined && Object.keys(this).includes(key))
				this[key] = data[key as keyof BaseExecutableMetadata];
	}
}

// #region cmd
interface CommandExecutableMetadata
{
	readonly name: string;
	flags?: string[];
	cooldown?: number;
	guildCooldown?: boolean;
	guildOnly?: boolean;
	reqPerms?: PermissionString[];
	reqUsers?: string[];
	nsfw?: boolean | 'partial';
	notes?: string[];
	onTrigger?(...args: unknown[]): void;
}

abstract class CommandExecutable extends BaseExecutable
{
	readonly name: string;
	flags: string[] = [];
	cooldown = 3;
	guildCooldown = false;
	guildOnly = false;
	reqPerms: PermissionString[] = [];
	reqUsers: string[] = [];
	nsfw: boolean | 'partial' = false;
	notes: string[] = [];
	abstract onTrigger(...args: unknown[]): void;
	constructor(data: CommandExecutableMetadata & BaseExecutableMetadata)
	{
		super(data);
		for (const key in data)
			if (data[key] !== undefined && Object.keys(this).includes(key))
				this[key] = data[key as keyof (CommandExecutableMetadata & BaseExecutableMetadata)];
	}
}

type ExtendWithClient<T> = T & { client: Sayumi };

class MessageBasedExecutable extends CommandExecutable
{
	aliases: string[] = [];
	args = false;
	reqArgs = false;
	usage: string[] = [];
	usageSyntax?: string[] = [];

	constructor(data: ExtendWithClient<Sayumi_MsgCommandStruct>)
	{
		super(data);
	}

	assign(data: unknown): void {
		throw new Error('Method not implemented.');
	}
	update(data: ExtendWithClient<Sayumi_MsgCommandStruct>)
	{

	}
	destroy()
	{

	}
	onTrigger: (message: ExtMessage, ...args: string[]) => void;
}

// slash
interface Base
{
	name: string;
	description: string;
	scope: 'global' | 'guild';
}

type HasChilds<T> = T & { childs?: Collection<ChildGroup['name'], ChildGroup> };

interface ParentGroup extends Base, HasChilds<Base>
{
	defaultPermission: boolean;
	options: ApplicationCommandOptionData[];
}

interface ChildGroup extends Base, HasChilds<Base>
{
	isParent: boolean;
	parentName: string;
	highestParentName?: string;
	type: 'SUB_COMMAND_GROUP' | 'SUB_COMMAND';

	// only available with SUB_COMMAND_GROUP or higher
	// @prop childs

	// only available with SUB_COMMAND
	options: ApplicationCommandOptionData[];
	unstable?: boolean;
	onTrigger?: (interaction: ExtInteraction) => void;
}

class InteractionBasedExecutable extends CommandExecutable implements Partial<ChildGroup>, Partial<ParentGroup>
{
	scope: 'global' | 'guild' = 'global';
	defaultPermission = true;
	unstable = false;

	isParent = false;
	parentName = '';
	highestParentName = '';
	childs = new Collection<string, ChildGroup>();

	type: 'SUB_COMMAND_GROUP' | 'SUB_COMMAND';
	options: ApplicationCommandOptionData[];

	constructor(data: ExtendWithClient<Sayumi_IntCommandStruct>)
	{
		super(data);
	}
	assign(data: Sayumi_IntCommandStruct)
	{
		for (const key in data)
			if (data[key] !== undefined && Object.keys(this).includes(key))
				this[key] = data[key as keyof Sayumi_IntCommandStruct];
	}
	update(data: Sayumi_IntCommandStruct)
	{

	}
	destroy()
	{
		if (this.highestParentName)
		{
			const target =  this.client.SlashCommands.get(this.highestParentName);
			if (!target) return this.client.RaiseException(`[Slash Command: rm] Remove "${this.name}" failed: No highest parent "${this.highestParentName}"`, 'WARN');
			const parent = target.childs?.get(this.parentName);
			if (!parent) return this.client.RaiseException(`[Slash Command: rm] Remove "${this.name}" failed: No nested parent "${this.highestParentName}"`, 'WARN');
			if (parent.childs.has(this.name)) parent.childs.delete(this.name);
		}
		else if (this.parentName)
		{
			const target =  this.client.SlashCommands.get(this.parentName);
			if (!target) return this.client.RaiseException(`[Slash Command: rm] Remove "${this.name}" failed: No nested parent "${this.highestParentName}"`, 'WARN');
			if (target.childs.has(this.name)) target.childs.delete(this.name);
		}
		else
		{
			const target =  this.client.SlashCommands.get(this.name);
			if (!target) return this.client.RaiseException(`[Slash Command: rm] Remove "${this.name}" failed: No such parent "${this.highestParentName}"`, 'WARN');
			this.client.SlashCommands.delete(this.name);
		}
		this.client.Log.Debug(
			`[Slash Command: rm] Removed "${this.name}"` +
			(this.parentName || this.highestParentName) ?
				`of ${[this.highestParentName, this.parentName].map((x, i, a) => x?.length ? null : delete a[i])}` :
				'',
		);
		for (const key in this)
			delete this[key];
	}
	onTrigger: (interaction: ExtInteraction, ...args: string[]) => void;
}
// #endregion

// #region evts
type Sayumi_Event<E extends { [K in keyof E]: unknown[] }> = {
	[T in keyof E]: {
		name: T,
		client: Sayumi;
		once?: boolean;
		music?: E extends PlayerEvents ? true : false;
		onEmit: (...args: E[T]) => void;
	};
}[keyof E];

type AllEvents = (ClientEvents & PlayerEvents);

class EventExecutable extends BaseExecutable
{
	name: keyof AllEvents;
	once: boolean;
	music: boolean;
	constructor(data: Sayumi_Event<AllEvents>)
	{
		super(data);
		this.assign(data);
	}
	isMusicPlayerEvent(): this is Sayumi_Event<PlayerEvents>
	{
		return this.client.MusicPlayer.eventNames().includes(this.name as keyof PlayerEvents);
	}
	update(data: Sayumi_Event<AllEvents>)
	{
		this.assign(data);
		if (this.isMusicPlayerEvent())
			this.client.MusicPlayer[this.once ? 'once' : 'on'](this.name, this.onEmit.bind(null));
		else
			this.client[this.once ? 'once' : 'on'](this.name as keyof ClientEvents, this.onEmit.bind(null));
	}
	destroy()
	{
		if (this.isMusicPlayerEvent())
			this.client.MusicPlayer.removeAllListeners(this.name);
		else this.client.removeAllListeners(this.name as keyof ClientEvents);

		for (const key in this)
			delete this[key];
	}
	onEmit: Sayumi_Event<AllEvents>['onEmit'];
	assign(data: Sayumi_Event<AllEvents>)
	{
		for (const key in data)
			if (data[key] !== undefined && Object.keys(this).includes(key))
				this[key] = data[key as keyof Sayumi_Event<AllEvents>];
	}
}