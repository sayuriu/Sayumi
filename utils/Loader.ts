import { existsSync, mkdirSync, readdirSync, lstatSync } from "fs";
import { join } from "path";
import { ApplicationCommandData, ApplicationCommandOptionData, Collection } from "discord.js";

import { Errors } from "@methods/common/parse-errors";
import Sayumi from "core:client";
import { AllEvents, Sayumi_Event, ChildGroup, HasChilds, MessageBasedExecutable, InteractionBasedExecutable, ParentGroup, EventExecutable } from "@abstract/executables";
import Sayumi_SlashCommand from "@interfaces/SlashCommand";
import Sayumi_Command from "@interfaces/Command";

import groupSettings, { GroupSettings as GroupSettingsStruct } from './GroupSettings';
import { ExtendWithClient } from './abstract/executables';

interface DirIndexMetadata
{
	size: number;
	invalidNames: string[];
	noFunc: string[];
	emptyFiles: string[];
	errored: Errors[];
	EntriesToCMD: string[];
}

class DirIndex implements DirIndexMetadata
{
	size: number;
	invalidNames: string[];
	noFunc: string[];
	emptyFiles: string[];
	errored: Errors[];
	EntriesToCMD: string[];
	constructor()
	constructor(data: DirIndexMetadata)
	constructor(data?: DirIndexMetadata)
	{
		Object.assign(this, data ?? {});
	}
}

type AllowedTypes = 'cmd' | 'evt' | 'slash';

function dupFinder<K>(arr: K[])
{
	return arr.filter((entry, index: number) => arr.indexOf(entry) !== index);
}

abstract class Base
{
	readonly mainRoot: string;
	dirIndex: DirIndexMetadata;

	// stdout
	loaded: number;
	empty: number;
	path: string;
	type: AllowedTypes;
	stdoutSignalSend: (signal: string) => boolean;
}

export class Loader extends Base
{
	dirIndex = new DirIndex();
	constructor(client: Sayumi, [path, type]: [string, AllowedTypes])
	{
		super();
		this.destroy();
	}
	destroy(): void
	{
		for (const key in this)
			delete this[key];
	}
	recursiveLoad(client: Sayumi, path: string): void
	{
		if (!existsSync(path))
		{
			client.RaiseException(`[Loader] Could not find "${path}". Creating one...`, 'WARN');
			try
			{
				mkdirSync(path);
			}
			catch(e)
			{
				return client.RaiseException(`[Loader] Failed to create "${path}":\n${e}`, 'FATAL');
			}
		}
		readdirSync(path).forEach(file => {
			const fullPath = join(path, file);
			// const fullPath = join(this.mainRoot, dirPath);

			if (lstatSync(fullPath).isDirectory()) return this.recursiveLoad(client, fullPath);
			if (file.endsWith(".js") || file.endsWith(".ts")) void ParseCheck(this.type, client, fullPath, this);
		});
		// if (this.type === 'cmd') BindCategory(client);
	}
}

interface ParseOptions
{
	asAbsolute?: boolean;
	hotReload?: boolean;
}

export async function ParseCheck(type: AllowedTypes, client: Sayumi, path: string, data: Partial<Loader>, options: ParseOptions = { asAbsolute: false }): Promise<number | void>
{
	const { invalidNames, emptyFiles, noFunc, errored } = data.dirIndex ?? { invalidNames: [], emptyFiles: [], noFunc: [], errored: [] };
	const { asAbsolute, hotReload } = options;

	let imported = await import(path) as unknown & { name: string };

	const size = lstatSync(path).size;
	const { name } = imported;
	data.dirIndex.size += size;

	try
	{
		switch(type)
		{
			case 'cmd':
			{
				if (imported instanceof MessageBasedExecutable)
				{
					const { aliases, onTrigger, groups: group } = imported;
					imported.client = client;

					if (!onTrigger)
					{
						imported.destroy();
						return noFunc.push(name ? `"${name}": ${path}` : path);
					}

					if (group?.length)
						for (const g of group)
						{
							if (!Object.keys(groupSettings).includes(g)) continue;

							const configs = {};
							const { global, groups } = groupSettings[g];
							for (const option in groups)
								if ((groups[option] as string[]).includes(name)) configs[option] = true;

							imported.update(
								new MessageBasedExecutable(
									Object.assign(
										imported.GetMetadata(), configs, global ? global : {},
									),
								),
							);
						}

					if ((aliases || []).length) client.CommandAliases.set(aliases, name);
					const cache = client.CommandList.get(name);
					if (cache)
						return cache.update(imported);

					client.CommandList.set(
						name,
						Object.assign(
							imported,
							{ memWeight: size, loadTime: Date.now() },
						),
					);
					data.loaded++;
					break;
				}
				break;
			}
			case 'evt':
			{
				if (imported instanceof EventExecutable)
				{

				}
				break;
			}
			case 'slash':
			{

			}
		}
	}
	catch(e)
	{
		errored.push(e);
	}
}

export function SlashCommandLoader(allCmds: InteractionBasedExecutable[], scExecutable = new Collection<string, InteractionBasedExecutable>()): Collection<string, InteractionBasedExecutable>
{
	const notEnoughSpace = (parent: HasChilds<ParentGroup | ChildGroup>) => parent.childs?.size > 25;

	// main
	for (const parent of allCmds.filter(c => c.isParent && !(c.parentName || c.highestParentName)))
		scExecutable.set(parent.name, new InteractionBasedExecutable(parent));

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
		parent.childs.set(name, new InteractionBasedExecutable(group));
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
				group.childs.set(name, new InteractionBasedExecutable(cmd));
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
				highestParent.childs.set(name, new InteractionBasedExecutable(cmd));
			}
		}
	}
	return scExecutable;
}

export function toApplicationCommandData(execCollection: Collection<string, InteractionBasedExecutable>): ApplicationCommandData[]
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

function formatToApplicationCmdData(input: InteractionBasedExecutable): ApplicationCommandOptionData
{
	const data = DuplicateObject(input);
	if (data.isParent) data.options = [...data.childs.values()];
	const attr = ['name', 'description', 'options', 'choices', 'type', 'required', 'defaultPermission'];
	for (const key in data)
		if (!attr.includes(key)) delete data[key];

	return data;
}

function DuplicateObject<T>(source: T): T
{
	const target: unknown = {};
	for (const key in source)
		target[key] = source[key];
	return target as T;
}