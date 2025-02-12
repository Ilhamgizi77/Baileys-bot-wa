import { makeWASocket, useMultiFileAuthState } from '@whiskeysockets/baileys';
import googleTTS from 'google-tts-api';

let sock;

async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState('./auth_info');
  sock = makeWASocket({
    auth: state,
    printQRInTerminal: true
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== 401;
      console.log('Koneksi terputus, mencoba menyambung ulang:', shouldReconnect);
      if (shouldReconnect) connectToWhatsApp();
    } else if (connection === 'open') {
      console.log('Bot terhubung ke WhatsApp');
    }
  });

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const message = messages[0];
    if (!message.message || message.key.fromMe) return;

    const sender = message.key.remoteJid;
    const textMessage = message.message.conversation || message.message.extendedTextMessage?.text || '';

    if (textMessage === '.menu') {
      const menuText = `✨ *Menu Bot* ✨\n` +
                       `.menu\n` +
                       `.says <pesan>\n` +
                       `.tts <teks>\n` +
                       `.confess <pesan> <nomor> <darisiapa>\n` +
                       `.confesstts <pesan> <nomor> <darisiapa>\n`;
      await sendTextMessage(sender, menuText);
    }

    if (textMessage.startsWith('.says ')) {
      const response = textMessage.slice(6);
      await sendTextMessage(sender, response);
    }

    if (textMessage.startsWith('.tts ')) {
      const response = textMessage.slice(5);
      await sendAudioMessage(sender, response);
    }

    if (textMessage.startsWith('.confess ')) {
      const parts = textMessage.slice(9).split(' ');
      if (parts.length >= 3) {
        const secretMessage = parts.slice(0, -2).join(' ');
        const number = parts[parts.length - 2];
        const from = parts[parts.length - 1];
        await sendTextMessage(sender, `Pesan telah dikirim.`);
      } else {
        await sendTextMessage(sender, 'Format salah. Gunakan: .confess <pesan> <nomor> <darisiapa>\nJika masih tidak bisa, coba kirim nomor seperti: 628xxxxxxx');
      }
    }

    if (textMessage.startsWith('.confesstts ')) {
      const parts = textMessage.slice(12).split(' ');
      if (parts.length >= 3) {
        const secretMessage = parts.slice(0, -2).join(' ');
        const number = parts[parts.length - 2];
        const from = parts[parts.length - 1];
        await sendTextMessage(sender, `Pesan telah dikirim.`);
        await sendAudioMessage(sender, secretMessage);
      } else {
        await sendTextMessage(sender, 'Format salah. Gunakan: .confesstts <pesan> <nomor> <darisiapa>\nJika masih tidak bisa, coba kirim nomor seperti: 628xxxxxxx');
      }
    }
  });
}

async function sendTextMessage(jid, text) {
  await sock.sendMessage(jid, { text });
}

async function sendAudioMessage(jid, text) {
  const url = googleTTS.getAudioUrl(text, { lang: 'id', slow: false, host: 'https://translate.google.com' });

  // Menggunakan stream langsung dari URL tanpa menyimpan ke file lokal
  const response = await globalThis.fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  await sock.sendMessage(jid, { audio: buffer, mimetype: 'audio/mp4' });
}

connectToWhatsApp();
