// index.js
require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const { createClient } = require('@supabase/supabase-js');

// Inisialisasi bot dengan polling (untuk development)
// Untuk production, kita akan menggunakan webhook
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

// Inisialisasi Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// Objek untuk menyimpan state sementara user yang sedang mendaftar
// Key: telegramUserId, Value: { step: 'name' | 'category' | 'phone', data: {...} }
const userRegistrationState = {};

// --- TEKS-TEKS STATIS ---
const welcomeText = `
🚴‍♂️ *Selamat Datang di JPM PRO RACE 2025 Bot!* 🚴‍♀️

Ajang balap sepeda gunung MTB XC paling bergengsi siap kembali menggebrak! Dapatkan informasi lengkap dan daftarkan diri Anda melalui bot ini.

Pilih menu di bawah ini dengan mengetikkan angkanya:
`;

const menuOptions = `
1️⃣ Info Race
2️⃣ Registrasi
3️⃣ Kategori Lomba
4️⃣ Info Hadiah
5️⃣ Kontak Person
`;

const infoRaceText = `
📅 *INFO RACE - JPM PRO RACE 2025* 📅

Ajang kompetisi balap sepeda gunung bergengsi JPM PRO RACE 2025 akan diselenggarakan pada:

🗓️ *Tanggal*: 25–26 Oktober 2025
📍 *Lokasi*: Arena Trek JPM, Paradise Serpong City, Tangerang Selatan
🛤️ *Lintasan*: Sepanjang 3,7 KM dengan rintangan dan tantangan yang menantang.

Event ini terselenggara berkat kerja sama Lion Group, ISSI/ICF, dan Paradise Serpong City.
`;

const categoryText = `
🏆 *KATEGORI LOMBA* 🏆

1.  Pra Junior (<16 tahun)
2.  Junior (17–18 tahun)
3.  Men Open (19–29 tahun)
4.  Women Open (Semua Umur)
5.  Master A (30–39 tahun)
6.  Master B (40–49 tahun)
7.  Master C (50 tahun ke atas)
8.  E-Bike (Semua umur)
9.  All Mountain (Open semua umur)
10. Men Elite
`;

const prizeText = `
💰 *INFO HADIAH* 💰

Total hadiah senilai **Rp 100.000.000,-** siap diperebutkan oleh para juara di setiap kategori!
`;

const contactText = `
📞 *KONTAK PERSON* 📞

Untuk informasi lebih lanjut dan konfirmasi, hubungi:
*MS Hadianto*
+62 815-9658-833
`;

const registrationInfoText = `
📝 *INFORMASI PENDAFTARAN* 📝

*Periode*: 5 September – 18 Oktober 2025
*Biaya*: Rp250.000,- per kelas (sudah termasuk tiket Paradise Dreamland, asuransi, T-shirt, dan BIB Number).
*Rekening*: BCA 5385183582 a.n. PT JALUR Pedal Mandiri
*Ketentuan*: Tidak ada pendaftaran On The Spot (OTS). Peserta wajib melampirkan bukti transfer saat submit formulir.

*LINK PENDAFTARAN*: [Klik Di Sini](https://example.com/link-pendaftaran)  <-- GANTI dengan link asli

---
Untuk simulasi pendaftaran via bot, ketik *2* lagi.
`;

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

    // Abaikan pesan dari command /start
    if (text.startsWith('/')) return;

    // Cek jika user sedang dalam proses registrasi
    if (userRegistrationState[userId]) {
        await handleRegistrationFlow(msg);
        return;
    }

    // Menu utama berdasarkan input angka
    switch (text) {
        case '1':
            bot.sendMessage(chatId, infoRaceText, { parse_mode: 'Markdown' });
            break;
        case '2':
            // Mulai proses registrasi
            userRegistrationState[userId] = { step: 'name', data: {} };
            bot.sendMessage(chatId, 'Oke, mari kita mulai pendaftaran!\n\nSilakan ketikkan *nama lengkap* Anda:', { parse_mode: 'Markdown' });
            break;
        case '3':
            bot.sendMessage(chatId, categoryText, { parse_mode: 'Markdown' });
            break;
        case '4':
            bot.sendMessage(chatId, prizeText, { parse_mode: 'Markdown' });
            break;
        case '5':
            bot.sendMessage(chatId, contactText, { parse_mode: 'Markdown' });
            break;
        default:
            bot.sendMessage(chatId, 'Menu tidak tersedia. Silakan pilih angka 1-5.');
            bot.sendMessage(chatId, menuOptions, { parse_mode: 'Markdown' });
            break;
    }
});

// --- FUNGSI-FUNGSI BANTUAN ---

async function handleRegistrationFlow(msg) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const text = msg.text;
    const state = userRegistrationState[userId];

    switch (state.step) {
        case 'name':
            state.data.name = text;
            state.step = 'category';
            bot.sendMessage(chatId, `Terima kasih, ${text}!\n\nSekarang, silakan ketikkan *kategori lomba* yang Anda pilih:\n(Contoh: Men Open)`, { parse_mode: 'Markdown' });
            break;

        case 'category':
            state.data.category = text;
            state.step = 'phone';
            bot.sendMessage(chatId, 'Bagus! Terakhir, silakan ketikkan *nomor telepon* aktif Anda:', { parse_mode: 'Markdown' });
            break;

        case 'phone':
            state.data.phone_number = text;
            // Simpan ke database
            try {
                const { error } = await supabase.from('registrations').insert({
                    telegram_user_id: userId,
                    name: state.data.name,
                    category: state.data.category,
                    phone_number: state.data.phone_number,
                });

                if (error) {
                    console.error('Gagal menyimpan ke Supabase:', error);
                    bot.sendMessage(chatId, 'Maaf, terjadi kesalahan saat menyimpan data. Silakan coba lagi nanti.');
                } else {
                    bot.sendMessage(chatId, `✅ *Pendaftaran Berhasil!*\n\nTerima kasih, ${state.data.name}! Data Anda telah kami simpan.\n\n*Nama*: ${state.data.name}\n*Kategori*: ${state.data.category}\n*No. HP*: ${state.data.phone_number}\n\nJangan lupa untuk melakukan pembayaran dan mengisi formulir resmi di link yang telah disediakan ya!`, { parse_mode: 'Markdown' });
                }
            } catch (err) {
                console.error('Error during Supabase operation:', err);
                bot.sendMessage(chatId, 'Maaf, terjadi kesalahan sistem. Silakan hubungi admin.');
            }

            // Hapus state user setelah selesai
            delete userRegistrationState[userId];
            break;
    }
}


console.log('Bot JPM Race 2025 sedang berjalan...');
