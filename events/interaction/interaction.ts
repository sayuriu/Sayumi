import Sayumi_Event from "../../utils/interfaces/Event";
import { ExtInteraction } from "../../utils/interfaces/Extended";
import { CommandInteraction, CommandInteractionOption } from 'discord.js';
import Sayumi from "utils/Client";

const evt: Sayumi_Event = {
	name: 'interactionCreate',
	onEmit: (client, interaction: ExtInteraction) => {
		// console.log(interaction);
		const guildSettings = client.Database.Guild.loadFromCache(interaction.guild);

		if (interaction.isCommand())
		{
			void interaction.deferReply();
			interaction.options.getSubcommandGroup(false);
			interaction.options.getSubcommand(false);
			resolve(client, interaction);
		}
	},
};

export = evt;

function resolve(client: Sayumi, data: CommandInteraction)
{
	const cmd_name = data.commandName;
	const level_3_cmd = client.SlashCommands.get(cmd_name);
	if (!level_3_cmd)
	{
		null;
	}
	const group = data.options.getSubcommandGroup(false);
	const subcommand = data.options.getSubcommand(false);
	null;
}