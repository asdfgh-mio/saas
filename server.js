const express = require('express');
const mongoose = require('mongoose');
const path = require('path');

// Apne modules
const config = require('./api/config/index');
const { startPairing } = require('./whatsapp'); // WhatsApp Engine
const BotConfig = require('./models/BotConfig'); 

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Database Connection
mongoose.connect(config.mongoURI)
    .then(() => console.log('🟢 MongoDB Connected!'))
    .catch(err => console.error('🔴 MongoDB Error:', err));

// 🚀 FIXED PAIRING API (Tumhari main.js ki tarah)
app.get('/api/pair', async (req, res) => {
    const phoneNumber = req.query.number?.replace(/[^0-9]/g, '');
    
    if (!phoneNumber) {
        return res.status(400).json({ error: 'Phone number is required!' });
    }

    try {
        const result = await startPairing(phoneNumber);
        if (result.alreadyRegistered) {
            return res.json({ status: 'connected', message: 'Number is already connected to panel.' });
        }
        res.json({ status: 'success', code: result.code });
    } catch (error) {
        console.error('Pairing API Error:', error.message);
        res.status(500).json({ error: error.message || 'Failed to generate pairing code' });
    }
});

// Menu Save API
app.post('/api/save-menu', async (req, res) => {
    try {
        const { phoneNumber, botMessage, mediaUrl, footerText, buttons } = req.body;
        if (!phoneNumber) return res.status(400).json({ error: "Phone number is required" });

        const sessionId = `qadeer_session_${phoneNumber}`;
        await BotConfig.findOneAndUpdate(
            { sessionId },
            { botMessage, mediaUrl, footerText, buttons, updatedAt: Date.now() },
            { new: true, upsert: true }
        );
        res.json({ success: true, message: "Advanced Flow Saved!" });
    } catch (error) {
        res.status(500).json({ error: "Failed to save flow to database" });
    }
});

app.listen(config.port, () => {
    console.log(`🚀 QADEER-AI SaaS Server running on port ${config.port}`);
});
