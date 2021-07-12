import { Schema } from "mongoose";

interface GuildData
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
	autoUpdate?: NodeJS.Timeout;
}

interface MusicPlayerSettings
{
	CustomFilters: Map<string, string>;
	Silent: boolean;
	DeleteEmbedsAfterPlaying: boolean;
}

export default GuildData;