import { API_URL } from '../constants';
import type { AuthForm, ChatRoom, AuthUser, ChatMessage, User } from '../types/chat';

export const apiLogin = async (form: { username: string; password: string }): Promise<AuthUser> => {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(form),
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Đăng nhập thất bại');
  return res.json();
};

export const apiRegister = async (form: Omit<AuthForm, 'displayName'> & { displayName: string }): Promise<void> => {
  const res = await fetch(`${API_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(form),
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Đăng ký thất bại');
};

export const apiLogout = async (username: string): Promise<void> => {
  await fetch(`${API_URL}/api/auth/logout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username }),
  });
};

export const apiGetRooms = async (username?: string): Promise<ChatRoom[]> => {
  const url = username 
    ? `${API_URL}/api/rooms?username=${encodeURIComponent(username)}`
    : `${API_URL}/api/rooms`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Không thể lấy danh sách phòng');
  const rooms = await res.json();
  return Array.isArray(rooms) ? rooms.filter((r: ChatRoom) => !r.dm) : [];
};

export const apiGetUsers = async (exclude?: string): Promise<User[]> => {
  const url = exclude
    ? `${API_URL}/api/users?exclude=${encodeURIComponent(exclude)}`
    : `${API_URL}/api/users`;
  const res = await fetch(url);
  if (!res.ok) return [];
  return res.json();
};

export const apiCreateRoom = async (name: string, createdBy: string): Promise<ChatRoom> => {
  const res = await fetch(`${API_URL}/api/rooms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, createdBy }),
  });
  if (!res.ok) throw new Error('Không thể tạo phòng');
  return res.json();
};

export const apiLeaveRoom = async (roomId: string, username: string): Promise<void> => {
  const res = await fetch(
    `${API_URL}/api/rooms/${roomId}/leave?username=${encodeURIComponent(username)}`,
    { method: 'POST' }
  );
  if (!res.ok) throw new Error('Không thể rời khỏi phòng');
};

export const apiGetMessageHistory = async (roomId: string): Promise<ChatMessage[]> => {
  const res = await fetch(`${API_URL}/api/rooms/${roomId}/history`);
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
};

export const apiCreateOrGetDM = async (from: string, to: string): Promise<ChatRoom> => {
  const res = await fetch(`${API_URL}/api/users/dm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to }),
  });
  if (!res.ok) throw new Error('Không thể mở cuộc trò chuyện');
  return res.json();
};

export const apiSearchRooms = async (query: string): Promise<ChatRoom[]> => {
  const res = await fetch(`${API_URL}/api/rooms/search?q=${encodeURIComponent(query)}`);
  if (!res.ok) return [];
  const rooms = await res.json();
  return Array.isArray(rooms) ? rooms : [];
};

export const apiJoinRoom = async (roomId: string, username: string): Promise<ChatRoom> => {
  const res = await fetch(`${API_URL}/api/rooms/${roomId}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username }),
  });
  if (!res.ok) throw new Error('Không thể tham gia nhóm');
  return res.json();
};
