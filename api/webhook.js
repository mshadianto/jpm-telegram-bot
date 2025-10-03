// api/webhook.js (Versi Webhook untuk Vercel dengan Supabase State)
require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const { createClient } = require('@supabase/supabase-js');

// Inisialisasi Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// Inisialisasi bot tanpa polling (untuk webhook)
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN);

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

// --- FUNGSI STATE MANAGEMENT DI SUPABASE ---

/**
 * Ambil state user dari Supabase
 */
async function getUserState(userId) {
    try {
        const { data, error } = await supabase
            .from('registration_states')
            .select('*')
            .eq('telegram_user_id', userId)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = not found
            console.error('Error fetching user state:', error);
            return null;
        }

        return data;
    } catch (err) {
        console.error('Exception in getUserState:', err);
        return null;
    }
}

/**
 * Simpan/update state user ke Supabase
 */
async function saveUserState(userId, step, data) {
    try {
        const { error } = await supabase
            .from('registration_states')
            .upsert({
                telegram_user_id: userId,
                step: step,
                data: data,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'telegram_user_id'
            });

        if (error) {
            console.error('Error saving user state:', error);
            return false;
        }
        return true;
    } catch (err) {
        console.error('Exception in saveUserState:', err);
        return false;
    }
}

/**
 * Hapus state user dari Supabase
 */
async function deleteUserState(userId) {
    try {
        const { error } = await supabase
            .from('registration_states')
            .delete()
            .eq('telegram_user_id', userId);

        if (error) {
            console.error('Error deleting user state:', error);
        }
    } catch (err) {
        console.error('Exception in deleteUserState:', err);
    }
}

// --- HANDLER UTAMA ---

// Handler untuk command /start
bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    // Reset state jika user restart
    await deleteUserState(userId);
    
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

    // Cek jika user sedang dalam proses registrasi (dari Supabase)
    const userState = await getUserState(userId);
    
    if (userState) {
        await handleRegistrationFlow(msg, userState);
        return;
    }

    // Menu utama berdasarkan input angka
    switch (text) {
        case '1':
            bot.sendMessage(chatId, infoRaceText, { parse_mode: 'Markdown' });
            break;
        case '2':
            // Mulai proses registrasi - simpan state ke Supabase
            await saveUserState(userId, 'name', {});
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

async function handleRegistrationFlow(msg, userState) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const text = msg.text;
    const currentStep = userState.step;
    const currentData = userState.data || {};

    switch (currentStep) {
        case 'name':
            currentData.name = text;
            await saveUserState(userId, 'category', currentData);
            bot.sendMessage(chatId, `Terima kasih, ${text}!\n\nSekarang, silakan ketikkan *kategori lomba* yang Anda pilih:\n(Contoh: Men Open)`, { parse_mode: 'Markdown' });
            break;

        case 'category':
            currentData.category = text;
            await saveUserState(userId, 'phone', currentData);
            bot.sendMessage(chatId, 'Bagus! Terakhir, silakan ketikkan *nomor telepon* aktif Anda:', { parse_mode: 'Markdown' });
            break;

        case 'phone':
            currentData.phone_number = text;
            
            // Simpan ke tabel registrations (data final)
            try {
                const { error } = await supabase.from('registrations').insert({
                    telegram_user_id: userId,
                    name: currentData.name,
                    category: currentData.category,
                    phone_number: currentData.phone_number,
                });

                if (error) {
                    console.error('Gagal menyimpan ke Supabase:', error);
                    bot.sendMessage(chatId, 'Maaf, terjadi kesalahan saat menyimpan data. Silakan coba lagi nanti.');
                } else {
                    bot.sendMessage(chatId, `✅ *Pendaftaran Berhasil!*\n\nTerima kasih, ${currentData.name}! Data Anda telah kami simpan.\n\n*Nama*: ${currentData.name}\n*Kategori*: ${currentData.category}\n*No. HP*: ${currentData.phone_number}\n\nJangan lupa untuk melakukan pembayaran dan mengisi formulir resmi di link yang telah disediakan ya!`, { parse_mode: 'Markdown' });
                }
            } catch (err) {
                console.error('Error during Supabase operation:', err);
                bot.sendMessage(chatId, 'Maaf, terjadi kesalahan sistem. Silakan hubungi admin.');
            }

            // Hapus state user setelah selesai
            await deleteUserState(userId);
            break;
    }
}

// --- EXPORT UNTUK VERCEL ---
// Ini adalah endpoint yang akan menerima update dari Telegram
module.exports = async (req, res) => {
    try {
        // Verifikasi secret token (opsional tapi direkomendasikan untuk keamanan)
        // Uncomment baris di bawah jika Anda mengatur secret token
        // if (req.headers['x-telegram-bot-api-secret-token'] !== process.env.TELEGRAM_WEBHOOK_SECRET) {
        //     return res.status(403).send('Forbidden');
        // }

        // Process incoming update dari Telegram
        bot.processUpdate(req.body);
        res.status(200).send('OK');
    } catch (error) {
        console.error('Error processing update:', error);
        res.status(500).send('Error');
    }
};