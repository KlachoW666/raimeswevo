import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync, existsSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = process.env.DB_PATH ? dirname(process.env.DB_PATH) : join(__dirname, 'data');
if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
const dbPath = process.env.DB_PATH || join(dataDir, 'zyphex.db');

export const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    telegram_id TEXT UNIQUE NOT NULL,
    username TEXT,
    first_name TEXT,
    ref_code TEXT NOT NULL,
    referred_by_ref_code TEXT,
    pin_hash TEXT NOT NULL,
    balance_usdt REAL DEFAULT 0,
    is_banned INTEGER DEFAULT 0,
    is_vip INTEGER DEFAULT 0,
    notes TEXT DEFAULT '',
    bot_mode TEXT DEFAULT 'balanced',
    total_deposited REAL DEFAULT 0,
    total_withdrawn REAL DEFAULT 0,
    referral_count INTEGER DEFAULT 0,
    referral_earnings REAL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    last_active TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
  CREATE INDEX IF NOT EXISTS idx_users_ref_code ON users(ref_code);
  CREATE INDEX IF NOT EXISTS idx_users_referred_by ON users(referred_by_ref_code);
`);

function refCodeFromTelegramId(telegramId) {
  const num = parseInt(String(telegramId).replace(/\D/g, ''), 10) || 0;
  const s = num.toString(36).toUpperCase();
  return s.length >= 6 ? s.slice(0, 8) : s.padStart(6, 'X');
}

export function findOrCreateUser({ telegramId, username, firstName, pin, referredBy }) {
  const id = `tg_${telegramId}`;
  const refCode = refCodeFromTelegramId(telegramId);
  let user = db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(String(telegramId));
  if (user) {
    db.prepare('UPDATE users SET last_active = datetime("now") WHERE id = ?').run(id);
    return { ...user, balance_usdt: user.balance_usdt ?? 0 };
  }
  db.prepare(`
    INSERT INTO users (id, telegram_id, username, first_name, ref_code, referred_by_ref_code, pin_hash, balance_usdt)
    VALUES (?, ?, ?, ?, ?, ?, ?, 0)
  `).run(id, String(telegramId), username || '', firstName || '', refCode, referredBy || null, pin);
  user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (referredBy) {
    const referrer = db.prepare('SELECT id FROM users WHERE ref_code = ?').get(referredBy);
    if (referrer) {
      db.prepare('UPDATE users SET referral_count = referral_count + 1 WHERE id = ?').run(referrer.id);
    }
  }
  return { ...user, balance_usdt: user.balance_usdt ?? 0 };
}

export function findUserByPin(telegramId, pin) {
  const user = db.prepare('SELECT * FROM users WHERE telegram_id = ? AND pin_hash = ?').get(String(telegramId), pin);
  return user ? { ...user, balance_usdt: user.balance_usdt ?? 0 } : null;
}

export function listUsers() {
  const rows = db.prepare('SELECT * FROM users ORDER BY created_at DESC').all();
  return rows.map(row => ({
    id: row.id,
    name: row.first_name || row.username || row.telegram_id || row.id,
    balance: row.balance_usdt ?? 0,
    isBanned: !!row.is_banned,
    registeredAt: row.created_at ? row.created_at.slice(0, 10) : '',
    totalDeposited: row.total_deposited ?? 0,
    totalWithdrawn: row.total_withdrawn ?? 0,
    referralCount: row.referral_count ?? 0,
    referralEarnings: row.referral_earnings ?? 0,
    lastActive: row.last_active ? row.last_active.slice(0, 16).replace('T', ' ') : '',
    botMode: row.bot_mode || 'balanced',
    notes: row.notes || '',
    vipStatus: !!row.is_vip,
  }));
}

export function updateUser(id, patch) {
  const allowed = ['balance_usdt', 'is_banned', 'is_vip', 'notes', 'bot_mode'];
  const updates = [];
  const values = [];
  for (const [k, v] of Object.entries(patch)) {
    const col = k === 'balance' ? 'balance_usdt' : k === 'isBanned' ? 'is_banned' : k === 'vipStatus' ? 'is_vip' : k;
    if (allowed.includes(col) || col === 'balance_usdt') {
      updates.push(`${col} = ?`);
      values.push(v === true ? 1 : v === false ? 0 : v);
    }
  }
  if (updates.length === 0) return null;
  values.push(id);
  db.prepare(`UPDATE users SET ${updates.join(', ')}, last_active = datetime("now") WHERE id = ?`).run(...values);
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
}

export function getUserById(id) {
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!row) return null;
  return {
    id: row.id,
    name: row.first_name || row.username || row.telegram_id || row.id,
    balance: row.balance_usdt ?? 0,
    isBanned: !!row.is_banned,
    registeredAt: row.created_at ? row.created_at.slice(0, 10) : '',
    totalDeposited: row.total_deposited ?? 0,
    totalWithdrawn: row.total_withdrawn ?? 0,
    referralCount: row.referral_count ?? 0,
    referralEarnings: row.referral_earnings ?? 0,
    lastActive: row.last_active ? row.last_active.slice(0, 16).replace('T', ' ') : '',
    botMode: row.bot_mode || 'balanced',
    notes: row.notes || '',
    vipStatus: !!row.is_vip,
  };
}

export function addBonusToUser(id, amount) {
  const u = db.prepare('SELECT balance_usdt FROM users WHERE id = ?').get(id);
  if (!u) return null;
  const newBalance = (u.balance_usdt ?? 0) + amount;
  db.prepare('UPDATE users SET balance_usdt = ?, last_active = datetime("now") WHERE id = ?').run(newBalance, id);
  return getUserById(id);
}

export function resetUserBalance(id) {
  db.prepare('UPDATE users SET balance_usdt = 0, last_active = datetime("now") WHERE id = ?').run(id);
  return getUserById(id);
}

export function getReferralInfo(userId) {
  const row = db.prepare('SELECT ref_code, referral_count, referral_earnings FROM users WHERE id = ?').get(userId);
  return row;
}
