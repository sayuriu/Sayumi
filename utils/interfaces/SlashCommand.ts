import { ApplicationCommandData, ApplicationCommandOptionData, Collection } from "discord.js";
import Sayumi from "../Client";
import { ExtInteraction } from "./Extended";

interface Base
{
	name: string;
	description?: string;
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

interface Sayumi_SlashCommand extends Partial<ChildGroup>, Partial<ParentGroup>
{
	name: string;
}
export default Sayumi_SlashCommand;

export class SlashCommandConstructor implements Sayumi_SlashCommand
{
	name: string;
	description: string;
	scope: 'global' | 'guild';
	defaultPermission?: boolean;
	unstable?: boolean;

	isParent: boolean;
	parentName: string;
	highestParentName?: string;
	childs?: Collection<string, ChildGroup>;

	type: 'SUB_COMMAND_GROUP' | 'SUB_COMMAND';
	options: ApplicationCommandOptionData[];

	onTrigger?: (interaction: ExtInteraction) => void;

	constructor(config: Sayumi_SlashCommand)
	{
		Object.assign(
			this,
			{
				name: 			config.name,
				description: 	config.description ||= 'Blank description.',
				scope: 			config.scope ?? 'global',
				defaultPermission: config.defaultPermission ?? false,
				unstable: 		config.unstable ?? false,
				isParent: 		config.isParent ?? false,
				parentName: 	config.parentName ?? null,
				highestParentName: config.highestParentName ?? null,
				childs: 		config.childs ?? new Collection(),
				type:			config.type ?? null,
				options: 		config.options ?? [],
				onTrigger: 		config.onTrigger ?? null,
			},
		);

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
}

function DuplicateObject<T>(source: T): T
{
	const target: unknown = {};
	for (const key in source)
		target[key] = source[key];
	return target as T;
}

export function SlashCommandLoader(allCmds: Sayumi_SlashCommand[], scExecutable = new Collection<string, SlashCommandConstructor>()): Collection<string, SlashCommandConstructor>
{
	const notEnoughSpace = (parent: HasChilds<ParentGroup | ChildGroup>) => parent.childs?.size > 25;

	// main
	for (const parent of allCmds.filter(c => c.isParent && !(c.parentName || c.highestParentName)))
		scExecutable.set(parent.name, new SlashCommandConstructor(parent));

	// SUB_COMMAND_GROUP
	for (const group of allCmds.filter(c => c.isParent && c.parentName))
	{
		const { name, parentName, highestParentName } = group;
		if (highestParentName)
		{
			delete group.isParent;
			continue;
		}
		const parent = scExecutable.get(parentName);
		if (!parent)
		{
			console.log(`${name}: no neighbor parent: ${parentName}`);
			// do something
			continue;
		}
		if (notEnoughSpace(parent))
		{
			// do something
			continue;
		}
		parent.childs.set(name, new SlashCommandConstructor(group));
	}

	// SUB_COMMAND
	for (const cmd of allCmds)
	{
		const { name, isParent, parentName, highestParentName } = cmd;
		if (isParent) continue;
		if (parentName)
		{
			if (highestParentName)
			{
				const highestParent = scExecutable.get(highestParentName);
				if (!highestParent)
				{
					console.log(`${name}: no highest parent: ${parentName}`);
					// do something
					continue;
				}
				const group = highestParent.childs.get(parentName);
				if (!group)
				{
					console.log(`${name}: no neighbor parent: ${parentName}`);
					// do something
					continue;
				}
				if (notEnoughSpace(group))
				{
					// do something
					continue;
				}
				group.childs.set(name, new SlashCommandConstructor(cmd));
			}
			else
			{
				const highestParent = scExecutable.get(parentName);
				if (!highestParent)
				{
					console.log(`${name}: no h.neighbor parent: ${parentName}`);
					// do something
					continue;
				}
				if (notEnoughSpace(highestParent))
				{
					// do something
					continue;
				}
				highestParent.childs.set(name, new SlashCommandConstructor(cmd));
			}
		}
	}
	return scExecutable;
}

export function toApplicationCommandData(execCollection: Collection<string, SlashCommandConstructor>): ApplicationCommandData[]
{
	const cmdList = execCollection.clone();
	// main
	for (const [, parent] of cmdList)
	{
		if (parent.childs?.size) parent.options = [...parent.childs.values()].map(formatToApplicationCmdData);
		// SUB_COMMAND_GROUP
		for (const [, group] of parent.childs)
			if (group.childs?.size) group.options = [...group.childs.values()].map(formatToApplicationCmdData);
	}
	return [...cmdList.values()].map(formatToApplicationCmdData);
}

function formatToApplicationCmdData(input: SlashCommandConstructor): ApplicationCommandOptionData
{
	const data = DuplicateObject(input);
	if (data.isParent) data.options = [...data.childs.values()];
	const attr = ['name', 'description', 'options', 'choices', 'type', 'required', 'defaultPermission'];
	for (const key in data)
		if (!attr.includes(key)) delete data[key];

	return data;
}