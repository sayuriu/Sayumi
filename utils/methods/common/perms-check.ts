import { PermissionString } from "discord.js";
import Sayumi_Command from "../../interfaces/Command";
import { ExtMessage } from '../../interfaces/Extended';
import GuildSettings from "../../interfaces/GuildSettings";

export default function PermsCheck(CommandOrSetting: Sayumi_Command | GuildSettings, message: ExtMessage): PermsCheckResult
{
	let clientPass = true;
	let userPass = true;
	const required: PermissionString[] = [];

	for (const permission of CommandOrSetting.reqPerms) {
		if (!message.member.permissions.has(permission as PermissionString)) userPass = false;
		if (!message.guild.me.permissions.has(permission as PermissionString))
		{
			required.push(permission as PermissionString);
			clientPass = false;
		}
	}

	return { clientPass, userPass, required };
}

interface PermsCheckResult
{
	clientPass: boolean;
	userPass: boolean;
	required: PermissionString[];
}
