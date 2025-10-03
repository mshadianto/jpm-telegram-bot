// index.js (Versi Webhook untuk Vercel)
require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const { createClient } = require('@supabase/supabase-js');

// Inisialisasi Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// Inisialisasi bot tanpa polling
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN);

// Objek untuk menyimpan state sementara user yang sedang mendaftar
const userRegistrationState = {};

// --- TEKS-TEKS STATIS (SAMA SEPERTI SEBELUMNYA) ---
const welcomeText = `...`;
const menuOptions = `...`;
const infoRaceText = `...`;
const categoryText = `...`;
const prizeText = `...`;
const contactText = `...`;
const registrationInfoText = `...`;

// --- HANDLER UTAMA ---

// Handler untuk command /start
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, welcomeText, { parse_mode: 'Markdown' });
    bot.sendMessage(chatId, menuOptions, { parse_mode: 'Markdown' });
});

// Handler untuk semua pesan teks
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    const userId = msg.from.id;

    if (text.startsWith('/')) return;

    if (userRegistrationState[userId]) {
        await handleRegistrationFlow(msg);
        return;
    }

    switch (text) {
        case '1': bot.sendMessage(chatId, infoRaceText, { parse_mode: 'Markdown' }); break;
        case '2':
            userRegistrationState[userId] = { step: 'name', data: {} };
            bot.sendMessage(chatId, 'Oke, mari kita mulai pendaftaran!\n\nSilakan ketikkan *nama lengkap* Anda:', { parse_mode: 'Markdown' });
            break;
        case '3': bot.sendMessage(chatId, categoryText, { parse_mode: 'Markdown' }); break;
        case '4': bot.sendMessage(chatId, prizeText, { parse_mode: 'Markdown' }); break;
        case '5': bot.sendMessage(chatId, contactText, { parse_mode: 'Markdown' }); break;
        default:
            bot.sendMessage(chatId, 'Menu tidak tersedia. Silakan pilih angka 1-5.');
            bot.sendMessage(chatId, menuOptions, { parse_mode: 'Markdown' });
            break;
    }
});

// --- FUNGSI-FUNGSI BANTUAN (SAMA SEPERTI SEBELUMNYA) ---
async function handleRegistrationFlow(msg) {
    // ... (isi fungsi sama persis seperti sebelumnya)
}

// --- EXPORT UNTUK VERCEL ---
// Ini adalah endpoint yang akan menerima update dari Telegram
module.exports = async (req, res) => {
    try {
        // Verifikasi secret token jika Anda mengaturnya di Telegram (opsional, tapi direkomendasikan)
        // if (req.headers['x-telegram-bot-api-secret-token'] !== process.env.TELEGRAM_WEBHOOK_SECRET) {
        //     return res.status(403).send('Forbidden');
        // }

        bot.processUpdate(req.body);
        res.status(200).send('OK');
    } catch (error) {
        console.error('Error processing update:', error);
        res.status(500).send('Error');
    }
};
