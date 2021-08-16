/* eslint-disable @typescript-eslint/no-namespace */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-var-requires */

import { existsSync, lstatSync, mkdirSync, statSync, readdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { PlayerEvents } from 'discord-player';

import Sayumi from './Client';
import groupSettings from './GroupSettings';
import TerminalClock from './InternalClock';
import ParseError, { Errors } from '@methods/common/parse-errors';
import { foreground, background } from '@methods/common/ansi-styles';
import Sayumi_Command from '@interfaces/Command';
import Sayumi_Event from '@interfaces/Event';
import Sayumi_SlashCommand, { SlashCommandConstructor, SlashCommandLoader, toApplicationCommandData } from '@interfaces/SlashCommand';
import Command_Group from '@interfaces/CmdGroup';
import * as Categories from '@json/Categories.json';
import { Interface } from 'readline';
import { Collection } from 'discord.js';

declare function require(id:string): Sayumi_Command | Sayumi_Event | Sayumi_SlashCommand;
declare namespace require {
	export const cache: string[];
	export const resolve: (id: string, options?: { paths?: string[]; }) => string;
}

type Solidify<T> =
{
	[prop in keyof T]-?: T[prop];
}

interface DirIndex
{
	size?: number;
	invalidNames?: string[];
	noFunc?: string[];
	emptyFiles?: string[];
	errored?: Errors[];
	EntriesToCMD?: string[] | undefined;
}

type AllowedTypes = 'cmd' | 'evt' | 'slash';

abstract class Loader_Base
{
	mainRoot: string;
	dirIndex: DirIndex;

	// stdout
	loaded: number;
	empty: number;
	path: string;
	type: AllowedTypes;
	stdoutSignalSend: (signal: string) => boolean;
}

export default class Loader extends Loader_Base
{
	slashcmds: Sayumi_SlashCommand[];
	constructor(client: Sayumi, [path, type]: [string, AllowedTypes])
	{
		super();
		this.mainRoot = client.ROOT_DIR;
		this.path = path;
		this.type = type;

		this.dirIndex = {
            size: 0,
            invalidNames: [],
            noFunc: [],
            emptyFiles: [],
            errored: [],
			EntriesToCMD: [],
        };
		// stdout
        this.loaded = 0;
        this.empty = 0;
		// slash
		this.slashcmds = [];

		this.stdoutSignalSend = signal =>
        {
            switch (signal)
            {
                case 'start-scan':
                {
                    const string = foreground('#30e5fc')('[Bootstrap] ')
                                        + foreground('#8c8c8c')(`scan ${this.type}: `)
                                        + foreground('#c15ee6')(this.path)
                                        + ' scanning';
                    return process.stdout.write(string);
                }
                case 'end-scan':
                {
                    const string = foreground('#30e5fc')('[Bootstrap] ')
                                        + foreground('#8c8c8c')(`scan ${this.type}: `)
                                        + foreground('#c15ee6')(this.path)
                                        + ' complete\n';
					process.stdout.cursorTo(0);
                    return process.stdout.write(string);
                }
            }
        };

		this.stdoutSignalSend('start-scan');
		this.recursiveLoad(client, this.path);
        this.stdoutSignalSend('end-scan');
		summarize(client, this, this.type);
			// global.TerminalClock = setInterval(TerminalClock, 34);
			// process.stdout.on('resize', () => {
			// 	clearInterval(global.TerminalClock);
			// 	global.TerminalClock = setInterval(TerminalClock, 1000);
			// });
			// process.on('SIGWINCH', () => console.log('c'));
		if (this.type === 'slash')
		{
			client.SlashCommands = SlashCommandLoader(this.slashcmds);
		}
		this.destroy();
		return;
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
			if (file.endsWith(".js") || file.endsWith(".ts")) ParseCheck(this.type, client, fullPath, this);
		});
		if (this.type === 'cmd') BindCategory(client);
	}

	destroy()
	{
		for (const key in this) delete this[key];
		return;
	}
}

interface ParseOptions
{
	asAbsolute?: boolean;
	hotReload?: boolean;
}

export function ParseCheck(type: AllowedTypes, client: Sayumi, path: string, data: any, options: ParseOptions = { asAbsolute: false }): number
{
	const { invalidNames, emptyFiles, noFunc, errored } = data.dirIndex ?? { invalidNames: [], emptyFiles: [], noFunc: [], errored: [] };
	const { asAbsolute, hotReload } = options;

	try
	{
		let imported = require(asAbsolute ? path : require.resolve(`.\\..\\${path}`));

		const size = statSync(path).size;
		const { name } = imported;
		data.dirIndex.size += size;

		if (!size) return emptyFiles.push(path);

		if (!name || typeof name !== 'string') return invalidNames.push(path);

		switch(type)
		{
			case 'cmd':
			{
				const { aliases, onTrigger, groups: group } = imported as Sayumi_Command;

				if (group?.length)
					for (const g of group)
					{
						if (!Object.keys(groupSettings).includes(g)) continue;

						const configs = {};
						const { global, groups } = groupSettings[g];
						for (const option in groups)
							if (groups[option].includes(name)) configs[option] = true;

						imported = Object.assign(imported, configs, global ? global : {});
					}
				// Check for command's functions
				if (!onTrigger || typeof onTrigger !== 'function') return noFunc.push(name ? `"${name}": ${path}` : path);

				client.CommandList.set(
					name,
					Object.assign(
						imported as Sayumi_Command,
						{ memWeight: size, loadTime: Date.now() },
					),
				);
				if ((aliases || []).length) client.CommandAliases.set(aliases, name);
				data.loaded++;
				break;
			}
			case 'evt':
			{
				const { once, onEmit, music } = imported as Sayumi_Event;

				if (!onEmit || typeof onEmit !== 'function') return noFunc.push(name ? `"${name}": ${path}` : path);

				// Remove old identical listeners if found to prevent overlapping
				if (music)
				{
					client.MusicPlayer.removeAllListeners(name as keyof PlayerEvents);
					client.MusicPlayer.on(name as keyof PlayerEvents, onEmit.bind(null, client));
				}
				else
				{
					client.removeAllListeners(name);
					once ? client.once(name, onEmit.bind(null, client)) : client.on(name, onEmit.bind(null, client));
				}
				client.HANDLED_EVENTS++;
				data.loaded++;
				break;
			}
			case 'slash':
			{
				path;
				if (hotReload)
					SlashCommandLoader([imported as Sayumi_SlashCommand], client.SlashCommands as Collection<string, SlashCommandConstructor>);
				else data.slashcmds.push(imported);
			}
		}
	} catch (e) {
		errored.push(e);
		// if (hotReload) client.RaiseException(`[Reload] Failed to load ${path.split('\\').splice(3, path.split('\\').length).join('\\')}:\n${e}`, 'LIGHT');
	}
	return 0;
}

export function IssueWarns(dirIndex: DirIndex, type: AllowedTypes | string): boolean
{
    const { invalidNames, emptyFiles, noFunc, EntriesToCMD, errored } = dirIndex;
    type = type.replace(/cmd/, 'command').replace(/evt/, 'event');

    function out(item: string[], customString: string)
    {
        process.stdout.write(customString);
        item.forEach(i => process.stdout.write(`  ${foreground('#b5b5b5')(i)}\n`));
        process.stdout.write('\n');
    }

    if (invalidNames.length) out(invalidNames, `${invalidNames.length} file${invalidNames.length > 1 ? 's' : ''} with ${foreground('#e38c22')('no or invalid names')}:\n`);
    if (emptyFiles.length) out(emptyFiles, `${emptyFiles.length} ${foreground('#8f8f8f')(`empty file${emptyFiles.length > 1 ? 's' : ''}`)}:\n`);
    if (noFunc.length) out(noFunc, `${noFunc.length} ${type}${noFunc.length > 1 ? 's' : ''} with ${background('#ff3333')(foreground('#cfcfcf')('no callbacks'))}:\n`);

    if (errored.length)
    {
        const map = new Map<string, string[][]>();
		for (const error of errored)
			ParseError(error, map);

        if (!map.size) return process.stdout.write(`An ${foreground('#d13636')(`error`)} has been detected while loading assets. Please attach breakpoints on this function next time to track down.\n`);
        process.stdout.write(`Those files had ${foreground('#d13636')(`errors`)} while compiling and skipped:\n`);

        for (const [errorName, errorStacks] of map.entries())
        {
            process.stdout.write(background('#a8a8a8')(foreground('#212121')(`${errorName}\n`)));
			for (const stack of errorStacks)
			{
				const [eMessage, location, line] = stack;
                process.stdout.write(`  ${foreground('#7a7a7a')('line')} ${foreground('#b8b8b8')(`${line}`)} ${foreground('#7a7a7a')('of')} ${foreground('#b5b5b5')(location)}: ${eMessage}\n`);
			}
            process.stdout.write('\n');
        }
    }
    if ((EntriesToCMD || []).length)
    {
        const res = [...new Set(dupFinder(EntriesToCMD))];
        if (res.length)
        {
            const targetList = [];
            for (const element of res)
                targetList.push(element);

            if (targetList.length)
            {
				process.stdout.write(
					`${targetList.length} ${background('#c46e49')(foreground('#c9c7c7')(`duplicated command entr${targetList.length > 1 ? 'ies' : 'y'}`))} found.`
					+ '\n' + `Unstability may occur when executing ${targetList.length > 1 ? 'those entries' : 'this entry'}:`
					+ '\n' + `${foreground('#9c9679')(targetList.join('\n  '))}`
					+ '\n\n',
				);
            }
        }
    }
	return true;
}

function summarize(client: Sayumi, data: Loader, type: AllowedTypes)
{
	const { ConvertBytes: calBytes } = client.Methods.Data;
	const cmdc = client.CommandList.size;
	const typec = type.replace(/cmd/, 'command').replace(/evt/, 'event');
	const { dirIndex } = data;
	if (type === 'cmd')
	{
		console.log(`${foreground('#8c8c8c')(`[${calBytes(dirIndex.size)}]`)} ${foreground('#2dd66b')(`${cmdc} ${typec}${cmdc > 1 ? 's' : ''}`)}`);
        Object.assign(dirIndex, { EntriesToCMD: EntryMergeAll(client) });
	}
	if (type === 'evt') console.log(`${foreground('#8c8c8c')(`[${calBytes(dirIndex.size)}]`)} ${foreground('#2dd66b')(`${client.HANDLED_EVENTS} ${typec}${client.HANDLED_EVENTS > 1 ? 's' : ''}`)}`);

	IssueWarns(dirIndex, type);
}

/** Sums up all command names and aliases into an array. */
function EntryMergeAll(client: Sayumi): string[]
{
    const allNames: string[] = [];
    let allAliases: string[] = [];

    for (const key of client.CommandList.keys())
        allNames.push(key);

    for (const key of client.CommandAliases.keys())
    {
        if (Array.isArray(key)) allAliases = allAliases.concat(key);
        else allAliases.push(key);
    }

	const empty: string[] = [];
    return empty.concat(allNames, allAliases);
}
function dupFinder<K>(arr: K[])
{
	return arr.filter((entry, index: number) => arr.indexOf(entry) !== index);
}

/** Binds each command loaded from the list to its approriate categories.
 * @param {object} client The client to pass in.
 */
function BindCategory(client: Sayumi)
{
	const CategoryList = Object.assign({}, Categories);
	const groupArray: string[] = [];

	// Set categories for comparing
	for (const category in CategoryList)
	{
		const target = CategoryList[category];
		if (!['lastUpdated', 'default'].includes(category)) client.CategoryCompare.set(target.name, target.keywords);
	}

	// Get all category entries
	client.CommandList.forEach(commandObject => {
		commandObject.groups?.forEach(element => {
			if (!groupArray.some(item => item === element)) groupArray.push(element);
		});

		let AssignedGroup: string[] = commandObject.groups;
		if (!AssignedGroup) AssignedGroup = ['Unassigned'];
		for (const group of AssignedGroup)
			if (!groupArray.some(item => item === group)) groupArray.push(group);
	});

	const odd: string[] = [];

	for (const element of groupArray)
	{
		if (Object.keys(CategoryList).some(i => i === element)) continue;
		odd.push(element);
	}

	if (odd.length)
		for (const element of odd)
		{
			if (Array.isArray(element) || element === 'default') continue;
			CategoryList[element] = {
				name: element,
				description: 'No description available yet!',
				colorCode: '#000000',
				keywords: [element],
			};
		}

	// Now, for each command object...
	groupArray.forEach(group => {
		if (Array.isArray(group) || group === 'default') return;
		const commandArray: string[] = [];
		const underDevArray: string[] = [];

		client.CommandList.forEach(cmd => {
			if (cmd.groups?.some(name => name === group))
			{
				commandArray.push(cmd.name);
				if (cmd.flags && cmd.flags.some(i => i === 'Under Developement')) underDevArray.push(cmd.name);
			}
		});

		const groupObject: Command_Group = {
			name: group,
			description: CategoryList[group].description,
			colorCode: CategoryList[group].colorCode,
			commands: commandArray,
			underDev: underDevArray,
			keywords: client.CategoryCompare.get(group) || [group.toLowerCase()],
		};
		client.CommandCategories.set(group, groupObject);
	});

	CategoryList.lastUpdated = Date.now();
	// against default import
	CategoryList.default = null;
	writeFileSync('./utils/json/Categories.json', JSON.stringify(CategoryList, null, 4));
}