const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const path = require('path');

// Apne configurations aur modules
const config = require('./api/config/index');
const { startBotEngine } = require('./index');
const BotConfig = require('./models/BotConfig');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// --- MIDDLEWARE ---
app.use(express.json());
// Public folder jahan index.html majood hoga usay serve karna
app.use(express.static(path.join(__dirname, 'public')));

// --- DATABASE CONNECTION ---
mongoose.connect(config.mongoURI)
    .then(() => console.log('🟢 MongoDB Connected Successfully!'))
    .catch(err => console.error('🔴 MongoDB Connection Error:', err));

// --- API ROUTES ---
app.post('/api/save-menu', async (req, res) => {
    try {
        const { phoneNumber, botMessage, mediaUrl, footerText, buttons } = req.body;
        
        if (!phoneNumber) {
            return res.status(400).json({ error: "Phone number is required" });
        }

        const sessionId = `qadeer_session_${phoneNumber}`;

        await BotConfig.findOneAndUpdate(
            { sessionId },
            { botMessage, mediaUrl, footerText, buttons, updatedAt: Date.now() },
            { new: true, upsert: true }
        );

        res.json({ success: true, message: "Flow saved to Database Successfully!" });
    } catch (error) {
        console.error("Save Menu API Error:", error);
        res.status(500).json({ error: "Failed to save flow to database" });
    }
});

// --- SOCKET.IO REALTIME ENGINE ---
io.on('connection', (socket) => {
    console.log(`💻 User Connected to Dashboard: ${socket.id}`);

    socket.on('request_pairing', async (data) => {
        const { phoneNumber } = data;
        
        if (!phoneNumber) {
            socket.emit('error', 'Phone number missing!');
            return;
        }

        const sessionId = `qadeer_session_${phoneNumber}`;
        console.log(`📱 Requesting Pair Code for: ${phoneNumber} | Session: ${sessionId}`);
        
        try {
            await startBotEngine(sessionId, phoneNumber, socket);
        } catch (err) {
            console.error(`Engine Error for ${phoneNumber}:`, err);
            socket.emit('error', 'Failed to start bot engine.');
        }
    });

    socket.on('disconnect', () => {
        console.log(`💻 User Disconnected: ${socket.id}`);
    });
});

// --- START SERVER ---
server.listen(config.port, () => {
    console.log(`🚀 QADEER-AI SaaS Master Server running on port ${config.port}`);
    console.log(`🌐 Dashboard is accessible at http://localhost:${config.port}`);
});
