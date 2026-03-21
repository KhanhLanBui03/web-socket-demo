/**
 * Utility functions for the chat application
 */

import { useState } from "react";

const AVATAR_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#6366f1', '#ec4899', '#8b5cf6'];

const EMOJI_CATEGORIES = [
  { label: '😀', name: 'Biểu cảm', emojis: ['😀', '😂', '🥲', '😍', '🥰', '😎', '🤩', '😏', '😒', '😢', '😡', '🥳', '😴', '🤔', '🤯', '😱', '🥺', '😇', '🤗', '😤', '😋', '🤤', '😛', '😝', '🤪', '🥴', '😵', '🤐', '🥱', '😪'] },
  { label: '👍', name: 'Cử chỉ', emojis: ['👍', '👎', '👏', '🙌', '🤝', '🙏', '✌️', '🤞', '💪', '🫶', '👋', '✋', '🤙', '💅', '☝️', '👆', '👇', '👈', '👉', '🤜', '🤛', '👊', '✊', '🤲'] },
  { label: '❤️', name: 'Tim', emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '🔥', '✨', '💫', '⭐', '🌟', '💥', '🎉', '🎊', '🎈', '🎯', '🏆'] },
  { label: '🐶', name: 'Động vật', emojis: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🦆', '🦅', '🦉', '🦋', '🐝', '🐛', '🦎', '🐍', '🐢', '🐙', '🦑', '🐡', '🐟', '🐬', '🐳'] },
  { label: '🍕', name: 'Đồ ăn', emojis: ['🍕', '🍔', '🍟', '🌮', '🌯', '🍜', '🍝', '🍣', '🍱', '🍛', '🍲', '🥗', '🥘', '🍳', '🧇', '🥞', '🍞', '🥖', '🧀', '🥩', '🍗', '🥓', '🌭', '🥚', '🧆', '🫔', '🍠'] },
  { label: '☕', name: 'Đồ uống', emojis: ['☕', '🧋', '🍵', '🫖', '🍺', '🍻', '🥂', '🍷', '🥃', '🍸', '🍹', '🧃', '🥤', '🧉', '🍾'] },
  { label: '⚽', name: 'Thể thao', emojis: ['⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏉', '🎱', '🏓', '🏸', '🥊', '🎽', '🛹', '⛸️', '🎿', '🏋️', '🤸', '🤺', '🏊', '🚴', '🏇', '🧗', '🧘'] },
  { label: '🌍', name: 'Du lịch', emojis: ['🌍', '🌎', '🌏', '🗺️', '🧭', '🏔️', '🌋', '🏕️', '🏖️', '🏜️', '🏝️', '🏠', '🏢', '🏥', '🏦', '🏨', '🏩', '🏪', '🏫', '✈️', '🚀', '🛸', '🚂', '🚢', '🚁'] },
];
const [emojiTab, setEmojiTab] = useState(0);

export const API_URL = 'http://localhost:8080';
export const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1MB

// ══════════════════════════════════════════════════════════════════
// AVATAR / DISPLAY
// ══════════════════════════════════════════════════════════════════

export const avatarColor = (username: string): string => {
  let hash = 0;
  for (const ch of username) hash = (hash * 31 + ch.charCodeAt(0)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[hash];
};

export const initials = (displayName: string): string =>
  displayName ? displayName.charAt(0).toUpperCase() : '?';

// ══════════════════════════════════════════════════════════════════
// FORMAT — kích thước, thời gian, ngày tháng
// ══════════════════════════════════════════════════════════════════

export const formatFileSize = (bytes?: number): string => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1048576).toFixed(1)}MB`;
};

export const formatTime = (timestamp?: number): string => {
  if (!timestamp) return '';
  return new Date(timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
};

/** "vừa xong" / "5 phút trước" / "2 giờ trước" / "hôm qua" */
export const formatLastSeen = (timestamp?: number): string => {
  if (!timestamp) return '';
  const diff = Date.now() - timestamp;
  if (diff < 60_000) return 'vừa xong';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} phút trước`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} giờ trước`;
  if (diff < 172_800_000) return 'hôm qua';
  return new Date(timestamp).toLocaleDateString('vi-VN');
};

/** "10:30 SA" hoặc "hôm qua" hoặc "20/03/2025" */
export const formatMessageDate = (timestamp?: number): string => {
  if (!timestamp) return '';
  const d = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - timestamp;

  if (diff < 86_400_000 && d.getDate() === now.getDate()) {
    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  }
  if (diff < 172_800_000) return 'hôm qua';
  return d.toLocaleDateString('vi-VN');
};

// ══════════════════════════════════════════════════════════════════
// VALIDATE
// ══════════════════════════════════════════════════════════════════

export const validate = {
  /** Username: 3-20 ký tự, chỉ chữ/số/gạch dưới */
  username: (v: string): string | null => {
    if (!v || v.trim().length < 3) return 'Username tối thiểu 3 ký tự';
    if (v.trim().length > 20) return 'Username tối đa 20 ký tự';
    if (!/^[a-zA-Z0-9_]+$/.test(v)) return 'Username chỉ được chứa chữ, số và dấu _';
    return null;
  },

  /** Password: tối thiểu 6 ký tự */
  password: (v: string): string | null => {
    if (!v || v.length < 6) return 'Mật khẩu tối thiểu 6 ký tự';
    return null;
  },

  /** Display name: không rỗng, tối đa 30 ký tự */
  displayName: (v: string): string | null => {
    if (!v || v.trim().length === 0) return 'Tên hiển thị không được rỗng';
    if (v.trim().length > 30) return 'Tên hiển thị tối đa 30 ký tự';
    return null;
  },

  /** Tên phòng: 2-50 ký tự */
  roomName: (v: string): string | null => {
    if (!v || v.trim().length < 2) return 'Tên phòng tối thiểu 2 ký tự';
    if (v.trim().length > 50) return 'Tên phòng tối đa 50 ký tự';
    return null;
  },
};

// ══════════════════════════════════════════════════════════════════
// FILE HELPERS
// ══════════════════════════════════════════════════════════════════

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/ogg'];
const DOC_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'application/zip',
  'application/x-rar-compressed',
];

export const fileHelpers = {
  isImage: (file: File) => IMAGE_TYPES.includes(file.type),
  isVideo: (file: File) => VIDEO_TYPES.includes(file.type),
  isDocument: (file: File) => DOC_TYPES.includes(file.type),

  /** Lấy extension từ tên file: "photo.jpg" → "jpg" */
  extension: (filename: string): string => {
    const parts = filename.split('.');
    return parts.length > 1 ? parts.pop()!.toLowerCase() : '';
  },

  /** Kiểm tra file có vượt giới hạn không */
  exceedsLimit: (file: File, limitMB = 1): boolean =>
    file.size > limitMB * 1024 * 1024,

  /** Lỗi nếu file không hợp lệ, null nếu OK */
  validate: (file: File, limitMB = 1): string | null => {
    if (fileHelpers.exceedsLimit(file, limitMB))
      return `File quá lớn — tối đa ${limitMB}MB`;
    if (!fileHelpers.isImage(file) && !fileHelpers.isVideo(file) && !fileHelpers.isDocument(file))
      return 'Định dạng file không được hỗ trợ';
    return null;
  },
};

export const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Đọc file thất bại'));
    reader.readAsDataURL(file);
  });

// ══════════════════════════════════════════════════════════════════
// CLIPBOARD
// ══════════════════════════════════════════════════════════════════

/** Copy text vào clipboard, trả về true nếu thành công */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};

// ══════════════════════════════════════════════════════════════════
// DEBOUNCE / THROTTLE
// ══════════════════════════════════════════════════════════════════

/** Debounce: chỉ chạy fn sau khi ngừng gọi được `delay`ms */
export function debounce<T extends (...args: any[]) => void>(fn: T, delay: number): T {
  let timer: ReturnType<typeof setTimeout>;
  return ((...args: any[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  }) as T;
}

/** Throttle: chỉ chạy fn tối đa 1 lần mỗi `limit`ms */
export function throttle<T extends (...args: any[]) => void>(fn: T, limit: number): T {
  let lastRun = 0;
  return ((...args: any[]) => {
    const now = Date.now();
    if (now - lastRun >= limit) { lastRun = now; fn(...args); }
  }) as T;
}

// ══════════════════════════════════════════════════════════════════
// STRING HELPERS
// ══════════════════════════════════════════════════════════════════

/** Rút gọn text dài: "Hello world" → "Hello..." */
export const truncate = (text: string, maxLength: number): string =>
  text.length <= maxLength ? text : text.slice(0, maxLength - 3) + '...';

/** Highlight từ khóa trong text (trả về HTML string) */
export const highlightKeyword = (text: string, keyword: string): string => {
  if (!keyword.trim()) return text;
  const regex = new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
};

/** Kiểm tra message có chứa chỉ emoji không */
export const isEmojiOnly = (text: string): boolean => {
  const emojiRegex = /^(\p{Emoji_Presentation}|\p{Extended_Pictographic}|\s)+$/u;
  return emojiRegex.test(text.trim());
};