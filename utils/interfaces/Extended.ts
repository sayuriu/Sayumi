import { CommandInteraction, Guild, GuildMember, Interaction, Message, MessageEditOptions, MessagePayload, TextChannel, VoiceChannel } from "discord.js";
import { Queue } from "discord-player";
import Sayumi from "../Client";

export interface ExtGuild extends Guild
{
	client: Sayumi
}

export interface ExtMessage extends Message
{
	edit: (content: string | MessageEditOptions | MessagePayload) =>  Promise<ExtMessage>
	requestID?: string;
	client: Sayumi;
	guild: ExtGuild;
	prefixCall?: string;
}

export interface ExtQueue extends Queue
{
	metadata: {
		textChannel: TextChannel;
		voiceChannel: VoiceChannel;
	}
}

export interface ExtInteraction extends Interaction
{
	guild: ExtGuild;
	client: Sayumi;
}

export interface ExtCommandInteraction extends CommandInteraction
{
	client: Sayumi;
	member: GuildMember;
}