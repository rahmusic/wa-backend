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
    webVersionCache: {
        type: 'remote',
        remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html',
    }
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

// --- API Route (UPDATED FOR ABOUT & PRESENCE) ---
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

        // 1. Get Contact Object
        const contact = await client.getContactById(chatId);
        
        // 2. Parallel Fetch: DP, About, Presence
        const [photoUrl, about, presence] = await Promise.all([
            client.getProfilePicUrl(chatId).catch(() => null),
            contact.getAbout().catch(() => null),
            client.getPresence(chatId).catch(() => null) // Returns { id, status: 'offline'|'available', lastSeen... }
        ]);

        // 3. Process Presence Data
        let isOnline = false;
        let lastSeen = null;

        if (presence) {
            // 'available' means Online in WhatsApp Web
            if (presence.status === 'available') {
                isOnline = true;
            }
            // Note: Last seen timestamp might not always be available depending on privacy
            if (presence.lastKnownPresence) {
                lastSeen = presence.lastKnownPresence; // Unix timestamp
            }
        }

        // 4. Send Response
        if (photoUrl || about || isOnline) {
            res.json({ 
                success: true, 
                url: photoUrl, 
                about: about,
                isOnline: isOnline,
                lastSeen: lastSeen
            });
        } else {
            res.json({ success: false, message: 'No Data found or Privacy Restricted' });
        }

    } catch (error) {
        console.error("Error fetching data:", error.message);
        res.status(500).json({ success: false, error: 'Failed to fetch Data' });
    }
});

app.get('/', (req, res) => {
    res.send('WhatsApp Backend is Running!');
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
