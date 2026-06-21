require('dotenv').config();

const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');

const { signup, login } = require('./lib/db');
const { signToken, verifyToken } = require('./lib/auth');

const app = express();
const PORT = process.env.PORT || 3000;
const COOKIE_NAME = 'ghost_ads_session';
const isProd = process.env.NODE_ENV === 'production';

app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd, // requires HTTPS in production
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  };
}

function requireAuth(req, res, next) {
  const token = req.cookies[COOKIE_NAME];
  const payload = token && verifyToken(token);
  if (!payload) return res.status(401).json({ error: 'Please sign in first.' });
  req.user = payload;
  next();
}

// ---------------------------------------------------------------------------
// Auth routes
// ---------------------------------------------------------------------------

app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const user = await signup(email, password);
    const token = signToken({ email: user.email });
    res.cookie(COOKIE_NAME, token, cookieOptions());
    res.json({ email: user.email });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const user = await login(email, password);
    const token = signToken({ email: user.email });
    res.cookie(COOKIE_NAME, token, cookieOptions());
    res.json({ email: user.email });
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie(COOKIE_NAME);
  res.json({ ok: true });
});

app.get('/api/auth/me', (req, res) => {
  const token = req.cookies[COOKIE_NAME];
  const payload = token && verifyToken(token);
  if (!payload) return res.status(401).json({ error: 'Not signed in.' });
  res.json({ email: payload.email });
});

// ---------------------------------------------------------------------------
// AI ad generator — runs server-side so the Anthropic API key never reaches
// the browser. Requires a signed-in session.
// ---------------------------------------------------------------------------

app.post('/api/ads/generate', requireAuth, async (req, res) => {
  try {
    const { product, audience, tone } = req.body || {};
    if (!product) return res.status(400).json({ error: 'Tell us what you are advertising.' });
    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(500).json({ error: 'Server is missing ANTHROPIC_API_KEY — add it to your .env file.' });
    }

    const prompt = `You are the AI ad copy engine for "Ghost Ads", an agency whose brand voice plays on ghosts/haunting/vanishing competitors, kept clever and not corny.
Generate 3 distinct ad copy variations for this brief:
Product/business: ${product}
Target audience: ${audience || 'a general audience'}
Tone: ${tone || 'Bold & confident'}

Respond with ONLY valid JSON, no markdown fences, no preamble, in this exact shape:
[{"channel":"string, e.g. Instagram Feed Ad","headline":"string, under 10 words","body":"string, 1-2 sentences, under 35 words"}, ...]`;

    const apiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!apiRes.ok) {
      const errBody = await apiRes.text();
      throw new Error(`Anthropic API error (${apiRes.status}): ${errBody}`);
    }

    const data = await apiRes.json();
    const textBlock = (data.content || []).find(b => b.type === 'text');
    if (!textBlock) throw new Error('No response content from the model.');

    const cleaned = textBlock.text.replace(/```json|```/g, '').trim();
    const ads = JSON.parse(cleaned);
    res.json({ ads });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Ad generation failed.' });
  }
});

app.listen(PORT, () => {
  console.log(`👻 Ghost Ads server running at http://localhost:${PORT}`);
});
