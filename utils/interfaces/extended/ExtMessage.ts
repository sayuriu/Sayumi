import { Message } from "discord.js";
import Sayumi from "../../Client";
import { ExtGuild } from "./ExtGuild";

export interface ExtMessage extends Message
{
	client: Sayumi;
	guild: ExtGuild;
	prefixCall?: string;
}