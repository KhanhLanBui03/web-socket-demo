import { useEffect, useRef, useState, useCallback } from 'react';
import SockJS from 'sockjs-client';
import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import './styles/global.css';

import type { User, ChatRoom, ChatMessage, Screen, Tab, AuthForm, AuthUser } from './types/chat';
import { API_URL, EMOJI_LIST, AVATAR_COLORS, MAX_FILE_SIZE } from './constants';
import { avatarColor, initials, formatSize, formatTime, formatLastSeen } from './utils/formatting';
import {
  apiLogin,
  apiRegister,
  apiLogout,
  apiGetRooms,
  apiGetUsers,
  apiCreateRoom,
  apiLeaveRoom,
  apiGetMessageHistory,
  apiCreateOrGetDM,
  apiSearchRooms,
  apiJoinRoom,
} from './utils/api';
import {
  createWebSocketClient,
  subscribeToRoom,
  subscribeToUserStatus,
  publishMessage,
} from './utils/websocket';
const EMOJI_CATEGORIES = [
  {
    label: '😀',
    name: 'Biểu cảm',
    emojis: [
      '😀', '😁', '😂', '🤣', '😃', '😄', '😅', '😆', '😉', '😊', '😋', '😎', '😍', '😘', '🥰', '😗', '😙', '😚',
      '🙂', '🤗', '🤩', '🤔', '🤨', '😐', '😑', '😶', '🙄', '😏', '😣', '😥', '😮', '🤐', '😯', '😪', '😫', '🥱',
      '😴', '😌', '😛', '😜', '😝', '🤤', '😒', '😓', '😔', '😕', '🙃', '🫠', '🫢', '🫣', '🫡', '😲', '😳',
      '🥺', '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣', '😞', '😓', '😩', '😫', '🥵', '🥶',
      '😡', '😠', '🤬', '😷', '🤒', '🤕'
    ]
  },

  {
    label: '👍',
    name: 'Cử chỉ',
    emojis: [
      '👍', '👎', '👏', '🙌', '🤝', '🙏', '✌️', '🤞', '💪', '🫶', '👋', '✋', '🤚', '🖐️', '🖖',
      '👌', '🤌', '🤏', '☝️', '👆', '👇', '👉', '👈', '✊', '👊', '🤛', '🤜', '🤲'
    ]
  },

  {
    label: '❤️',
    name: 'Tim',
    emojis: [
      '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎',
      '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝',
      '🔥', '✨', '💫', '⭐', '🌟', '💥', '🎉', '🎊'
    ]
  },

  {
    label: '🐶',
    name: 'Động vật',
    emojis: [
      '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁',
      '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🦆', '🦅', '🦉',
      '🦋', '🐝', '🐛', '🐌', '🐞', '🐜', '🪲', '🐢', '🐍', '🦎',
      '🐙', '🦑', '🐡', '🐠', '🐟', '🐬', '🐳', '🦈'
    ]
  },

  {
    label: '🍔',
    name: 'Đồ ăn',
    emojis: [
      '🍕', '🍔', '🍟', '🌭', '🍿', '🥓', '🥚', '🍳', '🥞', '🧇',
      '🍗', '🍖', '🥩', '🍤', '🍣', '🍱', '🍜', '🍝', '🍲',
      '🥗', '🥘', '🍛', '🍚', '🍞', '🥖', '🧀', '🍩', '🍪', '🎂', '🍰'
    ]
  },

  {
    label: '☕',
    name: 'Đồ uống',
    emojis: [
      '☕', '🍵', '🧋', '🥤', '🧃', '🍺', '🍻', '🥂', '🍷', '🥃', '🍸', '🍹', '🍾'
    ]
  },

  {
    label: '⚽',
    name: 'Thể thao',
    emojis: [
      '⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏉', '🎱', '🏓', '🏸',
      '🥊', '🥋', '🎽', '🛹', '⛸️', '🎿', '🏋️', '🤸', '🏊', '🚴'
    ]
  },

  {
    label: '🚗',
    name: 'Phương tiện',
    emojis: [
      '🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒',
      '🚜', '✈️', '🚀', '🛸', '🚁', '🚢', '⛵', '🚤', '🚂'
    ]
  },

  {
    label: '💡',
    name: 'Đồ vật',
    emojis: [
      '📱', '💻', '🖥️', '⌨️', '🖱️', '💡', '🔦', '📷', '📸',
      '📞', '☎️', '📺', '🎮', '🧸', '🛏️', '🚪', '🔑', '💰'
    ]
  },

  {
    label: '🎵',
    name: 'Âm nhạc',
    emojis: [
      '🎵', '🎶', '🎼', '🎤', '🎧', '🎷', '🎸', '🎹', '🥁', '🎺'
    ]
  },

  {
    label: '🏳️',
    name: 'Cờ',
    emojis: [
      '🏳️', '🏴', '🏁', '🚩', '🏳️‍🌈', '🏳️‍⚧️',
      '🇻🇳', '🇺🇸', '🇯🇵', '🇰🇷', '🇨🇳', '🇬🇧', '🇫🇷', '🇩🇪'
    ]
  }
];

export default function App() {
  const [screen, setScreen] = useState<Screen>('login');
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authForm, setAuthForm] = useState<AuthForm>({ username: '', password: '', displayName: '' });
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [tab, setTab] = useState<Tab>('groups');
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [connected, setConnected] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [notification, setNotif] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ChatRoom[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const clientRef = useRef<Client | null>(null);
  const subscriptionRef = useRef<StompSubscription | null>(null);
  const userSubRef = useRef<StompSubscription | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const notifTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const [emojiTab, setEmojiTab] = useState(0);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  useEffect(() => { const h = (e: MouseEvent) => { if (!(e.target as HTMLElement).closest('.emoji-zone')) setShowEmoji(false); }; document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h); }, []);
  useEffect(() => () => { subscriptionRef.current?.unsubscribe(); userSubRef.current?.unsubscribe(); clientRef.current?.deactivate(); }, []);

  const showNotification = useCallback((text: string) => { setNotif(text); if (notifTimerRef.current) clearTimeout(notifTimerRef.current); notifTimerRef.current = setTimeout(() => setNotif(''), 4000); }, []);

  const handleLogin = async () => {
    setAuthError(''); setAuthLoading(true);
    try {
      const data = await apiLogin({ username: authForm.username.trim(), password: authForm.password });
      setAuthUser(data); setScreen('chat');
      await fetchInitialData(data.username);
      connectWs(data.username);
    } catch (err) {
      const error = err as Error;
      setAuthError(error.message || 'Đăng nhập thất bại');
    } finally { setAuthLoading(false); }
  };

  const handleRegister = async () => {
    setAuthError(''); setAuthLoading(true);
    try {
      await apiRegister({ username: authForm.username.trim(), password: authForm.password, displayName: authForm.displayName.trim() });
      setAuthForm(f => ({ ...f, password: '', displayName: '' }));
      setAuthError('✅ Đăng ký thành công! Hãy đăng nhập.');
      setScreen('login');
    } catch (err) {
      const error = err as Error;
      setAuthError(error.message || 'Đăng ký thất bại');
    } finally { setAuthLoading(false); }
  };

  const handleLogout = async () => {
    if (authUser) {
      try { await apiLogout(authUser.username); } catch {}
    }
    subscriptionRef.current?.unsubscribe(); userSubRef.current?.unsubscribe();
    clientRef.current?.deactivate(); clientRef.current = null;
    setAuthUser(null); setScreen('login'); setConnected(false);
    setSelectedRoom(null); setMessages([]); setRooms([]); setUsers([]);
  };

  const fetchInitialData = async (username: string) => {
    try {
      const [roomsData, usersData] = await Promise.all([apiGetRooms(username), apiGetUsers(username)]);
      setRooms(roomsData);
      setUsers(usersData);
    } catch (err) {
      console.error('Failed to fetch initial data:', err);
    }
  };

  const refreshUsers = async () => {
    if (!authUser) return;
    try {
      const data = await apiGetUsers(authUser.username);
      setUsers(data);
    } catch (err) {
      console.error('Failed to refresh users:', err);
    }
  };

  const connectWs = useCallback((username: string) => {
    const client = createWebSocketClient(
      () => {
        setConnected(true);
        if (clientRef.current) {
          try {
            subscribeToUserStatus(clientRef.current, () => refreshUsers());
          } catch (err) {
            console.error('Failed to subscribe to user status:', err);
          }
        }
      },
      () => setConnected(false),
      (error) => {
        console.error('WebSocket error:', error);
        setConnected(false);
      }
    );
    clientRef.current = client;
  }, []);

  const handleSubscribeRoom = (roomId: string, client: Client) => {
    subscriptionRef.current?.unsubscribe();
    try {
      subscriptionRef.current = subscribeToRoom(client, roomId, (body: ChatMessage) => {
        setMessages(prev => {
          const arr = Array.isArray(prev) ? prev : [];
          if (body.messageId && arr.some(m => m.messageId === body.messageId)) return arr;
          return [...arr, body];
        });
        if (body.type === 'CALL' && body.sender !== authUser?.username) {
          if (body.callAction === 'INVITE') showNotification(`📞 ${body.sender} mời gọi ${body.callType?.toLowerCase()}`);
          if (body.callAction === 'END') showNotification(`Cuộc gọi kết thúc bởi ${body.sender}`);
          if (body.callAction === 'ACCEPT') showNotification(`${body.sender} đã chấp nhận`);
        }
      });
    } catch (err) {
      console.error('Failed to subscribe to room:', err);
    }
  };

  const loadHistory = async (roomId: string) => {
    try {
      const data = await apiGetMessageHistory(roomId);
      setMessages(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load history:', err);
      setMessages([]);
    }
  };

  const openRoom = async (room: ChatRoom) => {
    if (room.roomId === selectedRoom?.roomId) return;
    setSelectedRoom(room); 
    setMessages([]);
    
    // Load history TRƯỚC để tránh overwrite realtime messages
    await loadHistory(room.roomId);
    
    // Subscribe SAU để nhận realtime messages
    if (clientRef.current && connected) {
      handleSubscribeRoom(room.roomId, clientRef.current);
      // Gửi JOIN message
      try {
        publishMessage(clientRef.current, '/app/chat.addUser', {
          roomId: room.roomId,
          sender: authUser?.username,
          type: 'JOIN' as const,
          content: `${authUser?.displayName} đã vào phòng`
        });
      } catch (err) {
        console.error('Failed to publish join message:', err);
      }
    }
  };

  const openDm = async (targetUser: User) => {
    if (!authUser) return;
    try {
      const room: ChatRoom = await apiCreateOrGetDM(authUser.username, targetUser.username);
      room.name = targetUser.displayName;
      setTab('dm');
      await openRoom(room);
    } catch (err) {
      const error = err as Error;
      showNotification(`❌ ${error.message}`);
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault(); if (!roomName.trim() || !authUser) return;
    try {
      const room = await apiCreateRoom(roomName.trim(), authUser.username);
      setRooms(p => [...p, room]);
      setRoomName('');
      openRoom(room);
    } catch (err) {
      const error = err as Error;
      showNotification(`❌ ${error.message}`);
    }
  };

  const handleLeaveRoom = async () => {
    if (!selectedRoom || !authUser) return;
    try {
      if (clientRef.current) {
        publishMessage(clientRef.current, '/app/chat.sendMessage', {
          roomId: selectedRoom.roomId,
          sender: authUser.username,
          content: `${authUser.displayName} đã rời phòng`,
          type: 'LEAVE' as const
        });
      }
      await apiLeaveRoom(selectedRoom.roomId, authUser.username);
      subscriptionRef.current?.unsubscribe(); subscriptionRef.current = null;
      const name = selectedRoom.name; setSelectedRoom(null); setMessages([]);
      showNotification(`Bạn đã rời ${name}`);
    } catch (err) {
      const error = err as Error;
      showNotification(`❌ ${error.message}`);
    }
  };

  const publish = (extra: Partial<ChatMessage>) => {
    if (!selectedRoom || !clientRef.current || !authUser) return;
    try {
      publishMessage(clientRef.current, '/app/chat.sendMessage', {
        roomId: selectedRoom.roomId,
        sender: authUser.username,
        content: '',
        type: 'CHAT' as const,
        ...extra
      });
    } catch (err) {
      console.error('Failed to publish message:', err);
    }
  };

  const handleSend = () => {
    if (!message.trim()) return;
    publish({ content: message.trim(), type: 'CHAT' });
    setMessage('');
    setShowEmoji(false);
  };

  const handleSearchRooms = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    
    setIsSearching(true);
    try {
      const results = await apiSearchRooms(query);
      // Lọc loại bỏ nhóm đã tham gia
      const unjoined = results.filter(r => !rooms.some(room => room.roomId === r.roomId));
      setSearchResults(unjoined);
    } catch (err) {
      console.error('Search failed:', err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleJoinRoom = async (room: ChatRoom) => {
    if (!authUser) return;
    try {
      const joinedRoom = await apiJoinRoom(room.roomId, authUser.username);
      setRooms(p => [...p, joinedRoom]);
      setSearchResults(prev => prev.filter(r => r.roomId !== room.roomId));
      setSearchQuery('');
      showNotification(`✅ Đã tham gia ${joinedRoom.name}`);
      await openRoom(joinedRoom);
    } catch (err) {
      const error = err as Error;
      showNotification(`❌ ${error.message}`);
    }
  };

  const handleStartCall = (t: 'AUDIO' | 'VIDEO') => {
    try {
      clientRef.current?.publish({
        destination: '/app/chat.call',
        body: JSON.stringify({
          roomId: selectedRoom?.roomId,
          sender: authUser?.username,
          content: `${authUser?.displayName} mời gọi ${t.toLowerCase()}`,
          type: 'CALL',
          callType: t,
          callAction: 'INVITE'
        })
      });
    } catch (err) {
      console.error('Failed to start call:', err);
    }
  };

  const handleCallAction = (a: 'ACCEPT' | 'END') => {
    try {
      clientRef.current?.publish({
        destination: '/app/chat.call',
        body: JSON.stringify({
          roomId: selectedRoom?.roomId,
          sender: authUser?.username,
          content: `${authUser?.displayName} ${a === 'END' ? 'kết thúc' : 'chấp nhận'} cuộc gọi`,
          type: 'CALL',
          callType: 'NONE',
          callAction: a
        })
      });
    } catch (err) {
      console.error('Failed to handle call action:', err);
    }
  };

  const toBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Đọc file thất bại'));
      reader.readAsDataURL(file);
    });

  const uploadAndSend = async (file: File) => {
    if (!selectedRoom || !clientRef.current) return;

    if (file.size > MAX_FILE_SIZE) {
      showNotification(`❌ File quá lớn — tối đa ${MAX_FILE_SIZE / 1024 / 1024}MB`);
      return;
    }

    setUploading(true);
    try {
      const base64 = await toBase64(file);
      const isImage = file.type.startsWith('image/');
      publish({
        type: isImage ? 'IMAGE' : 'FILE',
        content: file.name,
        fileUrl: base64,
        fileName: file.name,
        fileType: isImage ? 'image' : 'file',
        fileSize: file.size,
      });
    } catch {
      showNotification('❌ Không thể đọc file');
    } finally {
      setUploading(false);
    }
  };

  const handleShareLocation = () => {
    if (!selectedRoom || !clientRef.current || !connected) return;
    if (!navigator.geolocation) { showNotification('❌ Trình duyệt không hỗ trợ định vị'); return; }
    showNotification('📍 Đang lấy vị trí...');
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        publish({
          type: 'LOCATION',
          content: 'Đã chia sẻ vị trí',
          latitude: coords.latitude,
          longitude: coords.longitude
        });
        showNotification('📍 Đã chia sẻ vị trí!');
      },
      (err) => { console.error('Geo error:', err); showNotification('❌ Không lấy được vị trí — hãy cấp quyền cho trình duyệt'); },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const insertEmoji = (emoji: string) => {
    const inp = inputRef.current;
    if (!inp) { setMessage(p => p + emoji); return; }
    const s = inp.selectionStart ?? message.length, e = inp.selectionEnd ?? message.length;
    setMessage(message.slice(0, s) + emoji + message.slice(e));
    setTimeout(() => { inp.focus(); inp.setSelectionRange(s + emoji.length, s + emoji.length); }, 0);
  };

  const canChat = connected && !!selectedRoom && !!authUser;

  const renderBubble = (msg: ChatMessage) => {
    if (msg.type === 'IMAGE' && msg.fileUrl) {
      return (
        <div>
          <img
            src={msg.fileUrl}
            alt={msg.fileName}
            style={{ maxWidth: '100%', maxHeight: 240, borderRadius: 8, display: 'block', cursor: 'pointer' }}
            onClick={() => window.open(msg.fileUrl, '_blank')}
          />
          <div style={{ fontSize: 11, marginTop: 3, opacity: 0.65 }}>{msg.fileName}</div>
        </div>
      );
    }
    if (msg.type === 'FILE' && msg.fileUrl) {
      return (
        <a href={msg.fileUrl} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', color: 'inherit' }}>
          <span style={{ fontSize: 28 }}>📎</span>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{msg.fileName}</div>
            <div style={{ fontSize: 11, opacity: 0.65 }}>{formatSize(msg.fileSize)} · Tải xuống</div>
          </div>
        </a>
      );
    }
    if (msg.type === 'LOCATION' && msg.latitude && msg.longitude) {
      const mapUrl = `https://www.google.com/maps?q=${msg.latitude},${msg.longitude}`;
      const imgUrl = `https://static-maps.yandex.ru/1.x/?lang=vi_VN&ll=${msg.longitude},${msg.latitude}&z=15&l=map&size=280,150&pt=${msg.longitude},${msg.latitude},pm2rdm`;
      return (
        <a href={mapUrl} target="_blank" rel="noreferrer" style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
          <img src={imgUrl} alt="map" style={{ width: '100%', maxWidth: 250, borderRadius: 8, display: 'block' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 5, fontSize: 13 }}>
            <span>📍</span><span style={{ fontWeight: 500 }}>Xem trên Google Maps</span>
          </div>
          <div style={{ fontSize: 10, opacity: 0.55, marginTop: 2 }}>{msg.latitude.toFixed(5)}, {msg.longitude.toFixed(5)}</div>
        </a>
      );
    }
    return <div>{msg.content}</div>;
  };

  if (screen === 'login' || screen === 'register') {
    const isLogin = screen === 'login';
    const isOk = authError.startsWith('✅');
    return (
      <div className="auth-wrap">
        <div className="auth-card">
          <div className="auth-logo">💬</div>
          <div className="auth-title">{isLogin ? 'Đăng nhập' : 'Tạo tài khoản'}</div>
          <div className="auth-sub">{isLogin ? 'Chào mừng trở lại!' : 'Tham gia cộng đồng chat'}</div>
          {authError && <div className={`auth-error ${isOk ? 'ok' : ''}`}>{authError}</div>}
          <label className="auth-label">Username</label>
          <input
            className="auth-input"
            value={authForm.username}
            onChange={e => setAuthForm(f => ({ ...f, username: e.target.value }))}
            placeholder="Nhập username..."
            onKeyDown={e => e.key === 'Enter' && (isLogin ? handleLogin() : handleRegister())}
          />
          {!isLogin && (
            <>
              <label className="auth-label">Tên hiển thị</label>
              <input
                className="auth-input"
                value={authForm.displayName}
                onChange={e => setAuthForm(f => ({ ...f, displayName: e.target.value }))}
                placeholder="Tên hiển thị..."
              />
            </>
          )}
          <label className="auth-label">Mật khẩu</label>
          <input
            className="auth-input"
            type="password"
            value={authForm.password}
            onChange={e => setAuthForm(f => ({ ...f, password: e.target.value }))}
            placeholder="Nhập mật khẩu..."
            onKeyDown={e => e.key === 'Enter' && (isLogin ? handleLogin() : handleRegister())}
          />
          <button className="auth-btn" onClick={isLogin ? handleLogin : handleRegister} disabled={authLoading}>
            {authLoading ? '⏳ Đang xử lý...' : isLogin ? 'Đăng nhập' : 'Đăng ký'}
          </button>
          <div className="auth-switch">
            {isLogin ? 'Chưa có tài khoản?' : 'Đã có tài khoản?'}{' '}
            <button onClick={() => { setAuthError(''); setScreen(isLogin ? 'register' : 'login'); }}>
              {isLogin ? 'Đăng ký ngay' : 'Đăng nhập'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sb-profile">
          <div className="av-lg" style={{ background: avatarColor(authUser?.username || '') }}>
            {initials(authUser?.displayName || '')}
          </div>
          <div style={{ minWidth: 0 }}>
            <div className="profile-name">{authUser?.displayName}</div>
            <span className={`badge ${connected ? 'on' : 'off'}`}>
              <span className="bdot" />
              {connected ? 'Online' : 'Offline'}
            </span>
          </div>
          <button className="logout-btn" onClick={handleLogout} title="Đăng xuất">⎋</button>
        </div>
        <div className="sb-tabs">
          <button className={`tab-btn ${tab === 'groups' ? 'active' : ''}`} onClick={() => setTab('groups')}>
            🏠 Nhóm
          </button>
          <button className={`tab-btn ${tab === 'dm' ? 'active' : ''}`} onClick={() => setTab('dm')}>
            💬 Trực tiếp
          </button>
        </div>
        {tab === 'groups' && (
          <>
            <form className="create-form" onSubmit={handleCreateRoom}>
              <input className="sb-input" value={roomName} onChange={e => setRoomName(e.target.value)} placeholder="Tên nhóm mới..." />
              <button className="btn-create" type="submit" disabled={!roomName.trim()}>Tạo</button>
            </form>
            
            <div className="search-form">
              <input
                className="sb-input"
                value={searchQuery}
                onChange={e => handleSearchRooms(e.target.value)}
                placeholder="🔍 Tìm nhóm..."
              />
              {searchQuery && searchResults.length === 0 && !isSearching && <p className="empty-hint">Không tìm thấy nhóm</p>}
              {isSearching && <p className="empty-hint">⏳ Đang tìm...</p>}
            </div>
            
            <div className="scroll-list">
              {searchQuery && searchResults.length > 0 ? (
                <>
                  <div className="sec-label">🔍 Kết quả tìm kiếm ({searchResults.length})</div>
                  {searchResults.map(room => (
                    <div key={room.roomId} className="search-result">
                      <span className="r-icon">#</span>
                      <span className="sr-name">{room.name}</span>
                      <button className="join-btn" onClick={() => handleJoinRoom(room)}>➕ Tham gia</button>
                    </div>
                  ))}
                </>
              ) : (
                <>
                  <div className="sec-label">Nhóm trò chuyện</div>
                  {rooms.length === 0 && <p className="empty-hint">Chưa có nhóm nào</p>}
                  {rooms.map(room => (
                    <button key={room.roomId} className={`room-btn ${selectedRoom?.roomId === room.roomId ? 'active' : ''}`} onClick={() => openRoom(room)}>
                      <span className="r-icon">#</span>{room.name}
                    </button>
                  ))}
                </>
              )}
            </div>
          </>
        )}
        {tab === 'dm' && (
          <div className="scroll-list">
            <div className="sec-label">Mọi người ({users.filter(u => u.status === 'ONLINE').length} online)</div>
            {users.length === 0 && <p className="empty-hint">Chưa có người dùng nào</p>}
            {users.map(user => {
              const dmId = 'dm_' + [authUser?.username || '', user.username].sort().join('_');
              return (
                <button key={user.username} className={`user-btn ${selectedRoom?.roomId === dmId ? 'active' : ''}`} onClick={() => openDm(user)}>
                  <div className="u-av" style={{ background: avatarColor(user.username) }}>
                    {initials(user.displayName)}
                    <span className={`u-dot ${user.status === 'ONLINE' ? 'on' : 'off'}`} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div className="u-name">{user.displayName}</div>
                    <div className="u-status">{user.status === 'ONLINE' ? '🟢 Online' : `⚫ ${formatLastSeen(user.lastSeen)}`}</div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </aside>

      <main className="chat-pane">
        <div className="chat-header">
          <div className="ch-info">
            <div className="ch-title">{selectedRoom ? (selectedRoom.dm ? `💬 ${selectedRoom.name}` : `# ${selectedRoom.name}`) : 'Chọn cuộc trò chuyện'}</div>
            <div className="ch-sub">{connected ? `${messages.filter(m => ['CHAT', 'IMAGE', 'FILE', 'LOCATION'].includes(m.type)).length} tin nhắn` : 'Chưa kết nối'}</div>
          </div>
          <div className="hdr-actions">
            {!selectedRoom?.dm && <button className="hbtn" disabled={!canChat} onClick={() => openRoom(selectedRoom!)}>🚪 Vào</button>}
            <button className="hbtn" disabled={!canChat} onClick={() => handleStartCall('AUDIO')}>📞 Audio</button>
            <button className="hbtn" disabled={!canChat} onClick={() => handleStartCall('VIDEO')}>📹 Video</button>
            <button className="hbtn green" disabled={!canChat} onClick={() => handleCallAction('ACCEPT')}>✅ Nhận</button>
            <button className="hbtn red" disabled={!canChat} onClick={() => handleCallAction('END')}>📵 Cúp</button>
            {!selectedRoom?.dm && <button className="hbtn red" disabled={!selectedRoom || !authUser} onClick={handleLeaveRoom}>🚪 Rời</button>}
          </div>
        </div>

        <div className="msg-list">
          {!selectedRoom ? (
            <div className="welcome">
              <div style={{ fontSize: 52 }}>👋</div>
              <h3>Chào {authUser?.displayName}!</h3>
              <p>Chọn nhóm hoặc nhắn tin trực tiếp để bắt đầu.</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="empty-chat">
              <span style={{ fontSize: 40 }}>{selectedRoom.dm ? '💬' : '🏠'}</span>
              {selectedRoom.dm ? `Bắt đầu trò chuyện với ${selectedRoom.name}` : 'Chưa có tin nhắn. Hãy bắt đầu!'}
            </div>
          ) : (
            messages.map((msg, i) => {
              const isMe = msg.sender === authUser?.username;
              if (['JOIN', 'LEAVE'].includes(msg.type)) {
                return <div key={msg.messageId ?? i} className="event-msg">{msg.type === 'JOIN' ? `👋 ${msg.sender} đã vào` : `🚪 ${msg.sender} đã rời`}</div>;
              }
              if (msg.type === 'CALL') {
                return <div key={msg.messageId ?? i} className="event-msg">📞 {msg.content}</div>;
              }
              return (
                <div key={msg.messageId ?? i} className={`msg-row ${isMe ? 'me' : 'other'}`}>
                  {!isMe && <div className="av-sm" style={{ background: avatarColor(msg.sender) }}>{initials(msg.sender)}</div>}
                  <div className="bwrap">
                    {!isMe && <div className="b-name">{msg.sender}</div>}
                    <div className="bubble">{renderBubble(msg)}</div>
                    <div className="b-time">{formatTime(msg.createdAt)}</div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {notification && <div className="toast">{notification}</div>}
        {uploading && <div className="uploading-bar" />}

        <div className="compose">
          <form onSubmit={e => { e.preventDefault(); handleSend(); }}>
            <div className="compose-box">
              <input
                ref={inputRef}
                className="msg-input"
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder={canChat ? 'Viết tin nhắn...' : 'Chọn cuộc trò chuyện để bắt đầu'}
                disabled={!canChat}
              />
              <div className="compose-actions">
                <button type="button" className="cta-btn" disabled={!canChat || uploading} title="Gửi file" onClick={() => fileInputRef.current?.click()}>
                  📎
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  style={{ display: 'none' }}
                  title="Gửi file"
                  onChange={e => { const f = e.target.files?.[0]; if (f) uploadAndSend(f); e.target.value = ''; }}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.rar"
                />
                <button type="button" className="cta-btn" disabled={!canChat || uploading} title="Gửi ảnh" onClick={() => imageInputRef.current?.click()}>
                  🖼️
                </button>
                <input
                  ref={imageInputRef}
                  type="file"
                  style={{ display: 'none' }}
                  title="Gửi ảnh"
                  onChange={e => { const f = e.target.files?.[0]; if (f) uploadAndSend(f); e.target.value = ''; }}
                  accept="image/*"
                />
                <button type="button" className="cta-btn" disabled={!canChat} title="Chia sẻ vị trí" onClick={handleShareLocation}>
                  📍
                </button>
                <div className="emoji-zone">
                  <button type="button" className="cta-btn" disabled={!canChat} title="Emoji" onClick={() => setShowEmoji(v => !v)}>
                    😊
                  </button>
                  {showEmoji && (
                    <div className="emoji-picker">
                      <div className="emoji-tabs">
                        {EMOJI_CATEGORIES.map((cat, idx) => (
                          <button key={idx} type="button"
                            className={`emoji-tab-btn ${emojiTab === idx ? 'active' : ''}`}
                            onClick={() => setEmojiTab(idx)}
                            title={cat.name}
                          >{cat.label}</button>
                        ))}
                      </div>
                      <div className="emoji-tab-label">{EMOJI_CATEGORIES[emojiTab].name}</div>
                      <div className="emoji-grid">
                        {EMOJI_CATEGORIES[emojiTab].emojis.map(e => (
                          <button key={e} type="button" className="ec" onClick={() => insertEmoji(e)}>{e}</button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <button className="send-btn" type="submit" disabled={!message.trim() || !canChat}>
                ➤
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}