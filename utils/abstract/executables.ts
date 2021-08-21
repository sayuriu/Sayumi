import Sayumi_MsgCommandStruct from '@interfaces/Command';
import Sayumi_IntCommandStruct from '@interfaces/SlashCommand';
import { ExtInteraction, ExtMessage } from '@interfaces/Extended';
import Sayumi from 'core:client';
import { PlayerEvents } from 'discord-player';
import { ApplicationCommandOptionData, ClientEvents, Collection, PermissionString } from 'discord.js';

type Solidify<T> = {
	[P in keyof T]-?: T[P];
}

/** Excludes properties in `T1` that matches the type `T2`.*/
type PropertyExclude<T1, T2> = {
	[P
		in keyof T1
		as Exclude<
					P,
					P extends T2 ?
						P : never
				>
	]: T1[P];
}
/** Get property names that are only avaliable in `T1`.*/
type UniquePropNames<T1, T2> = keyof PropertyExclude<T1, keyof T2>;

type ExecutableMetadata<T> = PropertyExclude<T, ('update' | 'destroy' | 'assign' | 'GetMetadata')>;
type ExecutableCastPartial<T> = Partial<T> & { name: string, client: Sayumi };

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
	description = 'No description available, yet!';
	protected abstract update(data: unknown): void;
	protected abstract destroy(): void;
	protected abstract assign(data: unknown): void;
	GetMetadata(): ExecutableMetadata<this>
	{
		const ret: Partial<this> = {};
		for (const key in this)
			if (!['update', 'destroy', 'assign', 'GetMetadata'].includes(key))
				ret[key] = this[key];
		return ret as unknown as ExecutableMetadata<this>;
	}
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
	reqPerms?: PermissionString[];
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
	reqPerms: PermissionString[] = [];
	nsfw: boolean | 'partial' = false;
	notes: string[] = [];
	abstract onTrigger(...args: unknown[]): void;
	constructor(data: ExecutableCastPartial<ExecutableMetadata<CommandExecutable & BaseExecutable>>)
	{
		super(data);
		for (const key in data)
			if (data[key] !== undefined && Object.keys(this).includes(key))
				this[key] = data[key as keyof (CommandExecutableMetadata & BaseExecutableMetadata)];
	}
}

export type ExtendWithClient<T> = T & { client: Sayumi };

export class MessageBasedExecutable extends CommandExecutable
{
	aliases: string[] = [];
	groups: string[] = ['Unassigned'];
	guildOnly = false;
	args = false;
	reqArgs = false;
	reqUsers: string[] = [];
	usage: string[] = [];
	usageSyntax?: string[] = [];

	constructor(data: ExtendWithClient<Sayumi_MsgCommandStruct>)
	constructor(data: ExecutableMetadata<MessageBasedExecutable>)

	constructor(data: ExecutableMetadata<MessageBasedExecutable>)
	{
		super(data);
		this.assign(data);
	}

	protected assign(data: ExtendWithClient<Sayumi_MsgCommandStruct>): void {
		for (const key in data)
			if (data[key] !== undefined && Object.keys(this).includes(key))
				this[key] = data[key as keyof ExtendWithClient<Sayumi_MsgCommandStruct>];
	}

	update(data: ExecutableMetadata<this>): void
	update(data: ExtendWithClient<Sayumi_MsgCommandStruct>): void

	update(data: ExtendWithClient<Sayumi_MsgCommandStruct>): void
	{
		this.assign(data);
		this.client.CommandList.set(this.name, this);
	}
	destroy(): void
	{
		this.client.CommandList.delete(this.name);
		for (const key in this)
			delete this[key];
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

export type HasChilds<T> = T & { childs?: Collection<ChildGroup['name'], ChildGroup> };

export interface ParentGroup extends Base, HasChilds<Base>
{
	defaultPermission: boolean;
	options: ApplicationCommandOptionData[];
}

export interface ChildGroup extends Base, HasChilds<Base>
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

export class InteractionBasedExecutable extends CommandExecutable implements Partial<ChildGroup>, Partial<ParentGroup>
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
		this.assign(data);
		// master, SUB_COMMAND_GROUP
		if (this.isParent)
		{
			// highest parent
			if (!(this.parentName || this.highestParentName))
				for (const attr of ['onTrigger', 'parentName', 'highestParentName', 'type'])
					delete this[attr];
			// lower parents
			else
			{
				this.type = 'SUB_COMMAND_GROUP';
				for (const attr of ['onTrigger', 'defaultPermission', 'highestParentName'])
					delete this[attr];
			}
		}
		// SUB_COMMAND
		else
		{
			for (const attr of ['childs', 'defaultPermission'])
				delete this[attr];
			this.type = 'SUB_COMMAND';
		}
	}
	assign(data: Sayumi_IntCommandStruct): void
	{
		for (const key in data)
			if (
					data[key] !== undefined
					&& new Boolean((data[key] as unknown).toString()).valueOf()
					&& Object.keys(this).includes(key)
					&& !['update', 'destroy', 'assign'].includes(key)
				)
				this[key] = data[key as keyof Sayumi_IntCommandStruct];
	}
	update(data: Sayumi_IntCommandStruct): void
	{
		this.assign(data);
	}
	destroy(): void
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
export type Sayumi_Event<E extends { [K in keyof E]: unknown[] }> = {
	[T in keyof E]: {
		name: T,
		client: Sayumi;
		once?: boolean;
		multi?: boolean;
		music?: T extends UniquePropNames<PlayerEvents, ClientEvents> ? true : false;
		onEmit: (...args: E[T]) => void;
	};
}[keyof E];

export type AllEvents = (ClientEvents & PlayerEvents);

export class EventExecutable extends BaseExecutable
{
	name: keyof AllEvents;
	once: boolean;
	music: boolean;
	multi?: boolean;
	constructor(data: Sayumi_Event<AllEvents>)
	{
		super(data);
		this.assign(data);
	}
	isMusicPlayerEvent(): this is Sayumi_Event<PlayerEvents>
	{
		return this.client.MusicPlayer.eventNames().includes(this.name as keyof PlayerEvents);
	}
	update(data: Sayumi_Event<AllEvents>): void
	{
		this.assign(data);
		if (!this.multi)
			if (this.isMusicPlayerEvent())
				this.client.MusicPlayer.removeAllListeners(this.name);
			else
				this.client.removeAllListeners(this.name as keyof ClientEvents);

		if (this.isMusicPlayerEvent())
			this.client.MusicPlayer[this.once ? 'once' : 'on'](this.name, this.onEmit.bind(null));
		else
			this.client[this.once ? 'once' : 'on'](this.name as keyof ClientEvents, this.onEmit.bind(null));
	}
	destroy(): void
	{
		if (this.isMusicPlayerEvent())
			this.client.MusicPlayer.removeAllListeners(this.name);
		else this.client.removeAllListeners(this.name as keyof ClientEvents);

		for (const key in this)
			delete this[key];
	}
	onEmit: Sayumi_Event<AllEvents>['onEmit'];
	assign(data: Sayumi_Event<AllEvents>): void
	{
		for (const key in data)
			if (data[key] !== undefined && Object.keys(this).includes(key))
				this[key] = data[key as keyof Sayumi_Event<AllEvents>];
	}
}
