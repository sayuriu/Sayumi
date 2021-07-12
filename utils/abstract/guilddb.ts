import { Guild } from "discord.js";
import GuildData from "../interfaces/GuildData";
import DefaultGuildSettings from "../json/DefaultGuildSettings.json";

export default abstract class GuildDatabase
{
	static add: (guild: Guild) => Promise<void>;
	static delete: (guild: Guild) => Promise<void>;
	static get: (guild: Guild) => Promise<GuildData | typeof DefaultGuildSettings>;
	static update: (guild: Guild, settings: Record<string, unknown>) => Promise<void>;
	static loadFromCache: (guild: Guild, force?: boolean) => Promise<GuildData | typeof DefaultGuildSettings>;
}