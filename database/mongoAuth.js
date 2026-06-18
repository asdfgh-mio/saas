// database/mongoAuth.js
const mongoose = require('mongoose');
const { proto, initAuthCreds, BufferJSON } = require('@qadeerxtech/baileys');

// Har user ke session ka alag document banega
const SessionSchema = new mongoose.Schema({
    sessionId: { type: String, required: true, index: true },
    data: { type: String, required: true }
});
const AuthModel = mongoose.model('AuthSession', SessionSchema);

async function useMongoDBAuthState(sessionId) {
    const writeData = async (data, id) => {
        const informationToStore = JSON.stringify(data, BufferJSON.replacer);
        await AuthModel.updateOne(
            { sessionId, id: id || 'creds' },
            { $set: { data: informationToStore } },
            { upsert: true }
        );
    };

    const readData = async (id) => {
        const result = await AuthModel.findOne({ sessionId, id: id || 'creds' });
        if (result && result.data) {
            return JSON.parse(result.data, BufferJSON.reviver);
        }
        return null;
    };

    const removeData = async (id) => {
        await AuthModel.deleteOne({ sessionId, id: id || 'creds' });
    };

    // Logout par pura session wipe karna
    const clearSession = async () => {
        await AuthModel.deleteMany({ sessionId });
        console.log(`🗑️ Session ${sessionId} completely wiped from MongoDB.`);
    };

    let creds = await readData('creds') || initAuthCreds();

    return {
        state: {
            creds,
            keys: {
                get: async (type, ids) => {
                    const data = {};
                    await Promise.all(
                        ids.map(async id => {
                            let value = await readData(`${type}-${id}`);
                            if (type === 'app-state-sync-key' && value) {
                                value = proto.Message.AppStateSyncKeyData.fromObject(value);
                            }
                            data[id] = value;
                        })
                    );
                    return data;
                },
                set: async (data) => {
                    const tasks = [];
                    for (const category in data) {
                        for (const id in data[category]) {
                            const value = data[category][id];
                            const key = `${category}-${id}`;
                            tasks.push(value ? writeData(value, key) : removeData(key));
                        }
                    }
                    await Promise.all(tasks);
                }
            }
        },
        saveCreds: () => writeData(creds, 'creds'),
        clearSession
    };
}

module.exports = { useMongoDBAuthState };
