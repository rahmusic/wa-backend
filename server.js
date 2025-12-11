const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());

// --- WhatsApp Client Setup (CRASH FIXES ADDED) ---
const client = new Client({
    // Restart hone par session save rakhe
    authStrategy: new LocalAuth({ 
        dataPath: './auth_info' 
    }),
    
    // Puppeteer launch settings (Memory optimize karne ke liye)
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage', // Memory crash fix
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu' 
            // Note: '--single-process' hata diya gaya hai kyunki wo crash kar raha tha
        ],
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || null,
        // Timeout badha diya taaki dheere load hone par crash na ho
        timeout: 60000 
    },
    // Web version cache karne se stability badhti hai
    webVersionCache: {
        type: 'remote',
        remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html',
    }
});

// --- QR Code Logic ---
client.on('qr', (qr) => {
    // console.log('QR RECEIVED', qr); // Ye line hata di hai taaki lamba text na aaye
    console.log('Generating QR Code...');
    
    // 'small: true' option QR ko chota aur scannable banata hai
    qrcode.generate(qr, { small: true });
    
    console.log('--------------------------------------------------');
    console.log('SCAN THIS QR CODE IN YOUR WHATSAPP LINKED DEVICES');
    console.log('--------------------------------------------------');
});

client.on('ready', () => {
    console.log('Client is ready!');
});

// Agar client disconnect ho jaye toh restart karo
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
             return res.status(503).json({ success: false, message: 'Server starting... check logs for QR' });
        }
        
        // Timeout add kiya taaki agar request atak jaye toh server na gire
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
    res.send('WhatsApp Backend is Running with Crash Fixes!');
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
