import Sayumi_Command from "../../utils/interfaces/Command";
import GuildData from "../../utils/interfaces/GuildData";

const cmd: Sayumi_Command = {
	name: 'afk',
	description: 'Set AFK for yourself. Other users will be notified if they ping you.',
	aliases: ['setafk'],
	groups: ['Utilities'],
	guildOnly: true,
	args: true,
	usage: [''],
	cooldown: 0,
	onTrigger: async (client, message, ...args) => {
		const source = await client.Database.Guild.get(message.guild) as GuildData;
		if (source.AFKUsers === false) return message.channel.send(`AFK function is disabled in this server.`);

		let reason: string;
		if (reason === '') reason = undefined;

		if (args) reason = args.join(' ');

		const userObject = {
			name: message.member.displayName,
			id: message.member.id,
			reason,
			AFKTimestamp: message.createdTimestamp,
			lastChannel: message.channel.id,
		};

		client.AFKUsers.set(message.author.id, userObject);
		if (message.guild.me.permissions.has('MANAGE_NICKNAMES')) await message.member.setNickname(`[AFK] ${userObject.name}`).catch(err => void message.channel.send('Hmph... Anyway.').then(m => setTimeout(() => void m.delete(), 2500)));
		void message.channel.send(`I have set your AFK${reason.length > 0 ? `: ${reason}` : '.'}`).then(m => setTimeout(() => void m.delete(), 5000));
		return;
	},
};