import { Guild } from "discord.js";
import { Schema } from "mongoose";
import DefaultGuildSettings from '../json/DefaultGuildSettings.json';

export default abstract class GuildDatabase
{
	static add: (guild: Guild) => Promise<void>;
	static delete: (guild: Guild) => Promise<void>;
	static get: (guild: Guild) => Promise<GuildData | typeof DefaultGuildSettings>;
	static update: (guild: Guild, settings: Record<string, unknown>) => Promise<void>;
	static loadFromCache: (guild: Guild, force?: boolean) => Promise<GuildData>;
}

export interface GuildData
{
	_id: Schema.Types.ObjectId;
	guildID: string;
	guildName: string;
	prefix: string;
	welcomeChannel?: string | null;
	AllowedReplyOn: string[];
	FalseCMDReply?: string[];
	LogHoldLimit?: number;
	MessageLogChannel?: string | null;
	MessageLogState?: boolean;
	MessageLog?: Map<string, unknown>;
	MusicPlayerSettings?: MusicPlayerSettings;
	AllowPartialNSFW?: boolean;
	AFKUsers?: boolean;
}

interface MusicPlayerSettings
{
	CustomFilters: Map<string, string>;
	Silent: boolean;
	DeleteEmbedsAfterPlaying: boolean;
}