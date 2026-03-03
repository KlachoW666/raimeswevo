import axios from 'axios';
import { db, addBonusToUser } from './db.js';

// ══════════════════════════════════════
// Configuration
// ══════════════════════════════════════

const POLL_INTERVAL = 30_000; // 30 seconds

const ADMIN_WALLETS = {
    TON: process.env.ADMIN_WALLET_TON || '',
    BSC: process.env.ADMIN_WALLET_BSC || '',
    TRC: process.env.ADMIN_WALLET_TRC || '',
    SOL: process.env.ADMIN_WALLET_SOL || '',
    BTC: process.env.ADMIN_WALLET_BTC || '',
    ETH: process.env.ADMIN_WALLET_ETH || '',
};

const BSC_API_KEY = process.env.BSC_API_KEY || '';
const ETH_API_KEY = process.env.ETH_API_KEY || '';

// ══════════════════════════════════════
// Shared helpers
// ══════════════════════════════════════

function getPending(network) {
    return db.prepare(
        'SELECT user_id, memo_code, amount_expected FROM pending_deposits WHERE network = ? AND status = "pending"'
    ).all(network);
}

function isProcessed(txHash) {
    return !!db.prepare('SELECT 1 FROM processed_txs WHERE tx_hash = ?').get(txHash);
}

function processDeposit(userId, network, memoCode, usdValue, txHash) {
    try {
        db.transaction(() => {
            db.prepare('INSERT OR IGNORE INTO processed_txs (tx_hash, network, user_id, amount) VALUES (?, ?, ?, ?)').run(txHash, network, userId, usdValue);
            db.prepare("UPDATE pending_deposits SET status = 'confirmed' WHERE user_id = ? AND network = ? AND memo_code = ?").run(userId, network, memoCode);
            addBonusToUser(userId, usdValue);
        })();
        console.log(`[Deposit ✓] +$${usdValue.toFixed(2)} → ${userId} via ${network} (tx: ${txHash.slice(0, 16)}…)`);
    } catch (e) {
        console.error(`[Deposit ✗] Failed to process ${txHash}:`, e.message);
    }
}

function matchMemo(text, pendingList) {
    if (!text) return null;
    return pendingList.find(p => text.includes(p.memo_code)) || null;
}

// ══════════════════════════════════════
// TON — via Toncenter (free, no key needed)
// ══════════════════════════════════════

async function checkTON() {
    const addr = ADMIN_WALLETS.TON;
    if (!addr) return;
    const pending = getPending('TON');
    if (!pending.length) return;

    try {
        const { data } = await axios.get(`https://toncenter.com/api/v2/getTransactions`, {
            params: { address: addr, limit: 50 },
            timeout: 10_000,
        });
        const txs = data?.result || [];

        for (const tx of txs) {
            const hash = tx.transaction_id?.hash;
            if (!hash || isProcessed(hash)) continue;

            const comment = tx.in_msg?.message || '';
            const match = matchMemo(comment, pending);
            if (!match) continue;

            const tonAmount = Number(tx.in_msg?.value || 0) / 1e9;
            // TON→USD: simplified static rate; in prod, fetch from CoinGecko
            const usdValue = tonAmount * 3.5;
            if (usdValue > 0) processDeposit(match.user_id, 'TON', match.memo_code, usdValue, hash);
        }
    } catch (e) {
        console.error('[Monitor] TON error:', e.message);
    }
}

// ══════════════════════════════════════
// BSC — via BscScan (free key recommended)
// ══════════════════════════════════════

async function checkBSC() {
    const addr = ADMIN_WALLETS.BSC;
    if (!addr) return;
    const pending = getPending('BSC');
    if (!pending.length) return;

    try {
        const params = {
            module: 'account', action: 'txlist', address: addr,
            startblock: 0, endblock: 99999999, page: 1, offset: 50, sort: 'desc',
        };
        if (BSC_API_KEY) params.apikey = BSC_API_KEY;

        const { data } = await axios.get('https://api.bscscan.com/api', { params, timeout: 10_000 });
        const txs = Array.isArray(data?.result) ? data.result : [];

        for (const tx of txs) {
            if (isProcessed(tx.hash)) continue;
            // Decode input data as UTF-8 for memo
            let memo = '';
            try { memo = Buffer.from((tx.input || '').replace('0x', ''), 'hex').toString('utf8'); } catch { }
            const match = matchMemo(memo, pending);
            if (!match) continue;

            const bnbAmount = Number(tx.value) / 1e18;
            const usdValue = bnbAmount * 600; // Mock BNB price
            if (usdValue > 0) processDeposit(match.user_id, 'BSC', match.memo_code, usdValue, tx.hash);
        }
    } catch (e) {
        console.error('[Monitor] BSC error:', e.message);
    }
}

// ══════════════════════════════════════
// ETH — via Etherscan (free key recommended)
// ══════════════════════════════════════

async function checkETH() {
    const addr = ADMIN_WALLETS.ETH;
    if (!addr) return;
    const pending = getPending('ETH');
    if (!pending.length) return;

    try {
        const params = {
            module: 'account', action: 'txlist', address: addr,
            startblock: 0, endblock: 99999999, page: 1, offset: 50, sort: 'desc',
        };
        if (ETH_API_KEY) params.apikey = ETH_API_KEY;

        const { data } = await axios.get('https://api.etherscan.io/api', { params, timeout: 10_000 });
        const txs = Array.isArray(data?.result) ? data.result : [];

        for (const tx of txs) {
            if (isProcessed(tx.hash)) continue;
            let memo = '';
            try { memo = Buffer.from((tx.input || '').replace('0x', ''), 'hex').toString('utf8'); } catch { }
            const match = matchMemo(memo, pending);
            if (!match) continue;

            const ethAmount = Number(tx.value) / 1e18;
            const usdValue = ethAmount * 3500; // Mock ETH price
            if (usdValue > 0) processDeposit(match.user_id, 'ETH', match.memo_code, usdValue, tx.hash);
        }
    } catch (e) {
        console.error('[Monitor] ETH error:', e.message);
    }
}

// ══════════════════════════════════════
// TRC (TRON) — via TronGrid (free)
// ══════════════════════════════════════

async function checkTRC() {
    const addr = ADMIN_WALLETS.TRC;
    if (!addr) return;
    const pending = getPending('TRC');
    if (!pending.length) return;

    try {
        const { data } = await axios.get(`https://api.trongrid.io/v1/accounts/${addr}/transactions`, {
            params: { limit: 50, only_to: true },
            timeout: 10_000,
        });
        const txs = data?.data || [];

        for (const tx of txs) {
            const hash = tx.txID;
            if (!hash || isProcessed(hash)) continue;

            // TRC20 transfers embed data in raw_data
            let memo = '';
            try {
                const rawData = tx.raw_data?.data || '';
                memo = Buffer.from(rawData, 'hex').toString('utf8');
            } catch { }
            const match = matchMemo(memo, pending);
            if (!match) continue;

            // TRX value is in sun (1 TRX = 1e6 sun)  
            const contract = tx.raw_data?.contract?.[0];
            const trxAmount = Number(contract?.parameter?.value?.amount || 0) / 1e6;
            const usdValue = trxAmount * 0.12; // Mock TRX price
            if (usdValue > 0) processDeposit(match.user_id, 'TRC', match.memo_code, usdValue, hash);
        }
    } catch (e) {
        console.error('[Monitor] TRC error:', e.message);
    }
}

// ══════════════════════════════════════
// SOL — via Solana public RPC
// ══════════════════════════════════════

async function checkSOL() {
    const addr = ADMIN_WALLETS.SOL;
    if (!addr) return;
    const pending = getPending('SOL');
    if (!pending.length) return;

    try {
        // Get recent signatures
        const { data: sigData } = await axios.post('https://api.mainnet-beta.solana.com', {
            jsonrpc: '2.0', id: 1,
            method: 'getSignaturesForAddress',
            params: [addr, { limit: 30 }],
        }, { timeout: 10_000 });

        const signatures = sigData?.result || [];

        for (const sig of signatures) {
            const hash = sig.signature;
            if (!hash || isProcessed(hash)) continue;
            if (sig.err) continue; // skip failed txs

            // Fetch full transaction to read memo
            const { data: txData } = await axios.post('https://api.mainnet-beta.solana.com', {
                jsonrpc: '2.0', id: 1,
                method: 'getTransaction',
                params: [hash, { encoding: 'jsonParsed', maxSupportedTransactionVersion: 0 }],
            }, { timeout: 10_000 });

            const txResult = txData?.result;
            if (!txResult) continue;

            // Extract memo from log messages
            const logs = txResult.meta?.logMessages || [];
            const memoLog = logs.find(l => l.includes('Program log: Memo'));
            let memoText = '';
            if (memoLog) {
                // "Program log: Memo (len 14): DEP-1234-ABCDEF"
                const parts = memoLog.split(': ');
                memoText = parts[parts.length - 1] || '';
            }

            const match = matchMemo(memoText, pending);
            if (!match) continue;

            // Calculate SOL amount from pre/post balances
            const pre = txResult.meta?.preBalances || [];
            const post = txResult.meta?.postBalances || [];
            const keys = txResult.transaction?.message?.accountKeys || [];
            const idx = keys.findIndex(k => (k.pubkey || k) === addr);
            const solDelta = idx >= 0 ? (post[idx] - pre[idx]) / 1e9 : 0;
            const usdValue = solDelta * 140; // Mock SOL price
            if (usdValue > 0) processDeposit(match.user_id, 'SOL', match.memo_code, usdValue, hash);
        }
    } catch (e) {
        console.error('[Monitor] SOL error:', e.message);
    }
}

// ══════════════════════════════════════
// BTC — via Blockstream (free, no key)
// ══════════════════════════════════════

async function checkBTC() {
    const addr = ADMIN_WALLETS.BTC;
    if (!addr) return;
    const pending = getPending('BTC');
    if (!pending.length) return;

    try {
        const { data: txs } = await axios.get(`https://blockstream.info/api/address/${addr}/txs`, {
            timeout: 10_000,
        });
        if (!Array.isArray(txs)) return;

        for (const tx of txs) {
            const hash = tx.txid;
            if (!hash || isProcessed(hash)) continue;

            // BTC doesn't natively support memos in the same way
            // We use OP_RETURN outputs for memo embedding
            let memo = '';
            for (const vout of (tx.vout || [])) {
                if (vout.scriptpubkey_type === 'op_return') {
                    try {
                        memo = Buffer.from(vout.scriptpubkey?.slice(4) || '', 'hex').toString('utf8');
                    } catch { }
                }
            }

            const match = matchMemo(memo, pending);
            if (!match) continue;

            // Sum all outputs going to our address
            let btcReceived = 0;
            for (const vout of (tx.vout || [])) {
                if (vout.scriptpubkey_address === addr) {
                    btcReceived += (vout.value || 0) / 1e8;
                }
            }
            const usdValue = btcReceived * 60000; // Mock BTC price
            if (usdValue > 0) processDeposit(match.user_id, 'BTC', match.memo_code, usdValue, hash);
        }
    } catch (e) {
        console.error('[Monitor] BTC error:', e.message);
    }
}

// ══════════════════════════════════════
// Main loop
// ══════════════════════════════════════

async function pollAll() {
    await Promise.allSettled([
        checkTON(),
        checkBSC(),
        checkETH(),
        checkTRC(),
        checkSOL(),
        checkBTC(),
    ]);
}

export function startMonitoring() {
    const configured = Object.entries(ADMIN_WALLETS).filter(([, v]) => v && v.length > 10);
    if (configured.length === 0) {
        console.log('[Deposit Monitor] No admin wallets configured in .env — monitoring disabled');
        return;
    }
    console.log(`[Deposit Monitor] Started for ${configured.map(([k]) => k).join(', ')} (polling every ${POLL_INTERVAL / 1000}s)`);

    // Initial check after 5s delay
    setTimeout(pollAll, 5000);
    // Then every POLL_INTERVAL
    setInterval(pollAll, POLL_INTERVAL);
}
