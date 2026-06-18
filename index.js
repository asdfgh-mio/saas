const { default: makeWASocket, DisconnectReason, Browsers } = require('@qadeerxtech/baileys');
const pino = require('pino');
const { useMongoDBAuthState } = require('./database/mongoAuth');
const { handleIncomingMessage } = require('./handler');

const sessions = new Map();

async function startBotEngine(sessionId, phoneNumber, socketClient) {
    console.log(`🚀 Starting engine for session: ${sessionId}`);

    const { state, saveCreds, clearSession } = await useMongoDBAuthState(sessionId);

    const sock = makeWASocket({
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        auth: state,
        browser: Browsers.ubuntu('Chrome'), // Zaroori hai pairing ke liye
        syncFullHistory: false,
        markOnlineOnConnect: true
    });

    sessions.set(sessionId, sock);

    // PAIRING CODE LOGIC
    if (!sock.authState.creds.registered && phoneNumber) {
        setTimeout(async () => {
            try {
                let formattedNumber = phoneNumber.replace(/[^0-9]/g, '');
                const code = await sock.requestPairingCode(formattedNumber);
                console.log(`[🔑] Pairing Code for ${formattedNumber}: ${code}`);
                
                if (socketClient) {
                    socketClient.emit('pairing_code', { sessionId, code });
                }
            } catch (err) {
                console.error('Pairing Code Error:', err.message);
                if (socketClient) socketClient.emit('error', 'Failed to generate pairing code.');
            }
        }, 3000);
    }

    // CONNECTION UPDATES & LOGOUT LOGIC
    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === 'open') {
            console.log(`✅ [${sessionId}] Connected Successfully!`);
            if (socketClient) socketClient.emit('connection_status', { sessionId, status: 'Connected' });
            
            try {
                await sock.sendMessage(sock.user.id, { text: "🚀 QADEER-AI Backend Connected Successfully!\nYour bot is now live." });
            } catch (e) {}
        } 
        else if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            
            if (statusCode === DisconnectReason.loggedOut) {
                console.log(`⚠️ [${sessionId}] Logged Out! Wiping MongoDB data...`);
                await clearSession();
                sessions.delete(sessionId);
                if (socketClient) socketClient.emit('connection_status', { sessionId, status: 'LoggedOut' });
            } 
            else {
                console.log(`🔄 [${sessionId}] Disconnected. Reconnecting...`);
                startBotEngine(sessionId, null, socketClient);
            }
        }
    });

    sock.ev.on('creds.update', saveCreds);

    // MESSAGE HANDLER INJECTION
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;
        for (const msg of messages) {
            await handleIncomingMessage(sock, msg, sessionId);
        }
    });

    return sock;
}

module.exports = { startBotEngine };
