/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Message, Collection, TextChannel, NewsChannel, ThreadChannel } from "discord.js";
import Sayumi from "../../utils/Client";

import { commands } from '../../utils/json/Responses.json';
import DefaultGuildSettings from '../../utils/json/DefaultGuildSettings.json';
import GuildData from "../../utils/interfaces/GuildData";
import AFKUser from "../../utils/interfaces/AFKUser";
import { ExtMessage } from "../../utils/interfaces/extended/ExtMessage";
import { ExtQueue } from "../../utils/interfaces/extended/ExtQueue";
import { joinVoiceChannel } from "@discordjs/voice";
import { VoiceAdapterCreator } from "discord-player";


type GuildChannels = TextChannel | NewsChannel | ThreadChannel;
type NonThreadChannels = TextChannel | NewsChannel;

export = {
	name: 'messageCreate',
	onEmit: async (client: Sayumi, message: ExtMessage): Promise<void> => {

		let prefix = DefaultGuildSettings.prefix;
		let source: GuildData | typeof DefaultGuildSettings;
		const mention_self = `<@!${client.user.id}>`;
		const { Common: { GetRandomize } } = client.Methods;

		const SelfDeteleMsg = (m: Message, t: number) => {
			setTimeout(() => {
				if (!m.deleted && m.deletable) void m.delete();
				return;
			}, t);
			return;
		};

		// Gets the prefix if the message is sent in a guild.
		if (message.guild)
		{
			source = await client.Database.Guild.loadFromCache(message.guild);
			prefix = source.prefix;

			if (message.guild['newGuild'])
			{
				// Setup message ...
				delete message.guild['newGuild'];
			}
		}

		message.prefixCall = prefix;
		// AFK section
		if (message.guild && (source as GuildData).AFKUsers)
		{
			const userArray: AFKUser[] = [];

			// Remove AFK for users
			const IfAFK = client.AFKUsers.get(message.author.id);
			if (IfAFK)
			{
				if (message.guild.me.permissions.has('MANAGE_NICKNAMES')) await message.member.setNickname(IfAFK.name).catch(() => void message.channel.send('...').then(m => m.delete()));
				client.AFKUsers.delete(message.author.id);
				if (message.guild && (source as GuildData).AllowedReplyOn.some(channelID => channelID === IfAFK.lastChannel)) void (client.channels.cache.find(channel => channel.id === IfAFK.lastChannel) as GuildChannels).send(`Welcome back <@!${IfAFK.id}>, I have removed your AFK!`).then(m => SelfDeteleMsg(m, 4000));
				else;
			}

			if (message.mentions.users.size)
			{
				message.mentions.users.forEach(user => {
					const userMention = client.AFKUsers.get(user.id);
					if (userMention) userArray.push(userMention);
				});
				if (userArray.length === 1)
				{
					const target = userArray[0];
					const { hour, minute, second } = client.Methods.Time.TimestampToTime(Date.now() - target.AFKTimestamp);
					let timeString = '';

					if (hour) timeString = `${hour} hour${hour > 1 ? 's' : ''}`;
					if (minute > 0 && !hour) timeString = `${minute} minute${minute > 1 ? 's' : ''}`;
					if (second > 0 && !minute && !hour) timeString = 'Just now';

					void message.channel.send(`**${target.name}** is currently AFK${target.reason ? `: *${target.reason}*` : '.'} **\`[${timeString}]\`**`);
					return;
				}
				if (userArray.length > 1)
				{
					void message.channel.send(`Two or more users you are mentioning are currently AFK.`);
					return;
				}
			}

			// She starts listening if the message starts with a prefix or a direct mention.
			if (message.content.startsWith(prefix) || message.content.startsWith(mention_self))
			{
				let mentionID = false;
				if (message.author.bot) return;
				if (message.content.startsWith(mention_self))
				{
					prefix = mention_self;
					mentionID = true;
				}

							// Returns when the message is sent in the listened channel (In guilds ofcourse)
				if (message.guild && !(source as GuildData).AllowedReplyOn.includes(message.channel.id)) return;

				// If command is typed in an eval instance's channel
				if (client.EvalSessions.get((parseInt(message.author.id) + parseInt(message.channel.id)).toString(16))) return;

				else
				{
					const args = message.content.slice(mentionID ? prefix.length + 1 : prefix.length).split(/ +/);
					const CommandName = args.shift().toLowerCase();

					if (!CommandName.length)
					{
						if (message.channel.type === 'DM' || (source as GuildData).FalseCMDReply.includes(message.channel.id))
						{
							// functions.Cooldown(client.Cooldowns, typo, 3, message.author.id, message);
							void message.channel.send(GetRandomize(commands.only_prefix));
						}
						return;
					}

					// Look up for the command
					const RequestedCommand = client.CommandList.get(CommandName) ||
					client.CommandList.find(cmd => cmd.aliases?.includes(CommandName));

					// If the command doesn't exist
					if (!RequestedCommand) {
						const typo = CommandName;

						const res: string = GetRandomize(commands.problems.invalid)
									.replace(/\${typo}/g, typo)
									.replace(/\${memberName}/g, message.guild ? message.member.displayName : message.author.username)
									.replace(/\${thisPrefix}/g, prefix);

						if (message.channel.type === 'DM' || (source as GuildData).FalseCMDReply.includes(message.channel.id))
						{
							// functions.Cooldown(client.Cooldowns, typo, 3, message.author.id, message);
							void message.channel.send(res);
						}
						return;
					}

									// Sending guild-only commands through DMs
					if (RequestedCommand.guildOnly && message.channel.type === 'DM') return void message.reply(GetRandomize(commands.problems.guild_only_invalid));

					// Cooldowns (throttling)
					const { Cooldowns } = client;
					const now = Date.now();

					if (!Cooldowns.has(RequestedCommand.name)) Cooldowns.set(RequestedCommand.name, new Collection());

					const timestamps = Cooldowns.get(RequestedCommand.name);
					const cooldownAmount = (RequestedCommand.cooldown || 2) * 1000;
					const master = message.author.id === client.master;

					// Guild cooldowns
					if (RequestedCommand.guildCooldown && message.guild)
					{
						if (timestamps.has(message.guild.id))
						{
							const expirationTime = timestamps.get(message.guild.id) + cooldownAmount;

							// @suggest: use while loop
							if (now < expirationTime && !master)
							{
								const timeLeft = (expirationTime - now) / 1000;
								return void message.reply(
									GetRandomize([
										// @flagged:needs-optimizations
										`please wait ${timeLeft.toFixed(0)} second${ Math.floor(timeLeft) > 1 ? 's' : '' } before reusing`,
										`please cool down! \`[${timeLeft.toFixed(0)} second${ Math.floor(timeLeft) > 1 ? 's' : '' }]\``,
									]),
								);
							}
						}

						timestamps.set(message.guild.id, now);
						setTimeout(() => timestamps.delete(message.guild.id), cooldownAmount);
					}

					// User cooldowns
					else
					{
						if (timestamps.has(message.author.id))
						{
							const expirationTime = timestamps.get(message.author.id) + cooldownAmount;

							if (now < expirationTime && message.channel.type !== 'DM' && !master)
							{
								const timeLeft = (expirationTime - now) / 1000;
								return void message.reply(
									`please wait ${timeLeft.toFixed(1)} second${ Math.floor(timeLeft) > 1 ? 's' : '' } before reusing the \`${RequestedCommand.name}\` command.`,
								);
							}
						}

						timestamps.set(message.author.id, now);
						setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);
					}

					// If the command requires args... But the user doesn't includes many.
					// Note: Added reqArgs for commands that specifically requires args.
					if (RequestedCommand.reqArgs && !args.length)
					{
						let string: string;
						if (RequestedCommand.prompt) return void message.channel.send(RequestedCommand.prompt.toString());
						if (RequestedCommand.usage) string = `\nUsage: \`${prefix}${RequestedCommand.name} ${RequestedCommand.usage}\`.`;
						return void message.channel.send(`${GetRandomize(commands.problems.empty_arguments)} ${string || ''}`);
					}

					// Master-explicit commands
					if (RequestedCommand.master_explicit && !master) {
						return message.channel.send(`Sorry ${message.author}, but this command can be issued by master only.`).then(msg => {
							if ((message.channel as GuildChannels).name.includes('general')) return SelfDeteleMsg(msg, 3000);
							return SelfDeteleMsg(msg, 5000);
						});
					}

					// NSFW commands (needs rework)
					// if (RequestedCommand.nsfw === 'partial' && message.channel.type !== 'DM')
					// {
					// 	if (!source.AllowPartialNSFW) return message.channel.send('Please execute this command from an appropriate channel.').then(m => SelfDeteleMsg(m, 3000));
					// 	const boolean = client.Channels.get(message.channel.id);
					// 	if (!boolean)
					// 	{
					// 		message.channel.send('This command is partial NSFW. You have been warned.');
					// 		client.Channels.set(message.channel.id, true);
					// 		setTimeout(() => client.Channels.delete(message.channel.id), 180000);
					// 	}
					// }
					if (RequestedCommand.nsfw && message.channel.type !== 'DM' && !(message.channel as NonThreadChannels).nsfw)
					{
						if (message.deletable) void message.delete();
						return message.channel.send('Please execute this command from an appropriate channel.').then(m => SelfDeteleMsg(m, 3000));
					}

					// Permissions-checking
					if (RequestedCommand.reqPerms && message.guild)
					{
						let uConfirm = true;
						let meConfirm = true;
						const required = [];
						if (Array.isArray(RequestedCommand.reqPerms))
						{
							RequestedCommand.reqPerms.forEach(permission => {
								if (message.member.permissions.has(permission)) return;
								uConfirm = false;
							});

							RequestedCommand.reqPerms.forEach(permission => {
								if (message.guild.me.permissions.has(permission)) return;

								required.push(permission);
								meConfirm = false;
							});
						}
						else
						{
							if (!message.member.permissions.has(RequestedCommand.reqPerms)) uConfirm = false;
							if (!message.guild.me.permissions.has(RequestedCommand.reqPerms)) meConfirm = false;
						}

						if (!uConfirm) return void message.channel.send(`**${message.member.displayName}**, you are lacking permission to do so.`);
						if (!meConfirm) return void message.channel.send(`Lacking permissions: \`${required.join(', ')}\``);
					}

					// Try executing the command
					try {
						if (typeof RequestedCommand.groups === 'string') RequestedCommand.groups = [RequestedCommand.groups];
						if ((RequestedCommand.groups || []).includes('Music'))
						{
							// if not in vc
							if (!message.member.voice.channel) return void message.channel.send('Please join the VC.');
							if (!message.guild.me.voice) joinVoiceChannel({
								channelId: message.member.voice.channelId,
								guildId: message.guild.id,
								adapterCreator: VoiceAdapterCreator(message.member.voice.channel),
							});

							const queue = client.MusicPlayer.getQueue(message.guild);
							if (queue)
							{
								const ListenerChannel = (queue as ExtQueue).metadata.textChannel;
								const VoiceChannel = (queue as ExtQueue).metadata.voiceChannel;
								// if not in text
								if (message.channel.id !== ListenerChannel.id) return void message.channel.send(`You are supposed to type the request in <#${ListenerChannel.id}>!`);
								// if not in voice
								if (message.member.voice?.channelId !== VoiceChannel.id) return void message.channel.send('Join the same voice channel as me to run requests.');
							}
						}

						if (RequestedCommand.terminal) return RequestedCommand.onTrigger(client, message, prefix);
						if (RequestedCommand.args || RequestedCommand.reqArgs) return RequestedCommand.onTrigger(client, message, args);
						return RequestedCommand.onTrigger(client, message);
						// Catch errors
					} catch (error) {
						client.Log.error(`[Command Execution] An error has occured while executing "${RequestedCommand.name}": \n${error.message} \n${error.stack ?? ''}`);
						void (client.channels.cache.find(ch => ch.id === process.env.BUG_CHANNEL_ID) as TextChannel).send({ embeds: [client.Embeds.error(message, error.message)] });
						if (message.channel.type === 'GUILD_TEXT' || message.channel.type === 'DM') return void message.channel.send(GetRandomize(commands.error));
						return void message.reply(GetRandomize(commands.error));
					}
				}
			}
		}
	},
};