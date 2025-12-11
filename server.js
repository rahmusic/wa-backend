const { Client, LocalAuth } = require('whatsapp-web.js');
const express = require('express');
const cors = require('cors');

// Note: qrcode-terminal hata diya hai kyunki wo Render par toot raha tha
const app = express();
const port = process.env.PORT || 3000;

app.use(cors());

// --- WhatsApp Client Setup ---
const client = new Client({
    authStrategy: new LocalAuth({ 
        dataPath: './auth_info' 
    }),
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

// --- QR Code Logic (CHANGED TO LINK) ---
client.on('qr', (qr) => {
    console.log('--------------------------------------------------');
    console.log('QR Code Generated!');
    console.log('Render Console par QR toot raha tha, isliye niche diye gaye LINK par click karein:');
    
    // QR string ko ek Image URL mein convert kar rahe hain
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

// --- API Route ---
app.get('/get-dp', async (req, res) => {
    const number = req.query.number;
    if (!number) return res.status(400).json({ error: 'Number is required' });

    const sanitized_number = number.replace(/\D/g, ''); 
    const chatId = sanitized_number + "@c.us";

    try {
        if (client.info === undefined) {
             return res.status(503).json({ success: false, message: 'Server starting... check logs for QR Link' });
        }
        
        const photoUrl = await Promise.race([
            client.getProfilePicUrl(chatId),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10000))
        ]);
        
        if (photoUrl) {
            res.json({ success: true, url: photoUrl });
        } else {
            res.json({ success: false, message: 'No DP found or Privacy Restricted' });
        }
    } catch (error) {
        console.error("Error fetching DP:", error.message);
        res.status(500).json({ success: false, error: 'Failed to fetch DP' });
    }
});

app.get('/', (req, res) => {
    res.send('WhatsApp Backend is Running!');
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
