import Sayumi_Bot from './utils/Client';
import * as dotenv from 'dotenv';
dotenv.config();

new Sayumi_Bot({
	core: {
		token: process.env.TOKEN,
		bugChannelID: process.env.BUG_CHANNEL_ID,
		MusicPlayerOptions: {
			autoSelfDeaf: true,
			// not enough processing power for lives but welp
			enableLive: true,
			fetchBeforeQueued: true,
			leaveOnEmpty: true,
			leaveOnEmptyCooldown: 60000,
			leaveOnEnd: true,
			leaveOnEndCooldown: 60000,
			ytdlOptions: {
				quality: 'highest',
				// inputStream: EPIPE error emitted when disabled on certain videos
				filter: 'audioonly',
			},
		},
		evtFolder: 'events',
		cmdFolder: 'executables',
	},
	DSBotOptions: {
		intents: [
			'DIRECT_MESSAGES',
			'DIRECT_MESSAGE_REACTIONS',
			'DIRECT_MESSAGE_TYPING',
			'GUILDS',
			'GUILD_EMOJIS_AND_STICKERS',
			'GUILD_INTEGRATIONS',
			'GUILD_INVITES',
			'GUILD_MEMBERS',
			'GUILD_MESSAGES',
			'GUILD_MESSAGE_REACTIONS',
			'GUILD_MESSAGE_TYPING',
			'GUILD_PRESENCES',
			'GUILD_VOICE_STATES',
			'GUILD_WEBHOOKS',
		],
	},
	databaseOptions: {
		local: true,
		uri: process.env.DATABASE_LOCAL_URI,
		// uri: process.env.DATABASE_REMOTE_URI,
		// localUri: process.env.DATABASE_LOCAL_URI,
		username: process.env.DATABASE_USERNAME,
		password: process.env.DATABASE_PASSWORD,
	},
});