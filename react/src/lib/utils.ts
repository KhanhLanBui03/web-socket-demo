/**
 * Utility functions for the chat application
 */

const AVATAR_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#6366f1', '#ec4899', '#8b5cf6'];

export const EMOJI_LIST = [
  '😀', '😂', '🥲', '😍', '🥰', '😎', '🤩', '😏', '😒', '😢',
  '😡', '🥳', '😴', '🤔', '🤯', '😱', '🥺', '😇', '🤗', '😤',
  '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💔', '❣️',
  '👍', '👎', '👏', '🙌', '🤝', '🙏', '✌️', '🤞', '💪', '🫶',
  '🎉', '🎊', '🎈', '🔥', '✨', '💫', '⭐', '🌟', '💥', '🎯',
  '😋', '🤤', '😛', '😝', '🤪', '🥴', '😵', '🤐', '🥱', '😪',
  '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯',
  '🍕', '🍔', '🍟', '🌮', '🍜', '🍣', '🍦', '🎂', '☕', '🧋',
];

export const API_URL = 'http://localhost:8080';

export const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1MB

/**
 * Get avatar background color based on username hash
 */
export const avatarColor = (username: string): string => {
  let hash = 0;
  for (const ch of username) {
    hash = (hash * 31 + ch.charCodeAt(0)) % AVATAR_COLORS.length;
  }
  return AVATAR_COLORS[hash];
};

/**
 * Get initials from display name
 */
export const initials = (displayName: string): string => {
  return displayName ? displayName.charAt(0).toUpperCase() : '?';
};

/**
 * Format file size to human-readable format
 */
export const formatFileSize = (bytes?: number): string => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1048576).toFixed(1)}MB`;
};

/**
 * Format timestamp to time string (HH:mm)
 */
export const formatTime = (timestamp?: number): string => {
  if (!timestamp) return '';
  return new Date(timestamp).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Format "last seen" timestamp
 */
export const formatLastSeen = (timestamp?: number): string => {
  if (!timestamp) return '';
  const diff = Date.now() - timestamp;
  if (diff < 60000) return 'vừa xong';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} phút trước`;
  return `${Math.floor(diff / 3600000)} giờ trước`;
};

/**
 * Convert File to Base64 string
 */
export const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Đọc file thất bại'));
    reader.readAsDataURL(file);
  });
