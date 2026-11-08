import { FriendUser, Beer, Tasting, Category, BeerGlass } from '../types';
import { buildServerAuthHeaders } from './storage';

export async function fetchFriendsList(): Promise<FriendUser[]> {
  try {
    const headers = await buildServerAuthHeaders(false);
    const res = await fetch('/api/friends', {
      method: 'GET',
      credentials: 'include',
      headers,
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.friends) ? data.friends : [];
  } catch {
    return [];
  }
}

export async function acceptFriendInvite(
  inviteCode: string
): Promise<{ success: boolean; message: string; friend?: FriendUser }> {
  try {
    const headers = await buildServerAuthHeaders(true);
    const res = await fetch('/api/friends/accept', {
      method: 'POST',
      credentials: 'include',
      headers,
      body: JSON.stringify({ inviteCode }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        success: false,
        message: data.error || 'Kon uitnodiging niet verwerken.',
      };
    }
    return {
      success: true,
      message: data.message || 'Succesvol vriend toegevoegd!',
      friend: data.friend,
    };
  } catch {
    return {
      success: false,
      message: 'Netwerkfout bij het verwerken van de uitnodiging.',
    };
  }
}

export async function removeFriend(friendId: string): Promise<boolean> {
  try {
    const headers = await buildServerAuthHeaders(false);
    const res = await fetch(`/api/friends/${encodeURIComponent(friendId)}`, {
      method: 'DELETE',
      credentials: 'include',
      headers,
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchFriendRecords(friendId: string): Promise<{
  friend: { id: string; name: string; email: string; avatarUrl?: string };
  beers: Beer[];
  tastings: Tasting[];
  categories: Category[];
  glasses: BeerGlass[];
} | null> {
  try {
    const headers = await buildServerAuthHeaders(false);
    const res = await fetch(`/api/friends/${encodeURIComponent(friendId)}/records`, {
      method: 'GET',
      credentials: 'include',
      headers,
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.friend || !data.records) return null;

    return {
      friend: data.friend,
      beers: Array.isArray(data.records.beers) ? data.records.beers : [],
      tastings: Array.isArray(data.records.tastings) ? data.records.tastings : [],
      categories: Array.isArray(data.records.categories) ? data.records.categories : [],
      glasses: Array.isArray(data.records.glasses) ? data.records.glasses : [],
    };
  } catch {
    return null;
  }
}

export function buildInviteLink(userId: string, overrideDomain?: string): string {
  let domain = (overrideDomain || '').trim();
  if (!domain && typeof window !== 'undefined') {
    try {
      domain = localStorage.getItem('bierlog_custom_domain') || '';
    } catch {}
  }
  if (!domain) {
    domain = typeof window !== 'undefined' ? window.location.origin : 'https://cervisium.nl';
  }
  if (!/^https?:\/\//i.test(domain)) {
    domain = `https://${domain}`;
  }
  domain = domain.replace(/\/+$/, '');
  return `${domain}/?invite=${encodeURIComponent(userId)}`;
}
