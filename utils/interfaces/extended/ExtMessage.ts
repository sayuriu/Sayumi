import { Message, MessageEditOptions, MessagePayload } from "discord.js";
import Sayumi from "../../Client";
import { ExtGuild } from "./ExtGuild";

export interface ExtMessage extends Message
{
	edit: (content: string | MessageEditOptions | MessagePayload) =>  Promise<ExtMessage>
	requestID?: `${bigint}`;
	client: Sayumi;
	guild: ExtGuild;
	prefixCall?: string;
}