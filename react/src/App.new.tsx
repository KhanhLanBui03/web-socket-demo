/**
 * Refactored App Component (Production-Ready)
 * Architecture:
 * - Separate concerns (auth, API, WebSocket, UI)
 * - Modular components
 * - Custom hooks for state management
 * - Centralized types
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { StompSubscription } from '@stomp/stompjs';
import { useWebSocket } from './hooks/useWebSocket';
import { authApi, roomApi, userApi } from './lib/api';
import { fileToBase64, MAX_FILE_SIZE, formatLastSeen } from './lib/utils';
import { AuthUser, ChatRoom, ChatMessage, User, Screen, Tab, AuthForm } from './types';
import { MessageBubble } from './components/MessageBubble';
import './styles/app.css';

/**
 * Auth Screen Component
 */
function AuthScreen({
  isLogin,
  form,
  error,
  loading,
  onFormChange,
  onSubmit,
  onToggle,
}: {
  isLogin: boolean;
  form: AuthForm;
  error: string;
  loading: boolean;
  onFormChange: (form: AuthForm) => void;
  onSubmit: () => void;
  onToggle: () => void;
}) {
  const isOk = error.startsWith('✅');
  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-logo">💬</div>
        <div className="auth-title">{isLogin ? 'Đăng nhập' : 'Tạo tài khoản'}</div>
        <div className="auth-sub">
          {isLogin ? 'Chào mừng trở lại!' : 'Tham gia cộng đồng chat'}
        </div>

        {error && (
          <div className={`auth-error ${isOk ? 'ok' : ''}`}>{error}</div>
        )}

        <label className="auth-label">Username</label>
        <input
          className="auth-input"
          value={form.username}
          onChange={(e) =>
            onFormChange({ ...form, username: e.target.value })
          }
          placeholder="Nhập username..."
          onKeyDown={(e) =>
            e.key === 'Enter' && onSubmit()
          }
        />

        {!isLogin && (
          <>
            <label className="auth-label">Tên hiển thị</label>
            <input
              className="auth-input"
              value={form.displayName}
              onChange={(e) =>
                onFormChange({ ...form, displayName: e.target.value })
              }
              placeholder="Tên hiển thị..."
            />
          </>
        )}

        <label className="auth-label">Mật khẩu</label>
        <input
          className="auth-input"
          type="password"
          value={form.password}
          onChange={(e) =>
            onFormChange({ ...form, password: e.target.value })
          }
          placeholder="Nhập mật khẩu..."
          onKeyDown={(e) =>
            e.key === 'Enter' && onSubmit()
          }
        />

        <button
          className="auth-btn"
          onClick={onSubmit}
          disabled={loading}
        >
          {loading ? '⏳ Đang xử lý...' : isLogin ? 'Đăng nhập' : 'Đăng ký'}
        </button>

        <div className="auth-switch">
          {isLogin ? 'Chưa có tài khoản?' : 'Đã có tài khoản?'}
          {' '}
          <button onClick={onToggle}>
            {isLogin ? 'Đăng ký ngay' : 'Đăng nhập'}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Main App Component
 */
export default function App() {
  // Auth State
  const [screen, setScreen] = useState<Screen>('login');
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authForm, setAuthForm] = useState<AuthForm>({
    username: '',
    password: '',
    displayName: '',
  });
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Chat State
  const [tab, setTab] = useState<Tab>('groups');
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [message, setMessage] = useState('');
  const [notification, setNotif] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [roomName, setRoomName] = useState('');

  // Refs
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const notifTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const subscriptionRef = useRef<StompSubscription | null>(null);
  const userSubRef = useRef<StompSubscription | null>(null);

  // WebSocket Hook
  const ws = useWebSocket(
    () => setConnected(true),
    () => setConnected(false)
  );

  // Effects
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.emoji-zone')) {
        setShowEmoji(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    return () => {
      subscriptionRef.current?.unsubscribe();
      userSubRef.current?.unsubscribe();
      ws.disconnect();
    };
  }, [ws]);

  // Handlers
  const showNotification = useCallback((text: string) => {
    setNotif(text);
    if (notifTimerRef.current) clearTimeout(notifTimerRef.current);
    notifTimerRef.current = setTimeout(() => setNotif(''), 4000);
  }, []);

  const handleLogin = async () => {
    setAuthError('');
    setAuthLoading(true);
    try {
      const user = await authApi.login(
        authForm.username,
        authForm.password
      );
      setAuthUser(user);
      setScreen('chat');
      await fetchInitialData(user.username);
      ws.connect(user.username);
      subscribeToUserUpdates();
    } catch (err) {
      setAuthError(
        err instanceof Error ? err.message : 'Lỗi kết nối server'
      );
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegister = async () => {
    setAuthError('');
    setAuthLoading(true);
    try {
      await authApi.register(authForm);
      setAuthForm((f) => ({
        ...f,
        password: '',
        displayName: '',
      }));
      setAuthError('✅ Đăng ký thành công! Hãy đăng nhập.');
      setScreen('login');
    } catch (err) {
      setAuthError(
        err instanceof Error ? err.message : 'Lỗi kết nối server'
      );
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    if (authUser) {
      await authApi.logout(authUser.username);
    }
    subscriptionRef.current?.unsubscribe();
    userSubRef.current?.unsubscribe();
    ws.disconnect();
    setAuthUser(null);
    setScreen('login');
    setConnected(false);
    setSelectedRoom(null);
    setMessages([]);
    setRooms([]);
    setUsers([]);
  };

  const fetchInitialData = async (username: string) => {
    const [roomsRes, usersRes] = await Promise.all([
      roomApi.getAll(),
      userApi.getAll(username),
    ]);
    setRooms(roomsRes.filter((r) => !r.dm));
    setUsers(usersRes);
  };

  const refreshUsers = async () => {
    if (!authUser) return;
    const users = await userApi.getAll(authUser.username);
    setUsers(users);
  };

  const subscribeToUserUpdates = () => {
    const client = ws.getClient();
    if (!client) return;
    userSubRef.current = ws.subscribe('/topic/users/online', () =>
      refreshUsers()
    );
  };

  const subscribeRoom = (roomId: string) => {
    subscriptionRef.current?.unsubscribe();
    const client = ws.getClient();
    if (!client) return;

    subscriptionRef.current = ws.subscribe(`/topic/rooms/${roomId}`, (msg) => {
      setMessages((prev) => {
        const arr = Array.isArray(prev) ? prev : [];
        if (msg.messageId && arr.some((m) => m.messageId === msg.messageId)) {
          return arr;
        }
        return [...arr, msg];
      });

      if (
        msg.type === 'CALL' &&
        msg.sender !== authUser?.username
      ) {
        if (msg.callAction === 'INVITE') {
          showNotification(
            `📞 ${msg.sender} mời gọi ${msg.callType?.toLowerCase()}`
          );
        }
        if (msg.callAction === 'END') {
          showNotification(`Cuộc gọi kết thúc bởi ${msg.sender}`);
        }
        if (msg.callAction === 'ACCEPT') {
          showNotification(`${msg.sender} đã chấp nhận`);
        }
      }
    });
  };

  const loadHistory = async (roomId: string) => {
    try {
      const history = await roomApi.getHistory(roomId);
      setMessages(history);
    } catch {
      setMessages([]);
    }
  };

  const openRoom = async (room: ChatRoom) => {
    if (room.roomId === selectedRoom?.roomId) return;
    setSelectedRoom(room);
    setMessages([]);

    if (ws.isConnected() && authUser) {
      subscribeRoom(room.roomId);
      ws.publish('/app/chat.addUser', {
        roomId: room.roomId,
        sender: authUser.username,
        type: 'JOIN',
        content: `${authUser.displayName} đã vào phòng`,
      });
    }

    await loadHistory(room.roomId);
  };

  const openDm = async (targetUser: User) => {
    if (!authUser) return;
    try {
      const room = await userApi.createDM(
        authUser.username,
        targetUser.username
      );
      room.name = targetUser.displayName;
      setTab('dm');
      await openRoom(room);
    } catch {
      showNotification('❌ Không thể mở cuộc trò chuyện');
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomName.trim() || !authUser) return;

    try {
      const room = await roomApi.create(roomName, authUser.username);
      setRooms((p) => [...p, room]);
      setRoomName('');
      await openRoom(room);
    } catch (err) {
      showNotification('❌ Tạo phòng thất bại');
    }
  };

  const handleLeaveRoom = async () => {
    if (!selectedRoom || !authUser) return;

    ws.publish('/app/chat.sendMessage', {
      roomId: selectedRoom.roomId,
      sender: authUser.username,
      content: `${authUser.displayName} đã rời phòng`,
      type: 'LEAVE',
    });

    await roomApi.leave(selectedRoom.roomId, authUser.username);
    subscriptionRef.current?.unsubscribe();
    subscriptionRef.current = null;

    const name = selectedRoom.name;
    setSelectedRoom(null);
    setMessages([]);
    showNotification(`Bạn đã rời ${name}`);
  };

  const publishMessage = (extra: Partial<ChatMessage>) => {
    if (!selectedRoom || !authUser || !ws.isConnected()) return;
    ws.publish('/app/chat.sendMessage', {
      roomId: selectedRoom.roomId,
      sender: authUser.username,
      content: '',
      type: 'CHAT',
      ...extra,
    });
  };

  const handleSend = () => {
    if (!message.trim()) return;
    publishMessage({
      content: message.trim(),
      type: 'CHAT',
    });
    setMessage('');
    setShowEmoji(false);
  };

  const handleStartCall = (callType: 'AUDIO' | 'VIDEO') => {
    ws.publish('/app/chat.call', {
      roomId: selectedRoom?.roomId,
      sender: authUser?.username,
      content: `${authUser?.displayName} mời gọi ${callType.toLowerCase()}`,
      type: 'CALL',
      callType,
      callAction: 'INVITE',
    });
  };

  const handleCallAction = (action: 'ACCEPT' | 'END') => {
    ws.publish('/app/chat.call', {
      roomId: selectedRoom?.roomId,
      sender: authUser?.username,
      content: `${authUser?.displayName} ${action === 'END' ? 'kết thúc' : 'chấp nhận'} cuộc gọi`,
      type: 'CALL',
      callType: 'NONE',
      callAction: action,
    });
  };

  const uploadAndSend = async (file: File) => {
    if (!selectedRoom || !ws.isConnected()) return;

    if (file.size > MAX_FILE_SIZE) {
      showNotification(
        `❌ File quá lớn — tối đa ${MAX_FILE_SIZE / 1024 / 1024}MB`
      );
      return;
    }

    setUploading(true);
    try {
      const base64 = await fileToBase64(file);
      const isImage = file.type.startsWith('image/');
      publishMessage({
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
    if (!selectedRoom || !ws.isConnected()) return;
    if (!navigator.geolocation) {
      showNotification(
        '❌ Trình duyệt không hỗ trợ định vị'
      );
      return;
    }

    showNotification('📍 Đang lấy vị trí...');
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        publishMessage({
          type: 'LOCATION',
          content: 'Đã chia sẻ vị trí',
          latitude: coords.latitude,
          longitude: coords.longitude,
        });
        showNotification('📍 Đã chia sẻ vị trí!');
      },
      () => {
        showNotification(
          '❌ Không lấy được vị trí — hãy cấp quyền cho trình duyệt'
        );
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const insertEmoji = (emoji: string) => {
    const inp = inputRef.current;
    if (!inp) {
      setMessage((p) => p + emoji);
      return;
    }
    const start = inp.selectionStart ?? message.length;
    const end = inp.selectionEnd ?? message.length;
    setMessage(message.slice(0, start) + emoji + message.slice(end));
    setTimeout(() => {
      inp.focus();
      inp.setSelectionRange(
        start + emoji.length,
        start + emoji.length
      );
    }, 0);
  };

  const canChat =
    connected && !!selectedRoom && !!authUser;

  // Auth Screen
  if (screen === 'login' || screen === 'register') {
    const isLogin = screen === 'login';
    return (
      <>
        <AuthScreen
          isLogin={isLogin}
          form={authForm}
          error={authError}
          loading={authLoading}
          onFormChange={setAuthForm}
          onSubmit={
            isLogin ? handleLogin : handleRegister
          }
          onToggle={() => {
            setAuthError('');
            setScreen(
              isLogin ? 'register' : 'login'
            );
          }}
        />
      </>
    );
  }

  // Chat Screen
  const groupRooms = rooms.filter((r) => !r.dm);
  const onlineUserCount = users.filter(
    (u) => u.status === 'ONLINE'
  ).length;

  return (
    <div className="app">
      {/* Sidebar */}
      <aside className="sidebar">
        {/* Profile */}
        <div className="sb-profile">
          <div
            className="av-lg"
            style={{
              background: '#818cf8',
            }}
          >
            {authUser?.displayName.charAt(0).toUpperCase()}
          </div>
          <div style={{ minWidth: 0 }}>
            <div className="profile-name">
              {authUser?.displayName}
            </div>
            <span
              className={`badge ${connected ? 'on' : 'off'}`}
            >
              <span className="bdot" />
              {connected ? 'Online' : 'Offline'}
            </span>
          </div>
          <button
            className="logout-btn"
            onClick={handleLogout}
            title="Đăng xuất"
          >
            ⎋
          </button>
        </div>

        {/* Tabs */}
        <div className="sb-tabs">
          <button
            className={`tab-btn ${
              tab === 'groups' ? 'active' : ''
            }`}
            onClick={() => setTab('groups')}
          >
            🏠 Nhóm
          </button>
          <button
            className={`tab-btn ${
              tab === 'dm' ? 'active' : ''
            }`}
            onClick={() => setTab('dm')}
          >
            💬 Trực tiếp
          </button>
        </div>

        {/* Groups Tab */}
        {tab === 'groups' && (
          <>
            <form
              className="create-form"
              onSubmit={handleCreateRoom}
            >
              <input
                className="sb-input"
                value={roomName}
                onChange={(e) =>
                  setRoomName(e.target.value)
                }
                placeholder="Tên nhóm mới..."
              />
              <button
                className="btn-create"
                type="submit"
                disabled={!roomName.trim()}
              >
                Tạo
              </button>
            </form>
            <div className="scroll-list">
              <div className="sec-label">
                Nhóm trò chuyện
              </div>
              {groupRooms.length === 0 && (
                <p className="empty-hint">
                  Chưa có nhóm nào
                </p>
              )}
              {groupRooms.map((room) => (
                <button
                  key={room.roomId}
                  className={`room-btn ${
                    selectedRoom?.roomId === room.roomId
                      ? 'active'
                      : ''
                  }`}
                  onClick={() => openRoom(room)}
                >
                  <span className="r-icon">#</span>
                  {room.name}
                </button>
              ))}
            </div>
          </>
        )}

        {/* DMs Tab */}
        {tab === 'dm' && (
          <div className="scroll-list">
            <div className="sec-label">
              Mọi người ({onlineUserCount} online)
            </div>
            {users.length === 0 && (
              <p className="empty-hint">
                Chưa có người dùng nào
              </p>
            )}
            {users.map((user) => {
              const dmId =
                'dm_' +
                [
                  authUser?.username || '',
                  user.username,
                ]
                  .sort()
                  .join('_');
              return (
                <button
                  key={user.username}
                  className={`user-btn ${
                    selectedRoom?.roomId === dmId
                      ? 'active'
                      : ''
                  }`}
                  onClick={() => openDm(user)}
                >
                  <div
                    className="u-av"
                    style={{
                      background: '#818cf8',
                    }}
                  >
                    {user.displayName
                      .charAt(0)
                      .toUpperCase()}
                    <span
                      className={`u-dot ${
                        user.status === 'ONLINE'
                          ? 'on'
                          : 'off'
                      }`}
                    />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div className="u-name">
                      {user.displayName}
                    </div>
                    <div className="u-status">
                      {user.status === 'ONLINE'
                        ? '🟢 Online'
                        : `⚫ ${formatLastSeen(
                            user.lastSeen
                          )}`}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </aside>

      {/* Chat Pane */}
      <main className="chat-pane">
        {/* Header */}
        <div className="chat-header">
          <div className="ch-info">
            <div className="ch-title">
              {selectedRoom
                ? selectedRoom.dm
                  ? `💬 ${selectedRoom.name}`
                  : `# ${selectedRoom.name}`
                : 'Chọn cuộc trò chuyện'}
            </div>
            <div className="ch-sub">
              {connected
                ? `${messages.filter((m) =>
                    [
                      'CHAT',
                      'IMAGE',
                      'FILE',
                      'LOCATION',
                    ].includes(m.type)
                  ).length} tin nhắn`
                : 'Chưa kết nối'}
            </div>
          </div>
          <div className="hdr-actions">
            <button
              className="hbtn"
              disabled={!canChat}
              onClick={() =>
                handleStartCall('AUDIO')
              }
            >
              📞 Audio
            </button>
            <button
              className="hbtn"
              disabled={!canChat}
              onClick={() =>
                handleStartCall('VIDEO')
              }
            >
              📹 Video
            </button>
            <button
              className="hbtn green"
              disabled={!canChat}
              onClick={() =>
                handleCallAction('ACCEPT')
              }
            >
              ✅ Nhận
            </button>
            <button
              className="hbtn red"
              disabled={!canChat}
              onClick={() =>
                handleCallAction('END')
              }
            >
              📵 Cúp
            </button>
            {!selectedRoom?.dm && (
              <button
                className="hbtn leave"
                disabled={!selectedRoom || !authUser}
                onClick={handleLeaveRoom}
              >
                🚪 Rời
              </button>
            )}
          </div>
        </div>

        {/* Message List */}
        <div className="msg-list">
          {!selectedRoom ? (
            <div className="welcome">
              <div style={{ fontSize: 52 }}>
                👋
              </div>
              <h3>
                Chào {authUser?.displayName}!
              </h3>
              <p>
                Chọn nhóm hoặc nhắn tin trực tiếp
                để bắt đầu.
              </p>
            </div>
          ) : messages.length === 0 ? (
            <div className="empty-chat">
              <span style={{ fontSize: 40 }}>
                {selectedRoom.dm ? '💬' : '🏠'}
              </span>
              {selectedRoom.dm
                ? `Bắt đầu trò chuyện với ${selectedRoom.name}`
                : 'Chưa có tin nhắn. Hãy bắt đầu!'}
            </div>
          ) : (
            messages.map((msg, i) => {
              const isMe =
                msg.sender === authUser?.username;
              if (
                ['JOIN', 'LEAVE'].includes(msg.type)
              ) {
                return (
                  <div
                    key={msg.messageId ?? i}
                    className="event-msg"
                  >
                    {msg.type === 'JOIN'
                      ? `👋 ${msg.sender} đã vào`
                      : `🚪 ${msg.sender} đã rời`}
                  </div>
                );
              }
              if (msg.type === 'CALL') {
                return (
                  <div
                    key={msg.messageId ?? i}
                    className="event-msg"
                  >
                    📞 {msg.content}
                  </div>
                );
              }
              return (
                <MessageBubble
                  key={msg.messageId ?? i}
                  message={msg}
                  isOwn={isMe}
                  sender={msg.sender}
                />
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Notifications */}
        {notification && (
          <div className="toast">{notification}</div>
        )}
        {uploading && (
          <div className="uploading-bar" />
        )}

        {/* Compose Area */}
        <div className="compose">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
          >
            <div className="compose-box">
              <input
                ref={inputRef}
                className="msg-input"
                value={message}
                onChange={(e) =>
                  setMessage(e.target.value)
                }
                placeholder={
                  canChat
                    ? 'Viết tin nhắn...'
                    : 'Chọn cuộc trò chuyện để bắt đầu'
                }
                disabled={!canChat}
              />
              <div className="compose-actions">
                <button
                  type="button"
                  className="cta-btn"
                  disabled={!canChat || uploading}
                  title="Gửi file"
                  onClick={() =>
                    fileInputRef.current?.click()
                  }
                >
                  📎
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const f =
                      e.target.files?.[0];
                    if (f) uploadAndSend(f);
                    e.target.value = '';
                  }}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.rar"
                />

                <button
                  type="button"
                  className="cta-btn"
                  disabled={!canChat || uploading}
                  title="Gửi ảnh"
                  onClick={() =>
                    imageInputRef.current?.click()
                  }
                >
                  🖼️
                </button>
                <input
                  ref={imageInputRef}
                  type="file"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const f =
                      e.target.files?.[0];
                    if (f) uploadAndSend(f);
                    e.target.value = '';
                  }}
                  accept="image/*"
                />

                <button
                  type="button"
                  className="cta-btn"
                  disabled={!canChat}
                  title="Chia sẻ vị trí"
                  onClick={handleShareLocation}
                >
                  📍
                </button>

                <div className="emoji-zone">
                  <button
                    type="button"
                    className="cta-btn"
                    disabled={!canChat}
                    title="Emoji"
                    onClick={() =>
                      setShowEmoji((v) => !v)
                    }
                  >
                    😊
                  </button>
                  {/* Emoji Picker will be added in next refactor */}
                </div>
              </div>
              <button
                className="send-btn"
                type="submit"
                disabled={
                  !message.trim() || !canChat
                }
              >
                ➤
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
