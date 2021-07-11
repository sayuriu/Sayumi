/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/restrict-plus-operands */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { createLogger, transports, format, Logger } from 'winston';
import * as chalk from 'chalk';
import { existsSync, mkdirSync } from 'fs';
import { name as pName, author, version, dependencies, repository } from '../package.json';
import DateTime from './functions/time/get-time';
const logDir = `${__dirname}/logs/`;

const loggerOut = createLogger({
	transports: [
		new transports.File({ filename: `${logDir}/log.log`, level: 'info' }),
		new transports.File({ filename: `${logDir}/log.log`, level: 'warn' }),
		new transports.File({ filename: `${logDir}/log.log`, level: 'debug' }),
		new transports.File({ filename: `${logDir}/log.log`, level: 'verbose' }),
		new transports.File({ filename: `${logDir}/log.log`, level: 'silly' }),
		new transports.File({ filename: `${logDir}/errors.log`, level: 'error', handleExceptions: true }),
	],
	format: format.printf(log =>
		`[${log.level.toUpperCase()}] ${log.message}`,
	),
});


type LogLevels = 'info' | 'warn' | 'error' | 'debug' | 'verbose' | 'silly' | `status ${string}` | string
/** Print out a custom message.
* @param {string} logLevel The level of the log. `info | warn | error | debug | verbose | silly`. `status: StatusMessage` by default won't log to file.
* @param {string} logMessage The message to pass in.
*/
function logCarrier(logLevel: LogLevels, logMessage: any): void | Logger
{
	let obj: any;
	if (!existsSync(logDir)) mkdirSync(logDir);

	if (!logMessage) throw new SyntaxError('[Global Functions > Logger] Cannot log an empty message.');
	if (typeof logLevel !== 'string')throw new TypeError('[Global Functions > Logger] Invalid log level given. Expected type \'string\'.');
	if (typeof logMessage !== 'string') {
		if (typeof logMessage === 'object') {
			obj = logMessage;
			logMessage = `[Object]`;
		}
		else logMessage = logMessage.toString();
	}
	const { dateID, hrs, min, sec, GMT } = DateTime();
	const Timestamp = `(${dateID} - ${hrs}:${min}:${sec}) <${GMT}>`;
	let startPoint = '>';
	let outputLevel: string;
	let functionClass: string;


	if (logLevel.toLowerCase() === 'err') logLevel = 'error';

	if (logMessage.startsWith('[') && logMessage.includes(']'))
	{
		functionClass  = logMessage.slice(logMessage.indexOf('['), logMessage.indexOf(']') + 1) || '';
		logMessage = logMessage.slice(logMessage.indexOf(']') + 1, logMessage.length);
	}
	const functionClass_00 = functionClass;

	if (logLevel === 'error' && functionClass?.match(/Unhandled Promise Rejection/g))
	{
		logMessage = logMessage.split('\n');
		const message = logMessage[0].trim() || '';
		const stack = logMessage.splice(1, logMessage.length).join('\n').trimLeft();
		const stackArray = stack.split('\n');
		let name = stackArray[0].slice(0, stackArray[0].length - message.length - 2);
		name.length ? name = `: ${name}` : name;
		functionClass = `${functionClass.slice(0, functionClass.length - 1)}${name}]`;
		logMessage = `${message}\nStack calls:\n${stackArray.splice(1, stackArray.length).join('\n')}`;
	}

	const Levels = ['info', 'warn', 'debug', 'verbose', 'silly', 'error'];
	const Header = logLevel;

	switch (logLevel) {
		case 'info': {
			const hex = chalk.hex('#30e5fc');
			outputLevel = hex(`[${Header.toUpperCase()}]`);
			startPoint = hex(startPoint);
			break;
		}
		case 'warn': {
			const hex = chalk.hex('#ffc430');
			outputLevel = chalk.bgHex('#ffc430').hex('000000')(`[${Header.toUpperCase()}]`);
			startPoint = hex(startPoint);
			break;
		}
		case 'debug': {
			const hex = chalk.hex('#ed6300');
			outputLevel = hex(`[${Header.toUpperCase()}]`);
			startPoint = hex(startPoint);
			break;
		}
		case 'verbose': {
			const hex = chalk.hex('#ffffff');
			outputLevel = hex(`[${Header.toUpperCase()}]`);
			startPoint = hex(startPoint);
			break;
		}
		case 'silly': {
			const hex = chalk.hex('#cf05f2');
			outputLevel = hex(`[${Header.toUpperCase()}]`);
			startPoint = hex(startPoint);
			break;
		}
		case 'error': {
			const hex = chalk.hex('#ff2b2b');
			outputLevel = chalk.bgHex('#ff2b2b').hex('ffffff')(`[${Header.toUpperCase()}]`);
			startPoint = hex(startPoint);
			break;
		}
		default: {
			const hex = chalk.hex('#30e5fc');
			outputLevel = hex(`[${Header.replace(Header.substr(0, 1), Header.substr(0, 1).toUpperCase())}]`);
			functionClass = outputLevel.length > 60 ? '' : ' [Terminal]';
			startPoint = hex(startPoint);
			if (!outputLevel) outputLevel = logLevel;
			break;
		}
	}

	functionClass = chalk.hex('#9c9c9c')(functionClass);
	const output = outputLevel + ' '  + chalk.hex('#8c8c8c')(Timestamp) + ' ' + functionClass + `\n` + startPoint + ` ${logMessage}`;
	if (!Levels.some(i => i === logLevel.toLowerCase()))
	{
		// if (!logLevel.split('status:')[1].length) return this.carrier('err', '[Global Functions > Logger]: Empty status message.');
		if (obj) return console.log(output, obj);
		return console.log(output);
	}

	console.log(output);
	return loggerOut.log(logLevel.toLowerCase(), `- ${Timestamp}${functionClass_00 ? ` ${functionClass_00}` : ''} \n${logMessage}`);
}

	// In case you want to do status message, you might wanna call the carrier itself.

	/** Used once on boot time. */
export const bootstrap = () => {

	const initString = `${chalk.hex('#e73b3b')(pName)} `
								+ `${chalk.hex('#8a8a8a')('version')} `
								+ `${chalk.hex('#212121').bgHex('#a8a8a8')(version)}\n`
								+ `${chalk.hex('#8a8a8a')('by')} ${chalk.hex('#44bee3')(author)} ${chalk.hex('#757575')(`(${repository.url})`)}\n`
								+ `${chalk.hex('#8c8c8c')(`${Object.keys(dependencies).length} dependenc${Object.keys(dependencies).length > 1 ? 'ies' : 'y'}`)}`;
	process.stdout.write(`${initString}\n`);
};

/** Inform time!
 * @param {string} message The message to pass in.
 */
export const info = (message: string): void | Logger => logCarrier('info', message);

/** Gives out a warning.
 * @param {string} message The message to pass in.
 */
export const warn = (message: string): void | Logger => logCarrier('warn', message);

/** Push out an error when something goes wrong.
 * @param {string} message The message to pass in.
 */
export const error = (message: string): void | Logger => logCarrier('error', message);

/** If you need to debug...
 * @param {string} message The message to pass in.
 */
export const debug = (message: string): void | Logger => logCarrier('debug', message);

/** Print out a custom message.
* @param {string} logLevel The level of the log. `info | warn | error | debug | verbose | silly`. `status: StatusMessage` by default won't log to file.
* @param {string} logMessage The message to pass in.
*/
export default logCarrier;