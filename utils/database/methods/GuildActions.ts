/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import GuildSchema from '../models/guild';
import { Types } from 'mongoose';
import DefaultSettings from '../../json/DefaultGuildSettings.json';
import { error, info } from '../../Logger';
import GuildData from '../../interfaces/GuildData';
import GD_Base from '../../abstract/guilddb';
import { ExtGuild } from '../../interfaces/extended/ExtGuild';
import Sayumi from '../../Client';

export default class GuildDatabase extends GD_Base {

	static async add(guild: ExtGuild): Promise<void>
	{
		if (checkDisabled(guild.client, this.caller.name, true)) return;
		const GuildObject = {
			_id: Types.ObjectId(),
			guildName: guild.name,
			guildID: guild.id,
			AllowedReplyOn: [guild.channels.cache.find(ch => ch.name.includes('bot') || ch.name.includes('general')).id],
		};
		const newGuild = new GuildSchema(GuildObject);
		return newGuild.save().then(() => {
			info(`[Guild Add] New settings saved for guild "${guild.name}" [ID${guild.id}]`);
		});
	}

	static async delete(guild: ExtGuild): Promise<void>
	{
		if (checkDisabled(guild.client, this.caller.name, true)) return;
		try {
			await GuildSchema.findOneAndDelete({ guildID: guild.id });
		} catch (e) {
			error(`[Database > Guild Removal] An error has occured while removing the data: \n${e}`);
		}
	}

	static async get(guild: ExtGuild): Promise<GuildData | typeof DefaultSettings>
	{
		if (checkDisabled(guild.client)) return DefaultSettings;
		const data = await GuildSchema.findOne({ guildID: guild.id });
		if (data) return data as unknown as GuildData;

		void this.add(guild);
		const def = Object.assign({
			_id: null,
			guildName: guild.name,
			guildID: guild.id,
			AllowedReplyOn: [guild.channels.cache.find(ch => ch.name.includes('bot') || ch.name.includes('general')).id],
		}, DefaultSettings);

		return def as GuildData;
	}

	static async update(guild: ExtGuild, settings: Record<string, unknown> | GuildData): Promise<void>
	{
		if (checkDisabled(guild.client, this.caller.name, true)) return;
		if (typeof settings !== 'object')
		{
			error('[Guild Update] The setting passed in is not an object.');
			return;
		}
		const data = await this.get(guild);
		for (const key in settings)
		{
			if (Object.prototype.hasOwnProperty.call(settings, key))
			{
				if (data[key] !== settings[key]) data[key] = settings[key];
				else return;
			}
		}

		await GuildSchema.updateOne({ guildID: guild.id }, data);
		guild.client.emit('databaseUpdate', 'guild', data);
		return;
	}

	static async loadFromCache(guild: ExtGuild, force = false): Promise<GuildData | typeof DefaultSettings>
	{
		if (checkDisabled(guild.client)) return DefaultSettings;
		let data = guild.client.CachedGuildSettings.get(guild.id);
		if (!data || force)
		{
			data = (await this.get(guild)) as GuildData;
			data.autoUpdate = setInterval(() => {
				guild.client.CachedGuildSettings.delete(guild.id);
				void this.loadFromCache(guild);
			}, 3600000);
			guild.client.CachedGuildSettings.set(guild.id, data);
		}
		return data;
	}
}

function checkDisabled(client: Sayumi, caller?: string, warn = false): boolean
{
	if (client.Database.disabled)
	{
		if (warn) client.Log.warn(`[Sayumi] Offline mode is enabled. You received this message because you have invoked a database methood.\n Invoked method: '${caller}'`);
		return true;
	}
	return false;
}