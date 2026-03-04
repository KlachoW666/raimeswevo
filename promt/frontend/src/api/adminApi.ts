import { api } from './client';
import { CONFIG } from '../config';
import type { MockAppUser } from '../store/adminStore';

const base = CONFIG.API_BASE || '';

export async function fetchUsers(adminUserId: string): Promise<MockAppUser[]> {
  const res = await api.get<{ users: MockAppUser[] }>(
    `/api/users?userId=${encodeURIComponent(adminUserId)}`
  );
  return res.users || [];
}

export async function updateUser(
  userId: string,
  adminUserId: string,
  patch: { balance?: number; isBanned?: boolean; vipStatus?: boolean; notes?: string; botMode?: string }
): Promise<MockAppUser> {
  const res = await api.patch<{ user: MockAppUser }>(
    `/api/users/${encodeURIComponent(userId)}?userId=${encodeURIComponent(adminUserId)}`,
    patch
  );
  return res.user;
}

export async function addBonus(userId: string, adminUserId: string, amount: number): Promise<MockAppUser> {
  const res = await api.post<{ user: MockAppUser }>(
    `/api/users/${encodeURIComponent(userId)}/bonus?userId=${encodeURIComponent(adminUserId)}`,
    { amount }
  );
  return res.user;
}

export async function resetBalance(userId: string, adminUserId: string): Promise<MockAppUser> {
  const res = await api.post<{ user: MockAppUser }>(
    `/api/users/${encodeURIComponent(userId)}/reset-balance?userId=${encodeURIComponent(adminUserId)}`,
    {}
  );
  return res.user;
}

// ZYPHEX admin
export async function getZyphexRate(adminUserId: string): Promise<number> {
  const res = await api.get<{ rate: number }>(`/api/admin/zyphex/rate?userId=${encodeURIComponent(adminUserId)}`);
  return res.rate ?? 100;
}

export async function setZyphexRate(adminUserId: string, rate: number): Promise<void> {
  await api.put(`/api/admin/zyphex/rate?userId=${encodeURIComponent(adminUserId)}`, { rate });
}

export async function getZyphexSupply(adminUserId: string): Promise<{ supply: number; sold: number; remaining: number }> {
  const res = await api.get<{ supply: number; sold: number; remaining: number }>(
    `/api/admin/zyphex/supply?userId=${encodeURIComponent(adminUserId)}`
  );
  return { supply: res.supply ?? 1000000, sold: res.sold ?? 0, remaining: res.remaining ?? 1000000 };
}

export async function setZyphexSupply(adminUserId: string, supply: number): Promise<void> {
  await api.put(`/api/admin/zyphex/supply?userId=${encodeURIComponent(adminUserId)}`, { supply });
}

export async function downloadZyphexExportCsv(adminUserId: string): Promise<void> {
  const url = `${base}/api/admin/zyphex/export?userId=${encodeURIComponent(adminUserId)}&format=csv`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Export failed');
  const blob = await res.blob();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'zyphex_airdrop_export.csv';
  a.click();
  URL.revokeObjectURL(a.href);
}

export type WithdrawalRequest = {
  id: string;
  userId: string;
  userName: string;
  network: string;
  amount: number;
  address: string;
  status: string;
  createdAt: string;
  processedAt: string | null;
};

export async function fetchWithdrawalRequests(adminUserId: string, status?: string): Promise<WithdrawalRequest[]> {
  const q = status ? `?userId=${encodeURIComponent(adminUserId)}&status=${encodeURIComponent(status)}` : `?userId=${encodeURIComponent(adminUserId)}`;
  const res = await api.get<{ requests: WithdrawalRequest[] }>(`/api/admin/withdrawal-requests${q}`);
  return res.requests || [];
}

export async function setWithdrawalRequestStatus(
  requestId: string,
  adminUserId: string,
  status: 'approved' | 'rejected'
): Promise<void> {
  await api.patch(
    `/api/admin/withdrawal-requests/${encodeURIComponent(requestId)}?userId=${encodeURIComponent(adminUserId)}`,
    { status }
  );
}

export type BroadcastItem = { id: string; text: string; audience: string; recipientCount: number; sentAt: string; createdAt: string };

export async function fetchBroadcasts(adminUserId: string): Promise<BroadcastItem[]> {
  const res = await api.get<{ broadcasts: BroadcastItem[] }>(`/api/admin/broadcasts?userId=${encodeURIComponent(adminUserId)}`);
  return res.broadcasts || [];
}

export async function createBroadcast(adminUserId: string, message: string, audience: string): Promise<{ id: string; recipientCount: number }> {
  return api.post(`/api/admin/broadcast?userId=${encodeURIComponent(adminUserId)}`, { message, audience });
}

export async function sendBroadcast(adminUserId: string, broadcastId: string): Promise<{ sent: number; failed: number }> {
  return api.post(`/api/admin/broadcast/${encodeURIComponent(broadcastId)}/send?userId=${encodeURIComponent(adminUserId)}`, {});
}
