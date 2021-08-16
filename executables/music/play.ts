import Sayumi_Command from '../../utils/interfaces/Command';
import ytpl from 'ytpl';
import { Message } from 'discord.js';

const cmd: Sayumi_Command = {
	name: 'mplay',
	groups: ['Music'],
	reqPerms: ['CONNECT', 'SPEAK'],
	onTrigger: async (client, message, ...args) => {
		// if (!args.length)
		// {
		// 	if (client.MusicPlayer.getQueue(message.guild)?.setPaused()) return client.MusicPlayer.resume(message);
		// 	return message.channel.send();
		// }
		const failCallback = () => {
			return message.channel.send('There was a problem while fetching playlist.');
		};
		const [query, ind] = await handleYTLinks(args.join(' '), failCallback);
		void client.MusicPlayer.getQueue(message.guild).play(
			(await client.MusicPlayer.search(query, {
				requestedBy: message.author.id,
			})).tracks[0],
			{
				immediate: true,
			},
		);
	},
};

export = cmd;

async function handleYTLinks(link: string, failCallback: { (): Promise<Message>; (): void; }): Promise<[string, number]>
{
	const [, videoID] = (videoRegEx.exec(link)) ?? [];
	const [, playlistID] = (playlistRegEx.exec(link)) ?? [];
	const [, startIndex] = (playlistIndexRegEx.exec(link)) ?? [];

	if (playlistID)
	{
		if (startIndex) return [generatePlaylistLink(playlistID), parseInt(startIndex)];
		if (videoID)
		{
			try
			{
				const res = await ytpl(playlistID);
				const target = res.items.filter(v => v.id === videoID)[0];

				return [generatePlaylistLink(playlistID), target ? res.items.indexOf(target) : 0];
			}
			catch(e)
			{
				void failCallback();
				if (videoID) return [videoID, 0];
				return [link, 0];
			}
		}
	}
	if (videoID) return [videoID, 0];
	return [link, 0];
}

const generatePlaylistLink = (id: any) => `https://www.youtube.com/playlist?list=${id}`;

const playlistRegEx = /(?:youtube\.com.*(?:\?|&)(?:list)=)((?!videoseries)[a-zA-Z0-9_-]*)/;
const playlistIndexRegEx = /&index=(\d+)/;
const videoRegEx = /(?:youtube\.com.*(?:\?|&)(?:v)=|youtube\.com.*embed\/|youtube\.com.*v\/|youtu\.be\/)((?!videoseries)[a-zA-Z0-9_]*)/;
