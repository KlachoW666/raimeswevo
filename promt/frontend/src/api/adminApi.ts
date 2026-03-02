import { api } from './client';
import type { MockAppUser } from '../store/adminStore';

export async function fetchUsers(adminUserId: string): Promise<MockAppUser[]> {
  const res = await api.get<{ users: MockAppUser[] }>(
    `/api/users?userId=${encodeURIComponent(adminUserId)}`
  );
  return res.users || [];
}

export async function updateUser(
  userId: string,
  adminUserId: string,
  patch: { balance?: number; isBanned?: boolean; vipStatus?: boolean; notes?: string }
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
