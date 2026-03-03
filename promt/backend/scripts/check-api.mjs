#!/usr/bin/env node
/**
 * API verification script. Run after deploy to ensure backend and DB respond.
 * Usage: node scripts/check-api.mjs
 * Env: BASE_URL (default http://localhost:3001), optional USER_ID, ADMIN_USER_ID
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';
const USER_ID = process.env.USER_ID || null;
const ADMIN_USER_ID = process.env.ADMIN_USER_ID || null;

function log(name, ok, detail = '') {
  const s = ok ? 'OK' : 'FAIL';
  console.log(`  [${s}] ${name}${detail ? ` — ${detail}` : ''}`);
}

async function get(path) {
  const res = await fetch(`${BASE_URL}${path}`, { method: 'GET' });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

async function main() {
  console.log(`Checking API at ${BASE_URL}\n`);

  let failed = 0;

  // Health
  const health = await get('/api/health');
  const healthOk = health.status === 200 && health.body?.ok === true;
  if (!healthOk) failed++;
  log('GET /api/health', healthOk, health.status !== 200 ? `status ${health.status}` : '');

  // ZYPHEX rate
  const rate = await get('/api/zyphex/rate');
  const rateOk = rate.status === 200 && typeof rate.body?.rate === 'number';
  if (!rateOk) failed++;
  log('GET /api/zyphex/rate', rateOk, rate.status !== 200 ? `status ${rate.status}` : '');

  if (rateOk && rate.body) {
    log('  rate, remaining, totalSupply present', [rate.body.rate, rate.body.remaining, rate.body.totalSupply].every(v => v !== undefined));
  }

  // Wallet balance (if USER_ID set)
  if (USER_ID) {
    const bal = await get(`/api/wallet/balance?userId=${encodeURIComponent(USER_ID)}`);
    const balOk = bal.status === 200 && typeof bal.body?.totalUsd === 'number';
    if (!balOk) failed++;
    log(`GET /api/wallet/balance?userId=...`, balOk, bal.status !== 200 ? `status ${bal.status}` : '');
    if (balOk && bal.body && typeof bal.body.balanceByNetwork !== 'object') {
      log('  balanceByNetwork object', false);
      failed++;
    }
  } else {
    console.log('  (skip wallet balance — set USER_ID to check)');
  }

  // Admin: users list (if ADMIN_USER_ID set)
  if (ADMIN_USER_ID) {
    const users = await get(`/api/users?userId=${encodeURIComponent(ADMIN_USER_ID)}`);
    const usersOk = users.status === 200 && Array.isArray(users.body?.users);
    if (!usersOk) failed++;
    log('GET /api/users (admin)', usersOk, users.status === 403 ? 'forbidden' : users.status !== 200 ? `status ${users.status}` : '');
  } else {
    console.log('  (skip admin users — set ADMIN_USER_ID to check)');
  }

  console.log('');
  if (failed > 0) {
    console.log(`Result: ${failed} check(s) failed.`);
    process.exit(1);
  }
  console.log('Result: all checks passed.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
