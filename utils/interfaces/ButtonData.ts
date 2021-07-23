import { MessageButtonOptions } from "discord.js";

interface ButtonData
{
	global?: MessageButtonOptions,
	individual: Partial<MessageButtonOptions>[],
}

export default ButtonData;