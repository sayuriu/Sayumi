interface GuildSettings
{
	title: string;
	name: string;
	description: string;
	reqPerms: string[];
	reqUser: string[];
	usage: string[];
	notes?: string[];
}

export default GuildSettings;