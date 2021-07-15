/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import beautify from "beautify";
import { Channel, Collection, User, MessageEmbed as EmbedConstructor, MessageReaction, Message, TextChannel, NewsChannel, ThreadChannel, DMChannel, MessageEmbed, MessageAttachment } from "discord.js";
import { readFileSync, writeFileSync } from "fs";
import { inspect } from "util";
import Sayumi from "./Client";
import { ExtMessage } from "./interfaces/extended/ExtMessage";

const headerStringArray = [
	'--------- [EVAL SESSION ACTIVE] \'${SID}\'',
	'',
	' - Type in expressions directly to execute.',
	' - Flags can be included before the expression: [sh/ext/]',
	' - Type -exit to cancel this session.',
	' [NOTE: \'You cannot execute commands in the same channel until this session ends.\']',
];
interface EvalInitData extends ExtMessage
{
	sessionID?: string;
	input?: string;
	prefix: string;
	ReactionFilter: (reaction: MessageReaction, user: User) => boolean;
	UserFilter: (user: User) => boolean;
}

type Flags = 'showExtended' | 'showHidden'
type Inputs = Collection<`${bigint}`, Message>;


interface EvalError
{
	name: string;
	stack: string;
	message: string;
}

interface EvalResult
{
	flags: Flags[];
	diffTime: [number, number?];
	output: string | EvalError;
	outputType: string;
	outputRaw: any;
	fileName?: string;
	filePath?: string;
	writeData?: any;
	exceedBoolean?: boolean;
}

export default class EvalRenderer implements EvalResult
{
	flags: Flags[] = [];
	diffTime: [number, number?];
	output: string | EvalError;
	outputType: string;
	outputRaw: any;
	fileName?: string;
	filePath?: string;
	writeData?: any;
	exceedBoolean = false;

	private header: ExtMessage | null;
	private mainEmbedInstance: ExtMessage;
	private mainInstanceUserID: `${bigint}`;
	public InstanceID: string;
	private listenerChannel: TextChannel | DMChannel;
	private destroyed = false;
	private outputWindows: ExtMessage[];
	private input: string;
	private ReactionFilter: (reaction: MessageReaction, user: User) => boolean;
	private UserFilter: (user: User) => boolean;
	private _embed: null | MessageEmbed;
	private lastInput: Inputs;
	private prefix: string;

	private a = -1;
	private sessionActiveString: string;
	private sessionDestroyedString: string;

	constructor(private config: EvalInitData)
	{
		this.mainInstanceUserID = config.author.id;
		this.InstanceID = config.sessionID;
		this.listenerChannel = (config.channel as TextChannel | DMChannel);
		this.outputWindows = [];
		this.input = config.content.slice(config.prefix.length);
		this.ReactionFilter = config.ReactionFilter;
		this.UserFilter = config.UserFilter;
		this._embed;
		this.lastInput;
		this.prefix = config.prefix;

		this.sessionActiveString = `\`\`\`css\n${headerStringArray.join('\n')
				.replace(/\n/g, () => {
					this.a++;
					if (this.a === 0) return '\n';
					return `\n0${this.a} `;
				})
				.replace(/\${SID}/g, '0x' + this.InstanceID)}\`\`\``;
		this.sessionDestroyedString = '```\nThis session is destroyed. No input will be taken until you start a new one.```';
	}

	start(): void
	{
		void this.config.delete();
		void this.updateState();

		if (this.input.replace(/\s+/g, '') === '') this.resetUI('<Awaiting input...>');
		else this.generateEmbeds();

		if (this._embed instanceof EmbedConstructor)
		{
			void this.listenerChannel.send(this.sessionActiveString).then(m => this.header = m as ExtMessage);
			void this.listenerChannel.send({ embeds: [this._embed] }).then(mainEmbed => {

				if (this.flags.some(f => f === 'showExtended')) void this.listenerChannel.send(`\`\`\`js\n${this.output}\`\`\`\u200b\`${this.outputType}\``).then(m => this.outputWindows.push(m as ExtMessage));
				if (this.exceedBoolean && this.filePath) void this.listenerChannel.send({ files: [new MessageAttachment(readFileSync(this.filePath), `eval.json`)] }).then(m => {
					this.outputWindows.push(m as ExtMessage);
					this.exceedBoolean = false;
				});

				this.mainEmbedInstance = mainEmbed as ExtMessage;
				void this.listener();
			});
		}
	}

	// Main listener of this instance
	async listener(): Promise<void>
	{
		if (this.destroyed || this.mainEmbedInstance.deleted) return;
		this.lastInput = await this.listenerChannel.awaitMessages({ filter: (m: ExtMessage) => m.author.id === this.mainInstanceUserID, max: 1, time: 0x7fffffff, errors: ['time'] }).catch(async error => {
			return await this.listener();
		}) as Inputs;
		if (this.lastInput.first())
		{
			(this.config as ExtMessage) = this.lastInput.first() as ExtMessage;
			void this.lastInput.first().delete();

			this.resetState();
			this.clearWindows();
			this.input = this.lastInput.first().content;

			if (this.input.toLowerCase().startsWith('-exit')) return this.destroyInstance();

			await this.updateState();
			this.generateEmbeds();
			this.updateMainInstance();

			if (this.flags.some(f => f === 'showExtended')) void this.listenerChannel.send(`\`\`\`js\n${this.output}\`\`\`\u200b\`${this.outputType}\``).then(m => this.outputWindows.push(m as ExtMessage));
			if (this.exceedBoolean && this.filePath)
			{
				if (!(this.listenerChannel as TextChannel).permissionsFor(this.config.client.user.id).has('ATTACH_FILES'))
				{
					const desc = this._embed.description ? this._embed.description + '\n' : '';
					this._embed = new EmbedConstructor(Object.assign(
						this._embed,
						{ description: `${desc}'Couldn't send output file. Lacking permission.'` },
					));
				}
				else
				{
					void this.listenerChannel.send({ files: [new MessageAttachment(readFileSync(this.filePath), `eval.json`)] }).then(m => {
						this.outputWindows.push(m as ExtMessage);
						this.exceedBoolean = false;
					});
				}
			}
		}
		return await this.listener();
	}

	updateMainInstance(): void
	{
		if (!this.mainEmbedInstance.deleted && this._embed) void this.mainEmbedInstance.edit({ embeds: [this._embed] });
	}

	generateEmbeds(): void
	{
		const data = {
			input: this.input,
			result: this,
			flags: this.flags,
		};
		if (this.outputType === 'error') this._embed = new TerminalEmbeds(data).ReturnError();
		else this._embed = new TerminalEmbeds(data).ReturnSucess();
	}

	clearWindows(): void
	{
		this.outputWindows.forEach(inst => {
			if (inst.deleted) return;
			void inst.delete();
			this.outputWindows.splice(this.outputWindows.indexOf(inst), 1);
		});
	}

	async updateState(): Promise<void>
	{
		const data = {
			message: this.config,
			prefix: this.prefix,
			rawInput: this.input,
			flags: this.flags,
		};
		const newState = await new GeneralProcessing(data).run();
		Object.assign(this, newState);
	}

	resetState(): void
	{
		this.output = null;
		this.outputRaw = null;
		this.outputType = null;
		this.flags = [];
		this.diffTime = [0];
		this._embed = null;
	}

	destroyInstance(): void
	{
		void this.header.edit(this.sessionDestroyedString);
		this.resetUI('<destroyed session>');
		this.updateMainInstance();
		if (/\s(-%del|-%d)\s*/.exec(this.config.content))
		{
			setTimeout(() => {
				void this.mainEmbedInstance.delete();
				void this.header.delete();
			}, 5000);
		}
		this.config.client.EvalSessions.delete(EvalRenderer.getSessionsID(this.config.author, this.config.channel));
		this.destroyed = true;
		return;
	}

	resetUI(message: string): void
	{
		this._embed = new EmbedConstructor()
							.setTitle('Terminal')
							.setColor('#bdbdbd')
							.addField('\u200b', `\`\`\`\n${message}\`\`\``);
	}

	static getSessionsID(user: User, channel: Channel): string
	{
		return (parseInt(user.id) + parseInt(channel.id)).toString(16);
	}
}

interface ProcessInputData
{
	message: ExtMessage;
	prefix: string;
	rawInput: string;
	flags: Flags[];
}

class GeneralProcessing implements EvalResult
{
	input: string;
	message: ExtMessage;
	flags: Flags[];
	rawInput: string;
	prefix: string;

	diffTime: [number, number?];
	output: string | EvalError;
	outputType: string;
	outputRaw: any;
	fileName?: string;
	filePath?: string;
	writeData?: any;
	exceedBoolean?: boolean;

	constructor(data: ProcessInputData)
	{
		Object.assign(this, data);
	}

	run(): Promise<this>
	{
		return new Promise((resolve, _) => {
			this.input = this.processInput(this.rawInput);
			Object.assign(this, this.execute(
				this.input,
				this.flags,
				this.message,
				this.message.client,
			));

			this.outputCheck(this.message, this);
			(this.output as string) = this.ErrorExport(this) as string;
			return resolve(this);
		});
	}

	private processInput(rawInput: string): string
	{
		let input =  rawInput;
		const flag_showHidden = /\s*-(showHidden|showhidden|sh|SH)\s*/.exec(input);
		const flag_showExt = /\s*-(ext|showExt)\s*/.exec(input);

		if (flag_showHidden && flag_showHidden[0].length)
		{
			input = input.replace(/\s*-?(showHidden|showhidden|sh|SH)\s*/, '');
			this.flags.push('showHidden');
		}
		if (flag_showExt && flag_showExt[0].length)
		{
			input = input.replace(/\s*-?(ext|showExt)\s*/, '');
			this.flags.push('showExtended');
		}

		input = input.replace(/^`+(js)?/, '').replace(/`+$/, '');
		return input;
	}

	// request feature: custom depth args input
	private execute(input: string, flagArray: Flags[], message: ExtMessage, client: Sayumi, log = console.log)
	{
		try
		{
			if (illegalStrings(input.toLowerCase()))this.throw('FORBIDDEN', 'Illegal keywords / varibles found.');
			if (input.startsWith(this.prefix)) this.throw('CONFLICTED_HEADER', 'Input started with this bot\'s prefix.');

			const startTime = process.hrtime();
			const outputRaw: any = eval(input);
			const diffTime = process.hrtime(startTime);
			let outputType: string = (typeof outputRaw).toString();
			//
			const output = inspect(outputRaw, flagArray.some(f => f === 'showHidden'), 2, false);

			if (outputType === 'undefined') outputType = 'statement?/unknown';
			outputType = outputType.replace(outputType.substr(0, 1), outputType.substr(0, 1).toUpperCase());

			if (output.indexOf('{') > -1 && output.endsWith('}'))
			{
				const header = output.substr(0, output.indexOf('{') - 1);
				if (header.toLowerCase().includes(outputType.toLowerCase()))
				{
					outputType = `[${header}]`;
					outputType = outputType.replace(/^\[+/, '').replace(/]+$/, '');
				}
				else outputType += `: ${header}`;
			}

			return { flags: flagArray, diffTime, output, outputType, outputRaw } as EvalResult;

		} catch (error) {
			const { name, message: eMessage, stack } = error as Error;
			return {
				flags: flagArray,
				diffTime: [0],
				output: {
					name,
					stack: stack.substr(stack.indexOf('at '), stack.length),
					message: eMessage,
				},
				outputType: 'error',
				outputRaw: null,
			} as EvalResult;
		}
	}

	private outputCheck(message: ExtMessage, data: EvalResult): void
	{
		if ((data.output as EvalError).stack) return;
		if ((data.output as string).length > 1024)
		{
			let JSONObjectString: string;
			try
			{
				JSONObjectString = JSON.stringify(data.outputRaw, null, 4);
				if (JSONObjectString)
				{
					if (data.flags.some(f => f === 'showExtended') && JSONObjectString.length <= 2048) data.output = inspect(JSON.parse(JSONObjectString), false, null, false);
					else if (JSONObjectString.length <= 1024) data.output = inspect(JSON.parse(JSONObjectString), false, null, false);
					data.exceedBoolean = true;

					this.DataExport(Object.assign(
							data,
							{ fileName: `${message.author.id}-${message.createdTimestamp}.json` },
							{ writeData: JSONObjectString },
					));
				}
				else
				{
					data.flags.push('showExtended');
					this.DataExport(data, true);
				}
			} catch(error) {
				data.flags.push('showExtended');
				this.DataExport(data, true);
			}
		}
	}

	private DataExport(data: EvalResult, showExt = false)
	{
		const { fileName = null, writeData = null } = data;
		if (fileName && writeData)
		{
			writeFileSync(`./temps/${fileName}`, writeData);
			data.filePath = `./temps/${fileName}`;
		}
		data.output = data.output as string;
		data.output = data.output.substr(0, data.output.substr(0, showExt ? 1956 : 1010).lastIndexOf('\n')) + '\n...';
	}

	private ErrorExport(data: EvalResult)
	{
		if (data.outputType !== 'error') return data;
		(data.output as EvalError).stack = 'Hidden';
		return inspect(JSON.parse(JSON.stringify(data, null, 4)), false, null, false);
	}

	private throw(name: string, message: string): void
	{
		class BaseError extends Error {
			name: string;
			constructor(header: string, ...msg: string[])
			{
				super(...msg);
				this.name = header || 'UNKNOWN_ERROR';
				this.name = this.name.toUpperCase();

				Error.captureStackTrace(this, BaseError);
			}
		}
		throw new BaseError(name, message);
	}
}

interface EmbedConstructData
{
	input: string;
	result: EvalResult;
	flags: Flags[];
}

class TerminalEmbeds
{
	constructor(private readonly data: EmbedConstructData)
	{
		null;
	}
	ReturnSucess()
	{
		const { input, result: { diffTime, outputType, flags } } = this.data;
		const showExt = flags.some(f => f === 'showExtended');
		const output = this.data.result.output as string;

		return new EmbedConstructor()
				.setTitle('Terminal')
				.setColor('#5acc61')
				.addField('Input', `${flags.length ? `\`flags: ${flags.join(', ')}\`\n` : ''}\`\`\`js\n${beautify(input, { format: 'js' })}\n\`\`\``)
				.addField('Output', `\`\`\`js\n${showExt ? 'The output is shown below.' : output.length > 1010 ? output.substr(0, output.substr(0, 1010).lastIndexOf('\n')) + '\n...' : output}\n\`\`\``)

				.setFooter(`${showExt ? `Executed in ${diffTime[0] > 0 ? `${diffTime}s` : ""}${diffTime[1] / 1000}ms` : `[${outputType}] | Executed in ${diffTime[0] > 0 ? `${diffTime}s` : ""}${diffTime[1] / 1000000}ms`}`)
				.setTimestamp();
	}

	ReturnError()
	{
		const { input } = this.data;
		const { name, message } = this.data.result.output as EvalError;

		return new EmbedConstructor()
				.setTitle('Terminal')
				.setColor('#fa3628')

				.addField('Input', `\`\`\`js\n${beautify(input, { format: 'js' })}\n\`\`\``)
				.addField('Error', `\`[${name}] ${message}\``)

				.setTimestamp();
	}
}

function illegalStrings(input: string): boolean {
	const match = (reg: RegExp) => reg.exec(input);
	if (match(/(this\.)?message\.client\.token/g)) return true;
	if (match(/process\.env/)) return true;
	return false;
}