/* eslint-disable @typescript-eslint/ban-ts-comment */
import { ApplicationCommandData, ApplicationCommandOptionData, VoiceChannel } from 'discord.js';
import Sayumi_Command from '../utils/interfaces/Command';


const cmd: Sayumi_Command = {
	name: 'script',
	async onTrigger(client, message)
	{
		void message.delete();
		// void client.application.commands.edit('871960481072570389', {name:'help',description:'For you who needs it.',defaultPermission:true,options:[{name:'settings',description:'Search for guild configurations.',type:'SUB_COMMAND',options:[{name:'name',description:'The setting that you are trying to look for.',type:'STRING',required:true,choices:[{name:'Shows all options.',value:'all',},],},],},{name:'category',description:'Search command categories.',type:'SUB_COMMAND',options: [{name:'name',description:'The setting that you are trying to look for.',type:'STRING',required: true,choices: [{name:'Shows all options.',value:'all',},],},],},{name:'command',description:'Looks for a specific command.',type:'SUB_COMMAND',options:[{name:'name',description:'The setting that you are trying to look for.',type:'STRING',required:true,},],},{name:'search',description:'Search for anything.',type:'SUB_COMMAND',options:[{name:'name',description:'What are you looking for?',type:'STRING',required: true,},],},{name:'noargs',description:'Starts with a default interactive embed.',type:'SUB_COMMAND',},],})
		//
		// const queue = client.MusicPlayer.createQueue(message.guild, {
		// 	metadata: {
		// 		message,
		// 	},
		// });
		// // aFzeMMgHaLQ
		// const ch = await message.guild.channels.fetch('625928544341590016') as VoiceChannel;
		// // @ts-ignore
		// ch.type = 'voice';
		// const [track] = (await client.MusicPlayer.search('aFzeMMgHaLQ', {
		// 	requestedBy: message.author,
		// })).tracks;
		// await queue.connect(ch);
		// void queue.play(track);
		// void client.MusicPlayer.getQueue(message.guild).play(track).then(() => client.MusicPlayer.getQueue(message.guild).skip());
		// void client.MusicPlayer.getQueue(message.guild).setRepeatMode(1);
		// void client.MusicPlayer.getQueue(message.guild).clear();
		// void message.client.application.commands.edit('872050376558411817', metadata);
		// void message.guild.commands.create(testData);
	},
};

export = cmd;

const testData: ApplicationCommandData = {
	name: 'test_main',
	description: 'null',
	options: [
		{
			name: 'subgroup',
			description: 'test_subgroup',
			type: 'SUB_COMMAND_GROUP',
			options: [
				{
					name: 'subcmd',
					description: 'subgroup_subcmd',
					type: 'SUB_COMMAND',
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
				},
			],
		},
	],
};

/**
 * struct
 *
 */