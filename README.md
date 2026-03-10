# Noura Slot Checker

Automated slot checker for [Noura Driving School](https://nouradc.com) final road test booking. Runs headlessly on your Mac, logs in, switches the portal to English, and polls for slot availability. When slots appear, you get a **desktop notification** and an **email alert**.

## Features

- **Headless** browser automation (runs in background)
- **Session persistence** — reuses login across runs
- **English mode** — auto-switches from Arabic for reliable detection
- **Desktop + email** notifications when slots are found
- **Resilient selectors** — multiple fallbacks if site structure changes
- **Debug mode** — visible browser for troubleshooting
- **Graceful shutdown** — Ctrl+C cleans up properly

## Requirements

- Node.js 18+
- macOS (for desktop notifications; email works on any OS)

## Setup

### 1. Install dependencies

```bash
cd noura-slot-checker
npm install
npx playwright install chromium
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` with your values:

| Variable | Required | Description |
|----------|----------|-------------|
| `NOURA_EMAIL` | Yes | Your nouradc.com login email |
| `NOURA_PASSWORD` | Yes | Your nouradc.com password |
| `NOTIFY_EMAIL` | No | Email for slot alerts (desktop works without it) |
| `SMTP_HOST` | No* | e.g. `smtp.gmail.com` |
| `SMTP_PORT` | No* | e.g. `587` |
| `SMTP_USER` | No* | Your SMTP username |
| `SMTP_PASS` | No* | SMTP password (Gmail: use [App Password](https://support.google.com/accounts/answer/185833)) |
| `CHECK_INTERVAL_MIN` | No | Minutes between checks (default: 5) |
| `PLAYWRIGHT_HEADLESS` | No | `true` = headless, `false` = visible (default: true) |

\* Required for email notifications

### 3. First run (debug)

Run once with a visible browser to verify login and selectors:

```bash
npm run debug
```

If something fails (e.g. new captcha, layout change), you’ll see it in the browser. Update selectors in `src/` if needed.

## Usage

**Continuous monitoring (production):**
```bash
npm start
```

Runs indefinitely, checking every 5 minutes (or `CHECK_INTERVAL_MIN`). Stops when slots are detected and notifications are sent.

**One-time check:**
```bash
npm run check
```

Performs a single check and exits.

**Troubleshooting:**
```bash
npm run debug
```

Runs with a visible browser and slower actions.

## Project structure

```
noura-slot-checker/
├── src/
│   ├── index.js      # Entry point, orchestration
│   ├── config.js     # Env config & validation
│   ├── logger.js     # Timestamped logging
│   ├── auth.js       # Login & session persistence
│   ├── portal.js     # Language switch + booking nav
│   ├── slotChecker.js # Check loop
│   └── notifier.js   # Desktop + email
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

## How it works

1. Launches Chromium (headless by default)
2. Loads saved session if `auth.json` exists, else logs in
3. Switches portal language to English
4. Clicks "Book Final Road Test" (4th sidebar item)
5. Looks for "Sorry, Slots Are Not Available Right Now."
6. If the message **disappears** → slots may be available → sends notifications
7. Otherwise waits `CHECK_INTERVAL_MIN` and repeats from step 5
8. On session expiry, re-logs in and continues

## Gmail setup (email notifications)

1. Enable 2FA on your Google account
2. Create an [App Password](https://support.google.com/accounts/answer/185833)
3. In `.env`:
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your@gmail.com
   SMTP_PASS=your-16-char-app-password
   NOTIFY_EMAIL=your@gmail.com
   ```

## Server deployment (free, runs 24/7)

To run without keeping your PC on, use **GitHub Actions** (free for public repos):

### 1. Push to GitHub

```bash
cd noura-slot-checker
git init
git add .
git commit -m "Noura slot checker"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/noura-slot-checker.git
git push -u origin main
```

**Important:** Use a **public** repo so you get unlimited free minutes. Your secrets stay private—they’re never exposed.

### 2. Add secrets

In GitHub: **Repo → Settings → Secrets and variables → Actions → New repository secret**

Add:

| Secret         | Value                     |
|----------------|---------------------------|
| `NOURA_EMAIL`  | Your login ID             |
| `NOURA_PASSWORD` | Your password          |
| `NOTIFY_EMAIL` | Email for alerts          |
| `SMTP_HOST`    | `smtp.gmail.com`          |
| `SMTP_PORT`    | `587`                     |
| `SMTP_USER`    | Your Gmail address        |
| `SMTP_PASS`    | Gmail App Password        |

### 3. Run

The workflow runs **every 10 minutes** and performs one check per run. Email notifications work; desktop notifications are skipped on the server.

To run manually: **Actions → Noura Slot Checker → Run workflow**.

### Alternative: Docker (Railway, Fly.io, etc.)

```bash
docker build -t noura-slot-checker .
docker run -d --env-file .env noura-slot-checker
```

Set environment variables in your host’s dashboard instead of using `--env-file`.

---

## Caveats

- Respect nouradc.com terms of service and rate limits (avoid very short intervals)
- If the portal layout changes, selectors in `src/portal.js` and `src/auth.js` may need updates
- Captcha on login requires manual intervention (run headed once, then reuse session)
- `auth.json` contains session data; keep it private and add it to `.gitignore` (already done)

## License

MIT
