import { writeFile, readdirSync, unlinkSync, rmdir, mkdir } from 'fs';
import { MessageEmbed as EmbedConstructor } from 'discord.js';
import Sayumi_Command from '../../utils/interfaces/Command';

const cmd: Sayumi_Command = {
	name: 'clear',
	description: 'Sweeping time!',
	cooldown: 0,
	master_explicit: true,
	reqArgs: true,
	usage: ['<option> [-associatedOptionFlags]'],
	usageSyntax: ['|<option: logs | tempfiles>| |[-associatedOptionFlags(logs): errors | logonly | all]|'],
	groups: ['Utilities'],
	onTrigger: (client, message, ...args): void => {
		if (!args[0])
		{
			const embed = new EmbedConstructor();
		}
		args[0] = args[0].toLowerCase();

		const clearLogs = (file = 'log.log') => {
			writeFile(`./logs/${file}`, '', (err) => {
				if (err)
				{
					void void message.channel.send(`Error occured!\n\`${err.message}\``);
					return false;
				}
			});
			return true;
		};

		switch (args[0])
		{
			case 'logs':
			{
				if (args[1] && args[1].startsWith('-'))
				{
					switch (args[1].toLowerCase())
					{
						case (/\s-errors?\s*/.exec(args[1].toLowerCase()))[0]:
						{
							if (clearLogs('errors.log')) void void message.channel.send('Error logs cleared!');
							break;
						}
						case '-logonly':
						{
							if (clearLogs()) void void message.channel.send('Log cleared!').then();
							break;
						}
						case '-all':
						{
							if (clearLogs() && clearLogs('errors.log')) void void message.channel.send('Logs cleared!');
							break;
						}
						default: return void void message.channel.send('Invalid or wrong flags.');
					}
				} else {
					if (clearLogs()) void void message.channel.send('Log cleared!');
					break;
				}
				break;
			}

			case (/-errors?/.exec(args[0]))[0]:
			{
				if (clearLogs('errors.log')) void void message.channel.send('Error logs cleared!');
				break;
			}

			case 'tempfiles':
			{
				if (client.Methods.Data.GetTotalSize('./temp').startsWith('0')) return void message.channel.send('There are no files to clean up.');
				readdirSync('./temp', { encoding: null }).forEach(file => {
					unlinkSync(`./temps/${file}`);
				});
				rmdir('./temp', (err) => {
					if (err) return void message.channel.send(`Error occured!\n\`${err.message}\``);
				});
				mkdir('./temp', (err) => {
					if (err) return void message.channel.send(`Error occured!\n\`${err.message}\``);
				});
				void message.channel.send('Cache files cleared.');
				break;
			}

			default: return void message.channel.send('Invalid option.');
		}
		return;
	},
};

export = cmd;