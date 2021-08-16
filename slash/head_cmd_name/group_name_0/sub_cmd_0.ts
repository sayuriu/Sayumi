import Sayumi_SlashCommand from "@interfaces/SlashCommand";

const cmd: Sayumi_SlashCommand = {
	name: 'cmd_0',
	description: 'null',
	parentName: 'group_0',
	highestParentName: 'test_main',
	onTrigger: (client, interaction) => console.log(0),
};

export = cmd;