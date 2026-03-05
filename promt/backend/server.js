import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { mkdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import {
  userExists,
  registerUser,
  findUserByTelegramId,
  updateLastActive,
  listAllPeople,
  updateUser,
  getUserById,
  addBonusToUser,
  resetUserBalance,
  getReferralInfo,
  upsertVisitor,
  verifyPin,
  getWalletBalances,
  getDepositAddress,
  getWithdrawLimits,
  createWithdrawalRequest,
  getWithdrawalRequests,
  updateWithdrawalRequestStatus,
  createBroadcast,
  listBroadcasts,
  getBroadcastById,
  markBroadcastSent,
  getTelegramIdsForAudience,
  getTradeStats,
  getRecentTrades,
  getUserSettings,
  updateBotMode,
  changePin,
  createPendingDeposit,
  getPendingDepositStatus,
  getZyphexRate,
  setZyphexRate,
  exchangeUsdtToZyphex,
  getUserZyphexBalance,
  getZyphexExportList,
  getZyphexRemaining,
  getTotalZyphexSold,
  getZyphexTotalSupply,
  setZyphexTotalSupply,
  dbPath,
} from './db.js';
import { startMonitoring } from './depositMonitor.js';
import axios from 'axios';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, 'data');
if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });

const app = express();
app.use(cors());
app.use(express.json());

const ADMIN_IDS = (process.env.ADMIN_IDS || '6976131338,5595447569').split(',').map(s => s.trim());
const isAdmin = (userId) => {
  const id = String(userId).replace(/^tg_/, '');
  return ADMIN_IDS.includes(id) || ADMIN_IDS.includes(userId);
};

// Health check (for Nginx / pm2; no auth)
app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

// ══════════════════════════════════════
// Visitors
// ══════════════════════════════════════

app.post('/api/visitors/sync', (req, res) => {
  try {
    const { telegramId, username, firstName } = req.body;
    if (!telegramId) return res.status(400).json({ error: 'telegramId required' });
    upsertVisitor(String(telegramId), username || '', firstName || '');
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'server_error' });
  }
});

// ══════════════════════════════════════
// Auth
// ══════════════════════════════════════

app.get('/api/auth/check', (req, res) => {
  try {
    const telegramId = req.query.telegramId;
    if (!telegramId) return res.status(400).json({ error: 'telegramId required' });
    res.json({ exists: userExists(telegramId) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'server_error' });
  }
});

app.post('/api/auth/register', (req, res) => {
  try {
    const { pin, confirmPin, telegramId, username, firstName, referredBy } = req.body;
    if (!pin || !confirmPin || !telegramId) {
      return res.status(400).json({ success: false, error: 'pin, confirmPin and telegramId required' });
    }
    if (String(pin) !== String(confirmPin)) {
      return res.status(400).json({ success: false, error: 'pin_mismatch' });
    }
    if (String(pin).length < 4 || String(pin).length > 6) {
      return res.status(400).json({ success: false, error: 'pin_length' });
    }
    if (userExists(telegramId)) {
      return res.status(400).json({ success: false, error: 'already_registered' });
    }
    const user = registerUser({
      telegramId: String(telegramId),
      username: username || null,
      firstName: firstName || null,
      pin: String(pin),
      referredBy: referredBy || null,
    });
    if (!user) return res.status(400).json({ success: false, error: 'already_registered' });
    res.json({
      success: true,
      user: {
        id: user.id,
        userId: user.id,
        refCode: user.ref_code,
        balanceUsdt: user.balance_usdt ?? 0,
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: 'server_error' });
  }
});

app.post('/api/auth/login', (req, res) => {
  try {
    const { pin, telegramId } = req.body;
    if (!pin || !telegramId) {
      return res.status(400).json({ success: false, error: 'pin and telegramId required' });
    }
    const user = findUserByTelegramId(telegramId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'not_registered' });
    }
    if (!verifyPin(pin, user.pin_hash)) {
      return res.status(401).json({ success: false, error: 'wrong_pin' });
    }
    updateLastActive(user.id);
    res.json({
      success: true,
      user: {
        id: user.id,
        userId: user.id,
        refCode: user.ref_code,
        balanceUsdt: user.balance_usdt ?? 0,
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: 'server_error' });
  }
});

app.post('/api/auth/logout', (_req, res) => {
  res.json({ ok: true });
});

// ══════════════════════════════════════
// Wallet
// ══════════════════════════════════════

const BASE_DAILY_PERCENT = 3;
const REFERRAL_BONUS_PERCENT_PER_USER = 0.02;

app.get('/api/wallet/balance', (req, res) => {
  try {
    const userId = req.query.userId;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    const data = getWalletBalances(userId);
    const refInfo = getReferralInfo(userId);
    const referralCount = refInfo?.referral_count ?? 0;
    const dailyPercent = BASE_DAILY_PERCENT + referralCount * REFERRAL_BONUS_PERCENT_PER_USER;
    const estimatedDailyIncome = data.totalUsd * (dailyPercent / 100);
    const limits = getWithdrawLimits(userId);
    res.json({
      totalUsd: data.totalUsd,
      totalDeposited: data.totalDeposited,
      estimatedDailyIncome,
      estimatedDailyPercent: dailyPercent,
      referralCount,
      balanceByNetwork: data.balanceByNetwork,
      withdrawLimits: { minAmount: limits.minAmount, maxDailyAmount: limits.maxDailyAmount, remainingToday: limits.remainingToday },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'server_error' });
  }
});

app.get('/api/wallet/deposit-address', (req, res) => {
  try {
    const { userId, network } = req.query;
    if (!userId || !network) return res.status(400).json({ error: 'userId and network required' });
    const address = getDepositAddress(userId, network);
    const memo = createPendingDeposit(userId, network);
    const networkNames = {
      TON: 'THE OPEN NETWORK', BSC: 'BNB SMART CHAIN', BNB: 'BINANCE COIN', TRC: 'TRON',
      SOL: 'SOLANA', BTC: 'BITCOIN', ETH: 'ETHEREUM',
    };
    res.json({
      address,
      memo,
      network,
      networkFullName: networkNames[network] || network,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'server_error' });
  }
});

app.get('/api/wallet/deposit-status', (req, res) => {
  try {
    const { userId, network } = req.query;
    if (!userId || !network) return res.status(400).json({ error: 'userId and network required' });
    const status = getPendingDepositStatus(userId, network);
    res.json({ status: status || 'none' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'server_error' });
  }
});

app.get('/api/wallet/withdraw-limits', (req, res) => {
  try {
    const userId = req.query.userId;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    res.json(getWithdrawLimits(userId));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'server_error' });
  }
});

// Save current balance from frontend to DB (called periodically by trade engine)
app.post('/api/wallet/sync-balance', (req, res) => {
  try {
    const { userId, totalUsd } = req.body;
    if (!userId || totalUsd == null) return res.status(400).json({ error: 'userId and totalUsd required' });
    const updated = updateUser(userId, { balance: totalUsd });
    if (!updated) return res.status(404).json({ error: 'user_not_found' });
    res.json({ ok: true, balance: updated.balance });
  } catch (e) {
    console.error('[POST /api/wallet/sync-balance]', e);
    res.status(500).json({ error: 'server_error' });
  }
});

app.post('/api/wallet/withdraw', (req, res) => {
  try {
    const { userId, network, amount, address } = req.body;
    if (!userId || !network || !amount || !address) {
      return res.status(400).json({ error: 'userId, network, amount, address required' });
    }
    const numAmount = Number(amount);
    if (!Number.isFinite(numAmount) || numAmount <= 0) {
      return res.status(400).json({ error: 'invalid_amount' });
    }
    const result = createWithdrawalRequest(userId, network, numAmount, String(address).trim());
    if (result.error) {
      const status = result.error === 'insufficient_balance' ? 400 : result.error === 'user_not_found' ? 404 : 400;
      const msg = result.error === 'below_min' ? 'Минимальная сумма вывода $50' : result.error === 'daily_limit_exceeded' ? 'Превышен дневной лимит' : result.error;
      return res.status(status).json({ error: msg });
    }
    res.json({
      transactionId: `tx_${result.id}`,
      status: 'pending',
      estimatedTime: '10-30 min',
      newBalance: result.newBalance,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'server_error' });
  }
});

// ══════════════════════════════════════
// Trades / Stats
// ══════════════════════════════════════

app.get('/api/trades/recent', (req, res) => {
  try {
    const userId = req.query.userId;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    const trades = getRecentTrades(userId);
    res.json({ trades });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'server_error' });
  }
});

app.get('/api/stats/pnl', (req, res) => {
  try {
    const userId = req.query.userId;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    const stats = getTradeStats(userId);
    res.json(stats);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'server_error' });
  }
});

// ══════════════════════════════════════
// Referrals
// ══════════════════════════════════════

app.get('/api/referral/info', (req, res) => {
  try {
    const userId = req.query.userId;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    const u = getReferralInfo(userId);
    if (!u) return res.status(404).json({ error: 'not_found' });
    res.json({
      refCode: u.ref_code,
      invitedCount: u.referral_count ?? 0,
      totalEarned: u.referral_earnings ?? 0,
      refLink: `https://t.me/${process.env.BOT_USERNAME || 'ZYPHEXAUTOTRAIDINGBOT'}/app?startapp=${u.ref_code}`,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'server_error' });
  }
});

// ══════════════════════════════════════
// ZYPHEX (user)
// ══════════════════════════════════════

app.get('/api/zyphex/rate', (req, res) => {
  try {
    const rate = getZyphexRate();
    const remaining = getZyphexRemaining();
    const sold = getTotalZyphexSold();
    res.json({ rate, remaining, totalSupply: getZyphexTotalSupply(), sold });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'server_error' });
  }
});

app.get('/api/zyphex/balance', (req, res) => {
  try {
    const userId = req.query.userId;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    const data = getUserZyphexBalance(userId);
    if (!data) return res.status(404).json({ error: 'not_found' });
    res.json(data);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'server_error' });
  }
});

app.post('/api/zyphex/exchange', (req, res) => {
  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const userId = body.userId;
    const amountUsdt = body.amountUsdt;
    if (!userId || amountUsdt == null) return res.status(400).json({ error: 'userId and amountUsdt required' });
    const result = exchangeUsdtToZyphex(userId, amountUsdt);
    if (result.error) {
      const status = result.error === 'insufficient_balance' || result.error === 'supply_exhausted' ? 400 : result.error === 'user_not_found' ? 404 : 400;
      return res.status(status).json({ error: result.error });
    }
    res.json(result);
  } catch (e) {
    const msg = e?.message || String(e);
    console.error('[zyphex/exchange]', msg);
    if (e?.stack) console.error(e.stack);
    const isProd = process.env.NODE_ENV === 'production';
    res.status(500).json({ error: 'server_error', ...(isProd ? {} : { detail: msg }) });
  }
});

// ══════════════════════════════════════
// Settings
// ══════════════════════════════════════

app.get('/api/settings', (req, res) => {
  try {
    const userId = req.query.userId;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    const settings = getUserSettings(userId);
    if (!settings) return res.status(404).json({ error: 'not_found' });
    res.json(settings);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'server_error' });
  }
});

app.put('/api/settings/bot-mode', (req, res) => {
  try {
    const { userId, mode } = req.body;
    if (!userId || !mode) return res.status(400).json({ error: 'userId and mode required' });
    const ok = updateBotMode(userId, mode);
    if (!ok) return res.status(400).json({ error: 'invalid_mode' });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'server_error' });
  }
});

app.post('/api/settings/change-pin', (req, res) => {
  try {
    const { userId, oldPin, newPin, confirmNewPin } = req.body;
    if (!userId || !oldPin || !newPin || !confirmNewPin) {
      return res.status(400).json({ success: false, error: 'all fields required' });
    }
    if (newPin !== confirmNewPin) {
      return res.status(400).json({ success: false, error: 'pin_mismatch' });
    }
    const result = changePin(userId, oldPin, newPin);
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: 'server_error' });
  }
});

app.post('/api/settings/reset-balance', (req, res) => {
  try {
    const { userId, confirmPin } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    const user = findUserByTelegramId(userId.replace(/^tg_/, ''));
    if (user && confirmPin && !verifyPin(confirmPin, user.pin_hash)) {
      return res.status(401).json({ error: 'wrong_pin' });
    }
    resetUserBalance(userId);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'server_error' });
  }
});

// ══════════════════════════════════════
// Admin
// ══════════════════════════════════════

app.get('/api/users', (req, res) => {
  try {
    const userId = req.query.userId || req.headers['x-user-id'];
    if (!userId || !isAdmin(userId)) {
      return res.status(403).json({ error: 'forbidden' });
    }
    const users = listAllPeople();
    res.json({ users });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'server_error' });
  }
});

app.patch('/api/users/:id', (req, res) => {
  try {
    const adminUserId = req.query.userId || req.headers['x-user-id'];
    if (!adminUserId || !isAdmin(adminUserId)) {
      return res.status(403).json({ error: 'forbidden', message: 'Нет прав администратора' });
    }
    const { id } = req.params;
    if (id.startsWith('visitor_')) {
      return res.status(400).json({ error: 'cannot_edit_visitor', message: 'Действия доступны только для зарегистрированных пользователей' });
    }
    // Only extract known fields to prevent unexpected data
    const body = req.body || {};
    const safePatch = {};
    if (typeof body.balance === 'number') safePatch.balance = body.balance;
    if (typeof body.isBanned === 'boolean') safePatch.isBanned = body.isBanned;
    if (typeof body.vipStatus === 'boolean') safePatch.vipStatus = body.vipStatus;
    if (typeof body.notes === 'string') safePatch.notes = body.notes;
    if (typeof body.botMode === 'string') safePatch.botMode = body.botMode;
    const updated = updateUser(id, safePatch);
    if (!updated) return res.status(404).json({ error: 'not_found', message: 'Пользователь не найден в базе данных' });
    res.json({ user: updated });
  } catch (e) {
    console.error('[PATCH /api/users/:id]', req.params.id, req.body, e);
    res.status(500).json({ error: 'server_error', message: `Ошибка сервера: ${e.message || e}` });
  }
});

app.post('/api/users/:id/bonus', (req, res) => {
  try {
    const adminUserId = req.query.userId || req.headers['x-user-id'];
    if (!adminUserId || !isAdmin(adminUserId)) {
      return res.status(403).json({ error: 'forbidden' });
    }
    if (req.params.id.startsWith('visitor_')) {
      return res.status(400).json({ error: 'cannot_edit_visitor', message: 'Бонус доступен только зарегистрированным' });
    }
    const amount = Number(req.body.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ error: 'invalid_amount' });
    }
    const user = addBonusToUser(req.params.id, amount);
    if (!user) return res.status(404).json({ error: 'not_found', message: 'Пользователь не найден' });
    res.json({ user });
  } catch (e) {
    console.error('[POST /api/users/:id/bonus]', e);
    res.status(500).json({ error: 'server_error', message: String(e.message || e) });
  }
});

app.post('/api/users/:id/reset-balance', (req, res) => {
  try {
    const adminUserId = req.query.userId || req.headers['x-user-id'];
    if (!adminUserId || !isAdmin(adminUserId)) {
      return res.status(403).json({ error: 'forbidden' });
    }
    if (req.params.id.startsWith('visitor_')) {
      return res.status(400).json({ error: 'cannot_edit_visitor', message: 'Сброс доступен только зарегистрированным' });
    }
    const user = resetUserBalance(req.params.id);
    if (!user) return res.status(404).json({ error: 'not_found', message: 'Пользователь не найден' });
    res.json({ user });
  } catch (e) {
    console.error('[POST /api/users/:id/reset-balance]', e);
    res.status(500).json({ error: 'server_error', message: String(e.message || e) });
  }
});

app.get('/api/admin/withdrawal-requests', (req, res) => {
  try {
    const adminUserId = req.query.userId || req.headers['x-user-id'];
    if (!adminUserId || !isAdmin(adminUserId)) return res.status(403).json({ error: 'forbidden' });
    const status = req.query.status || null;
    const list = getWithdrawalRequests(status);
    const enriched = list.map((r) => {
      const user = getUserById(r.userId);
      return { ...r, userName: user?.name || r.userId };
    });
    res.json({ requests: enriched });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'server_error' });
  }
});

app.patch('/api/admin/withdrawal-requests/:id', (req, res) => {
  try {
    const adminUserId = req.query.userId || req.headers['x-user-id'];
    if (!adminUserId || !isAdmin(adminUserId)) return res.status(403).json({ error: 'forbidden' });
    const { id } = req.params;
    const status = req.body.status;
    if (status !== 'approved' && status !== 'rejected') {
      return res.status(400).json({ error: 'invalid_status', message: 'status must be approved or rejected' });
    }
    const updated = updateWithdrawalRequestStatus(id, status);
    if (!updated) return res.status(404).json({ error: 'not_found', message: 'Заявка не найдена или уже обработана' });
    res.json({ request: updated });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'server_error' });
  }
});

app.get('/api/admin/broadcasts', (req, res) => {
  try {
    const adminUserId = req.query.userId || req.headers['x-user-id'];
    if (!adminUserId || !isAdmin(adminUserId)) return res.status(403).json({ error: 'forbidden' });
    const list = listBroadcasts();
    res.json({ broadcasts: list });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'server_error' });
  }
});

app.post('/api/admin/broadcast', (req, res) => {
  try {
    const adminUserId = req.query.userId || req.headers['x-user-id'];
    if (!adminUserId || !isAdmin(adminUserId)) return res.status(403).json({ error: 'forbidden' });
    const { message, audience } = req.body;
    if (!message || typeof message !== 'string' || !audience) {
      return res.status(400).json({ error: 'message and audience required' });
    }
    const telegramIds = getTelegramIdsForAudience(audience);
    const count = telegramIds.length;
    const { id } = createBroadcast(adminUserId, message.trim(), audience, count);
    res.json({ id: String(id), recipientCount: count });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'server_error' });
  }
});

async function sendBroadcastViaTelegram(broadcastId) {
  const b = getBroadcastById(broadcastId);
  if (!b || b.sent_at) return { sent: 0, failed: 0 };
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return { sent: 0, failed: 0, error: 'TELEGRAM_BOT_TOKEN not set' };
  const telegramIds = getTelegramIdsForAudience(b.audience);
  let sent = 0;
  let failed = 0;
  for (const chatId of telegramIds) {
    try {
      await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
        chat_id: chatId,
        text: b.message,
        parse_mode: 'HTML',
      }, { timeout: 5000 });
      sent++;
    } catch (err) {
      failed++;
    }
  }
  markBroadcastSent(broadcastId);
  return { sent, failed };
}

app.post('/api/admin/broadcast/:id/send', async (req, res) => {
  try {
    const adminUserId = req.query.userId || req.headers['x-user-id'];
    if (!adminUserId || !isAdmin(adminUserId)) return res.status(403).json({ error: 'forbidden' });
    const { id } = req.params;
    const result = await sendBroadcastViaTelegram(id);
    res.json(result);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'server_error' });
  }
});

// ══════════════════════════════════════
// Admin ZYPHEX
// ══════════════════════════════════════

app.get('/api/admin/zyphex/rate', (req, res) => {
  try {
    const adminUserId = req.query.userId || req.headers['x-user-id'];
    if (!adminUserId || !isAdmin(adminUserId)) return res.status(403).json({ error: 'forbidden' });
    const rate = getZyphexRate();
    res.json({ rate });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'server_error' });
  }
});

app.put('/api/admin/zyphex/rate', (req, res) => {
  try {
    const adminUserId = req.query.userId || req.headers['x-user-id'];
    if (!adminUserId || !isAdmin(adminUserId)) return res.status(403).json({ error: 'forbidden' });
    const rate = Number(req.body.rate);
    if (!Number.isFinite(rate) || rate <= 0) return res.status(400).json({ error: 'invalid_rate' });
    setZyphexRate(rate);
    res.json({ ok: true, rate });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'server_error' });
  }
});

app.get('/api/admin/zyphex/supply', (req, res) => {
  try {
    const adminUserId = req.query.userId || req.headers['x-user-id'];
    if (!adminUserId || !isAdmin(adminUserId)) return res.status(403).json({ error: 'forbidden' });
    const supply = getZyphexTotalSupply();
    const sold = getTotalZyphexSold();
    const remaining = getZyphexRemaining();
    res.json({ supply, sold, remaining });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'server_error' });
  }
});

app.put('/api/admin/zyphex/supply', (req, res) => {
  try {
    const adminUserId = req.query.userId || req.headers['x-user-id'];
    if (!adminUserId || !isAdmin(adminUserId)) return res.status(403).json({ error: 'forbidden' });
    const supply = Number(req.body.supply);
    if (!Number.isFinite(supply) || supply < 0) return res.status(400).json({ error: 'invalid_supply' });
    setZyphexTotalSupply(supply);
    res.json({ ok: true, supply: getZyphexTotalSupply() });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'server_error' });
  }
});

app.get('/api/admin/zyphex/export', (req, res) => {
  try {
    const adminUserId = req.query.userId || req.headers['x-user-id'];
    if (!adminUserId || !isAdmin(adminUserId)) return res.status(403).json({ error: 'forbidden' });
    const list = getZyphexExportList();
    const format = req.query.format || 'json';
    if (format === 'csv') {
      const header = 'user_id,telegram_id,name,balance_zyphex,total_exchanged_usdt,total_exchanged_zyphex';
      const rows = list.map(r => `${r.userId},${r.telegramId},"${String(r.name).replace(/"/g, '""')}",${r.balanceZyphex},${r.totalExchangedUsdt},${r.totalExchangedZyphex}`);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename=zyphex_airdrop_export.csv');
      return res.send('\uFEFF' + header + '\n' + rows.join('\n'));
    }
    res.json({ list });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'server_error' });
  }
});

// ══════════════════════════════════════
// Start
// ══════════════════════════════════════

const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, () => {
  console.log(`Zyphex API listening on port ${PORT}`);
  console.log(`Database: ${dbPath} (settings persist across restarts; set DB_PATH for custom path)`);
  startMonitoring();
});
