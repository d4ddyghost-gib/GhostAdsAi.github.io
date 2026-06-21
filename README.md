# 👻 Ghost Ads

> AI-powered growth. Ghosted competition.

A full-stack version of the Ghost Ads landing page: the animated marketing site, plus a **real Node/Express backend** with hashed-password accounts, server-side sessions, and an AI ad-copy generator that calls Claude from the server (so your API key never reaches the browser).

## Features

**Frontend**
- Cinematic Three.js hero scene, scroll reveals, count-up stats, sticky CTA bar
- ROI calculator, testimonial carousel, FAQ accordion, contact form
- Sign in / sign up modal and a dashboard with a live AI ad generator

**Backend (new)**
- Real accounts backed by a lightweight file database (`data/users.json`)
- Passwords hashed with Node's built-in `scrypt` + a random per-user salt — never stored in plaintext
- Sessions via signed, **httpOnly** cookies (JWT) — not `localStorage`, so tokens aren't exposed to client-side JS or XSS
- Signing up, signing in, and reloading the page all talk to real `/api/auth/*` endpoints; your session survives a page refresh
- The AI ad generator runs through `/api/ads/generate` on the server, which holds your `ANTHROPIC_API_KEY` — it's never shipped to the browser

## Tech stack

- Node.js + Express
- `jsonwebtoken` for signed session cookies
- `cookie-parser` for reading them
- Node's built-in `crypto` for password hashing (no native compilation needed)
- A small JSON-file store for users (zero extra services to run)
- Plain HTML / CSS / vanilla JS on the frontend — no build step

## Project structure

```
ghost-ads/
├── server.js              # Express app: static files + API routes
├── lib/
│   ├── auth.js             # password hashing, JWT sign/verify
│   └── db.js                # file-backed user store (signup/login)
├── public/
│   ├── index.html           # the whole site, now wired to the API
│   └── assets/
│       └── ghost-ads-logo.png
├── data/
│   └── users.json            # created automatically on first run
├── package.json
├── .env.example
└── .gitignore
```

## Getting started

```bash
npm install
cp .env.example .env
```

Open `.env` and fill in:

| Variable | What it's for |
|---|---|
| `PORT` | Port the server runs on (default `3000`) |
| `JWT_SECRET` | Long random string used to sign session cookies. Generate one with:<br>`node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `ANTHROPIC_API_KEY` | Your key from [console.anthropic.com](https://console.anthropic.com), used by the ad generator |
| `NODE_ENV` | Set to `production` when deploying behind HTTPS (enables secure cookies) |

Then run it:

```bash
npm start
```

Visit `http://localhost:3000`. Click **Sign in → Sign up** to create a real account — it's hashed and saved to `data/users.json`. Refresh the page and you'll stay signed in (real session, not a demo). From the dashboard, the **AI Ad Generator** calls Claude through your own server.

For auto-restart on file changes during development:

```bash
npm run dev
```

## How auth works

1. **Sign up** — `POST /api/auth/signup` validates the email/password, hashes the password (`scrypt` + random salt), and saves the user to `data/users.json`.
2. **Sign in** — `POST /api/auth/login` looks up the user and verifies the password with a timing-safe comparison.
3. On success, the server signs a JWT (`{ email }`, 7-day expiry) and sets it as an **httpOnly** cookie — JavaScript in the browser can't read it, which protects it from XSS token theft.
4. **Every page load** calls `GET /api/auth/me`; if the cookie is present and valid, the dashboard is restored automatically.
5. **Sign out** — `POST /api/auth/logout` clears the cookie.

## The "database"

User accounts are stored in `data/users.json`, a flat file managed by `lib/db.js`. This keeps the project dependency-free and easy to run anywhere with just `npm install` — no Postgres/MySQL/Mongo to stand up. It's genuinely persistent (data survives server restarts) and fine for prototypes, demos, or small deployments.

If you outgrow it, swap `lib/db.js` for a real database client (e.g. `pg`, `mongodb`, or an ORM like Prisma) — the `signup()` / `login()` / `getUserByEmail()` function signatures are what the rest of the app calls, so the routes in `server.js` don't need to change.

## Security notes before deploying for real

- Never commit your `.env` file (already in `.gitignore`)
- Use a long, random `JWT_SECRET` — don't ship the example value
- Set `NODE_ENV=production` and serve over HTTPS so the session cookie's `secure` flag is honored
- Consider adding rate limiting on `/api/auth/login` and `/api/auth/signup` to slow down brute-force attempts
- The file-based store has no concurrent-write protection — fine for low traffic, but move to a real database before scaling up

## License

No license specified — add one (e.g. MIT) if you intend to open-source this.
