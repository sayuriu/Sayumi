import Sayumi_Command from "../../utils/interfaces/Command";

import settings from '../../utils/json/SettingsObjects.json';
import { MessageEmbed as EmbedConstructor } from 'discord.js';
import GuildData from "../../utils/interfaces/GuildData";
import { ExtMessage } from "../../utils/interfaces/Extended";

const cmd: Sayumi_Command = {
	name: 'settings',
	description: 'Configurate Sayumi\'s settings for your current server.',
	args: true,
	guildOnly: true,
	usage: ['[<name> <options>]'],
	groups: ['Settings'],
	notes: ['If no arguments are provided, that will display settings\' status instead.'],
	// settings_explicit: true,
	onTrigger: async (client, message, ...args) => {
		const source = await client.Database.Guild.get(message.guild) as GuildData;

		if (args[1]) args[1] = args[1].toLowerCase();

		if (!args.length || args.length < 1 || args[0] === 'info' || args[0] === 'status')
		{
			const SettingsObject = {
				activeChannels: source.AllowedReplyOn,
				falseReply: source.FalseCMDReply.length ? source.FalseCMDReply.map(c => `<#${c}>`) : 'Disabled',
				logState: source.MessageLogState,
				logLimit: source.LogHoldLimit,
				afk: source.AFKUsers,
			};
			const embed = new EmbedConstructor()
									.setTitle('Settings')
									.setDescription(`Now showing settings for guild [${message.guild.name}]`)
									.setColor('#42e3f5')
									.addField(`Active channels (${SettingsObject.activeChannels.length})`, `*Note: Sayumi will only listen for commands on those channels.*\n${SettingsObject.activeChannels.length > 15 ? `${SettingsObject.activeChannels.length} channels` : SettingsObject.activeChannels.join(' ')}`)
									.addField('Unknown command replies', `${SettingsObject.falseReply.length > 15 ? `${SettingsObject.falseReply.length} channels` : `${Array.isArray(SettingsObject.falseReply) ? `${SettingsObject.falseReply.join(' ')}` : `${SettingsObject.falseReply}`}`}`)
									.addFields([
										{ name: 'Edit / deleted message logging', value: `${SettingsObject.logState ? 'Enabled' : 'Disabled'} \`| ${SettingsObject.logLimit}\``, inline: true },
										{ name: 'AFK users settings', value: `${SettingsObject.afk ? 'Enabled' : 'Disabled'}`, inline: true },
									])
									.setFooter(`Current prefix: ${source.prefix}`);
			return void message.channel.send({ embeds: [embed] }).catch(_ => { return void message.channel.send('I can\'t send the embed...'); });
		}
		else
		{
			args[0] = args[0].toLowerCase();
			switch (args[0])
			{
				case 'replyon':
				{
					void Settings.AllowReplyConfig(message, args);
					break;
				}
				case 'msglog':
				{
					void Settings.MessageLog(message, args);
					break;
				}
				case 'unknowncmd':
				{
					void Settings.UnknownCMDReply(message, args);
					break;
				}
				case 'afk':
				{
					void Settings.AFKUsers(message, args);
					break;
				}
				default: return void message.channel.send('Invalid option name.');
			}
		}
	},
};

export = cmd;

class Settings
{
	constructor()
    {
        throw new Error(`${this.constructor.name} can't be instantiated!`);
    }

	static async AFKUsers(message: ExtMessage, args: string[])
	{
		const { client: { Methods: { Common: { PermissionCheck } }, Database: { Guild: GuildDatabase } } } = message;
		const SettingsObject = settings.afk_users;

		const { userPass } = PermissionCheck(SettingsObject, message);
		if (!userPass) return void message.channel.send(`**${message.member.displayName}**, you are lacking permissions to change this settings.`);

		const { AFKUsers: status } = await GuildDatabase.get(message.guild) as GuildData;

		if (!args[1]) return void message.channel.send(status ? 'This settings is enabled.' : 'This setting is disabled.');

		args[1] = args[1].toLowerCase();
		switch (args[1])
		{
			case 'enable':
			{
				if (status) return void message.channel.send('This settings is already enabled.');

				void GuildDatabase.update(message.guild, { AFKUsers: true })
				.then(() => {
					void message.channel.send('Successfully enabled this settings.');
				})
				.catch(() => void message.channel.send('Failed to enable this settings. Please try again after a few moments.'));
				break;
			}
			case 'disable':
			{
				if (!status) return void message.channel.send('This settings is already disabled.');

				void GuildDatabase.update(message.guild, { AFKUsers: false })
				.then(() => {
					void message.channel.send('Successfully enabled this settings.');
				})
				.catch(() => void message.channel.send('Failed to enable this settings. Please try again after a few moments.'));
				break;
			}
		}
	}

	static async AllowReplyConfig(message: ExtMessage, args: string[])
	{
		const { client: { Methods: { Common: { PermissionCheck } }, Database: { Guild: GuildDatabase } } } = message;
		const SettingsObject = settings.active_channels;

		const { userPass } = PermissionCheck(SettingsObject, message);
		if (!userPass) return void message.channel.send(`**${message.member.displayName}**, you are lacking permissions to change this settings.`);

		const { AllowedReplyOn } = await GuildDatabase.get(message.guild) as GuildData;

		if (!args[1] || args.length < 2)
		{
			const embed = new EmbedConstructor()
									.setColor('RANDOM')
									.setDescription(`Currently enabled channels: \n${AllowedReplyOn.map(c => `<#${c}>`).join('\n')}`)
									.setFooter('Settings: Active channels');
			return void message.channel.send({ embeds: [embed] });
		}
		else
		{
			args[1] = args[1].toLowerCase();
			let _id: string;
			let confirm = false;
			const channelID = /^<?#?(\d+)>?$/.exec(args[2]);
			if (channelID)
			{
				_id = channelID[1];
				confirm = true;
			}
			else if (!channelID) _id = null;

			switch(args[1])
			{
				case 'add':
				{
					const target = message.guild.channels.cache.find(ch => confirm ? ch.id === _id : ch.name === args[1]);
					if (!target) return void message.channel.send('Can\'t find the channel you specified.');

					const index = AllowedReplyOn.indexOf(target.id);
					if (index > -1) return void message.channel.send('The channel is already existed in my list.');
					else AllowedReplyOn.push(target.id);

					void GuildDatabase.update(message.guild, { AllowedReplyOn: AllowedReplyOn });

					const embed = new EmbedConstructor()
									.setColor('#3aeb34')
									.setDescription(`Successfully added <#${target.id}> to the list.`);
					void message.channel.send({ embeds: [embed] });
					break;
				}
				case 'remove':
				{
					const target = message.guild.channels.cache.find(ch => confirm ? ch.id === _id : ch.name === args[1]);
					if (!target) return void message.channel.send('Can\'t find the channel you specified.');

					const index = AllowedReplyOn.indexOf(target.id);
					if (index > -1)
					{
						AllowedReplyOn.splice(index, 1);
					} else return void message.channel.send('The channel does not exist in my list.');

					void GuildDatabase.update(message.guild, { AllowedReplyOn });
					const embed = new EmbedConstructor()
									.setColor('#eb3434')
									.setDescription(`Successfully removed <#${target.id}> from the list.`);
					void message.channel.send({ embeds: [embed] });
					break;
				}
				case 'list':
				{
					const embed = new EmbedConstructor()
								.setColor('RANDOM')
								.setDescription(`Currently enabled channels: \n${AllowedReplyOn.map(c => `<#${c}>`).join('\n')}`);
					void message.channel.send({ embeds: [embed] });
					break;
				}
				default:
				{
					return void message.channel.send(`Please provide a valid option (either \`list\`, \`add\` or \`remove\`).`);
				}
			}
		}
	}

	static async UnknownCMDReply(message: ExtMessage, args: string[])
	{
		const { client: { Methods: { Common: { PermissionCheck } }, Database: { Guild: GuildDatabase } } } = message;
		const SettingsObject = settings.unknown_replies;

		const { userPass } = PermissionCheck(SettingsObject, message);
		if (!userPass) return void message.channel.send(`**${message.member.displayName}**, you are lacking permissions to change this settings.`);

		const { AllowedReplyOn, FalseCMDReply } = await GuildDatabase.get(message.guild) as GuildData;

		const output = FalseCMDReply.map(c => `<#${c}>`);

		if (args[1]) args[1] = args[1].toLowerCase();

		if (!args[1] || args.length < 2 || args[1] === 'info' || args[1] === 'status')
		{
			if (AllowedReplyOn.length === FalseCMDReply.length) return void message.channel.send('This setting is enabled globally.');
			if (output.length > 0 && AllowedReplyOn.length !== FalseCMDReply.length)
			{
				const embed = new EmbedConstructor()
						.setColor('RANDOM')
						.setDescription(`Currently enabled channels: \n${output.join('\n')}`)
						.setFooter('Settings: Unknown command response');
				void message.channel.send({ embeds: [embed] });
			}
			else return void message.channel.send('This setting is disabled globally.');
		}
		else
		{
			let _id: string;
			let confirm = false;
			const channelID = /^<?#?(\d+)>?$/.exec(args[2]);

			if (channelID)
			{
				_id = channelID[1];
				confirm = true;
			}
			else if (!channelID) _id = null;

			switch (args[1])
			{
				case 'add':
				{
					const target = message.guild.channels.cache.find(ch => confirm ? ch.id === _id : ch.name === args[1]);
					if (!target) return void message.channel.send('Can\'t find the channel you specified.');

					if (!AllowedReplyOn.some((chID: string) => chID === target.id)) return void message.channel.send('Make sure I can send messages in that channel before you type this command.');

					const index = FalseCMDReply.indexOf(target.id);
					if (index > -1) return void message.channel.send('The target channel already has this setting enabled.');
					else FalseCMDReply.push(target.id);

					void GuildDatabase.update(message.guild, { FalseCMDReply: FalseCMDReply });

					const embed = new EmbedConstructor()
									.setColor('#3aeb34')
									.setDescription(`Successfully enabled unknown command replies in <#${target.id}>.`);
					void message.channel.send({ embeds: [embed] });
					break;
				}
				case 'remove':
				{
					const target = message.guild.channels.cache.find(ch => confirm ? ch.id === _id : ch.name === args[1]);
					if (!target) return void message.channel.send('Can\'t find the channel you specified.');

					const index = FalseCMDReply.indexOf(target.id);
					if (index > -1) AllowedReplyOn.splice(index, 1);
					else return void message.channel.send('This channel does not exist in my list.');

					void GuildDatabase.update(message.guild, { FalseCMDReply: FalseCMDReply });
					const embed = new EmbedConstructor()
									.setColor('#eb3434')
									.setDescription(`Successfully disabled unknown command replies in <#${target.id}>.`);
					void message.channel.send({ embeds: [embed] });
					break;
				}
				case 'list':
				{
					if (output.length > 0)
					{
						const embed = new EmbedConstructor()
								.setColor('RANDOM')
								.setDescription(`Currently enabled channels: \n${output.join('\n')}`)
								.setFooter('Setting: Unknown command response');
						void message.channel.send({ embeds: [embed] });
					}
					else return void message.channel.send('This setting is disabled globally.');
					break;
				}
				default:
				{
					return void message.channel.send(`Please provide a valid option (either \`list\`, \`add\` or \`remove\`).`);
				}
			}
		}
	}

	static async MessageLog(message: ExtMessage, args: string[])
	{
		const { client: { Methods: { Common: { PermissionCheck } }, Database: { Guild: GuildDatabase } } } = message;
		const SettingsObject = settings.message_log;

		const { userPass } = PermissionCheck(SettingsObject, message);
		if (!userPass) return void message.channel.send(`**${message.member.displayName}**, you are lacking permissions to change this settings.`);

		const { AllowedReplyOn, MessageLogState, MessageLogChannel, LogHoldLimit, prefix } = await GuildDatabase.get(message.guild) as GuildData;
		if (args[1]) args[1] = args[1].toLowerCase();

		if (!args.length || args[1] === 'info' || args[1] === 'status' || !args[1])
		{
			const embed = MessageLogState ?
							new EmbedConstructor()
							.setColor('#3aeb34')
							.setDescription(`This setting is enabled.${MessageLogChannel ? `\nChannel: <#${MessageLogChannel}> | limit \`${LogHoldLimit}\`` : `\nNo log channel assigned`}`)
							.setFooter('Settings: Edit / deleted message logging')
							:
							new EmbedConstructor()
							.setColor('#6a6a6a')
							.setDescription('This setting is disabled.')
							.setFooter('Settings: Edit / deleted message logging');

			return void message.channel.send({ embeds: [embed] });
		}
		else
		{
			switch (args[1])
			{
				case 'enable':
				{
					if (MessageLogState) return void message.channel.send('This setting is already enabled.');
					void GuildDatabase.update(message.guild, { MessageLogState: true });
					const embed = new EmbedConstructor()
										.setColor('#3aeb34')
										.setDescription(`Successfully enabled this setting.`);
					if (!MessageLogChannel) embed.setFooter(`There is no channel for me to send reports! Use ${prefix}${this.name} set <channel> to enable logging.`);
					void message.channel.send({ embeds: [embed] });
					break;
				}
				case 'disable':
				{
					if (!MessageLogState) return void message.channel.send('This setting is already disabled.');
					void GuildDatabase.update(message.guild, { MessageLogState: false });
					const embed = new EmbedConstructor()
										.setColor('#757574')
										.setDescription(`Successfully disabled this setting.`);
					void message.channel.send({ embeds: [embed] });
					break;
				}
				case 'set':
				{
					let _id: string;
					let confirm = false;
					const channelID = /^<?#?(\d+)>?$/.exec(args[2]);
					if (channelID)
					{
						_id = channelID[1];
						confirm = true;
					}
					else if (!channelID) _id = null;
					const target = message.guild.channels.cache.find(ch => confirm ? ch.id === _id : ch.name === args[1]);
					if (!target) return void message.channel.send('Can\'t find the channel you specified.');

					if (!AllowedReplyOn.some((chID: string) => chID === target.id)) return void message.channel.send('Make sure I can send messages in that channel before you type this command.');
					if (target.id === MessageLogChannel) return void message.channel.send('Already using that channel.');

					void GuildDatabase.update(message.guild, { MessageLogChannel: target.id });
					const embed = new EmbedConstructor()
										.setColor('#eb3434')
										.setDescription(`Successfully set <#${target.id}> as inform channel.`)
										.setFooter('Setting: Deleted message logging');
					if (!MessageLogState) embed.setFooter(`The log setting is currently disabled! You can enable anytime by typing ${prefix}${this.name} enable`);
					void message.channel.send({ embeds: [embed] });
					break;
				}
				case 'clear':
				{
					void GuildDatabase.update(message.guild, { MessageLogChannel: null });
					const embed = new EmbedConstructor()
										.setColor('#757574')
										.setDescription(`Successfully cleared inform channel.`);
					void message.channel.send({ embeds: [embed] });
					break;
				}
				case 'setlimit':
				{
					const amount = parseInt(args[2]);
					if (isNaN(amount)) return void message.channel.send('The limit specified must be a number.');
					if (amount < 1 || amount > 5) return void message.channel.send('The limit specified must be between `1` and `5`.');
					void GuildDatabase.update(message.guild, { LogHoldLimit: amount });

					const embed = new EmbedConstructor()
										.setColor('#3aeb34')
										.setDescription(`Successfully changed value to \`${amount}\`.`)
										.setFooter('Setting: Deleted message logging');
					void message.channel.send({ embeds: [embed] });
					break;
				}
				default:
				{
					void message.channel.send('Invalid option.');
				}
			}
		}
	}

	static async Prefix(message: ExtMessage, args: string[])
	{
		const { client: { Methods: { Common: { PermissionCheck } }, Database: { Guild: GuildDatabase } } } = message;
		const SettingsObject = settings.prefix;

		const { userPass } = PermissionCheck(SettingsObject, message);
		if (!userPass) return void message.channel.send(`**${message.member.displayName}**, you are lacking permissions to change this settings.`);

		const { prefix } = await GuildDatabase.get(message.guild);
		if (!args.length || args.length < 2)
		{
			return void message.channel.send(`The current prefix is \`${prefix}\``);
		}
		if (args[1])
		{
			if (args[1].length > 3) return void message.channel.send('The new prefix can not be longer than 3 characters. Please try again.');
			void GuildDatabase.update(message.guild, { prefix: args[1] });
			return void message.channel.send(`The prefix has been updated to \`${args[1]}\``);
		}
	}
}