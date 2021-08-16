import { Interaction, InteractionCollector } from "discord.js";
import Sayumi_Event from "../../utils/interfaces/Event";

const evt: Sayumi_Event = {
	name: 'interactionCreate',
	onEmit: (client, interaction: Interaction) => {
		// console.log(interaction);
	},
};

export = evt;