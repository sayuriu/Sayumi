/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import beautify from 'beautify';
import { inspect } from 'util';
import { readFileSync, writeFileSync } from 'fs';
import { MessageAttachment, User, MessageReaction, MessageEmbed, TextChannel, Collection } from 'discord.js';
import Sayumi from './Client';
import { ExtMessage } from './interfaces/extended/ExtMessage';

// TODO: use markdown instead
const headerStringArray = [
	'```css',
	'/*# [eval] \'${SID}\' */',
	'',
	' - Type in expressions directly to execute.',
	' - Flags can be included before the expression: [sh/ext/]',
	' - Type -exit to cancel this session.',
	' [NOTE: \'You cannot execute commands in the same channel until this session ends.\']',
	'```',
];

interface EvalInitConfig
{
	ReactionFilter: (reaction: MessageReaction, user: User) => boolean;
	UserFilter: (user: User) => boolean;
}

type AllowedFlags = 'SHOW_HIDDEN' | 'SHOW_EXTENDED' | 'LOG' | 'DEPTH'
interface EvalStats
{
	input: string;
	inputRaw: string;
	inspectDepth: number;
	output?: string;
	outputRaw?: any;
	outputType?: string;
	error?: Error;
	diffTime?: [number, number];
	flags: AllowedFlags[];

	// exports
	file?: string;
	jsonData?: string;
}

export = class EvalInstance
{
	// #region Props
	public readonly Prefix: string;
	public readonly MainInstanceUserID: `${bigint}`;
	public readonly InstanceID: string;
	public readonly ReactionFilter: (reaction: MessageReaction, user: User) => boolean;
	public readonly UserFilter: (user: User) => boolean;

	private readonly listenerChannel: TextChannel;
	private outputWindows: ExtMessage[] = [];
	private currentEmbed: MessageEmbed = null;
	private header: ExtMessage;
	private mainInstance: ExtMessage;
	private currentMessage: ExtMessage;
	// #endregion

	// #region EvalStats
	private evalStatus: EvalStats = {
		input: null,
		inputRaw: null,
		inspectDepth: 2,
		flags: [],
	};
	// #endregion

	get MainInstanceMessageID(): string
	{
		return this.mainInstance.id;
	}

	constructor(message: ExtMessage, config: EvalInitConfig)
	{
		this.ReactionFilter = config.ReactionFilter;
		this.UserFilter = config.UserFilter;
		this.InstanceID = EvalInstance.getSessionsID(message.author.id, message.channel.id);

		this.Prefix = message.prefixCall;
		this.MainInstanceUserID = message.author.id;

		this.listenerChannel = message.channel as TextChannel;
		this.evalStatus.inputRaw = message.content.slice(message.prefixCall.length + 5);
		this.currentMessage = message;
	}

	public start(message: ExtMessage): void
	{
		void message.delete().catch(() => null);
		this.updateState();

		if (!this.evalStatus.inputRaw.replace(/\s+/g, '')) this.blankEmbed('<Awaiting input...>');
		else this.generateEmbeds();

		if (this.currentEmbed instanceof MessageEmbed)
		{
			void this.listenerChannel.send(headerStringArray.join('\n').replace('${SID}', this.InstanceID)).then(m => this.header = m as ExtMessage);
			void this.listenerChannel.send({ embeds: [this.currentEmbed] })
					.then(mainEmbed => {
						if (this.evalStatus.flags.includes('SHOW_EXTENDED'))
							void this.listenerChannel.send(`\`\`\`js\n${this.evalStatus.output}\`\`\`\u200b\`${this.evalStatus.outputType}\``)
								.then(m => this.outputWindows.push(m as ExtMessage));

						if (this.evalStatus.file)
							void this.listenerChannel.send({ files: [new MessageAttachment(readFileSync(this.evalStatus.file), `eval.json`)] })
								.then(m => {
									this.outputWindows.push(m as ExtMessage);
									this.evalStatus.file = null;
									this.evalStatus.jsonData = null;
								});

						this.mainInstance = mainEmbed as ExtMessage;
						void this.listener();
					})
					.catch(e => {
						void this.listenerChannel.send('Eval instance failed to start.');
						this.currentMessage.client.RaiseException(`[Eval] ${e}`);
						return this.destroy();
					});
		}
	}

	private async listener(): Promise<void>
	{
		if (!this || this.mainInstance.deleted) return;

		const collected = await this.listenerChannel
			.awaitMessages({
				filter: (message) => this.UserFilter(message.author),
				max: 1,
				time: 0x7fffffff,
				errors: ['time'],
			})
			.catch(e => {
				this.destroy((e as Error).toString().includes('time') ? 'Input timed out.' : null);
			}) as Collection<`${bigint}`, ExtMessage>;

		if (collected.first())
		{
			this.currentMessage = collected.first();
			void this.currentMessage.delete().catch(() => null);
			if (this.currentMessage.content.toLowerCase().startsWith('-exit')) return this.destroy();

			this.resetState();
			this.clearWindows();
			this.evalStatus.inputRaw = this.currentMessage.content;

			this.updateState();
			this.generateEmbeds();
			this.updateMainInstance();

			if (this.evalStatus.flags.includes('SHOW_EXTENDED'))
				this.listenerChannel.send(`\`\`\`js\n${this.evalStatus.output}\`\`\`\u200b\`${this.evalStatus.outputType}\``)
				.then(m => this.outputWindows.push(m as ExtMessage))
				.catch(() => {
					this.blankEmbed('Failed to display extended window.');
					this.updateMainInstance();
					return;
				});

			if (this.evalStatus.file)
			{
				if (!this.listenerChannel.permissionsFor(this.currentMessage.client.user.id).has('ATTACH_FILES'))
				{
					const desc = this.currentEmbed.description ? this.currentEmbed.description + '\n' : '';
					this.currentEmbed = new MessageEmbed(Object.assign(
						this.currentEmbed,
						{ description: `${desc}'Couldn't send output file. Lacking permission.'` },
					));
					this.updateMainInstance();
				}
				else void this.listenerChannel.send({ files: [new MessageAttachment(readFileSync(this.evalStatus.file), `eval.json`)] })
					.then(m => {
						this.outputWindows.push(m as ExtMessage);
						this.evalStatus.file = null;
						this.evalStatus.jsonData = null;
					});
			}
		}
		return await this.listener();
	}

	private updateMainInstance()
	{
		if (!this.mainInstance?.deleted && this.currentEmbed)
			void this.mainInstance.edit({ embeds: [this.currentEmbed] })
			.catch(() => this.destroy());
		return;
	}

	private generateEmbeds()
	{
		this.currentEmbed = this.evalStatus.outputType === 'error' ? TerminalEmbed.Error(this.evalStatus) : TerminalEmbed.Success(this.evalStatus);
		return;
	}

	private clearWindows()
	{
		this.outputWindows.forEach(inst => {
			if (!inst.deleted && inst.deletable) void inst.delete().catch();
			this.outputWindows.splice(this.outputWindows.indexOf(inst), 1);
		});
		return;
	}

	resetState(): void
	{
		// unnecessary?
		this.evalStatus.inputRaw = null;
		this.evalStatus.input = null;

		this.evalStatus.inspectDepth = 2;
		this.evalStatus.error = null;
		this.evalStatus.output = null;
		this.evalStatus.outputRaw = null;
		this.evalStatus.outputType = null;
		this.evalStatus.flags = [];
		this.evalStatus.diffTime = [0, 0];
		this.currentEmbed = null;
		return;
	}

	private updateState()
	{
		const processor = new EvalProcessor(this.evalStatus, this.currentMessage);
		this.evalStatus = processor.run();
		processor.destroy();
		return;
	}

	public destroy(message?: string, force = false): void
	{
		if (!force)
		{
			void this.header?.edit(message ?? '```\nThis session is destroyed. No input will be taken.```').catch(() => null);
			this.blankEmbed('<destroyed session>');
			this.updateMainInstance();
			if (/\s(-%del|-%d)\s*/.exec(this.currentMessage.content))
			{
				setTimeout(() => {
					void this.mainInstance.delete();
					void this.header.delete();
				}, 5000);
			}
		}
		this.currentMessage.client.EvalSessions.delete(EvalInstance.getSessionsID(this.MainInstanceUserID, this.listenerChannel.id));
		this.clearWindows();
		for (const key in this) delete this[key];
		return;
	}

	static getSessionsID(userID: `${bigint}`, channelID: `${bigint}`): string
	{
		return (parseInt(userID) + parseInt(channelID)).toString(16);
	}

	blankEmbed(message: string): void
	{
		this.currentEmbed = new MessageEmbed({
			title: 'Terminal',
			color: '#BDBDBD',
			fields: [{
				name: '\u200b',
				value: `\`\`\`\n${message}\`\`\``,
			}],
		});
		return;
	}
}

interface FlagRegExp
{
	"SHOW_HIDDEN": RegExp;
	"SHOW_EXTENDED": RegExp,
	"LOG": RegExp,
	"DEPTH": RegExp,
}

class EvalProcessor
{
	private message: ExtMessage;
	get FlagRegex()
	{
		return {
			"SHOW_HIDDEN": /-(-showHidden|-showhidden|sh|SH)\s{1}/g,
			"SHOW_EXTENDED": /-(ext|-showExt)\s{1}/g,
			"LOG": /-(-log|l)\s{1}/g,
			"DEPTH": /-(d|-depth)\s(\d+)\s{1}/g,
		};
	}

	get IllegalRegex()
	{
		return [
			/(this\.)?message\.client\.token/g,
			/process\.env/g,
		];
	}

	constructor(private data: EvalStats, message: ExtMessage)
	{
		this.message = message;
		null;
	}

	public run()
	{
		this.processInput();
		this.execute(this.data.input, this.message, this.message.client, console.log);
		this.outputCheck();
		this.DataExport();
		return this.data;
	}

	public destroy()
	{
		for (const key in this) delete this[key];
		return;
	}

	private processInput()
	{
		let { inputRaw: input } = this.data;

		for (const flag in this.FlagRegex)
		{
			const regexMatch = this.FlagRegex[flag as keyof FlagRegExp].exec(input);
			if (regexMatch)
			{
				if (flag === 'DEPTH')
					this.data.inspectDepth = parseInt(regexMatch.filter(e => !Number.isNaN(parseInt(e)))[0]);

				input = input.replace(this.FlagRegex[flag], '');
				if (!this.data.flags.includes(flag as AllowedFlags)) this.data.flags.push(flag as AllowedFlags);
			}
		}
		this.data.input = input.trim();
		return;
	}

	private execute(input: string, message: ExtMessage, client: Sayumi, log = console.log)
	{
		try
		{
			if (this.IllegalInputTest(this.data.inputRaw.toLowerCase()))this.throw('FORBIDDEN', 'Illegal keywords / varibles found.');
			if (input.startsWith(this.message.prefixCall)) this.throw('CONFLICTED_HEADER', 'Input started with this bot\'s prefix.');

			const outputRaw: any = eval(input);
			const output = inspect(
						outputRaw,
						this.data.flags.includes('SHOW_HIDDEN'),
						this.data.inspectDepth,
						false,
					);

			if (this.data.flags.includes('LOG'))
				this.message.client.Log('info', inspect(
						outputRaw,
						this.data.flags.includes('SHOW_HIDDEN'),
						this.data.inspectDepth,
						true,
					));

			const startTime = process.hrtime();
			const diffTime = process.hrtime(startTime);

			let outputType = (typeof outputRaw).toString();
			if (outputType === 'undefined') outputType = 'unknown';
			if (output.startsWith('[')  && output.endsWith(']') && typeof outputRaw !== 'function') outputType = 'array';
			outputType = outputType.replace(outputType.substr(0, 1), outputType.substr(0, 1).toUpperCase());

			if (output.indexOf('{') > -1 && output.endsWith('}'))
			{
				const header = output.substr(0, output.indexOf('{') - 1);
				if (header)
				{
					if (header.toLowerCase().includes(outputType.toLowerCase()))
					{
						outputType = `[${header}]`;
						outputType = outputType.replace(/^\[+/, '').replace(/]+$/, '');
					}
					else outputType += `: ${header}`;
				}
			}

			Object.assign(this.data, {
				error: null,
				output,
				outputRaw,
				outputType,
				diffTime,
			});

		} catch (error) {
			Object.assign(this.data, {
				error,
				output: null,
				outputRaw: null,
				outputType: 'error',
				diffTime: [0, 0],
			});
		}
	}

	private outputCheck()
	{
		if (this.data.error) return;
		if (this.data.output.length > 1024)
		{
			let JSONObjectString: string;
			try
			{
				JSONObjectString = JSON.stringify(this.data.outputRaw, null, 4);
				if (JSONObjectString)
				{
					if (this.data.flags.includes('SHOW_EXTENDED') && JSONObjectString.length <= 2048) this.data.output = inspect(JSON.parse(JSONObjectString), false, null, false);
					else if (JSONObjectString.length <= 1024) this.data.output = inspect(JSON.parse(JSONObjectString), false, null, false);

					Object.assign(
						this.data,
						{ fileName: `${Math.round(Math.random() * Date.now() * 0x989680).toString(16)}.json` },
						{ writeData: JSONObjectString },
					);
					this.DataExport();
				}
				else while (!this.data.flags.includes('SHOW_EXTENDED'))
					this.data.flags.push('SHOW_EXTENDED');

			} catch(_) {
				while (!this.data.flags.includes('SHOW_EXTENDED'))
					this.data.flags.push('SHOW_EXTENDED');
			}
		}
	}

	private DataExport()
	{
		const { file = null, jsonData = null } = this.data;
		if (file && jsonData)
		{
			writeFileSync(`temp/${file}.json`, jsonData);
			this.data.file = `temp/${file}.json`;
		}
		if (this.data.output?.length >= 1024)
		{
			const showExt = this.data.flags.includes('SHOW_EXTENDED');
			let indexOfLastNL: number;

			if (showExt) indexOfLastNL = this.data.output.substr(0, 1956).lastIndexOf('\n');
			else indexOfLastNL = this.data.output.substr(0, 1010).lastIndexOf('\n');
			this.data.output = this.data.output.substr(0, indexOfLastNL) + '\n...';
		}
	}

	private throw(name: string, message: string)
	{
		class BaseError extends Error {
			constructor(header?: string, ...msg: string[])
			{
				super(...msg);
				this.name = header ?? 'UNKNOWN_ERROR';
				this.name = this.name.toUpperCase();

				Error.captureStackTrace(this, BaseError);
			}
		}
		throw new BaseError(name, message);
	}

	private IllegalInputTest(input: string): boolean
	{
		for (const pattern of this.IllegalRegex)
		{
			if (pattern.exec(input)) return true;
		}
		return false;
	}
}

class TerminalEmbed
{
	static Success(result: EvalStats)
	{
		const { diffTime, input, output, outputType, flags, inspectDepth } = result;
		const ifDepth = (flag: AllowedFlags) => {
			if (flag === 'DEPTH' && inspectDepth !== 2) return `\`DEPTH [L${inspectDepth}]\``;
			return `\`${flag}\``;
		};
		return new MessageEmbed({
			title: 'Terminal',
			color: '#5ACC61',
			fields: [
				{
					name: 'Input',
					value: (flags.length ? `\`flags:\` ${flags.map(ifDepth).join(', ')}\n` : '') +
					`\`\`\`js\n${beautify(input, { format: 'js' })}\n\`\`\``,
				},
				{
					name: 'Output',
					value: [
						'```js',
						flags.includes('SHOW_EXTENDED') ?
							'The output is shown below.' :
							(output.length > 1010 ? output.substr(0, output.substr(0, 1010).lastIndexOf('\n')) + '\n...' : output),
						'\n```',
					].join('\n'),
				},
			],
			footer: {
				text: `${flags.includes('SHOW_EXTENDED') ? `Executed in ${diffTime[0] ? `${diffTime}s` : ""}${diffTime[1] / 1000}ms` : `[${outputType}] | Executed in ${diffTime[0] ? `${diffTime}s` : ""}${diffTime[1] / 1000}ms`}`,
			},
			timestamp: Date.now(),
		});
	}

	static Error(result: EvalStats)
	{
		const { input, error } = result;

		return new MessageEmbed({
			title: 'Terminal',
			color: '#FA3628',
			fields: [
				{
					name: 'Input',
					value: `\`\`\`js\n${beautify(input, { format: 'js' })}\n\`\`\``,
				},
				{
					name: `Error [${error.name ?? 'unknown'}]`,
					value: `\`${error.message}\``,
				},
			],
			timestamp: Date.now(),
		});
	}
}
