import { Queue } from "discord-player";
import { TextChannel, VoiceChannel } from "discord.js";

export interface ExtQueue extends Queue
{
	metadata: {
		textChannel: TextChannel;
		voiceChannel: VoiceChannel;
	}
}