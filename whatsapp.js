const { default: makeWASocket, DisconnectReason, Browsers } = require('@qadeerxtech/baileys');
const pino = require('pino');
const { useMongoDBAuthState } = require('./database/mongoAuth');
const { handleIncomingMessage } = require('./handler');

const activeSockets = new Map();

async function startPairing(phoneNumber) {
    const sessionId = `qadeer_session_${phoneNumber}`;
    console.log(`🚀 Init pairing for: ${phoneNumber}`);

    const { state, saveCreds, clearSession } = await useMongoDBAuthState(sessionId);

    const sock = makeWASocket({
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        auth: state,
        browser: Browsers.ubuntu('Chrome'), // Must be Chrome for Pairing
        syncFullHistory: false,
        markOnlineOnConnect: true
    });

    activeSockets.set(sessionId, sock);

    // 🚀 CONNECTION HANDLER
    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'open') {
            console.log(`✅ [${phoneNumber}] Connected!`);
        } else if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            if (statusCode === DisconnectReason.loggedOut) {
                console.log(`⚠️ [${phoneNumber}] Logged Out! Wiping DB...`);
                await clearSession();
                activeSockets.delete(sessionId);
            } else {
                console.log(`🔄 Reconnecting ${phoneNumber}...`);
                startPairing(phoneNumber); // Auto Reconnect
            }
        }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type === 'notify') {
            for (const msg of messages) {
                await handleIncomingMessage(sock, msg, sessionId);
            }
        }
    });

    // 🚀 PAIRING LOGIC FIX (Inspired by your main.js)
    if (!sock.authState.creds.registered) {
        await new Promise(resolve => setTimeout(resolve, 1500)); // Delay for socket
        
        // WhatsApp Valid Number Check
        const jid = phoneNumber + '@s.whatsapp.net';
        const result = await sock.onWhatsApp(jid);
        if (!result?.[0]?.exists) {
            throw new Error("Number is not registered on WhatsApp.");
        }

        const code = await sock.requestPairingCode(phoneNumber);
        console.log(`[🔑] Code for ${phoneNumber}: ${code}`);
        return { code, sessionId, sock };
    }

    return { alreadyRegistered: true, sessionId, sock };
}

module.exports = { startPairing };
