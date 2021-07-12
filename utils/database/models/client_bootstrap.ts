import { Schema, model } from "mongoose";

const bootstrap = new Schema({
	_id: Schema.Types.ObjectId,
	host: String,
	shardCount: Number,
	readyAt: Date,
	readyTimestamp: Number,
	ping: Number,
	wsStatus: Number,
	gateway: String,
	cmds: Number,
	events: Number,
	cachedUsers: Number,
	cachedGuilds: Number,
}, {
	collection: 'init',
});

const init = model('init', bootstrap);
export default init;