const BotConfig = require('./models/BotConfig');

async function handleIncomingMessage(sock, msg, sessionId) {
    if (!msg.message || msg.key.fromMe) return;

    const from = msg.key.remoteJid;
    
    try {
        const config = await BotConfig.findOne({ sessionId });
        if (!config) return;

        let finalMessage = config.botMessage;
        if (config.footerText) finalMessage += `\n\n> ${config.footerText}`;

        let messageOptions = {};

        // 🚀 ADVANCED BUTTON GENERATOR
        if (config.buttons && config.buttons.length > 0) {
            const interactiveButtons = config.buttons.map((btn, index) => {
                if (btn.type === 'url') {
                    return {
                        name: "cta_url",
                        buttonParamsJson: JSON.stringify({
                            display_text: `🔗 ${btn.title}`,
                            url: btn.value,
                            merchant_url: btn.value
                        })
                    };
                } else if (btn.type === 'copy') { // ✨ NAYA FEATURE: Copy Code Button
                    return {
                        name: "cta_copy",
                        buttonParamsJson: JSON.stringify({
                            display_text: `📋 ${btn.title}`,
                            copy_code: btn.value
                        })
                    };
                } else {
                    return {
                        name: "quick_reply",
                        buttonParamsJson: JSON.stringify({
                            display_text: `↩️ ${btn.title}`,
                            id: btn.value || `cmd_${index}`
                        })
                    };
                }
            });

            messageOptions = {
                viewOnceMessage: {
                    message: {
                        interactiveMessage: {
                            header: config.mediaUrl ? { hasMediaAttachment: false } : { title: "" }, 
                            body: { text: finalMessage },
                            footer: { text: config.footerText || "Powered by QADEER-AI" },
                            nativeFlowMessage: { buttons: interactiveButtons }
                        }
                    }
                }
            };
        } else {
            messageOptions = { text: finalMessage };
        }

        // Add Media if present (Separate from buttons to prevent bugs)
        if (config.mediaUrl && !config.buttons.length) {
            messageOptions = { image: { url: config.mediaUrl }, caption: finalMessage };
        }

        messageOptions.secureMetaServiceLabel = true;
        if (!from.endsWith('@g.us')) messageOptions.ai = true;

        await sock.sendMessage(from, messageOptions, { quoted: msg });
        
    } catch (error) {
        console.error("Handler Error:", error);
    }
}

module.exports = { handleIncomingMessage };
