// Authentication
export interface User {
  username: string;
  displayName: string;
  status: 'ONLINE' | 'OFFLINE';
  lastSeen?: number;
}

export interface AuthUser {
  username: string;
  displayName: string;
}

export interface AuthForm {
  username: string;
  password: string;
  displayName: string;
}

// Chat
export interface ChatRoom {
  roomId: string;
  name: string;
  createdBy?: string;
  members?: string[];
  dm?: boolean;
}

export interface ChatMessage {
  messageId?: string;
  roomId: string;
  sender: string;
  content: string;
  type: 'CHAT' | 'JOIN' | 'LEAVE' | 'CALL' | 'FILE' | 'IMAGE' | 'LOCATION';
  createdAt?: number;
  callType?: string;
  callAction?: string;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  latitude?: number;
  longitude?: number;
  locationName?: string;
}

// UI
export type Screen = 'login' | 'register' | 'chat';
export type Tab = 'groups' | 'dm';

export interface AuthState {
  user: AuthUser | null;
  form: AuthForm;
  error: string;
  loading: boolean;
}

export interface ChatState {
  selectedRoom: ChatRoom | null;
  rooms: ChatRoom[];
  users: User[];
  messages: ChatMessage[];
  connected: boolean;
}
