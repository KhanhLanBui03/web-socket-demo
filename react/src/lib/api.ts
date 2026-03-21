/**
 * API service for backend communication
 */
import { API_URL, AuthForm, AuthUser, ChatRoom, User } from '../types';

export const authApi = {
  login: async (username: string, password: string): Promise<AuthUser> => {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username.trim(), password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Đăng nhập thất bại');
    return data;
  },

  register: async (form: Omit<AuthForm, 'password'> & { password: string }): Promise<void> => {
    const res = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: form.username.trim(),
        password: form.password,
        displayName: form.displayName.trim(),
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Đăng ký thất bại');
  },

  logout: async (username: string): Promise<void> => {
    await fetch(`${API_URL}/api/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
    }).catch(() => {
      /* ignore */
    });
  },
};

export const roomApi = {
  getAll: async (): Promise<ChatRoom[]> => {
    const res = await fetch(`${API_URL}/api/rooms`);
    if (!res.ok) return [];
    return res.json();
  },

  create: async (name: string, createdBy: string): Promise<ChatRoom> => {
    const res = await fetch(`${API_URL}/api/rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), createdBy }),
    });
    if (!res.ok) throw new Error('Tạo phòng thất bại');
    return res.json();
  },

  getHistory: async (roomId: string): Promise<any[]> => {
    const res = await fetch(`${API_URL}/api/rooms/${roomId}/history`);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  },

  leave: async (roomId: string, username: string): Promise<void> => {
    await fetch(
      `${API_URL}/api/rooms/${roomId}/leave?username=${encodeURIComponent(username)}`,
      { method: 'POST' }
    );
  },

  delete: async (roomId: string): Promise<void> => {
    await fetch(`${API_URL}/api/rooms/${roomId}`, { method: 'DELETE' });
  },
};

export const userApi = {
  getAll: async (excludeUsername?: string): Promise<User[]> => {
    const query = excludeUsername ? `?exclude=${encodeURIComponent(excludeUsername)}` : '';
    const res = await fetch(`${API_URL}/api/users${query}`);
    if (!res.ok) return [];
    return res.json();
  },

  getOnline: async (): Promise<User[]> => {
    const res = await fetch(`${API_URL}/api/users/online`);
    if (!res.ok) return [];
    return res.json();
  },

  createDM: async (from: string, to: string): Promise<ChatRoom> => {
    const res = await fetch(`${API_URL}/api/users/dm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to }),
    });
    if (!res.ok) throw new Error('Không thể mở cuộc trò chuyện');
    return res.json();
  },
};
