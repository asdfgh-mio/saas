// api/config/index.js
require('dotenv').config();

module.exports = {
    // Database Connection
    mongoURI: process.env.MONGO_URI || "mongodb+srv://txcowner_db_user:qadeer1234@cluster0.jaz98kx.mongodb.net/?appName=Cluster0",
    
    // Heroku API for Auto-Spawning (Jab implement karein)
    herokuAPI: process.env.HEROKU_API_KEY || "HRKU-AAeDr7p_9Y4oh0Y1-tHPRIXtFb4JViTcyglv3qhbBhCQ_____w-ME_bvX3FM",
    
    // Server Port
    port: process.env.PORT || 3000
};
