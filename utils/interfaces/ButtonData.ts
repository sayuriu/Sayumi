import { MessageButtonOptions } from "discord.js";

interface ButtonData
{
	global?: Partial<MessageButtonOptions>,
	individual: Partial<MessageButtonOptions>[],
}

export default ButtonData;