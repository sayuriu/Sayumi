import { PermissionString } from "discord.js";
import { ExtMessage } from "./Extended";

/** All `[REQUIRED]` properties must be included for a command to load. */
interface Sayumi_Command
{
	/** `[REQUIRED]` The command's name. */
	name: string;
	/** `[optional]` Command's aliases. */
	aliases?: string[];
	/** `[optional]` Command's description. */
	description?: string;
	/** `[optional]` Command's groups. */
	groups?: string[];
	/** `[optional]` Enable if this command is unstable.*/
	unstable?: boolean;
	/** `[optional]` Custom flags foor this command.*/
	flags?: string[];

	// Only one of these is enabled.
	/** `[optional]` Enable if this command optionally takes arguments. Cannot work with `reqArgs`.*/
	args?: boolean;
	/** `[optional]` Enable if this command requires arguments. Cannot work with `args`.*/
	reqArgs?: boolean;
	// -----------------------------

	/** `[optional]` Command cooldown, in seconds. Default to `3`.*/
	cooldown?: number;
	/** `[optional]` Enable if this command should have cooldown across the guild. */
	guildCooldown?: boolean;
	/** `[optional]` Enable if this is a guild command.*/
	guildOnly?: boolean;
	/** `[optional]` Permission strings, required for both Sayumi and the user. */
	reqPerms?: PermissionString[];
	/** `[optional]` Who can use this command. (Must associate with `ReqPerms`) */
	reqUsers?: string[];
	/** `[optional]` You know the rules, and so do I~ (__Seriously, think carefully.__)*/
	nsfw?: boolean | 'partial';
	/** `[optional]` Enable if this command is owner-exclusive. This will bypass some parameters.*/
	usage?: string[];
	/** `[optional]` An advanced take on `usage`. Show associated params type. (`usage` must be included for this to show.) */
	usageSyntax?: string[];

	/** `[optional] Extra notes for this command.*/
	notes?: string[];
	/** `[REQUIRED]` The function which executes when this command is called. */
	onTrigger?: (message: ExtMessage, ...args: string[]) => void;
}

export default Sayumi_Command;