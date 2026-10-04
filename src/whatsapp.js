import path from 'path';
import makeWASocket, { DisconnectReason, useMultiFileAuthState } from '@whiskeysockets/baileys';
import qrcode from 'qrcode-terminal';
import pino from 'pino';

const AUTH_DIR = path.resolve('auth');
const PHONE_NUMBER = process.env.PHONE_NUMBER || '254751412940';
const logger = pino({ level: 'silent' });

let sock = null;
let ready = false;
let pairingRequested = false;

function normalizeNumber(input) {
  const digits = String(input).replace(/[^\d]/g, '');
  if (!digits) throw new Error(`Invalid phone number: ${input}`);
  return digits;
}

function toJid(input) {
  const raw = String(input).trim();
  if (raw.includes('@')) return raw;
  return `${normalizeNumber(raw)}@s.whatsapp.net`;
}

function extractText(msg) {
  const content = msg.message;
  if (!content) return null;
  const inner =
    content.ephemeralMessage?.message ||
    content.viewOnceMessage?.message ||
    content.viewOnceMessageV2?.message ||
    content;
  return (
    inner.conversation ||
    inner.extendedTextMessage?.text ||
    inner.imageMessage?.caption ||
    inner.videoMessage?.caption ||
    null
  );
}

async function connect() {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

  sock = makeWASocket({ auth: state, logger });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr && !sock.authState.creds.registered && !pairingRequested) {
      pairingRequested = true;
      sock
        .requestPairingCode(PHONE_NUMBER)
        .then((code) => {
          console.log(`\nPairing code: ${code}`);
          console.log('Enter it on the DEDICATED phone: WhatsApp > Linked Devices > Link a Device > Link with phone number instead\n');
        })
        .catch((err) => {
          pairingRequested = false;
          console.error('Failed to request pairing code:', err.message);
        });
    }

    if (connection === 'close') {
      ready = false;
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('connection closed, reconnecting:', shouldReconnect);
      if (shouldReconnect) connect().catch((err) => console.error('reconnect failed:', err));
    } else if (connection === 'open') {
      ready = true;
      console.log('Connected to WhatsApp.');
    }
  });

  sock.ev.on('messages.upsert', ({ messages, type }) => {
    if (type !== 'notify') return;
    for (const msg of messages) {
      if (msg.key.fromMe) continue;
      const from = msg.key.remoteJid;
      const name = msg.pushName ? `${msg.pushName} ` : '';
      console.log(`${new Date().toISOString()} REPLY from ${name}<${from}>: ${extractText(msg) ?? '[non-text message]'}`);
    }
  });

  return sock;
}

async function checkNumber(to) {
  if (!sock || !ready) throw new Error('WhatsApp is not connected yet');
  const number = normalizeNumber(to);
  const results = await sock.onWhatsApp(`${number}@s.whatsapp.net`);
  const hit = Array.isArray(results) ? results.find((r) => r.exists) : null;
  return { exists: Boolean(hit), jid: hit?.jid ?? null, number };
}

async function sendMessage(to, text, { check = true } = {}) {
  if (!sock || !ready) throw new Error('WhatsApp is not connected yet');
  const jid = toJid(to);

  if (check) {
    const lookup = await sock.onWhatsApp(jid);
    const exists = Array.isArray(lookup) ? lookup.some((r) => r.exists) : false;
    if (!exists) {
      const err = new Error('Number is not registered on WhatsApp');
      err.code = 'NOT_ON_WHATSAPP';
      throw err;
    }
  }

  const res = await sock.sendMessage(jid, { text: String(text) });
  return res?.key?.id ?? null;
}

export { connect, sendMessage, checkNumber };
export const isReady = () => ready;
