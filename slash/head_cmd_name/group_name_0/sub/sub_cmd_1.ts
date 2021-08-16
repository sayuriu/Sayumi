import Sayumi_SlashCommand from "@interfaces/SlashCommand";

const cmd: Sayumi_SlashCommand = {
	name: 'cmd_1',
	description: 'null',
	parentName: 'group_0',
	highestParentName: 'test_main',
	options: [
		{
			name: 'arg_0',
			description: 'subcmd_arg_0',
			type: 'INTEGER',
		},
		{
			name: 'arg_1',
			description: 'subcmd_arg_1',
			type: 'BOOLEAN',
		},
	],
	onTrigger: (client, interaction) => console.log(1),
};

export = cmd;