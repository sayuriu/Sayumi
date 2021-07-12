import { Schema, model } from "mongoose";
import DefaultSettings from "../../json/DefaultGuildSettings.json";

const Guilds = new Schema({
    _id: Schema.Types.ObjectId,
    guildID: String,
    guildName: String,
    prefix: {
        type: String,
        default: DefaultSettings.prefix,
    },
    welcomeChannel: {
        type: String,
        default: null,
    },
    defaultWelcomeMsg: {
        type: String,
        default: null,
    },

    AllowedReplyOn: {
        type: Array,
    },
    FalseCMDReply: {
        type: Array,
    },

    LogHoldLimit: {
        type: Number,
        default: 1,
    },
    MessageLogChannel: {
        type: String,
        default: null,
    },
    MessageLogState: {
        type: Boolean,
        default: false,
    },
    MessageLog: {
        type: Map,
        default: new Map(),
    },
    MusicPlayerSettings: {
        type: Object,
        CustomFilters: {
            type: Map,
            default: new Map(),
        },
        Silent: {
            type: Boolean,
            default: false,
        },
        DeleteEmbedsAfterPlaying: {
            type: Boolean,
            default: false,
        },
    },
    AllowPartialNSFW: {
        type: Boolean,
        default: false,
    },
    AFKUsers: {
        type: Boolean,
        default: false,
    },
}, {
    collection: 'GuildList',
});

export = model('GuildList', Guilds);