import { MessageButton, MessageButtonOptions } from "discord.js";
import ButtonData from "../../interfaces/ButtonData";

export default function createButtons(data: ButtonData): MessageButton[]
{
	const out: MessageButton[] = [];
	for (let settings of data.individual)
	{
		if (data.global) settings = Object.assign(settings, data.global);
		out.push(new MessageButton(settings as MessageButtonOptions));
	}
	return out;
}