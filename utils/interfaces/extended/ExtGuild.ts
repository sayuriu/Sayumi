import { Guild } from "discord.js";
import Sayumi from "../../Client";

export interface ExtGuild extends Guild
{
	client: Sayumi
}