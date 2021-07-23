/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
// @flagged:need-update

import { MessageEmbed } from 'discord.js';
import fetch from 'node-fetch';
import Sayumi_Command from '../../utils/interfaces/Command';

const cmd: Sayumi_Command = {
	name: 'define',
	aliases: ['urban', 'identify', 'dictionary', 'id'],
	description: 'Basically this is a dictionary command. Please make a good use of it.',
	groups: ['Information'],
	cooldown: 5,
	reqArgs: true,
	nsfw: 'partial',
	usage: ['<query>'],
	onTrigger: async (client, message, ...args) => {
		try {
            // if (args < 1 || ["search", "random"].includes(args[0])) return;
            const query = args.join("+");
            if (!args.length) {
                const string = `What word do you want to search? \nYou may try \`s!define <query>\`.`;
                return void message.channel.send(string);
            }
            const response = await fetch(`https://api.urbandictionary.com/v0/define?term=${query}`);
            const jsonResponse = await response.json();
            const res = jsonResponse.list[0];
            if (!res) return message.channel.send("No result found.");
            const embed = new MessageEmbed()
                .setColor('RANDOM')
                .setTitle(`${res.word}`)
                .setDescription(`Written by ${res.author || "unknown"}\n[Permalink](${res.permalink})`)
                .addField('Definition: ', res.definition || "No definition available.")
                .addField('Example:', res.example || "No examples available.")
                .addField('Rating', `Upvotes: \`${res.thumbs_up || 0}\`Downvotes : \`${res.thumbs_down || 0}\``)
                .setFooter("*Source: Urban Dictionary*");
            void message.channel.send({ embeds: [embed] });
        } catch(e) {
            client.RaiseException(`[Command: urban] ${e}`);
            return message.channel.send("An unexpected error happened. Please try again.");
        }
	},
};

export = cmd;