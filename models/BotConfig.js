const mongoose = require('mongoose');

const buttonSchema = new mongoose.Schema({
    type: { type: String, enum: ['reply', 'url'], required: true },
    title: { type: String, required: true },
    value: { type: String, required: true }
});

const configSchema = new mongoose.Schema({
    sessionId: { type: String, required: true, unique: true },
    botMessage: { type: String, required: true },
    mediaUrl: { type: String, default: '' },
    footerText: { type: String, default: '' },
    buttons: [buttonSchema],
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('BotConfig', configSchema);
