import express from 'express';
import cors from 'cors';
import { mkdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import {
  findOrCreateUser,
  listUsers,
  updateUser,
  getUserById,
  addBonusToUser,
  resetUserBalance,
  getReferralInfo,
} from './db.js';

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

// POST /api/auth/login — register or login by PIN + Telegram initData
app.post('/api/auth/login', (req, res) => {
  try {
    const { pin, telegramId, username, firstName, referredBy } = req.body;
    if (!pin || !telegramId) {
      return res.status(400).json({ success: false, error: 'pin and telegramId required' });
    }
    const user = findOrCreateUser({
      telegramId: String(telegramId),
      username: username || null,
      firstName: firstName || null,
      pin: String(pin),
      referredBy: referredBy || null,
    });
    const match = user.pin_hash === String(pin);
    if (!match) {
      return res.status(401).json({ success: false, error: 'wrong_pin' });
    }
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

// GET /api/users — list users (admin only)
app.get('/api/users', (req, res) => {
  try {
    const userId = req.query.userId || req.headers['x-user-id'];
    if (!userId || !isAdmin(userId)) {
      return res.status(403).json({ error: 'forbidden' });
    }
    const users = listUsers();
    res.json({ users });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'server_error' });
  }
});

// PATCH /api/users/:id — update user (admin only)
app.patch('/api/users/:id', (req, res) => {
  try {
    const adminUserId = req.query.userId || req.headers['x-user-id'];
    if (!adminUserId || !isAdmin(adminUserId)) {
      return res.status(403).json({ error: 'forbidden' });
    }
    const { id } = req.params;
    const body = req.body;
    const patch = {};
    if (typeof body.balance === 'number') patch.balance_usdt = body.balance;
    if (typeof body.isBanned === 'boolean') patch.is_banned = body.isBanned;
    if (typeof body.vipStatus === 'boolean') patch.is_vip = body.vipStatus;
    if (typeof body.notes === 'string') patch.notes = body.notes;
    const updated = updateUser(id, patch);
    if (!updated) return res.status(404).json({ error: 'not_found' });
    res.json({ user: getUserById(id) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'server_error' });
  }
});

// POST /api/users/:id/bonus — add bonus (admin only)
app.post('/api/users/:id/bonus', (req, res) => {
  try {
    const adminUserId = req.query.userId || req.headers['x-user-id'];
    if (!adminUserId || !isAdmin(adminUserId)) {
      return res.status(403).json({ error: 'forbidden' });
    }
    const amount = Number(req.body.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ error: 'invalid_amount' });
    }
    const user = addBonusToUser(req.params.id, amount);
    if (!user) return res.status(404).json({ error: 'not_found' });
    res.json({ user });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'server_error' });
  }
});

// POST /api/users/:id/reset-balance — reset balance to 0 (admin only)
app.post('/api/users/:id/reset-balance', (req, res) => {
  try {
    const adminUserId = req.query.userId || req.headers['x-user-id'];
    if (!adminUserId || !isAdmin(adminUserId)) {
      return res.status(403).json({ error: 'forbidden' });
    }
    const user = resetUserBalance(req.params.id);
    if (!user) return res.status(404).json({ error: 'not_found' });
    res.json({ user });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'server_error' });
  }
});

// GET /api/referral/info?userId= — refCode, invitedCount, earned
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
      refLink: `https://t.me/ZyphexAutotraidingBot/app?startapp=${u.ref_code}`,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'server_error' });
  }
});

const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, () => console.log(`Zyphex API listening on port ${PORT}`));
