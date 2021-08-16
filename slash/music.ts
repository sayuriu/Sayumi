import { ApplicationCommandOptionData, ApplicationCommandData } from "discord.js";

export const metadata: ApplicationCommandData = {
	name: 'music',
	description: 'Music utility commands.',
	options: [
		{
			name: 'fx',
			description: 'Applies audios effects on the player.',
			type: 'SUB_COMMAND',
			options: [
				{
					name: 'name',
					description: 'The effect\'s name.',
					type: 'STRING',
					choices: [
						{ name: 'off', value: 'off' },
						{ name: 'bassboost_low', value: 'bass=g=15:f=110:w=0.3' },
						{ name: 'bassboost_norm', value: 'bass=g=20:f=110:w=0.3' },
						{ name: 'bassboost_high', value: 'bass=g=20:f=110:w=0.3' },
						{ name: 'chorus', value: 'chorus=0.7:0.9:55:0.4:0.25:2' },
						{ name: 'chorus2d', value: 'chorus=0.6:0.9:50|60:0.4|0.32:0.25|0.4:2|1.3' },
						{ name: 'chorus3d', value: 'chorus=0.5:0.9:50|60|40:0.4|0.32|0.3:0.25|0.4|0.3:2|2.3|1.3' },
						{ name: 'compressor', value: 'compand=points=-80/-105|-62/-80|-15.4/-15.4|0/-12|20/-7.6' },
						{ name: 'compand', value: 'mcompand' },
						{ name: 'earrape', value: 'channelsplit,sidechaingate=level_in=64' },
						{ name: 'flanger', value: 'flanger' },
						{ name: 'gate', value: 'agate' },
						{ name: 'haas', value: 'haas' },
						{ name: 'karaoke', value: 'stereotools=mlev=0.03' },
						{ name: 'mono', value: 'pan=mono|c0=.5*c0+.5*c1' },
						{ name: 'nightcore', value: 'aresample=48000,asetrate=48000*1.25' },
						{ name: 'normalizer', value: 'dynaudnorm=g=101' },
						{ name: 'phaser', value: 'aphaser=in_gain=0.4' },
						{ name: 'pulsator', value: 'apulsator=hz=1' },
						{ name: 'reverse', value: 'areverse' },
						{ name: 'subboost', value: 'asubboost' },
						{ name: 'treble', value: 'treble=g=5' },
						{ name: 'tremolo', value: 'tremolo' },
						{ name: 'vaporwave', value: 'aresample=48000,asetrate=48000*0.8' },
						{ name: 'vibrato', value: 'vibrato=f=6.5' },
					],
				},
				{
					name: 'intensity',
					description: 'Sets the value of target effect. This may apply to some effects. Make sure you know what to do.',
					type: 'NUMBER',
					required: false,
				},
			],
		},
		{
			name: 'fx_ext',
			description: 'Additional audios effects on the player.',
			type: 'SUB_COMMAND',
			options: [
				{
					name: 'name',
					description: 'The effect\'s name.',
					type: 'STRING',
					choices: [
						{ name: 'off', value: 'off' },
						{ name: 'dim', value: `afftfilt="'real=re * (1-clip((b/nb)*b,0,1))':imag='im * (1-clip((b/nb)*b,0,1))'"` },
						{ name: 'mstlr', value: 'stereotools=mode=ms>lr' },
						{ name: 'mstrr', value: 'stereotools=mode=ms>rr' },
						{ name: 'normalizer2', value: 'acompressor' },
						{ name: 'surrounding', value: 'surround' },
						{ name: 'expander', value: 'compand=attacks=0:points=-80/-169|-54/-80|-49.5/-64.6|-41.1/-41.1|-25.8/-15|-10.8/-4.5|0/0|20/8.3' },
						{ name: 'softlimiter', value: 'compand=attacks=0:points=-80/-80|-12.4/-12.4|-6/-8|0/-6.8|20/-2.8' },
						{ name: 'fadein', value: 'afade=t=in:ss=0:d=10' },
					],
				},
				{
					name: 'intensity',
					description: 'Sets the value of target effect. This may apply to some effects. Make sure you know what to do.',
					type: 'NUMBER',
					required: false,
				},
			],
		},
		{
			name: 'jump_to',
			description: 'Jumps to tracks...',
			type: 'SUB_COMMAND',
			options: [
				{
					name: 'name',
					description: 'Jumps to the first track matches the following name.',
					type: 'STRING',
				},
				{
					name: 'position',
					description: 'Jumps to the first track matches the following position.',
					type: 'NUMBER',
				},
			],
		},
		{
			name: 'loop_queue',
			description: 'Loops the current queue. This overrides current loop mode.',
			type: 'SUB_COMMAND',
		},
		{
			name: 'loop',
			description: 'Sets loop mode. Leave empty will show the current loop mode.',
			type: 'SUB_COMMAND',
			options: [{
				name: 'query',
				description: 'The new mode to set.',
				type: 'NUMBER',
				required: false,
				choices: [
					{ name: 'off', value: 0 },
					{ name: 'track', value: 1 },
					{ name: 'queue', value: 2 },
					{ name: 'autoplay', value: 3 },
				],
			}],
		},
		{
			name: 'move_to',
			description: 'Jumps to a new voice channel.',
			type: 'SUB_COMMAND',
			options: [{
				name: 'channel',
				description: 'The new voice channel',
				type: 'CHANNEL',
				required: true,
			}],
		},
		{
			name: 'mute',
			description: 'Mutes the player. But why would you?',
			type: 'SUB_COMMAND',
		},
		{
			name: 'now_playing',
			description: 'Shows the track that\'s currently playing.',
			type: 'SUB_COMMAND',
		},
		{
			name: 'pause',
			description: 'Pause the current playback.',
			type: 'SUB_COMMAND',
		},
		{
			name: 'play',
			description: 'Plays the specified query.',
			type: 'SUB_COMMAND',
			options: [
				{
					name: 'query',
					description: 'What are you looking for?',
					type: 'STRING',
					required: true,
				},
				{
					name: 'immediate',
					description: 'Immidiately plays the first search result. Set this to \'no\' will display the search embed.',
					type: 'NUMBER',
					choices: [
						{ name: 'yes', value: 1 },
						{ name: 'no', value: 0 },
					],
					required: false,
				},
			],
		},
		{
			name: 'play_prev',
			description: 'Plays the previous track.',
			type: 'SUB_COMMAND',
		},
		{
			name: 'queue',
			description: 'Displays the queue embed.',
			type: 'SUB_COMMAND',
		},
		{
			name: 'remove',
			description: 'Remove the track with specified arguments.',
			type: 'SUB_COMMAND',
			options: [
				{
					name: 'name',
					description: 'Removes the first track matches the specified name.',
					type: 'STRING',
					required: false,
				},
				{
					name: 'index',
					description: 'Removes the song that has the specified position (0-index array by the way).',
					type: 'NUMBER',
					required: false,
				},
				{
					name: 'amount',
					description: 'Remove x amount of tracks starts from matched position. Defaults to 1.',
					type: 'NUMBER',
					required: false,
				},
			],
		},
		{
			name: 'repeat',
			description: 'Loops the current track. This overrides current loop mode.',
			type: 'SUB_COMMAND',
		},
		{
			name: 'resume',
			description: 'Resumes the playback.',
			type: 'SUB_COMMAND',
		},
		{
			name: 'search',
			description: 'Search for a track.',
			type: 'SUB_COMMAND_GROUP',
			options: [
				{
					name: 'youtube',
					description: 'Searches YouTube with this query.',
					type: 'SUB_COMMAND',
					options: [{
						name: 'query',
						description: 'What are you looking for?',
						type: 'STRING',
						required: true,
					}],
				},
				{
					name: 'auto',
					description: 'Flexible query search, if you are confused.',
					type: 'SUB_COMMAND',
					options: [{
						name: 'query',
						description: 'What are you looking for?',
						type: 'STRING',
						required: true,
					}],
				},
			],
		},
		{
			name: 'seek',
			description: 'Skips to a certain point of the song.',
			type: 'SUB_COMMAND',
			options: [
				{
					name: 'timestamp',
					description: 'The timestamp to skip to. Negative value will reverse that amount of time. Eg. `5:02`',
					type: 'STRING',
					required: false,
					choices: [
						{ name: 'end', value: 'end' },
						{ name: 'start', value: 'start' },
					],
				},
				{
					name: 'seconds',
					description: 'The timestamp to skip to in seconds. Negative value will reverse that amount of time.',
					type: 'NUMBER',
					required: false,
				},
			],
		},
		{
			name: 'skip',
			description: 'Skips the current track.',
			type: 'SUB_COMMAND',
		},
		{
			name: 'stop',
			description: 'Stops the player and disconnects from the voice channel.',
			type: 'SUB_COMMAND',
		},
		{
			name: 'volume',
			description: 'Get of see the current volume.',
			type: 'SUB_COMMAND',
			options: [{
				name: 'new_value_percentage',
				description: 'Sets the new playback volume. If omitted, this will displays the current volume instead.',
				type: 'NUMBER',
				required: false,
			}],
		},
	],
};