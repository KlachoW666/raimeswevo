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
export { dbPath };

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
  
  CREATE TABLE IF NOT EXISTS pending_deposits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL REFERENCES users(id),
    network TEXT NOT NULL,
    memo_code TEXT NOT NULL,
    amount_expected REAL DEFAULT 0,
    status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(user_id, network, memo_code)
  );

  CREATE TABLE IF NOT EXISTS processed_txs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tx_hash TEXT UNIQUE NOT NULL,
    network TEXT NOT NULL,
    user_id TEXT NOT NULL REFERENCES users(id),
    amount REAL NOT NULL,
    processed_at TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_pending_deposits_network_status ON pending_deposits(network, status);
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
  CREATE INDEX IF NOT EXISTS idx_trades_user_executed ON trades(user_id, executed_at);
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

db.exec(`
  CREATE TABLE IF NOT EXISTS withdrawal_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL REFERENCES users(id),
    network TEXT NOT NULL,
    amount REAL NOT NULL,
    address TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT (datetime('now')),
    processed_at TEXT,
    UNIQUE(id)
  );
  CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_status ON withdrawal_requests(status);
  CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_user ON withdrawal_requests(user_id);
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS broadcasts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    admin_user_id TEXT NOT NULL,
    message TEXT NOT NULL,
    audience TEXT NOT NULL,
    recipient_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    sent_at TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_broadcasts_created ON broadcasts(created_at);
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS zyphex_exchanges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL REFERENCES users(id),
    amount_usdt REAL NOT NULL,
    amount_zyphex REAL NOT NULL,
    rate_used REAL NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_zyphex_exchanges_user ON zyphex_exchanges(user_id);
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS promo_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    amount_zyphex REAL NOT NULL,
    max_uses INTEGER NOT NULL,
    used_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON promo_codes(code);
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS promo_activations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL REFERENCES users(id),
    promo_id INTEGER NOT NULL REFERENCES promo_codes(id),
    amount_zyphex REAL NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(user_id, promo_id)
  );
  CREATE INDEX IF NOT EXISTS idx_promo_activations_user ON promo_activations(user_id);
`);

// Migration: add balance_zyphex to users if missing
const userCols = db.prepare('PRAGMA table_info(users)').all().map(r => r.name);
if (!userCols.includes('balance_zyphex')) {
  db.exec('ALTER TABLE users ADD COLUMN balance_zyphex REAL DEFAULT 0');
}

// Default ZYPHEX rate (1 USDT = 100 ZYPHEX) and total supply
db.prepare('INSERT OR IGNORE INTO app_settings (key, value) VALUES (?, ?)').run('zyphex_rate_per_usdt', '100');
db.prepare('INSERT OR IGNORE INTO app_settings (key, value) VALUES (?, ?)').run('zyphex_total_supply', '1000000');

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
    case 'TON': return process.env.ADMIN_WALLET_TON || `UQ${seed.slice(0, 46)}`;
    case 'BSC': return process.env.ADMIN_WALLET_BSC || `0x${seed.slice(0, 40)}`;
    case 'TRC': return process.env.ADMIN_WALLET_TRC || `T${seed.slice(0, 33)}`;
    case 'SOL': return process.env.ADMIN_WALLET_SOL || seed.slice(0, 44);
    case 'BTC': return process.env.ADMIN_WALLET_BTC || `bc1q${seed.slice(0, 38)}`;
    case 'BNB': return process.env.ADMIN_WALLET_BNB || `0x${seed.slice(0, 40)}`;
    case 'ETH': return process.env.ADMIN_WALLET_ETH || `0x${seed.slice(0, 40)}`;
    default: return `0x${seed.slice(0, 40)}`;
  }
}

/** Generate unique memo string to identify deposits from this user. */
export function getDepositMemo(userId, network) {
  const shortId = userId.replace('tg_', '').slice(0, 4);
  const hash = crypto.createHash('md5').update(`${userId}:${network}`).digest('hex').toUpperCase().slice(0, 6);
  return `DEP-${shortId}-${hash}`;
}

export function createPendingDeposit(userId, network) {
  const memo = getDepositMemo(userId, network);
  db.prepare('INSERT OR IGNORE INTO pending_deposits (user_id, network, memo_code) VALUES (?, ?, ?)')
    .run(userId, network, memo);
  return memo;
}

export function getPendingDepositStatus(userId, network) {
  const row = db.prepare('SELECT status FROM pending_deposits WHERE user_id = ? AND network = ? ORDER BY id DESC LIMIT 1')
    .get(userId, network);
  return row ? row.status : null;
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
  const referredByNormalized = referredBy ? String(referredBy).trim().toUpperCase() : null;

  db.prepare(`
    INSERT INTO users (id, telegram_id, username, first_name, ref_code, referred_by_ref_code, pin_hash, balance_usdt)
    VALUES (?, ?, ?, ?, ?, ?, ?, 0)
  `).run(id, String(telegramId), username || '', firstName || '', refCode, referredByNormalized, pinHash);

  // Create wallets for all networks
  const networks = ['TON', 'BSC', 'BNB', 'TRC', 'SOL', 'BTC', 'ETH'];
  const insertWallet = db.prepare(`
    INSERT OR IGNORE INTO wallets (user_id, network, address, balance_usdt)
    VALUES (?, ?, ?, 0)
  `);
  for (const net of networks) {
    insertWallet.run(id, net, generateDepositAddress(id, net));
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);

  if (referredByNormalized) {
    const referrer = db.prepare('SELECT id FROM users WHERE ref_code = ?').get(referredByNormalized);
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
  db.prepare(`UPDATE users SET last_active = datetime('now') WHERE id = ?`).run(id);
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
  // First check if user exists
  const existing = db.prepare('SELECT 1 FROM users WHERE id = ?').get(id);
  if (!existing) return null;

  // Key normalization: accept both frontend names and DB column names
  const keyMap = {
    balance: 'balance_usdt',
    balance_usdt: 'balance_usdt',
    isBanned: 'is_banned',
    is_banned: 'is_banned',
    vipStatus: 'is_vip',
    is_vip: 'is_vip',
    notes: 'notes',
    bot_mode: 'bot_mode',
    botMode: 'bot_mode',
  };
  const allowed = new Set(['balance_usdt', 'is_banned', 'is_vip', 'notes', 'bot_mode']);

  const updates = [];
  const values = [];
  for (const [k, v] of Object.entries(patch)) {
    const col = keyMap[k];
    if (!col || !allowed.has(col)) continue;
    updates.push(`${col} = ?`);
    values.push(v === true ? 1 : v === false ? 0 : v);
  }
  if (updates.length === 0) return getUserById(id); // nothing to update but user exists
  values.push(id);
  db.prepare(`UPDATE users SET ${updates.join(', ')}, last_active = datetime('now') WHERE id = ?`).run(...values);
  return getUserById(id);
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
    registered: true,
  };
}

export function addBonusToUser(id, amount) {
  const u = db.prepare('SELECT balance_usdt FROM users WHERE id = ?').get(id);
  if (!u) return null;
  const newBalance = (u.balance_usdt ?? 0) + amount;
  db.prepare(`UPDATE users SET balance_usdt = ?, last_active = datetime('now') WHERE id = ?`).run(newBalance, id);
  return getUserById(id);
}

export function resetUserBalance(id) {
  db.prepare(`UPDATE users SET balance_usdt = 0, last_active = datetime('now') WHERE id = ?`).run(id);
  return getUserById(id);
}

export function getReferralInfo(userId) {
  const row = db.prepare('SELECT ref_code, referral_count, referral_earnings FROM users WHERE id = ?').get(userId);
  return row;
}

// ══════════════════════════════════════
// ZYPHEX exchange
// ══════════════════════════════════════

export const ZYPHEX_TOTAL_SUPPLY_DEFAULT = 1_000_000;
const ZYPHEX_RATE_KEY = 'zyphex_rate_per_usdt';
const ZYPHEX_SUPPLY_KEY = 'zyphex_total_supply';
const MIN_EXCHANGE_USDT = 1;

export function getTotalZyphexSold() {
  const row = db.prepare('SELECT COALESCE(SUM(amount_zyphex), 0) AS total FROM zyphex_exchanges').get();
  return Number(row?.total) || 0;
}

export function getZyphexTotalSupply() {
  const row = db.prepare('SELECT value FROM app_settings WHERE key = ?').get(ZYPHEX_SUPPLY_KEY);
  const val = row ? parseFloat(row.value) : ZYPHEX_TOTAL_SUPPLY_DEFAULT;
  const n = Number.isFinite(val) && val >= 0 ? Math.floor(val) : ZYPHEX_TOTAL_SUPPLY_DEFAULT;
  return n;
}

export function setZyphexTotalSupply(supply) {
  const n = Number(supply);
  if (!Number.isFinite(n) || n < 0) return false;
  const total = Math.floor(n);
  db.prepare('INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
    .run(ZYPHEX_SUPPLY_KEY, String(total));
  return true;
}

export function getZyphexRemaining() {
  const sold = getTotalZyphexSold();
  const total = getZyphexTotalSupply();
  return Math.max(0, total - sold);
}

export function getZyphexRate() {
  const row = db.prepare('SELECT value FROM app_settings WHERE key = ?').get(ZYPHEX_RATE_KEY);
  const initialRate = row ? parseFloat(row.value) : 100;
  const baseRate = Number.isFinite(initialRate) ? initialRate : 100;
  const remaining = getZyphexRemaining();
  const total = getZyphexTotalSupply();
  if (remaining <= 0 || total <= 0) return 0;
  const rate = baseRate * (remaining / total);
  return rate;
}

export function setZyphexRate(rate) {
  const r = Number(rate);
  if (!Number.isFinite(r) || r <= 0) return false;
  db.prepare('INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
    .run(ZYPHEX_RATE_KEY, String(r));
  return true;
}

function isFiniteNumber(x) {
  return typeof x === 'number' && Number.isFinite(x) && x >= 0 && x !== Infinity;
}

export function exchangeUsdtToZyphex(userId, amountUsdt) {
  const amount = parseFloat(amountUsdt);
  if (!Number.isFinite(amount) || amount < MIN_EXCHANGE_USDT) return { error: 'invalid_amount' };
  if (typeof userId !== 'string' || !userId.trim()) return { error: 'user_not_found' };
  const user = db.prepare('SELECT balance_usdt, balance_zyphex FROM users WHERE id = ?').get(userId);
  if (!user) return { error: 'user_not_found' };
  const balanceUsdt = Number(user.balance_usdt) || 0;
  if (balanceUsdt < amount) return { error: 'insufficient_balance' };
  const rate = getZyphexRate();
  if (!Number.isFinite(rate) || rate <= 0) return { error: 'supply_exhausted' };
  const remaining = getZyphexRemaining();
  const wantedZyphex = amount * rate;
  const amountZyphex = Math.min(wantedZyphex, remaining);
  const amountZyphexRounded = Math.round(amountZyphex * 1000) / 1000;
  if (amountZyphexRounded <= 0) return { error: 'supply_exhausted' };
  const amountUsdtToCharge = amountZyphexRounded / rate;
  const newBalanceUsdt = Math.round((balanceUsdt - amountUsdtToCharge) * 100) / 100;
  const newBalanceZyphex = Math.round(((Number(user.balance_zyphex) || 0) + amountZyphexRounded) * 1000) / 1000;
  if (!isFiniteNumber(amountUsdtToCharge) || !isFiniteNumber(amountZyphexRounded) || !isFiniteNumber(newBalanceUsdt) || !isFiniteNumber(newBalanceZyphex)) {
    return { error: 'invalid_amount' };
  }
  const rateToSave = Number.isFinite(rate) ? rate : 0;
  const updateUsers = db.prepare(`UPDATE users SET balance_usdt = ?, balance_zyphex = ?, last_active = datetime('now') WHERE id = ?`);
  const insertExchange = db.prepare('INSERT INTO zyphex_exchanges (user_id, amount_usdt, amount_zyphex, rate_used) VALUES (?, ?, ?, ?)');
  const runExchange = db.transaction(() => {
    updateUsers.run(newBalanceUsdt, newBalanceZyphex, userId);
    insertExchange.run(userId, amountUsdtToCharge, amountZyphexRounded, rateToSave);
  });
  runExchange();
  return { newBalanceUsdt, newBalanceZyphex, amountZyphex: amountZyphexRounded };
}

export function getUserZyphexBalance(userId) {
  const user = db.prepare('SELECT balance_zyphex FROM users WHERE id = ?').get(userId);
  if (!user) return null;
  const balanceZyphex = user.balance_zyphex ?? 0;
  const history = db.prepare(
    'SELECT amount_usdt, amount_zyphex, rate_used, created_at FROM zyphex_exchanges WHERE user_id = ? ORDER BY created_at DESC LIMIT 20'
  ).all(userId);
  const totals = db.prepare(
    'SELECT COALESCE(SUM(amount_usdt), 0) AS total_usdt, COALESCE(SUM(amount_zyphex), 0) AS total_zyphex FROM zyphex_exchanges WHERE user_id = ?'
  ).get(userId);
  return {
    balanceZyphex,
    totalExchangedUsdt: totals?.total_usdt ?? 0,
    totalExchangedZyphex: totals?.total_zyphex ?? 0,
    history: history.map(r => ({
      amountUsdt: r.amount_usdt,
      amountZyphex: r.amount_zyphex,
      rateUsed: r.rate_used,
      createdAt: r.created_at,
    })),
  };
}

export function getZyphexExportList() {
  const users = db.prepare(`
    SELECT u.id AS user_id, u.telegram_id, u.first_name, u.username, u.balance_zyphex,
      (SELECT COALESCE(SUM(amount_usdt), 0) FROM zyphex_exchanges WHERE user_id = u.id) AS total_exchanged_usdt,
      (SELECT COALESCE(SUM(amount_zyphex), 0) FROM zyphex_exchanges WHERE user_id = u.id) AS total_exchanged_zyphex
    FROM users u
    WHERE (u.balance_zyphex IS NOT NULL AND u.balance_zyphex > 0)
       OR EXISTS (SELECT 1 FROM zyphex_exchanges WHERE user_id = u.id)
    ORDER BY u.balance_zyphex DESC
  `).all();
  return users.map(r => ({
    userId: r.user_id,
    telegramId: r.telegram_id,
    name: r.first_name || r.username || r.telegram_id || r.user_id,
    balanceZyphex: r.balance_zyphex ?? 0,
    totalExchangedUsdt: r.total_exchanged_usdt ?? 0,
    totalExchangedZyphex: r.total_exchanged_zyphex ?? 0,
  }));
}

// ══════════════════════════════════════
// Promo codes
// ══════════════════════════════════════

export function createPromoCode(code, amountZyphex, maxUses) {
  const normalized = String(code).trim().toUpperCase();
  if (!normalized) return { error: 'invalid_code' };
  const amount = parseFloat(amountZyphex);
  const max = parseInt(maxUses, 10);
  if (!Number.isFinite(amount) || amount <= 0 || !Number.isFinite(max) || max < 1) return { error: 'invalid_params' };
  try {
    db.prepare(
      'INSERT INTO promo_codes (code, amount_zyphex, max_uses) VALUES (?, ?, ?)'
    ).run(normalized, amount, max);
    const row = db.prepare('SELECT id, code, amount_zyphex, max_uses, used_count, created_at FROM promo_codes WHERE code = ?').get(normalized);
    return {
      promo: {
        id: row.id,
        code: row.code,
        amountZyphex: row.amount_zyphex,
        maxUses: row.max_uses,
        usedCount: row.used_count ?? 0,
        createdAt: row.created_at,
      },
    };
  } catch (e) {
    if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') return { error: 'code_exists' };
    throw e;
  }
}

export function listPromoCodes() {
  const rows = db.prepare(
    'SELECT id, code, amount_zyphex, max_uses, used_count, created_at FROM promo_codes ORDER BY created_at DESC'
  ).all();
  return rows.map(r => ({
    id: r.id,
    code: r.code,
    amountZyphex: r.amount_zyphex,
    maxUses: r.max_uses,
    usedCount: r.used_count ?? 0,
    createdAt: r.created_at,
  }));
}

export function activatePromo(userId, code) {
  if (typeof userId !== 'string' || !userId.trim()) return { error: 'user_not_found' };
  const user = db.prepare('SELECT id, balance_zyphex FROM users WHERE id = ?').get(userId);
  if (!user) return { error: 'user_not_found' };
  const normalized = String(code).trim().toUpperCase();
  if (!normalized) return { error: 'invalid_code' };
  const promo = db.prepare('SELECT id, code, amount_zyphex, max_uses, used_count FROM promo_codes WHERE code = ?').get(normalized);
  if (!promo) return { error: 'invalid_code' };
  const usedCount = promo.used_count ?? 0;
  if (usedCount >= promo.max_uses) return { error: 'no_uses_left' };
  const existing = db.prepare('SELECT 1 FROM promo_activations WHERE user_id = ? AND promo_id = ?').get(userId, promo.id);
  if (existing) return { error: 'already_used' };
  const remaining = getZyphexRemaining();
  const amountZyphex = Number(promo.amount_zyphex) || 0;
  if (amountZyphex <= 0 || remaining < amountZyphex) return { error: 'supply_exhausted' };
  const amountRounded = Math.round(amountZyphex * 1000) / 1000;
  const newBalanceZyphex = Math.round(((Number(user.balance_zyphex) || 0) + amountRounded) * 1000) / 1000;
  const updateUser = db.prepare('UPDATE users SET balance_zyphex = ?, last_active = datetime(\'now\') WHERE id = ?');
  const insertActivation = db.prepare('INSERT INTO promo_activations (user_id, promo_id, amount_zyphex) VALUES (?, ?, ?)');
  const updatePromoUsed = db.prepare('UPDATE promo_codes SET used_count = used_count + 1 WHERE id = ?');
  const insertExchange = db.prepare('INSERT INTO zyphex_exchanges (user_id, amount_usdt, amount_zyphex, rate_used) VALUES (?, ?, ?, ?)');
  const run = db.transaction(() => {
    updateUser.run(newBalanceZyphex, userId);
    insertActivation.run(userId, promo.id, amountRounded);
    updatePromoUsed.run(promo.id);
    insertExchange.run(userId, 0, amountRounded, 0);
  });
  run();
  return { success: true, amountZyphex: amountRounded, newBalanceZyphex };
}

// ══════════════════════════════════════
// Wallet
// ══════════════════════════════════════

export function getWalletBalances(userId) {
  const rows = db.prepare('SELECT network, balance_usdt, address FROM wallets WHERE user_id = ?').all(userId);
  const balances = { TON: 0, BSC: 0, BNB: 0, TRC: 0, SOL: 0, BTC: 0, ETH: 0 };
  const addresses = {};
  let walletTotal = 0;
  for (const r of rows) {
    balances[r.network] = r.balance_usdt ?? 0;
    walletTotal += r.balance_usdt ?? 0;
    addresses[r.network] = r.address;
  }
  const user = db.prepare('SELECT balance_usdt, total_deposited FROM users WHERE id = ?').get(userId);
  const totalUsd = user?.balance_usdt ?? 0;
  const totalDeposited = user?.total_deposited ?? 0;

  // If user has balance but wallets are empty (e.g. admin-set balance),
  // distribute evenly across networks so the wallet page shows real numbers
  if (totalUsd > 0 && walletTotal === 0) {
    const networks = Object.keys(balances);
    const perNetwork = Math.round((totalUsd / networks.length) * 100) / 100;
    for (const net of networks) {
      balances[net] = perNetwork;
    }
    // Also update wallet rows in DB so it persists
    const upsert = db.prepare(`
      INSERT INTO wallets (user_id, network, address, balance_usdt)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(user_id, network) DO UPDATE SET balance_usdt = excluded.balance_usdt
    `);
    for (const net of networks) {
      upsert.run(userId, net, addresses[net] || generateDepositAddress(userId, net), perNetwork);
    }
  }

  return {
    totalUsd,
    totalDeposited,
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

// Withdrawal requests: create (deduct balance, record request, update daily limit)
export function createWithdrawalRequest(userId, network, amount, address) {
  const user = db.prepare('SELECT balance_usdt FROM users WHERE id = ?').get(userId);
  if (!user) return { error: 'user_not_found' };
  const balance = user.balance_usdt ?? 0;
  if (balance < amount) return { error: 'insufficient_balance' };
  const limits = getWithdrawLimits(userId);
  if (amount < limits.minAmount) return { error: 'below_min' };
  if (amount > limits.remainingToday) return { error: 'daily_limit_exceeded' };

  const today = new Date().toISOString().slice(0, 10);
  const newBalance = Math.round((balance - amount) * 100) / 100;
  const run = db.transaction(() => {
    db.prepare(`UPDATE users SET balance_usdt = ?, last_active = datetime('now') WHERE id = ?`).run(newBalance, userId);
    db.prepare(`
      INSERT INTO withdrawal_limits (user_id, date, withdrawn_today) VALUES (?, ?, ?)
      ON CONFLICT(user_id, date) DO UPDATE SET withdrawn_today = withdrawn_today + excluded.withdrawn_today
    `).run(userId, today, amount);
    const r = db.prepare(
      `INSERT INTO withdrawal_requests (user_id, network, amount, address, status) VALUES (?, ?, ?, ?, 'pending')`
    ).run(userId, network, amount, address);
    return { id: r.lastInsertRowid, newBalance };
  });
  return run;
}

export function getWithdrawalRequests(statusFilter = null) {
  const rows = statusFilter
    ? db.prepare('SELECT id, user_id, network, amount, address, status, created_at, processed_at FROM withdrawal_requests WHERE status = ? ORDER BY created_at DESC LIMIT 500').all(statusFilter)
    : db.prepare('SELECT id, user_id, network, amount, address, status, created_at, processed_at FROM withdrawal_requests ORDER BY created_at DESC LIMIT 500').all();
  return rows.map(r => ({
    id: String(r.id),
    userId: r.user_id,
    network: r.network,
    amount: r.amount,
    address: r.address,
    status: r.status,
    createdAt: r.created_at,
    processedAt: r.processed_at || null,
  }));
}

/** Returns withdrawal requests with userName in a single query (avoids N+1). */
export function getWithdrawalRequestsEnriched(statusFilter = null) {
  const stmt = db.prepare(`
    SELECT wr.id, wr.user_id, wr.network, wr.amount, wr.address, wr.status, wr.created_at, wr.processed_at,
           COALESCE(u.first_name, u.username, u.telegram_id, u.id) AS user_name
    FROM withdrawal_requests wr
    LEFT JOIN users u ON u.id = wr.user_id
    WHERE (? IS NULL OR wr.status = ?)
    ORDER BY wr.created_at DESC
    LIMIT 500
  `);
  const rows = stmt.all(statusFilter, statusFilter);
  return rows.map(r => ({
    id: String(r.id),
    userId: r.user_id,
    network: r.network,
    amount: r.amount,
    address: r.address,
    status: r.status,
    createdAt: r.created_at,
    processedAt: r.processed_at || null,
    userName: r.user_name || r.user_id,
  }));
}

export function getWithdrawalRequestById(id) {
  const r = db.prepare('SELECT * FROM withdrawal_requests WHERE id = ?').get(id);
  return r || null;
}

export function updateWithdrawalRequestStatus(id, status) {
  const row = db.prepare('SELECT user_id, amount, status FROM withdrawal_requests WHERE id = ?').get(id);
  if (!row || row.status !== 'pending') return null;
  if (status === 'rejected') {
    const today = new Date().toISOString().slice(0, 10);
    db.transaction(() => {
      db.prepare(`UPDATE withdrawal_requests SET status = 'rejected', processed_at = datetime('now') WHERE id = ?`).run(id);
      const u = db.prepare('SELECT balance_usdt FROM users WHERE id = ?').get(row.user_id);
      const newBalance = (u?.balance_usdt ?? 0) + row.amount;
      db.prepare(`UPDATE users SET balance_usdt = ?, last_active = datetime('now') WHERE id = ?`).run(newBalance, row.user_id);
      const lim = db.prepare('SELECT withdrawn_today FROM withdrawal_limits WHERE user_id = ? AND date = ?').get(row.user_id, today);
      if (lim) {
        const newWithdrawn = Math.max(0, (lim.withdrawn_today ?? 0) - row.amount);
        db.prepare(`UPDATE withdrawal_limits SET withdrawn_today = ? WHERE user_id = ? AND date = ?`).run(newWithdrawn, row.user_id, today);
      }
    })();
  } else if (status === 'approved') {
    db.prepare(`UPDATE withdrawal_requests SET status = 'approved', processed_at = datetime('now') WHERE id = ?`).run(id);
  }
  return getWithdrawalRequestById(id);
}

// Broadcasts (save to DB; sending via Telegram is in server)
export function createBroadcast(adminUserId, message, audience, recipientCount) {
  const r = db.prepare(
    'INSERT INTO broadcasts (admin_user_id, message, audience, recipient_count) VALUES (?, ?, ?, ?)'
  ).run(adminUserId, message, audience, recipientCount);
  return { id: r.lastInsertRowid };
}

export function listBroadcasts(limit = 50) {
  const rows = db.prepare(
    'SELECT id, admin_user_id, message, audience, recipient_count, created_at, sent_at FROM broadcasts ORDER BY created_at DESC LIMIT ?'
  ).all(limit);
  return rows.map(r => ({
    id: String(r.id),
    adminUserId: r.admin_user_id,
    text: r.message,
    audience: r.audience,
    recipientCount: r.recipient_count ?? 0,
    sentAt: r.sent_at ? r.sent_at.slice(0, 16).replace('T', ' ') : r.created_at?.slice(0, 16).replace('T', ' '),
    createdAt: r.created_at,
  }));
}

export function getBroadcastById(id) {
  const r = db.prepare('SELECT * FROM broadcasts WHERE id = ?').get(id);
  return r || null;
}

export function markBroadcastSent(id) {
  db.prepare(`UPDATE broadcasts SET sent_at = datetime('now') WHERE id = ?`).run(id);
}

export function getTelegramIdsForAudience(audience) {
  if (audience === 'all') {
    return db.prepare('SELECT telegram_id FROM users WHERE is_banned = 0 AND telegram_id IS NOT NULL AND telegram_id != ""').all().map(r => r.telegram_id);
  }
  if (audience === 'with_balance') {
    return db.prepare('SELECT telegram_id FROM users WHERE is_banned = 0 AND (balance_usdt IS NULL OR balance_usdt > 0) AND telegram_id IS NOT NULL AND telegram_id != ""').all().map(r => r.telegram_id);
  }
  if (audience === 'vip') {
    return db.prepare('SELECT telegram_id FROM users WHERE is_banned = 0 AND is_vip = 1 AND telegram_id IS NOT NULL AND telegram_id != ""').all().map(r => r.telegram_id);
  }
  return [];
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
