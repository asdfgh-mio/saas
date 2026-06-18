const BotConfig = require('./models/BotConfig');

async function handleIncomingMessage(sock, msg, sessionId) {
    if (!msg.message || msg.key.fromMe) return;

    const from = msg.key.remoteJid;
    
    try {
        const config = await BotConfig.findOne({ sessionId });
        if (!config) return;

        let finalMessage = config.botMessage || "Hello from QADEER-AI Bot!";
        if (config.footerText) finalMessage += `\n\n> ${config.footerText}`;

        let messageOptions = {};

        // BUTTONS RENDER LOGIC
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
                } else {
                    return {
                        name: "quick_reply",
                        buttonParamsJson: JSON.stringify({
                            display_text: `↩️ ${btn.title}`,
                            id: `custom_reply_${index}`
                        })
                    };
                }
            });

            messageOptions = {
                viewOnceMessage: {
                    message: {
                        interactiveMessage: {
                            header: { title: "" },
                            body: { text: finalMessage },
                            footer: { text: config.footerText || "Powered by QADEER-AI" },
                            nativeFlowMessage: {
                                buttons: interactiveButtons
                            }
                        }
                    }
                }
            };
        } 
        // SIMPLE TEXT OR MEDIA LOGIC
        else {
            if (config.mediaUrl) {
                messageOptions = { image: { url: config.mediaUrl }, caption: finalMessage };
            } else {
                messageOptions = { text: finalMessage };
            }
        }

        // 🚀 SECURE META AI TAG
        messageOptions.secureMetaServiceLabel = true;
        if (!from.endsWith('@g.us')) messageOptions.ai = true;

        await sock.sendMessage(from, messageOptions, { quoted: msg });
        
    } catch (error) {
        console.error("Handler Error:", error);
    }
}

module.exports = { handleIncomingMessage };
