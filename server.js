const { Client, LocalAuth } = require('whatsapp-web.js');
const express = require('express');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());

// --- WhatsApp Client Setup ---
const client = new Client({
    authStrategy: new LocalAuth({ dataPath: './auth_info' }),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
        ],
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || null,
        timeout: 60000 
    },
    // WebVersionCache hata diya hai taaki latest compatible version load ho
    // Agar future mein crash ho toh specific version wapas lagana pad sakta hai
});

// --- QR Code Logic ---
client.on('qr', (qr) => {
    console.log('--------------------------------------------------');
    console.log('QR Code Generated!');
    const qrLink = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qr)}`;
    console.log('\n👉 CLICK HERE TO SCAN: ' + qrLink + '\n');
    console.log('--------------------------------------------------');
});

client.on('ready', () => {
    console.log('Client is ready!');
});

client.on('disconnected', (reason) => {
    console.log('Client was disconnected', reason);
    client.initialize();
});

client.initialize();

// --- API Route (ROBUST ERROR HANDLING ADDED) ---
app.get('/get-dp', async (req, res) => {
    const number = req.query.number;
    if (!number) return res.status(400).json({ error: 'Number is required' });

    const sanitized_number = number.replace(/\D/g, ''); 
    const chatId = sanitized_number + "@c.us";

    try {
        if (client.info === undefined) {
             return res.status(503).json({ success: false, message: 'Server starting... check logs' });
        }
        
        console.log(`Fetching data for ${sanitized_number}...`);

        let photoUrl = null;
        let about = null;
        let isOnline = false;
        let lastSeen = null;

        // 1. Try fetching DP (Safe Mode)
        try {
            photoUrl = await client.getProfilePicUrl(chatId);
        } catch (e) {
            console.log("Error fetching DP:", e.message);
        }

        // 2. Try fetching Contact/About (Ye part crash kar raha tha, ab safe hai)
        try {
            const contact = await client.getContactById(chatId);
            if(contact) {
                about = await contact.getAbout();
            }
        } catch (e) {
            console.log("Error fetching About info (Skipping):", e.message);
            // About fail ho toh default text dikhane ke liye null rehne do
        }

        // 3. Try fetching Presence (Online/Offline)
        try {
            const presence = await client.getPresence(chatId);
            if (presence) {
                if (presence.status === 'available') isOnline = true;
                if (presence.lastKnownPresence) lastSeen = presence.lastKnownPresence;
            }
        } catch (e) {
            console.log("Error fetching Presence (Skipping):", e.message);
        }

        // 4. Send whatever we found
        if (photoUrl || about || isOnline) {
            res.json({ 
                success: true, 
                url: photoUrl, 
                about: about,
                isOnline: isOnline,
                lastSeen: lastSeen
            });
        } else {
            // Agar sab kuch fail ho jaye
            res.json({ success: false, message: 'No Data found or Privacy Restricted' });
        }

    } catch (error) {
        console.error("Critical Error:", error.message);
        res.status(500).json({ success: false, error: 'Failed to fetch Data' });
    }
});

app.get('/', (req, res) => {
    res.send('WhatsApp Backend is Running!');
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
