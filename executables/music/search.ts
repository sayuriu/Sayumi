import { MessageEmbed as EmbedConstructor } from 'discord.js';
import Sayumi_Command from '../../utils/interfaces/Command';
import { music } from '../../utils/json/Responses.json';

const cmd: Sayumi_Command = {
	name: 'msearch',
	aliases: ['ms, music-s, mlookfor'],
	groups: ['Music'],
	args: true,
	reqPerms: ['CONNECT', 'SPEAK'],
	onTrigger: async (client, message, ...args) => {
		const m = await message.channel.send({
			embeds: [new EmbedConstructor({
				title: client.Methods.Common.GetRandomize(music.embed.searching),
				description: `Query: \`${args.join(' ')}\``,
			})],
		}).catch();

		const res = await client.MusicPlayer.search(args.join(" "), {
			requestedBy: message.author.id,
		});
		console.log(res);
	},
};

export = cmd;