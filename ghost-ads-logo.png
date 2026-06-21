const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { hashPassword, verifyPassword } = require('./auth');

const DB_PATH = path.join(__dirname, '..', 'data', 'users.json');

function ensureDb() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, '[]', 'utf8');
}

function readUsers() {
  ensureDb();
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  } catch {
    return [];
  }
}

function writeUsers(users) {
  ensureDb();
  fs.writeFileSync(DB_PATH, JSON.stringify(users, null, 2), 'utf8');
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Create a new account. Throws on invalid input or duplicate email.
 */
async function signup(email, password) {
  const normalized = normalizeEmail(email);
  if (!isValidEmail(normalized)) throw new Error('Enter a valid email address.');
  if (!password || password.length < 4) throw new Error('Password must be at least 4 characters.');

  const users = readUsers();
  if (users.some(u => u.email === normalized)) {
    throw new Error('An account with that email already exists.');
  }

  const user = {
    id: crypto.randomUUID(),
    email: normalized,
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString()
  };
  users.push(user);
  writeUsers(users);
  return { email: user.email };
}

/**
 * Verify credentials. Throws if the email/password combination is invalid.
 */
async function login(email, password) {
  const normalized = normalizeEmail(email);
  const users = readUsers();
  const user = users.find(u => u.email === normalized);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    throw new Error('Invalid email or password.');
  }
  return { email: user.email };
}

function getUserByEmail(email) {
  const normalized = normalizeEmail(email);
  return readUsers().find(u => u.email === normalized) || null;
}

module.exports = { signup, login, getUserByEmail };
