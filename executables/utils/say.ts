import { TextChannel, ThreadChannel } from "discord.js";
import Sayumi_Command from "../../utils/interfaces/Command";

const cmd: Sayumi_Command = {
	name: 'say',
	aliases: ['copy', 'parrot', 'iu', 'asay'],
	groups: ['Emotes'],
	description: 'Saying on my behalf.',
	guildOnly: true,
	args: true,
	usage: ['[channel?] <any>'],
	reqPerms: ['MANAGE_MESSAGES'],
	reqUsers: ['Anyone with the permission flagged above.'],
	onTrigger: (client, message, ...args) => {
		if (!args.length) return;
		const targetChannel = message.guild.channels.cache.get(args[0] as string) ??
							message.guild.channels.cache.find(ch => ch.name === args[0]);

		if (targetChannel) args.splice(0, 1);

		try {
			// client.Messages.set(message.id, { msgID: message.id, flagNoDelete: true });
			void message.delete().then(() => {
				if (targetChannel && targetChannel.permissionsFor(client.user.id).has('SEND_MESSAGES')) return void (targetChannel as TextChannel | ThreadChannel).send(args.join(' '));
				void message.channel.send(args.join(' '));
			});
		} catch (error) {
			return;
		}
	},
};

export = cmd;