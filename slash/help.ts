/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { ApplicationCommandData, AwaitMessageComponentOptions, Collection, CommandInteraction, GuildMember, Message, MessageActionRow, MessageActionRowComponent, MessageButton, MessageButtonOptions, MessageComponentInteraction, MessageEmbed, MessageSelectMenu, SelectMenuInteraction } from "discord.js";
import Sayumi from "../utils/Client";
import ButtonData from "@interfaces/ButtonData";
import Command_Group from "@interfaces/CmdGroup";
import Sayumi_Command from "@interfaces/Command";
import Sayumi_SlashCommand from "@interfaces/SlashCommand";
import { ExtCommandInteraction, ExtInteraction, ExtMessage } from "@interfaces/Extended";
import GuildSettings from "@interfaces/GuildSettings";
import generatePages from "@methods/common/generate-pages";
import GetRandomize from "@methods/common/randomize";
import responses from '@json/Responses.json';
import settingsList from '@json/SettingsObjects.json';

const metadata: ApplicationCommandData = {
	name: 'help',
	description: 'For you who needs it.',
	defaultPermission: true,
	options: [
		{
			name: 'settings',
			description: 'Search for guild configurations.',
			type: 'SUB_COMMAND',
			options: [
				{
					name: 'name',
					description: 'The setting that you are trying to look for.',
					type: 'STRING',
					required: true,
					choices: [
						{
							name: 'Shows all options.',
							value: 'all',
						},
					],
				},
			],
		},
		{
			name: 'category',
			description: 'Search command categories.',
			type: 'SUB_COMMAND',
			options: [
				{
					name: 'name',
					description: 'The setting that you are trying to look for.',
					type: 'STRING',
					required: true,
					choices: [
						{
							name: 'Shows all options.',
							value: 'all',
						},
					],
				},
			],
		},
		{
			name: 'command',
			description: 'Looks for a specific command.',
			type: 'SUB_COMMAND',
			options: [
				{
					name: 'name',
					description: 'The setting that you are trying to look for.',
					type: 'STRING',
					required: true,
				},
			],
		},
		{
			name: 'search',
			description: 'Search for anything.',
			type: 'SUB_COMMAND',
			options: [
				{
					name: 'name',
					description: 'What are you looking for?',
					type: 'STRING',
					required: true,
				},
			],
		},
		{
			name: 'noargs',
			description: 'Starts with a default interactive embed.',
			type: 'SUB_COMMAND',
		},
	],
};

type Pages = [string, string, number[]][] & { len: number };
type MainScope = 'categories-list' | 'settings-list';

class Handler
{
	// #region Props
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
				customId: 'help:categories-list',
			},
			{
				label: 'Settings',
				customId: 'help:settings-list',
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

	private initalInteraction: ExtCommandInteraction;
	private mainMessage: ExtMessage;
	private currentReply: ExtMessage;
	private initialArgs: string[];
	private scope: 'main' | MainScope | 'cmd-list' | 'cmd-info' | 'settings-info' = 'main';
	private pages: Pages;
	private pagePointer: number;
	private cachedCategory: [Command_Group, Collection<string, Sayumi_Command>];

	private onBoardComponents: (MessageActionRow)[] = [];
	// #endregion

	constructor(interaction: CommandInteraction, args: string[])
	{
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		this.initalInteraction = interaction as ExtCommandInteraction;
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

		this.onBoardComponents = [createActionRow(createButtons(this.mainOptionButtons))];
		this.activateButton({ row: 0, searchID: 'help:goto', overwriteStyle: 'SECONDARY' });
		this.mainMessage = await this.initalInteraction.channel.send({
			embeds: [embed],
			components: this.onBoardComponents,
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

	private componentsSync = setInterval(() => this.onBoardComponents = this.mainMessage.components, 5000);
	private findDisabledButton = (matchName: string) => (b: MessageActionRowComponent) => b.customId === matchName && b.disabled;

	handle(): void
	{
		void this.mainMessage.createMessageComponentCollector({
			dispose: true,
			componentType: 'BUTTON',
			idle: 0xea60,
			time: 0x493e0,
			filter: i => i.channelId === this.initalInteraction.channel.id,
		})
		.on('collect', interaction => { void this.handleInteractions(interaction); });
	}

	handleInteractions(interaction: MessageComponentInteraction)
	{
		switch(interaction.customId)
		{
			case 'help:categories-list':
			case 'help:settings-list':
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
		if (!interaction.deferred) await interaction.deferUpdate();
		await interaction.deleteReply().catch();
		if (!this.currentReply?.deleted)
			void this.currentReply?.delete().catch().finally(() => delete this.currentReply);

		delete this.pagePointer;
		delete this.onBoardComponents[1];

		this.scope = `${interaction.customId.split(':')[1] as MainScope}`;
		this.activateButton({ row: 0, searchID: interaction.customId, exceptOthers: true });
		this.mainMessage = await this.mainMessage.edit({
			embeds: [this.scope === 'settings-list' ? generateSettingsEmbed() : this.generateCategoryListEmbed()],
			components: this.onBoardComponents,
		});
		return;
	}

	async HandleSearch(interaction: MessageComponentInteraction)
	{
		if (this.mainMessage.components[0].components.filter(this.findDisabledButton('help:goto'))?.length)
		{
			void interaction.deleteReply().catch();
			this.onBoardComponents[0].components[0].disabled = false;
		}

		const activePageJump = this.mainMessage.components[1]?.components.filter(this.findDisabledButton('help-nav:goto'));
		if (activePageJump?.length)
		{
			void interaction.deleteReply().catch();
			this.onBoardComponents[1].components[this.mainMessage.components[1].components.findIndex(this.findDisabledButton('help-nav:goto'))].disabled = false;
		}

		void this.currentReply?.delete().catch();
		delete this.currentReply;
		if (this.mainMessage.deleted) return;
		this.activateButton({ row: 0, searchID: 'help:goto', overwriteStyle: 'SECONDARY' });
		this.activateButton({ row: 0, searchID: 'help:search' });
		if (!['settings-list', 'categories-list', 'cmd-list'].includes(this.scope) && this.mainMessage.components[0].components.length === 5)
			this.onBoardComponents[0].components.shift();

		this.mainMessage = await this.mainMessage.edit({
			components: this.onBoardComponents,
		});

		await interaction.reply('What do you want to search for?\nYou can type `cancel` or `exit` to opt out.');
		this.currentReply = await interaction.fetchReply() as ExtMessage;
		void this.mainMessage.channel.awaitMessages({
			filter: _ => _.member.id === this.initalInteraction?.member.id,
			max: 1,
			time: 10000,
			errors: ['time'],
		})
		.then(async listened => {
			let target: Sayumi_Command | Command_Group | GuildSettings;
			let toSend: MessageEmbed;
			let type: string;

			const received = listened.first();
			if (received?.deletable) void received.delete().catch();
			if (['cancel', 'exit'].includes(listened.first().content.toLowerCase().trim())) throw null;
			const [query, mode] = this.ParseSearchQuery(received.content);
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
						this.scope = 'cmd-info';
						type = 'cmd';
						break;
					}
					target = this.mainMessage.client.CommandCategories.find(c => c.keywords.includes(query));
					if (target)
					{
						this.scope = 'cmd-list';
						type = 'cat';
						break;
					}
					target = createSettingsList().get(query);
					if (target)
					{
						this.scope = 'settings-info';
						type = 'set';
						break;
					}
					break;
				}
			}
			if (!target)
			{
				void interaction.editReply('No result matches your query.');
					(interaction.client as Sayumi).Methods.Task.DelayTask(4000);
				throw null;
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
					if (this.onBoardComponents[0].components.length < 5)
						this.onBoardComponents[0].components.unshift(new MessageButton({
							style: 'PRIMARY',
							type: 'BUTTON',
							label: 'Go to...',
							customId: 'help:goto',
						}));
					this.cachedCategory = [target as Command_Group, this.mainMessage.client.CommandList.filter(c => (target as Command_Group).commands.includes(c.name))];
					toSend = this.createCategoryInfoEmbed();
					break;
				}
				case 'set':
				{
					toSend = this.createSettingsInfoEmbed((target as GuildSettings).name);
					break;
				}
			}
			if (toSend)
			{
				if (this.scope !== 'cmd-list') delete this.onBoardComponents[1];
				void interaction.deleteReply().catch();
				if (type !== 'cat' && this.mainMessage.components[0].components.length === 5) this.onBoardComponents[0].components.shift();
				enableAll(this.onBoardComponents[0].components, [this.translateScopeToButtonId()]);
				this.mainMessage = await this.mainMessage.edit({
					embeds: [toSend],
					components: this.onBoardComponents,
				});
			}
			return;
		})
		.catch(async () => {
			void interaction.deleteReply().catch();
			enableAll(this.onBoardComponents[0].components, [this.translateScopeToButtonId()]);
			this.mainMessage = await this.mainMessage.edit({
				components: this.onBoardComponents,
			}).catch();
			return;
		});
	}

	async HandleGoto(interaction: MessageComponentInteraction)
	{
		let forceQuit = false;
		if (this.mainMessage.components[0].components.filter(this.findDisabledButton('help:search'))?.length)
		{
			void interaction.deleteReply().catch();
			this.onBoardComponents[0].components[4].disabled = false;
		}
		const activePageJump = this.mainMessage.components[1]?.components.filter(this.findDisabledButton('help-nav:goto'));
		if (activePageJump?.length)
		{
			void interaction.deleteReply().catch();
			this.onBoardComponents[1].components[this.mainMessage.components[1].components.findIndex(this.findDisabledButton('help-nav:goto'))].disabled = false;
		}

		this.activateButton({ row: 0, searchID: 'help:search', overwriteStyle: 'SECONDARY' });
		this.activateButton({ row: 0, searchID: 'help:goto' });
		this.mainMessage = await this.mainMessage.edit({
			components: this.onBoardComponents,
		});
		let toSend: MessageEmbed;
		switch (this.scope)
		{
			case 'settings-list':
			{
				delete this.pagePointer;
				delete this.pages;
				delete this.cachedCategory;
				await interaction.reply({
					content: 'Say, what setting do you want to see?',
					components: [createActionRow([createSettingsMenu()])],
				});

				this.currentReply = await interaction.fetchReply() as ExtMessage;

				const targetName = await getMenuOption(this.currentReply, {
					dispose: true,
					idle: 0xea60,
					time: 0x493e0,
					filter: i => (i.member as GuildMember).id === this.initalInteraction.user.id,
				});

				if (this.currentReply?.deleted) delete this.currentReply;

				if (targetName === 'cancel' || !targetName)
				{
					forceQuit = true;
					break;
				}
				this.scope = 'settings-info';
				toSend = this.createSettingsInfoEmbed(targetName);
				break;
			}
			case 'categories-list':
			{
				delete this.pagePointer;
				delete this.pages;
				await interaction.reply({
					content: 'Say, what category do you want to see?',
					components: [createActionRow([this.createCategoryMenu()])],
				});

				this.currentReply = await interaction.fetchReply() as ExtMessage;

				const targetName = await getMenuOption(this.currentReply, {
					dispose: true,
					idle: 0xea60,
					time: 0x493e0,
					filter: i => (i.member as GuildMember).id === this.initalInteraction.user.id,
				});

				if (this.currentReply?.deleted) delete this.currentReply;

				if (targetName === 'cancel' || !targetName)
				{
					forceQuit = true;
					break;
				}

				this.scope = 'cmd-list';
				const category = this.mainMessage.client.CommandCategories.find(c => c.keywords.includes(targetName));
				this.cachedCategory = [category, this.mainMessage.client.CommandList.filter(c => category.commands.includes(c.name))];

				toSend = this.createCategoryInfoEmbed();
				break;
			}
			case 'cmd-list':
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
					filter: i => (i.member as GuildMember).id === this.initalInteraction.user.id,
				});

				if (this.currentReply?.deleted) delete this.currentReply;

				const c = this.initalInteraction.client.CommandList.get(targetName);
				if (!c)
				{
					forceQuit = true;
					break;
				}

				this.scope = 'cmd-info';
				toSend = this.createCommandInfoEmbed(c);
				delete this.onBoardComponents[1];
				break;
			}
		}

		enableAll(this.onBoardComponents[0].components, forceQuit ? [this.translateScopeToButtonId()] : null);
		if (!forceQuit)
		{
			if (!['settings-list', 'categories-list', 'cmd-list'].includes(this.scope)) this.onBoardComponents[0].components.shift();
			this.mainMessage = await this.mainMessage.edit({
				embeds: [toSend],
				components: this.onBoardComponents,
			}).catch();
		}
		else this.mainMessage = await this.mainMessage.edit({
			components: this.onBoardComponents,
		});
		return;
	}

	HandleNav(interaction: MessageComponentInteraction): void
	{
		if (!this.pages || Number.isNaN(parseInt(this.pagePointer?.toString()))) return;
		const action = interaction.customId.split(':')[1];
		switch(action)
		{
			case 'first':
			{
				this.pagePointer = 0;
				break;
			}
			case 'prev':
			{
				if (this.pagePointer) this.pagePointer--;
				break;
			}
			case 'next':
			{

				if (this.pagePointer < this.pages.length - 1) this.pagePointer++;
				break;
			}
			case 'last':
			{
				this.pagePointer = this.pages.length - 1;
				break;
			}
			case 'goto':
				return void this.PageJump(interaction);
		}
		void interaction.deferUpdate();
		return void this.ChangePages();
	}

	private async PageJump(interaction: MessageComponentInteraction)
	{
		if (this.mainMessage.components[0].components.filter(this.findDisabledButton('help:goto'))?.length)
		{
			void interaction.deleteReply().catch();
			this.onBoardComponents[0].components[0].disabled = false;
		}
		if (this.mainMessage.components[0].components.filter(this.findDisabledButton('help:search'))?.length)
		{
			void interaction.deleteReply().catch();
			this.onBoardComponents[0].components[4].disabled = false;
		}

		void this.currentReply?.delete().catch();
		delete this.currentReply;
		if (this.mainMessage.deleted) return;

		this.activateButton({ row: 1, searchID: 'help-nav:jump' });
		this.mainMessage = await this.mainMessage.edit({
			components: this.onBoardComponents,
		});

		await interaction.reply(`What page do you want to jump to?\n(From 1 to ${this.pages.length})`);
		this.currentReply = await interaction.fetchReply() as ExtMessage;
		void this.mainMessage.channel.awaitMessages({
			filter: _ => _.member.id === this.initalInteraction.user.id,
			max: 1,
			time: 10000,
			errors: ['time'],
		})
		.then(received => {
			void interaction.deleteReply().catch();
			const content = received.first().content.trim();
			if (content.toLowerCase() === 'last')
			{
				this.pagePointer = this.pages.length - 1;
				return void this.ChangePages();
			}
			if (content.toLowerCase() === 'first')
			{
				this.pagePointer = 0;
				return void this.ChangePages();
			}
			const ind = parseInt(content);
			if (Number.isNaN(ind))
			{
				void interaction.editReply('I was expecting a number.');
					(interaction.client as Sayumi).Methods.Task.DelayTask(4000);
				throw null;
			}
			this.pagePointer = ind;
			return void this.ChangePages();
		})
		.catch(() => void interaction.deleteReply().catch());
	}

	private async ChangePages()
	{
		if (this.pagePointer === 0)
			this.activateButtons([
				{ searchID: 'help-nav:first' },
				{ searchID: 'help-nav:prev' },
			], {
				row: 1,
				overwriteStyle: 'SECONDARY',
			});

		if (this.pagePointer === this.pages.length - 1)
		this.activateButtons([
			{ searchID: 'help-nav:next' },
			{ searchID: 'help-nav:last' },
		], {
			row: 1,
			overwriteStyle: 'SECONDARY',
		});

		this.mainMessage = await this.mainMessage.edit({
			embeds: [this.createCategoryInfoEmbed()],
			components: this.onBoardComponents,
		});
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

		for (const category of this.initalInteraction.client.CommandCategories.values())
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
		if (!this.pages || Number.isNaN(parseInt(this.pagePointer?.toString())) || !this.cachedCategory) return null;
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

		const toUsageString = (u: string) => `\`/${name} ${u}\``;
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
				+ `Current prefix: Slash command`,
			},
		});

		if (notes.length) embed.fields.unshift({
			name: 'Extra notes',
			value: `*${notes.join('\n')}*`,
			inline: false,
		});

		if (usageString) embed.fields.unshift({
			name: 'Usage',
			value: usageString,
			inline: false,
		});

		if (aliases.length) embed.fields.unshift({
			name: GetRandomize(responses.commands.info.aliases),
			value: aliases.map(a => `\`${a}\``).join(', '),
			inline: false,
		});

		return embed;
	}

	private createCategoryInfoEmbed()
	{
		if (Number.isNaN(parseInt(this.pagePointer?.toString()))) this.pagePointer = 0;
		if (!this.pages) this.pages = createCategoryPages(this.cachedCategory);
		const category = this.cachedCategory[0];

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
				text: `Prefix: Slash command`,
			},
		});
		if (this.pages.length > 1)
		{
			const navButtons = createActionRow(createButtons(this.navButtons));
			if (this.pages.length === 2 && navButtons.components.length === 5)
				navButtons.components = [navButtons.components[1], navButtons.components[3]];

			this.onBoardComponents.push(navButtons);
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
					value: `${usage.map(u => `\`/settings ${name} ${u}\``).join('\n')}`,
				},
			],
		});
		if (notes) embed.setFooter(GetRandomize(notes).replace(/{prefix}/g, '/'));

		return embed;
	}

	destroy()
	{
		clearInterval(this.componentsSync);
		void this.mainMessage?.delete().catch();
		void this.currentReply?.delete().catch();
		for (const key in this) delete this[key];
		return;
	}

	private activateButton(options: ActivateButtonOptions)
	{
		const { row, searchID, exceptOthers = false, overwriteStyle = 'SUCCESS' } = options;
		if (Number.isNaN(parseInt(row.toString())) || row < 0) return;

		if (['settings-list', 'categories-list', 'cmd-list'].includes(this.scope) && this.onBoardComponents[row].components.findIndex(b => b.customId === 'help:goto') === -1)
		this.onBoardComponents[row].components.unshift(new MessageButton({
				style: 'PRIMARY',
				type: 'BUTTON',
				label: 'Go to...',
				customId: 'help:goto',
			}));

		const buttonIndex = this.onBoardComponents[row].components.findIndex(b => b.customId === searchID);
		if (buttonIndex === -1) return;
		const button = this.onBoardComponents[row].components[buttonIndex] as MessageButton;

		const newButton = new MessageButton(Object.assign(button, { disabled: true, style: overwriteStyle }));
		this.onBoardComponents[row].components[buttonIndex] = newButton;
		if (exceptOthers) enableAll(this.onBoardComponents[row].components, [button.customId]);
	}

	private activateButtons(options: Partial<ActivateButtonOptions>[], global?: Partial<ActivateButtonOptions>)
	{
		for (const option of options)
			this.activateButton(Object.assign(option, global ?? {}) as ActivateButtonOptions);
	}

	private translateScopeToButtonId()
	{
		switch (this.scope)
		{
			case 'settings-list': return 'help:settings-list';
			case 'categories-list': return 'help:categories-list';
			case 'cmd-list':
			case 'cmd-info':
			case 'settings-info':
			case 'main':
				return null;
		}
	}
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

// #region Standalone
interface ActivateButtonOptions
{
	row: number
	searchID: string;
	exceptOthers?: boolean;
	overwriteStyle?: MessageButtonOptions['style'],
}

function enableAll(components: MessageActionRowComponent[], exceptTargetIDs: string[])
{
	if (!components) return;
	for (const button of components as MessageButton[])
		if (!(exceptTargetIDs ?? []).includes(button.customId))
			enableSingle(button);
}

function enableSingle(button: MessageButton)
{
	if (!button.customId.includes('exit')) button.style = 'PRIMARY';
	button.disabled = false;
}

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

async function getMenuOption(message: Message, options?: AwaitMessageComponentOptions<MessageComponentInteraction>)
{
	let targetName: string = null;
	await message.awaitMessageComponent(
		Object.assign(
			options ?? {},
			{ componentType: 'SELECT_MENU' },
		)).then((i) => {
		void i.deferUpdate();
		void i.deleteReply();
		targetName = (i as SelectMenuInteraction).values[0];
	})
	.catch(() => null)
	.finally(() => void message.delete().catch(() => null));
	return targetName;
}
// #endregion
