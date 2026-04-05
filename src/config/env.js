const fs = require('fs');
const path = require('path');

// Simple zero-dependency .env parser
function loadEnv() {
    try {
        const envPath = path.resolve(__dirname, '../../.env');
        if (fs.existsSync(envPath)) {
            const file = fs.readFileSync(envPath, 'utf8');
            file.split('\n').forEach(line => {
                // Ignore comments and empty lines
                if (!line || line.startsWith('#')) return;
                
                const [key, ...valueParts] = line.split('=');
                if (key) {
                    process.env[key.trim()] = valueParts.join('=').trim();
                }
            });
            console.log("Environment variables loaded natively.");
        }
    } catch (e) {
        console.error("Failed to load .env natively:", e.message);
    }
}

module.exports = { loadEnv };
