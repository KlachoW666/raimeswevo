import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync, existsSync } from 'fs';
import crypto from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = process.env.DB_PATH ? dirname(process.env.DB_PATH) : join(__dirname, 'data');
if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
const dbPath = process.env.DB_PATH || join(dataDir, 'zyphex.db');

export const db = new Database(dbPath);

// ══════════════════════════════════════
// Schema
// ══════════════════════════════════════

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

db.exec(`
  CREATE TABLE IF NOT EXISTS visitors (
    telegram_id TEXT PRIMARY KEY,
    username TEXT,
    first_name TEXT,
    first_seen TEXT DEFAULT (datetime('now')),
    last_seen TEXT DEFAULT (datetime('now'))
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS wallets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL REFERENCES users(id),
    network TEXT NOT NULL,
    address TEXT NOT NULL,
    balance_usdt REAL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(user_id, network)
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL REFERENCES users(id),
    type TEXT NOT NULL,
    network TEXT,
    amount_usdt REAL NOT NULL,
    address TEXT,
    tx_hash TEXT,
    status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT (datetime('now')),
    confirmed_at TEXT
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS trades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL REFERENCES users(id),
    pair TEXT NOT NULL,
    pnl_amount REAL NOT NULL,
    pnl_usd REAL NOT NULL,
    executed_at TEXT DEFAULT (datetime('now')),
    latency_ns INTEGER
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS referral_earnings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    referrer_id TEXT NOT NULL REFERENCES users(id),
    referred_id TEXT NOT NULL REFERENCES users(id),
    deposit_amount REAL NOT NULL,
    bonus_amount REAL NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS withdrawal_limits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL REFERENCES users(id),
    date TEXT NOT NULL,
    withdrawn_today REAL DEFAULT 0,
    UNIQUE(user_id, date)
  );
`);

// ══════════════════════════════════════
// Helpers
// ══════════════════════════════════════

/** Hash PIN with sha256 (lightweight, sufficient for PIN protection). */
export function hashPin(pin) {
  return crypto.createHash('sha256').update(String(pin)).digest('hex');
}

export function verifyPin(pin, hash) {
  return hashPin(pin) === hash;
}

function refCodeFromTelegramId(telegramId) {
  const num = parseInt(String(telegramId).replace(/\D/g, ''), 10) || 0;
  const s = num.toString(36).toUpperCase();
  return s.length >= 6 ? s.slice(0, 8) : s.padStart(6, 'X');
}

/** Generate a deterministic mock deposit address from user id + network seed. */
function generateDepositAddress(userId, network) {
  const seed = crypto.createHash('md5').update(`${userId}:${network}`).digest('hex');
  switch (network) {
    case 'TON': return `UQ${seed.slice(0, 46)}`;
    case 'BSC': return `0x${seed.slice(0, 40)}`;
    case 'TRC': return `T${seed.slice(0, 33)}`;
    case 'SOL': return seed.slice(0, 44);
    case 'BTC': return `bc1q${seed.slice(0, 38)}`;
    case 'ETH': return `0x${seed.slice(0, 40)}`;
    default: return `0x${seed.slice(0, 40)}`;
  }
}

// ══════════════════════════════════════
// User CRUD
// ══════════════════════════════════════

export function userExists(telegramId) {
  const row = db.prepare('SELECT 1 FROM users WHERE telegram_id = ?').get(String(telegramId));
  return !!row;
}

export function registerUser({ telegramId, username, firstName, pin, referredBy }) {
  const id = `tg_${telegramId}`;
  const refCode = refCodeFromTelegramId(telegramId);
  if (userExists(telegramId)) return null;

  const pinHash = hashPin(pin);

  db.prepare(`
    INSERT INTO users (id, telegram_id, username, first_name, ref_code, referred_by_ref_code, pin_hash, balance_usdt)
    VALUES (?, ?, ?, ?, ?, ?, ?, 0)
  `).run(id, String(telegramId), username || '', firstName || '', refCode, referredBy || null, pinHash);

  // Create wallets for all networks
  const networks = ['TON', 'BSC', 'TRC', 'SOL', 'BTC', 'ETH'];
  const insertWallet = db.prepare(`
    INSERT OR IGNORE INTO wallets (user_id, network, address, balance_usdt)
    VALUES (?, ?, ?, 0)
  `);
  for (const net of networks) {
    insertWallet.run(id, net, generateDepositAddress(id, net));
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);

  if (referredBy) {
    const referrer = db.prepare('SELECT id FROM users WHERE ref_code = ?').get(referredBy);
    if (referrer) {
      db.prepare('UPDATE users SET referral_count = referral_count + 1 WHERE id = ?').run(referrer.id);
    }
  }
  return { ...user, balance_usdt: user.balance_usdt ?? 0 };
}

export function findUserByTelegramId(telegramId) {
  const user = db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(String(telegramId));
  return user ? { ...user, balance_usdt: user.balance_usdt ?? 0 } : null;
}

export function updateLastActive(id) {
  db.prepare('UPDATE users SET last_active = datetime("now") WHERE id = ?').run(id);
}

// ══════════════════════════════════════
// Visitors
// ══════════════════════════════════════

export function upsertVisitor(telegramId, username, firstName) {
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  const id = String(telegramId);
  const existing = db.prepare('SELECT 1 FROM visitors WHERE telegram_id = ?').get(id);
  if (existing) {
    db.prepare('UPDATE visitors SET username = ?, first_name = ?, last_seen = ? WHERE telegram_id = ?')
      .run(username || '', firstName || '', now, id);
  } else {
    db.prepare('INSERT INTO visitors (telegram_id, username, first_name, first_seen, last_seen) VALUES (?, ?, ?, ?, ?)')
      .run(id, username || '', firstName || '', now, now);
  }
}

// ══════════════════════════════════════
// User listing (admin)
// ══════════════════════════════════════

function mapRowToAppUser(row, registered = true) {
  return {
    id: row.id || `visitor_${row.telegram_id}`,
    name: row.first_name || row.username || row.telegram_id || row.id,
    balance: row.balance_usdt ?? 0,
    isBanned: !!row.is_banned,
    registeredAt: row.created_at ? row.created_at.slice(0, 10) : (row.first_seen || '').slice(0, 10),
    totalDeposited: row.total_deposited ?? 0,
    totalWithdrawn: row.total_withdrawn ?? 0,
    referralCount: row.referral_count ?? 0,
    referralEarnings: row.referral_earnings ?? 0,
    lastActive: (row.last_active || row.last_seen || '').slice(0, 16).replace('T', ' '),
    botMode: row.bot_mode || 'balanced',
    notes: row.notes || '',
    vipStatus: !!row.is_vip,
    registered,
  };
}

export function listUsers() {
  const rows = db.prepare('SELECT * FROM users ORDER BY created_at DESC').all();
  return rows.map(row => mapRowToAppUser(row, true));
}

export function listAllPeople() {
  const users = listUsers();
  const registeredIds = new Set(db.prepare('SELECT telegram_id FROM users').all().map(r => r.telegram_id));
  const visitorRows = db.prepare('SELECT * FROM visitors ORDER BY last_seen DESC').all();
  const visitors = visitorRows
    .filter(r => !registeredIds.has(r.telegram_id))
    .map(row => mapRowToAppUser({
      id: `visitor_${row.telegram_id}`,
      telegram_id: row.telegram_id,
      first_name: row.first_name,
      username: row.username,
      first_seen: row.first_seen,
      last_seen: row.last_seen,
      last_active: row.last_seen,
      created_at: row.first_seen,
      balance_usdt: 0,
      is_banned: 0,
      is_vip: 0,
      total_deposited: 0,
      total_withdrawn: 0,
      referral_count: 0,
      referral_earnings: 0,
      bot_mode: 'balanced',
      notes: '',
    }, false));
  return [...users, ...visitors];
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

// ══════════════════════════════════════
// Wallet
// ══════════════════════════════════════

export function getWalletBalances(userId) {
  const rows = db.prepare('SELECT network, balance_usdt, address FROM wallets WHERE user_id = ?').all(userId);
  const balances = { TON: 0, BSC: 0, TRC: 0, SOL: 0, BTC: 0, ETH: 0 };
  const addresses = {};
  for (const r of rows) {
    balances[r.network] = r.balance_usdt ?? 0;
    addresses[r.network] = r.address;
  }
  const user = db.prepare('SELECT balance_usdt FROM users WHERE id = ?').get(userId);
  return {
    totalUsd: user?.balance_usdt ?? 0,
    balanceByNetwork: balances,
    addresses,
  };
}

export function getDepositAddress(userId, network) {
  const row = db.prepare('SELECT address FROM wallets WHERE user_id = ? AND network = ?').get(userId, network);
  if (row) return row.address;
  // Generate on the fly if not exists
  const addr = generateDepositAddress(userId, network);
  db.prepare('INSERT OR IGNORE INTO wallets (user_id, network, address, balance_usdt) VALUES (?, ?, ?, 0)')
    .run(userId, network, addr);
  return addr;
}

// ══════════════════════════════════════
// Withdrawal limits
// ══════════════════════════════════════

export function getWithdrawLimits(userId) {
  const today = new Date().toISOString().slice(0, 10);
  const row = db.prepare('SELECT withdrawn_today FROM withdrawal_limits WHERE user_id = ? AND date = ?').get(userId, today);
  const withdrawnToday = row?.withdrawn_today ?? 0;
  return {
    minAmount: 50,
    maxDailyAmount: 1000,
    remainingToday: Math.max(0, 1000 - withdrawnToday),
  };
}

// ══════════════════════════════════════
// Stats / Trades
// ══════════════════════════════════════

export function getTradeStats(userId) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);
  const monthStart = new Date();
  monthStart.setDate(monthStart.getDate() - 30);

  const fmt = (d) => d.toISOString().slice(0, 19).replace('T', ' ');

  const todayRows = db.prepare(
    'SELECT pnl_usd FROM trades WHERE user_id = ? AND executed_at >= ?'
  ).all(userId, fmt(todayStart));

  const weekRows = db.prepare(
    'SELECT pnl_usd FROM trades WHERE user_id = ? AND executed_at >= ?'
  ).all(userId, fmt(weekStart));

  const monthRows = db.prepare(
    'SELECT pnl_usd FROM trades WHERE user_id = ? AND executed_at >= ?'
  ).all(userId, fmt(monthStart));

  const allRows = db.prepare(
    'SELECT pnl_usd FROM trades WHERE user_id = ?'
  ).all(userId);

  const sum = (rows) => rows.reduce((a, r) => a + (r.pnl_usd ?? 0), 0);
  const profitCount = allRows.filter(r => r.pnl_usd > 0).length;

  return {
    today: { pnl: sum(todayRows), tradesCount: todayRows.length },
    week: { pnl: sum(weekRows), tradesCount: weekRows.length, days: 7 },
    month: { pnl: sum(monthRows), tradesCount: monthRows.length },
    performance: {
      winRate: allRows.length > 0 ? (profitCount / allRows.length) * 100 : 0,
      profitTrades: profitCount,
      totalTrades: allRows.length,
    },
  };
}

export function getRecentTrades(userId, limit = 50) {
  return db.prepare(
    'SELECT * FROM trades WHERE user_id = ? ORDER BY executed_at DESC LIMIT ?'
  ).all(userId, limit);
}

// ══════════════════════════════════════
// Settings
// ══════════════════════════════════════

export function getUserSettings(userId) {
  const row = db.prepare('SELECT id, bot_mode FROM users WHERE id = ?').get(userId);
  if (!row) return null;
  return {
    userId: row.id,
    botMode: row.bot_mode || 'balanced',
  };
}

export function updateBotMode(userId, mode) {
  if (!['safe', 'balanced', 'aggressive'].includes(mode)) return false;
  db.prepare('UPDATE users SET bot_mode = ? WHERE id = ?').run(mode, userId);
  return true;
}

export function changePin(userId, oldPin, newPin) {
  const user = db.prepare('SELECT pin_hash FROM users WHERE id = ?').get(userId);
  if (!user) return { success: false, error: 'not_found' };
  if (!verifyPin(oldPin, user.pin_hash)) return { success: false, error: 'wrong_pin' };
  if (String(newPin).length < 4 || String(newPin).length > 6) return { success: false, error: 'pin_length' };
  db.prepare('UPDATE users SET pin_hash = ? WHERE id = ?').run(hashPin(newPin), userId);
  return { success: true };
}
