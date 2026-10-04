const express = require('express');
const wa = require('./whatsapp');

const app = express();
app.use(express.json());

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    console.log(
      `${new Date().toISOString()} ${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - start}ms`
    );
  });
  next();
});

const API_KEY = process.env.API_KEY;

app.use((req, res, next) => {
  if (!API_KEY) return next();
  const header = req.get('authorization') || '';
  if (header === `Bearer ${API_KEY}`) return next();
  return res.status(401).json({ error: 'unauthorized' });
});

app.get('/health', (req, res) => {
  res.json({ ok: true, ready: wa.isReady() });
});

app.get('/check', async (req, res) => {
  if (!req.query.to) {
    return res.status(400).json({ error: 'query param "to" is required' });
  }
  if (!wa.isReady()) {
    return res.status(503).json({ error: 'WhatsApp not connected yet' });
  }
  try {
    res.json(await wa.checkNumber(req.query.to));
  } catch (err) {
    console.error('check failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/hello', async (req, res) => {
  const to = req.query.to;
  if (!to) {
    return res.status(400).json({ error: 'query param "to" is required' });
  }
  if (!wa.isReady()) {
    return res.status(503).json({ error: 'WhatsApp not connected yet' });
  }
  try {
    const id = await wa.sendMessage(to, 'nothing much');
    res.json({ ok: true, to, message: 'hello', id });
  } catch (err) {
    if (err.code === 'NOT_ON_WHATSAPP') {
      return res.status(422).json({ error: err.message, code: err.code });
    }
    console.error('hello failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/send', async (req, res) => {
  const { to, message, check = true } = req.body || {};
  if (!to || !message) {
    return res.status(400).json({ error: 'to and message are required' });
  }
  if (!wa.isReady()) {
    return res.status(503).json({ error: 'WhatsApp not connected yet' });
  }
  try {
    const id = await wa.sendMessage(to, message, { check: check !== false });
    res.json({ ok: true, id });
  } catch (err) {
    if (err.code === 'NOT_ON_WHATSAPP') {
      return res.status(422).json({ error: err.message, code: err.code });
    }
    console.error('send failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;

wa.connect().catch((err) => console.error('connect failed:', err));

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
