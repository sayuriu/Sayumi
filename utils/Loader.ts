/* eslint-disable @typescript-eslint/no-namespace */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-var-requires */

import { lstatSync, statSync, readdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import * as readline from 'readline';
import chalk from 'chalk';

import ParseError, { Errors } from './functions/common/parse-errors';
import groupSettings from './GroupSettings';
import * as Categories from '../utils/json/Categories.json';
import Sayumi from './Client';
import Sayumi_Command from './interfaces/Command';
import Sayumi_Event from './interfaces/Event';

declare function require(id:string): Sayumi_Command | Sayumi_Event;
declare namespace require {
	export const cache: string[];
	export const resolve: (id: string, options?: { paths?: string[]; }) => string;
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

type AllowedTypes = 'cmd' | 'evt';

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
	constructor(client: Client, [path, type]: [string, AllowedTypes])
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

		this.stdoutSignalSend = signal =>
        {
            switch (signal)
            {
                case 'start-scan':
                {
                    const string = chalk.hex('#30e5fc')('[Bootstrap] ')
                                        + chalk.hex('8c8c8c')(`scan ${this.type}: `)
                                        + chalk.hex('#c15ee6')(this.path)
                                        + ' scanning';
                    return process.stdout.write(string);
                }
                case 'end-scan':
                {
                    const string = chalk.hex('#30e5fc')('[Bootstrap] ')
                                        + chalk.hex('8c8c8c')(`scan ${this.type}: `)
                                        + chalk.hex('#c15ee6')(this.path)
                                        + ' complete\n';
					readline.cursorTo(process.stdout, 0);
                    return process.stdout.write(string);
                }
            }
        };

		this.stdoutSignalSend('start-scan');
		this.recursiveLoad(client, this.path);
        this.stdoutSignalSend('end-scan');
		summarize(client, this, this.type);
	}

	recursiveLoad(client: Client, path: string): void
	{
		readdirSync(path).forEach(file => {
			const fullPath = join(path, file);
			// const fullPath = join(this.mainRoot, dirPath);

			if (lstatSync(fullPath).isDirectory()) return this.recursiveLoad(client, fullPath);
			if (file.endsWith(".js")) ParseCheck(this.type, client, fullPath, this);
		});
		if (this.type === 'cmd') BindCategory(client);
	}
}

export function ParseCheck(type: AllowedTypes, client: Client, path: string, data: any): number
{
	const { invalidNames, emptyFiles, noFunc, errored } = data.dirIndex ?? { invalidNames: [], emptyFiles: [], noFunc: [], errored: [] };

	try
	{
		let object = require(require.resolve(`.\\..\\${path}`));

		const size = statSync(path).size;
		const { name } = object;
		data.dirIndex.size += size;

		if (!size) return emptyFiles.push(path);

		if (!name || typeof name !== 'string') return invalidNames.push(path);

		if (type === 'cmd')
		{
			const { aliases, onTrigger, groups: group } = object as Sayumi_Command;

			if (group?.length)
            {
                for (let i = 0; i < group.length; i++)
                {
                    if (Object.keys(groupSettings).includes(group[i]))
                    {
                        const configs = {};
                        const { global, groups } = groupSettings[group[i]];
                        for (const option in groups)
                        {
                            if (groups[option].includes(name)) configs[option] = true;
                        }
                        object = Object.assign(object, configs, global ? global : {});
                    }
                }
			}
			// Check for command's functions
			if (!onTrigger || typeof onTrigger !== 'function') return noFunc.push(name ? `"${name}": ${path}` : path);

			client.CommandList.set(
                name,
                Object.assign(
                    object as Sayumi_Command,
                    { memWeight: size, loadTime: Date.now() },
                ),
            );
			if ((aliases || []).length) client.CommandAliases.set(aliases, name);
            data.loaded++;
		}


		if (type === 'evt')
		{
			const { once, onEmit, music } = object as Sayumi_Event;

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
		}

	} catch (e) {
		errored.push(e);
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
        item.forEach(i => process.stdout.write(`  ${chalk.hex('#b5b5b5')(i)}\n`));
        process.stdout.write('\n');
    }

    if (invalidNames.length) out(invalidNames, `${invalidNames.length} file${invalidNames.length > 1 ? 's' : ''} with ${chalk.hex('#e38c22')('no or invalid names')}:\n`);
    if (emptyFiles.length) out(emptyFiles, `${emptyFiles.length} ${chalk.hex('#8f8f8f')(`empty file${emptyFiles.length > 1 ? 's' : ''}`)}:\n`);
    if (noFunc.length) out(noFunc, `${noFunc.length} ${type}${noFunc.length > 1 ? 's' : ''} with ${chalk.hex('#cfcfcf').bgHex('#ff3333')('no callbacks')}:\n`);

    if (errored.length)
    {
        const map = new Map<string, string[][]>();
        errored.forEach(e => ParseError(e, map));
		console.log(errored);

        if (!map.size) return process.stdout.write(`An ${chalk.hex('#d13636')(`error`)} has been detected while loading assets. Please attach breakpoints on this function next time to track down.\n`);
        process.stdout.write(`Those files had ${chalk.hex('#d13636')(`errors`)} while compiling and skipped:\n`);
        for (const entry of map.entries())
        {
            const errorName: string = entry[0];
            const errorStacks = entry[1];

            process.stdout.write(chalk.hex('#212121').bgHex('#a8a8a8')(`${errorName}\n`));
            errorStacks.forEach(stack => {
                const [eMessage, location, line] = stack;
                process.stdout.write(`  ${chalk.hex('#7a7a7a')('line')} ${chalk.hex('#b8b8b8')(`${line}`)} ${chalk.hex('#7a7a7a')('of')} ${chalk.hex('#b5b5b5')(location)}: ${eMessage}\n`);
            });
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
            {
                targetList.push(element);
            }
            if (targetList.length)
            {
                const outString = `${targetList.length} ${chalk.hex('#c9c7c7').bgHex('#c46e49')(`duplicated command entr${targetList.length > 1 ? 'ies' : 'y'}`)} found.\n Unstability may occur when executing ${targetList.length > 1 ? 'those entries' : 'this entry'}:\n  `
                                        + `${chalk.hex('#9c9679')(targetList.join('\n  '))}\n`;
                process.stdout.write(outString + '\n');
            }
        }
    }
	return true;
}

function summarize(client: Client, data: Loader, type: AllowedTypes)
{
	const { ConvertBytes: calBytes } = client.Methods.Data;
	const cmdc = client.CommandList.size;
	const typec = type.replace(/cmd/, 'command').replace(/evt/, 'event');
	const { dirIndex } = data;
	if (type === 'cmd')
	{
		console.log(`${chalk.hex('#8c8c8c')(`[${calBytes(dirIndex.size)}]`)} ${chalk.hex('#2dd66b')(`${cmdc} ${typec}${cmdc > 1 ? 's' : ''}`)}`);
        Object.assign(dirIndex, { EntriesToCMD: EntryMergeAll(client) });
	}
	if (type === 'evt') console.log(`${chalk.hex('#8c8c8c')(`[${calBytes(dirIndex.size)}]`)} ${chalk.hex('#2dd66b')(`${client.HANDLED_EVENTS} ${typec}${client.HANDLED_EVENTS > 1 ? 's' : ''}`)}`);

	IssueWarns(dirIndex, type);
}

/** Sums up all command names and aliases into an array. */
function EntryMergeAll(client: Client): string[]
{
    const allNames: string[] = [];
    let allAliases: string[] = [];

    for (const key of client.CommandList.keys())
    {
        allNames.push(key);
    }
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

/** Binds each command loaded from the list to its approriate c ategories.
 * @param {object} client The client to pass in.
 */
function BindCategory(client: Client)
{
	const CategoryList = Object.assign({}, Categories);
	const groupArray: string[] = [];

	// Set categories for comparing
	for (const category in CategoryList)
	{
		const target = CategoryList[category];
		client.CategoryCompare.set(target.name, target.keywords);
	}

	// Get all category entries
	client.CommandList.forEach(commandObject => {
		if (Array.isArray(commandObject.groups))
		{
			commandObject.groups.forEach(element => {
				if (!groupArray.some(item => item === element)) groupArray.push(element);
			});
		}

		let AssignedGroup: string[] | string = commandObject.groups;
		if (!AssignedGroup) AssignedGroup = 'Unassigned';
		if (!groupArray.some(item => item === AssignedGroup)) groupArray.push(...AssignedGroup);
	});

	const odd: string[] = [];

	groupArray.forEach(element => {
		if (Object.keys(CategoryList).some(i => i === element)) return;
		else odd.push(element);
	});

	if (odd.length) odd.forEach(element => {
		if (Array.isArray(element)) return;
		CategoryList[element] = {
			name: element,
			description: 'No description available yet!',
			colorCode: '#000000',
			keywords: [element],
		};
	});

	// Now, for each command object...
	groupArray.forEach(group => {
		if (Array.isArray(group)) return;
		const commandArray: string[] = [];
		const underDevArray: string[] = [];

		client.CommandList.forEach(cmd => {
			if (cmd.groups?.some(name => name === group))
			{
				commandArray.push(cmd.name);
				if (cmd.flags && cmd.flags.some(i => i === 'Under Developement')) underDevArray.push(cmd.name);
			}
		});

		const groupObject = {
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
	writeFileSync('./utils/json/Categories.json', JSON.stringify(CategoryList, null, 4));
}

import { Collection } from 'discord.js';
import Command_Group from './interfaces/CmdGroup';
import { Player as MusicPlayer, PlayerEvents } from 'discord-player';
import Methods from './Methods';

interface Client extends NodeJS.EventEmitter
{
	ROOT_DIR: string;
	HANDLED_EVENTS: number;
	CommandList: Collection<string, Sayumi_Command>;
	CommandAliases: Collection<string[], string>;
	CommandCategories: Collection<string, Command_Group>;
	CategoryCompare: Collection<string, string[]>;

	MusicPlayer: MusicPlayer;
	Methods: typeof Methods;
}