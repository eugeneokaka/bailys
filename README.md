# WhatsApp Sender

A small local Express API for sending one-off WhatsApp messages through [Baileys](https://baileys.wiki/), the unofficial WhatsApp Web WebSocket API.

Built for **low-volume, 1:1, hobby use** — **not bulk messaging**.

> ⚠️ **Warning:** Baileys is unofficial and is not affiliated with WhatsApp. Using unofficial WhatsApp automation may violate WhatsApp's Terms of Service, and your number **can be banned**.
>
> Use a dedicated number you can afford to lose, keep volume low, and follow the safety guidelines below.
>
> For real customers or commercial use, use the official Meta WhatsApp Cloud API.

---

## Stack

- **Node.js 20+** — tested on Node 24
- **Express**
- **@whiskeysockets/baileys 7.0.0-rc14**
- **ESM** — `"type": "module"`
- WhatsApp session stored locally in `auth/`
- Node's built-in `--watch` for development

---

## Installation

Clone the project and install dependencies:

```bash
npm install
```

---

## Running the App

### Development

Use:

```bash
npm run dev
```

This uses Node's built-in `--watch` mode and automatically restarts the application whenever you save a file.

You'll see:

```text
Restarting 'src/index.js'
```

### Production / normal start

```bash
npm start
```

`npm start` does **not** automatically reload when files change. Stop the process with `Ctrl+C` and restart it after making changes.

### Important

**Run only one instance at a time.**

Running multiple instances using the same `auth/` folder can cause problems with the WhatsApp session and may result in:

```text
EADDRINUSE
```

---

## First-Time Setup

This project uses **WhatsApp pairing codes** instead of QR codes.

The phone number is configured in:

```text
src/whatsapp.js
```

using `PHONE_NUMBER`.

The default is:

```text
254751412940
```

### Link the dedicated phone

1. Start the application:

   ```bash
   npm run dev
   ```

2. The terminal will display a pairing code:

   ```text
   Pairing code: XXXXXXXX
   ```

3. On the **dedicated phone**, open:

   **WhatsApp → Settings → Linked Devices → Link a Device → Link with phone number instead**

4. Enter the 8-character pairing code.

5. Wait for:

   ```text
   Connected to WhatsApp.
   ```

Your session is saved inside:

```text
auth/
```

Future starts will automatically reconnect using the saved session.

You only need to pair again if:

- You delete `auth/`
- WhatsApp unlinks the device
- The session becomes invalid

> ⚠️ The pairing code belongs to whichever WhatsApp account is configured through `PHONE_NUMBER`.
>
> **Never use your personal/main WhatsApp number for this project.**

---

## Changing the `/hello` Message

The default `/hello` message is defined in:

```text
src/index.js
```

For example:

```js
const HELLO_TEXT = 'i know it will';
```

Change it to whatever you want:

```js
const HELLO_TEXT = 'Hello from my WhatsApp bot 👋';
```

If you're running:

```bash
npm run dev
```

the application automatically reloads after saving.

If you're running:

```bash
npm start
```

you must restart the process manually.

---

# API

Base URL:

```text
http://localhost:3000
```

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Check API and WhatsApp connection status |
| `GET` | `/check?to=` | Check whether a number is registered on WhatsApp |
| `GET` | `/hello?to=` | Send the predefined `HELLO_TEXT` |
| `POST` | `/send` | Send a custom message |

### Phone Number Format

Numbers must use **full international format**:

```text
254751412940
```

Use:

- Country code
- Phone number
- Digits only

Do **not** use:

```text
+254751412940
```

or:

```text
0751412940
```

---

## API Examples

### Health Check

```bash
curl http://localhost:3000/health
```

Example response:

```json
{
  "ok": true,
  "ready": true
}
```

---

### Check a WhatsApp Number

```bash
curl "http://localhost:3000/check?to=254751412940"
```

---

### Send the Hello Message

```bash
curl "http://localhost:3000/hello?to=254751412940"
```

This sends whatever is currently configured in:

```js
HELLO_TEXT
```

---

### Send a Custom Message

```bash
curl -X POST http://localhost:3000/send \
  -H "Content-Type: application/json" \
  -d '{"to":"254751412940","message":"Hello from my app!"}'
```

Request body:

```json
{
  "to": "254751412940",
  "message": "Hello from my app!",
  "check": true
}
```

Set:

```json
"check": false
```

to skip the WhatsApp number lookup before sending.

---

## Error Responses

| Status | Code | Meaning |
|---:|---|---|
| `400` | — | Missing `to` or `message` |
| `401` | — | Missing or invalid `API_KEY` |
| `422` | `NOT_ON_WHATSAPP` | Number isn't registered on WhatsApp |
| `503` | — | WhatsApp isn't connected yet |
| `500` | — | Unexpected server error |

---

# Incoming Messages

Incoming WhatsApp messages are logged directly to the terminal.

Example:

```text
2026-10-04T10:04:46.494Z REPLY from Eugene <254751412940@s.whatsapp.net>: hey
```

The application:

- Logs real-time incoming messages
- Skips your own outgoing messages
- Displays `[non-text message]` for messages without text
- Displays captions from images/videos when available
- Does not backfill old message history

Receiving messages is passive; however, the use of unofficial automation still carries account risk.

---

# Project Structure

```text
whatsapp-sender/
│
├── src/
│   ├── index.js
│   │   └── Express API
│   │   └── HELLO_TEXT
│   │   └── Request logging
│   │
│   └── whatsapp.js
│       └── Baileys connection
│       └── Pairing code
│       └── Message sending
│       └── Incoming message logging
│
├── auth/
│   └── WhatsApp session
│
├── package.json
├── README.md
└── .gitignore
```

---

# How It Works

```text
npm run dev
     │
     ├── Start Express server on :3000
     │
     └── connect() in whatsapp.js
           │
           ├── Load session from auth/
           │
           ├── If no session → request pairing code
           │
           ├── Open WebSocket connection to WhatsApp
           │
           ├── connection === 'open'
           │       └── ready = true
           │
           ├── messages.upsert
           │       └── Log incoming replies
           │
           └── Connection closes
                   └── Reconnect after 3 seconds
```

### Sending a message

```text
HTTP Request
     │
     ▼
src/index.js
     │
     ├── GET /hello?to=...
     │       └── sendMessage(to, HELLO_TEXT)
     │
     └── POST /send
             └── sendMessage(to, message)
                       │
                       ├── Normalize number
                       │
                       ├── Optional WhatsApp lookup
                       │
                       └── sock.sendMessage()
```

---

# Things NOT to Do

### 🔴 Don't use your personal number

Use the dedicated WhatsApp account only.

### 🔴 Don't enter the pairing code on your main account

The pairing code should only be entered on the dedicated phone.

### 🔴 Don't run multiple instances

Only one process should use the `auth/` session at a time.

If you see:

```text
EADDRINUSE
```

stop the old process first.

### 🔴 Don't delete `auth/` unnecessarily

The folder contains your WhatsApp session.

Deleting it forces you to pair the device again.

### 🔴 Never commit `auth/`

The folder contains long-lived cryptographic credentials.

Make sure it is in `.gitignore`:

```text
auth/
```

### 🔴 Don't send bulk messages

Don't:

- Blast messages to many people
- Repeatedly send identical messages
- Message people who haven't opted in
- Rapidly automate large volumes

### 🔴 Don't rapidly restart the application

Every restart disconnects and reconnects the WhatsApp session.

Avoid repeatedly restarting the application in a loop.

### 🔴 Don't expose port 3000 publicly without authentication

If this API ever leaves localhost, configure an `API_KEY` and put proper network protection in place.

---

# Account Safety

For this unofficial integration:

- Keep usage **1:1 and low-volume**
- Prefer messaging people who have opted in
- Avoid unsolicited messages
- Respect opt-outs
- Use a dedicated number
- Keep the WhatsApp session stable
- Avoid multiple simultaneous sessions using the same `auth/` folder
- If WhatsApp warns or restricts the account, stop automation

For commercial or customer-facing applications, use the **official Meta WhatsApp Cloud API** instead.

---

# Troubleshooting

### `npm start` doesn't pick up my changes

`npm start` doesn't use watch mode.

Use:

```bash
npm run dev
```

or stop and restart the application manually.

---

### `EADDRINUSE`

Another process is already using port `3000`.

Stop the existing Node process before starting another instance.

---

### Pairing code expired

Restart the application to generate a new pairing code and enter the newest code promptly.

---

### Forced to pair every time

Check that:

- `auth/` exists
- The application has permission to write to `auth/`
- You aren't deleting the folder
- Only one instance is using the session

---

### `Bad MAC` errors

These can occur with WhatsApp's Signal session.

First check that:

1. Only one instance is running.
2. You're using the expected Baileys version.
3. The application isn't rapidly restarting.

If the problem persists, stop the application, remove `auth/`, and pair the device again.

> **Warning:** Removing `auth/` logs out the stored session and requires a new pairing.

---

### VS Code `Unable to get absolute uri ...`

If this error is coming from GitLens, it is unrelated to the WhatsApp application.

Try:

- Updating GitLens
- Disabling GitLens for the project
- Ignoring the error if everything else works

---

## License / Usage

This project is intended for **personal learning, experimentation, and low-volume development**.

Baileys is an unofficial WhatsApp Web API and is not affiliated with WhatsApp or Meta.