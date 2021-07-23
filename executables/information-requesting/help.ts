/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Collection, MessageEmbed, MessageActionRow, MessageButton, MessageSelectMenu, MessageButtonOptions, MessageActionRowComponent, SelectMenuInteraction, AwaitMessageComponentOptions, MessageComponentInteraction, Message, GuildMember } from 'discord.js';
import ButtonData from '../../utils/interfaces/ButtonData';
import Command_Group from '../../utils/interfaces/CmdGroup';
import Sayumi_Command from '../../utils/interfaces/Command';
import { ExtMessage } from '../../utils/interfaces/extended/ExtMessage';
import GuildSettings from '../../utils/interfaces/GuildSettings';
import responses from '../../utils/json/Responses.json';
import settingsList from '../../utils/json/SettingsObjects.json';
import generatePages from '../../utils/methods/common/generate-pages';
import GetRandomize from '../../utils/methods/common/randomize';

const cmd: Sayumi_Command = {
	name: 'help',
	aliases : ['helps', 'holps', '?'],
	description: 'A help command for those in need.',
	args: true,
	groups: ['Information'],
	cooldown: 15,
	usage: ['[category?]', '[command?]'],
	onTrigger: (_, message, ...args) => {
		if (message.deletable) void message.delete();
		new Handler(message, args);
	},
};

type Pages = [string, string, number[]][] & { len: number }
class Handler
{
	readonly navButtons: ButtonData = {
		global: {
			style: 'PRIMARY',
		},
		individual: [
			{
				label: 'First',
				customId: 'help-nav:first',
			},
			{
				label: 'Previous',
				customId: 'help-nav:prev',
			},
			{
				label: 'Jump to...',
				customId: 'help-nav:goto',
			},
			{
				label: 'Next',
				customId: 'help-nav:next',
			},
			{
				label: 'Last',
				customId: 'help-nav:last',
			},
		],
	};

	readonly mainOptionButtons: ButtonData = {
		global: {
			style: 'PRIMARY',
			type: 'BUTTON',
		},
		individual: [
			{
				label: 'Categories',
				customId: 'help:categories',
			},
			{
				label: 'Settings',
				customId: 'help:settings',
			},
			{
				label: 'Search',
				customId: 'help:search',
			},
			{
				label: 'Exit',
				style: 'DANGER',
				customId: 'help:exit',
			},
		],
	};

	readonly searchRegex = {
		'cmd': /((cmd|command|commands):){1}/,
		'cat': /((cat|category):){1}/,
		'set': /((setting|settings):){1}/,
	};

	private initialMessage: ExtMessage;
	private mainMessage: ExtMessage;
	private currentReply: ExtMessage;
	private initialArgs: string[];
	private scope: string;
	private pages: Pages;
	private pagePointer: number;
	private cachedCategory: [Command_Group, Collection<string, Sayumi_Command>];

	constructor(message: ExtMessage, args: string[])
	{
		this.initialMessage = message;
		this.initialArgs = args;
		this.scope = 'main';

		void this.init();
	}

	private async init(): Promise<void>
	{
		const embed = new MessageEmbed({
			title: 'Help',
			description: '*Upon here you can find lists of all commands / categories / settings.\nTap a button for more information.*',
			fields: [
				{
					name: 'Available',
					value: '`placeholder:items`',
				},
			],
		});

		this.mainMessage = await this.initialMessage.channel.send({
			embeds: [embed],
			components: [createActionRow(createButtons(this.mainOptionButtons))],
		}) as ExtMessage;

		try {
			this.handle();
		}
		catch(e)
		{
			e;
			null;
		}
	}

	handle(): void
	{
		void this.mainMessage.createMessageComponentCollector({
			dispose: true,
			componentType: 'BUTTON',
			idle: 0xea60,
			time: 0x493e0,
			filter: i => i.channelId === this.initialMessage.channel.id,
		})
		.on('collect', interaction => { void this.handleInteractions(interaction); });
	}

	handleInteractions(interaction: MessageComponentInteraction)
	{
		switch(interaction.customId)
		{
			case 'help:categories':
			case 'help:settings':
				return this.HandleMain(interaction);
			case 'help:goto':
				return this.HandleGoto(interaction);
			case 'help:search':
				return this.HandleSearch(interaction);
			case 'help-nav:first':
			case 'help-nav:prev':
			case 'help-nav:next':
			case 'help-nav:last':
			case 'help-nav:goto':
				return this.HandleNav(interaction);
			case 'help:exit':
				return this.destroy();
		}
	}
	// #region SubHandlers
	async HandleMain(interaction: MessageComponentInteraction)
	{
		if (!interaction.deferred) await interaction.defer();
		await interaction.deleteReply();
		if (!this.currentReply?.deleted) void this.currentReply?.delete();
		this.pagePointer = null;
		delete this.mainMessage.components[1];

		this.scope = interaction.customId.split(':')[1];
		return void this.mainMessage.edit({
			embeds: [this.scope === 'settings' ? generateSettingsEmbed() : this.generateCategoryListEmbed()],
			components: activateButton(this.mainMessage.components, { row: 0, searchID: interaction.customId, exceptOthers: true }),
		});
	}

	async HandleSearch(interaction: MessageComponentInteraction)
	{
		void interaction.deleteReply();
		if (this.mainMessage.deleted) return;
		this.mainMessage.components = activateButton(this.mainMessage.components, { row: 0, searchID: 'help:search' });
		if (!['settings', 'categories', 'categories-cmd'].includes(this.scope)) this.mainMessage.components[0].components.shift();
		void this.mainMessage.edit({
			components: this.mainMessage.components,
		});
		await interaction.reply('What do you want to search for?');
		void this.mainMessage.channel.awaitMessages({
			filter: _ => _.author.id === this.initialMessage.author.id,
			max: 1,
			time: 10000,
		})
		.then(received => {
			let target: Sayumi_Command | Command_Group | GuildSettings;
			let toSend: MessageEmbed;
			let type: string;
			if (received.first().deletable) void received.first().delete();
			const [query, mode] = this.ParseSearchQuery(received.first().content);
			switch (mode)
			{
				case 'cmd':
				{
					target = this.mainMessage.client.CommandList.get(query) ||
							this.mainMessage.client.CommandList.find(c => c.aliases?.includes(query));
					break;
				}
				case 'cat':
				{
					target = this.mainMessage.client.CommandCategories.find(c => c.keywords?.includes(query));
					break;
				}
				case 'set':
				{
					target = createSettingsList().get(query);
					break;
				}
				default:
				{
					target = this.mainMessage.client.CommandList.get(query)
						?? this.mainMessage.client.CommandList.find(c => c.aliases?.includes(query));
					if (target)
					{
						type = 'cmd';
						break;
					}
					target = this.mainMessage.client.CommandCategories.find(c => c.keywords.includes(query));
					if (target)
					{
						type = 'cat';
						break;
					}
					target = createSettingsList().get(query);
					if (target)
					{
						type = 'set';
						break;
					}
					break;
				}
			}
			if (!target)
			{
				void interaction.editReply('No result matches your query.')
					.then(() => setTimeout(() => void interaction.deleteReply(), 5000));
			}
			switch(type)
			{
				case 'cmd':
				{
					toSend = this.createCommandInfoEmbed(target as Sayumi_Command);
					break;
				}
				case 'cat':
				{
					if (this.mainMessage.components[0].components.length < 5)
						this.mainMessage.components[0].components.unshift(new MessageButton({
							style: 'PRIMARY',
							type: 'BUTTON',
							label: 'Go to...',
							customId: 'help:goto',
						}));
					toSend = this.createCategoryInfoEmbed(target as Command_Group);
					break;
				}
				case 'set':
				{
					toSend = this.createSettingsInfoEmbed((target as GuildSettings).name);
					break;
				}
			}

			enableAll(this.mainMessage.components[0].components);
			// enableAll(this.mainMessage.components[0].components, `help:${this.scope}`);
			void this.mainMessage.edit({
				embeds: toSend ? [toSend] : this.mainMessage.embeds,
				components: this.mainMessage.components,
			});
			return;
		})
		.catch(e => {
			console.log(e);
		})
		.finally(() => {
			void interaction.deleteReply().catch(() => null);
			enableAll(this.mainMessage?.components[0].components);
			return void this.mainMessage.edit({
				components: this.mainMessage.components,
			});
		});
	}

	async HandleGoto(interaction: MessageComponentInteraction)
	{
		let forceQuit = false;
		void this.mainMessage.edit({
			components: activateButton(this.mainMessage.components, { row: 0, searchID: 'help:goto' }),
		});

		let toSend: MessageEmbed = null;
		switch (this.scope)
		{
			case 'settings':
			{
				this.pagePointer = null;
				this.pages = null;
				this.cachedCategory = null;
				await interaction.reply({
					content: 'Say, what setting do you want to see?',
					components: [createActionRow([createSettingsMenu()])],
				});

				this.currentReply = await interaction.fetchReply() as ExtMessage;

				const targetName = await getMenuOption(this.currentReply, {
					dispose: true,
					idle: 0xea60,
					time: 0x493e0,
					filter: i => (i.member as GuildMember).id === this.initialMessage.author.id,
				});

				if (this.currentReply?.deleted) this.currentReply = null;

				if (targetName === 'cancel' || !targetName)
				{
					forceQuit = true;
					break;
				}
				toSend = this.createSettingsInfoEmbed(targetName);

				break;
			}
			case 'categories':
			{
				this.pagePointer = 0;
				this.pages = null;
				await interaction.reply({
					content: 'Say, what category do you want to see?',
					components: [createActionRow([this.createCategoryMenu()])],
				});

				this.currentReply = await interaction.fetchReply() as ExtMessage;

				const targetName = await getMenuOption(this.currentReply, {
					dispose: true,
					idle: 0xea60,
					time: 0x493e0,
					filter: i => (i.member as GuildMember).id === this.initialMessage.author.id,
				});

				if (this.currentReply.deleted) this.currentReply = null;

				if (targetName === 'cancel' || !targetName)
				{
					forceQuit = true;
					break;
				}

				const category = this.mainMessage.client.CommandCategories.find(c => c.keywords.includes(targetName));
				this.cachedCategory = [category, this.mainMessage.client.CommandList.filter(c => category.commands.includes(c.name))];

				toSend = this.createCategoryInfoEmbed(category);
				this.scope = 'categories-cmd';
				break;
			}
			case 'categories-cmd':
			{
				const menu = this.createCategoryCmdMenu();
				if (!menu)
				{
					forceQuit = true;
					break;
				}
				void interaction.reply({
					content: 'What command do you want to see?',
					components: [createActionRow([menu])],
				});

				this.currentReply = await interaction.fetchReply() as ExtMessage;
				const targetName = await getMenuOption(this.currentReply, {
					dispose: true,
					idle: 0xea60,
					time: 0x493e0,
					filter: i => (i.member as GuildMember).id === this.initialMessage.author.id,
				});

				if (this.currentReply.deleted) this.currentReply = null;

				const c = this.initialMessage.client.CommandList.get(targetName);
				if (!c)
				{
					forceQuit = true;
					break;
				}

				toSend = this.createCommandInfoEmbed(c);
				this.mainMessage.components[0].components.shift();
				delete this.mainMessage.components[1];
				this.scope = 'main';
				break;
			}
		}

		enableAll(this.mainMessage.components[0].components, forceQuit ? `help:${this.scope}` : null);
		if (!forceQuit)
		{
			if (!['settings', 'categories', 'categories-cmd'].includes(this.scope)) this.mainMessage.components[0].components.shift();
			void this.mainMessage.edit({
				embeds: [toSend],
				components: this.mainMessage.components,
			});
		}
		else void this.mainMessage.edit({
			components: this.mainMessage.components,
		});
		return;
	}

	async HandleNav(interaction: MessageComponentInteraction)
	{

	}
	// #endregion
	ParseSearchQuery(input: string)
	{
		input = input.toLowerCase();
		for (const mode in this.searchRegex)
		{
			if ((this.searchRegex[mode] as RegExp).exec(input))
				return [input.replace(this.searchRegex[mode], ''), mode];
		}
		return [input, null];
	}

	private generateCategoryListEmbed()
	{
		const { CommandCategories } = this.mainMessage.client;
		const embed = new MessageEmbed({
			title: 'Help [Categories]',
			description: '*Here is a list of all the categories.*',
		});

		for (const category of CommandCategories.values())
		{
			const CategoryKeyword = category.keywords[0] || 'Unaccessible';
			const length = category.commands.length;

			if (CategoryKeyword !== 'settings' && length)
				embed.addField(
					`${category.name} \`${CategoryKeyword}\` (${length} command${length > 1 ? 's' : ''})`,
					[
						`*${category.description || 'No description yet!'}*`,
						``,
					].join('\n'),
				);
		}
		return embed;
	}

	private createCategoryMenu()
	{
		const menu = new MessageSelectMenu({
			customId: 'help:cate-menu',
			placeholder: generatePlaceholderText(),
		});

		for (const category of this.initialMessage.client.CommandCategories.values())
		{
			if (category.commands.length)
				menu.addOptions({
					label: category.keywords[0],
					value: category.keywords[0],
					description: category.name,
				});
		}
		menu.addOptions({
			label: 'Cancel',
			value: 'cancel',
			description: 'Closes this menu.',
		});
		return menu;
	}

	private createCategoryCmdMenu()
	{
		if (!this.pages || Number.isNaN(parseInt(this.pagePointer.toString())) || !this.cachedCategory) return null;
		const menu = new MessageSelectMenu({
			customId: 'help:cate-cmd-menu',
			placeholder: generatePlaceholderText(),
		});
		for (const i of this.pages[this.pagePointer][2])
		{
			const c = [...this.cachedCategory[1].values()][i];
			menu.addOptions({
				label: c.name,
				value: c.name,
				description: (c.aliases || []).length ? c.aliases.join(', ') : 'No aliases',
			});
		}
		menu.addOptions({
			label: 'Cancel',
			value: 'cancel',
			description: 'Closes this menu.',
		});
		return menu;
	}

	private createCommandInfoEmbed(command: Sayumi_Command)
	{
		const {
			name,
			aliases = [],
			description = 'No description available, yet!',
			groups,
			cooldown,
			guildCooldown = false,
			notes = [],
			master_explicit = false,
			guildOnly,
			reqPerms = [],
			reqUsers = [],
			unstable = false,
			nsfw = false,
			usage = [],
			usageSyntax = [] } = command;

		const toUsageString = (u: string) => `\`${this.initialMessage.prefixCall}${name} ${u}\``;
		const usageString = usage.map(toUsageString).join('\n');
		const { SearchString } = this.mainMessage.client.Methods.Common;

		const usageStringWithSyntax = usageSyntax.map(toUsageString).join(' ');

		const requiredParams = [];
		const optionalParams = [];
		const reqPRight = SearchString(/>\|/g, usageStringWithSyntax);
		const optPRight = SearchString(/]\|/g, usageStringWithSyntax);
		const reqPLeft = SearchString(/\|</g, usageStringWithSyntax);
		const optPLeft = SearchString(/\|\[/g, usageStringWithSyntax);

		for (const i of reqPLeft)
			requiredParams.push(usageStringWithSyntax.substr(i + 2, reqPRight[reqPLeft.indexOf(i)] - i - 2));

		for (const i of optPLeft)
			optionalParams.push(usageStringWithSyntax.substr(i + 2, optPRight[optPLeft.indexOf(i)] - i - 2));

		const embed = new MessageEmbed({
			color: 'RANDOM',
			title: `[${groups.join(', ')}] \`${name}\``,
			description: `${unstable ? '**[Under Development!]** __This command may not running as expected.__\n' : ''}*${description}*${reqPerms.length ? `\nRequired permissions: ${reqPerms.map(r => `\`${r}\``).join(', ')}` : ''}`,
			fields: [
				{
					name: 'Usage',
					value: usageString +
						(notes.length ? `**Extra notes:**\n*${notes.join('\n')}*` : ''),
				},
				{
					name: 'Command availability',
					value: master_explicit ? 'Master dedicated ~' :
							`${guildOnly ? `${reqUsers.length ? `[Guild only] ${reqUsers.join(', ')}` : 'Guild only.'}` : GetRandomize(responses.commands.info.availability)}`,
					inline: true,
				},
				{
					name: 'Cooldown',
					value: cooldown ? `\`${cooldown}\` second${cooldown > 1 ? 's' : ''}${guildCooldown ? ', guild' : ''}` : 'None',
					inline: true,
				},
			],
			footer: {
				text:
				(requiredParams.length > 0  ? `${optionalParams.length ? '<> required parameters' : '<> required parameters |'}` : '')
				+ (optionalParams.length ? `${requiredParams.length ? ', [] optional parameters |' : '[] optional parameters |'}` : '')
				+ `Current prefix: ${this.initialMessage.prefixCall}`,
			},
		});

		if (aliases.length) embed.fields.unshift({
			name: GetRandomize(responses.commands.info.aliases),
			value: aliases.map(a => `\`${a}\``).join(', '),
			inline: false,
		});

		return embed;
	}

	private createCategoryInfoEmbed(category: Command_Group)
	{
		this.pagePointer = 0;
		this.pages = createCategoryPages([category, this.mainMessage.client.CommandList.filter(c => category.commands.includes(c.name))]);

		const embed = new MessageEmbed({
			title: `Category: ${category.name}`,
			color: category.colorCode,
			description: `*${category.description}*`,
			fields: [
				{
					name: `Showing ` +
						(this.pages.length > 1 ? `${this.pages[this.pagePointer][0]} of ` : '') +
						`${category.commands.length} command${category.commands.length > 1 ? 's' : ''}`,
					value: this.pages[this.pagePointer][1],
				},
			],
			footer: {
				text: `Prefix: ${this.initialMessage.prefixCall}`,
			},
		});
		if (this.pages.length > 1)
		{
			const navButtons = createActionRow(createButtons(this.navButtons));
			if (this.pages.length === 2 && navButtons.components.length === 2)
				navButtons.components = [navButtons.components[1], navButtons.components[3]];

			this.mainMessage.components.push(navButtons);
		}
		return embed;
	}

	private createSettingsInfoEmbed(target: string)
	{
		const { description, name, reqPerms, reqUser, title, usage, notes } = createSettingsList().get(target);

		const embed = new MessageEmbed({
			title: `Server Settings: ${title}`,
			color: 'RANDOM',
			description: [
				`Authorized: [${reqUser.join(', ')}]`,
				`[Roles]: ${reqPerms.map(r => `\`${r}\``).join(', ')}`,
				`*${description}*`,
			].join('\n'),
			fields: [
				{
					name: 'Usage',
					value: `${usage.map(u => `\`${this.initialMessage.prefixCall}settings ${name} ${u}\``).join('\n')}`,
				},
			],
		});
		if (notes) embed.setFooter(GetRandomize(notes).replace(/{prefix}/g, this.initialMessage.prefixCall));

		return embed;
	}
	destroy()
	{
		void this.mainMessage?.delete();
		void this.currentReply?.delete();
		for (const key in this) delete this[key];
		return;
	}

	// #endregion
}

function createCategoryPages([category, cmdList]: [Command_Group, Collection<string, Sayumi_Command>])
{
	const cmds = cmdList.filter(c => category.commands.includes(c.name));
	const pages = generatePages(
		[...cmds.values()],
		(c) => {
			const { name, description = 'No description provided. Looks shady...' } = c;
			return [
				`**\`${name}\`**${category.underDev.includes(name) ? ' | Under Developement' : ''}`,
				`*${description}*`,
			].join('\n') + '\n';
		},
		{
			itemsPerPage: 7,
			charsPerPage: 1024,
		},
	);
	return pages;
}

// #region Actions
interface ActivateButtonOptions
{
	row: number
	searchID: string;
	exceptOthers?: boolean;
	overwriteStyle?: MessageButtonOptions['style'],
}

function activateButton(components: MessageActionRow[], options: ActivateButtonOptions)
{
	const { row, searchID, exceptOthers = false, overwriteStyle = 'SUCCESS' } = options;
	if (Number.isNaN(row) || row < 0) return components;
	if (components[row].components.findIndex(b => b.customId === 'help:goto') === -1)
		components[row].components.unshift(new MessageButton({
			style: 'PRIMARY',
			type: 'BUTTON',
			label: 'Go to...',
			customId: 'help:goto',
		}));

	const buttonIndex = components[row].components.findIndex(b => b.customId === searchID);
	const button = components[row].components[buttonIndex] as MessageButton;

	const newButton = new MessageButton(Object.assign(button, { disabled: true, style: overwriteStyle }));
	components[row].components[buttonIndex] = newButton;
	if (exceptOthers) enableAll(components[row].components, button.customId);

	return components;
}

function enableAll(components: MessageActionRowComponent[], exceptTargetID?: string)
{
	if (exceptTargetID && components.findIndex(b => b.customId === exceptTargetID) === -1) return;
	for (const button of components as MessageButton[])
	{
		if (exceptTargetID)
		{
			if (!button.customId.includes('exit') && button.customId !== exceptTargetID) button.style = 'PRIMARY';
			if (button.customId !== exceptTargetID) button.disabled = false;
		}
		else
		{
			if (!button.customId.includes('exit')) button.style = 'PRIMARY';
			button.disabled = false;
		}
	}
}
// #endregion

function generateSettingsEmbed(settingsOptions = createSettingsList())
{
	const embed = new MessageEmbed({
		title: 'Help [Server Settings]',
		description: '*These settings decides how I should act in your server.*',
	});

	for (const setting of settingsOptions.values())
	{
		embed.addField(
			`${setting.title} \`${setting.name}\``,
			[
				`Permissions: \`${setting.reqPerms.join(', ')}\``,
				`*${setting.description}*`,
			].join('\n'),
		);
	}

	return embed;
}
function createSettingsList()
{
	const settingsOptions = new Collection<string, GuildSettings>();

	for (const key in settingsList)
	{
		settingsOptions.set(settingsList[key].name, settingsList[key]);
	}
	return settingsOptions;
}
function createSettingsMenu(settingsOptions = createSettingsList())
{
	const menu = new MessageSelectMenu({
		customId: 'help:settings-menu',
		placeholder: generatePlaceholderText(),
	});

	for (const settings of settingsOptions.values())
	{
		menu.addOptions({
			label: settings.name,
			value: settings.name,
			description: `${settings.title}`,
		});
	}
	menu.addOptions({
		label: 'Cancel',
		value: 'cancel',
		description: 'Closes this menu.',
	});
	return menu;
}

//
function generatePlaceholderText()
{
	const menuVerb = ['Pick', 'Choose', 'Select'];
	const menuEnd = ['!', '...'];
	return `${GetRandomize(menuVerb)} one${GetRandomize(menuEnd)}`;
}

function createActionRow(data: MessageButton[] | MessageSelectMenu[])
{
	return new MessageActionRow({
		components: data,
	});
}

function createButtons(data: ButtonData)
{
	const out: MessageButton[] = [];
	for (let settings of data.individual)
	{
		if (data.global) settings = Object.assign(data.global, settings);
		out.push(new MessageButton(settings as MessageButtonOptions));
	}
	return out;
}
''
async function getMenuOption(message: Message, options?: AwaitMessageComponentOptions<MessageComponentInteraction>)
{
	let targetName: string = null;
	await message.awaitMessageComponent(
		Object.assign(
			options ?? {},
			{ componentType: 'SELECT_MENU' },
		)).then((i) => {
		void i.defer();
		void i.deleteReply();
		targetName = (i as SelectMenuInteraction).values[0];
	})
	.catch(() => null)
	.finally(() => void message.delete().catch(() => null));
	return targetName;
}
//

export = cmd;
