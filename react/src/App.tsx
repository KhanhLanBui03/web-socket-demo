import { useEffect, useRef, useState, useCallback } from 'react';
import SockJS from 'sockjs-client';
import { Client, IMessage, StompSubscription } from '@stomp/stompjs';

interface User { username: string; displayName: string; status: 'ONLINE' | 'OFFLINE'; lastSeen?: number; }
interface ChatRoom { roomId: string; name: string; createdBy?: string; members?: string[]; dm?: boolean; }
interface ChatMessage {
  messageId?: string; roomId: string; sender: string; content: string;
  type: 'CHAT' | 'JOIN' | 'LEAVE' | 'CALL' | 'FILE' | 'IMAGE' | 'LOCATION';
  createdAt?: number; callType?: string; callAction?: string;
  fileUrl?: string; fileName?: string; fileType?: string; fileSize?: number;
  latitude?: number; longitude?: number; locationName?: string;
}
type Screen = 'login' | 'register' | 'chat';
type Tab = 'groups' | 'dm';

const API_URL = 'http://localhost:8080';
const EMOJI_LIST = ['😀', '😂', '🥲', '😍', '🥰', '😎', '🤩', '😏', '😒', '😢', '😡', '🥳', '😴', '🤔', '🤯', '😱', '🥺', '😇', '🤗', '😤', '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💔', '❣️', '👍', '👎', '👏', '🙌', '🤝', '🙏', '✌️', '🤞', '💪', '🫶', '🎉', '🎊', '🎈', '🔥', '✨', '💫', '⭐', '🌟', '💥', '🎯', '😋', '🤤', '😛', '😝', '🤪', '🥴', '😵', '🤐', '🥱', '😪', '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🍕', '🍔', '🍟', '🌮', '🍜', '🍣', '🍦', '🎂', '☕', '🧋'];

const avatarColor = (n: string) => { const c = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#6366f1', '#ec4899', '#8b5cf6']; let h = 0; for (const ch of n) h = (h * 31 + ch.charCodeAt(0)) % c.length; return c[h]; };
const initials = (n: string) => n ? n.charAt(0).toUpperCase() : '?';
const fmtSize = (b?: number) => !b ? '' : b < 1024 ? `${b}B` : b < 1048576 ? `${(b / 1024).toFixed(1)}KB` : `${(b / 1048576).toFixed(1)}MB`;
const fmtTime = (ts?: number) => ts ? new Date(ts).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '';
const fmtLast = (ts?: number) => { if (!ts) return ''; const d = Date.now() - ts; if (d < 60000) return 'vừa xong'; if (d < 3600000) return `${Math.floor(d / 60000)} phút trước`; return `${Math.floor(d / 3600000)} giờ trước`; };

export default function App() {
  const [screen, setScreen] = useState<Screen>('login');
  const [authUser, setAuthUser] = useState<{ username: string; displayName: string } | null>(null);
  const [authForm, setAuthForm] = useState({ username: '', password: '', displayName: '' });
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
  const clientRef = useRef<Client | null>(null);
  const subscriptionRef = useRef<StompSubscription | null>(null);
  const userSubRef = useRef<StompSubscription | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const notifTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  useEffect(() => { const h = (e: MouseEvent) => { if (!(e.target as HTMLElement).closest('.emoji-zone')) setShowEmoji(false); }; document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h); }, []);
  useEffect(() => () => { subscriptionRef.current?.unsubscribe(); userSubRef.current?.unsubscribe(); clientRef.current?.deactivate(); }, []);

  const showNotification = useCallback((text: string) => { setNotif(text); if (notifTimerRef.current) clearTimeout(notifTimerRef.current); notifTimerRef.current = setTimeout(() => setNotif(''), 4000); }, []);

  const handleLogin = async () => {
    setAuthError(''); setAuthLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: authForm.username.trim(), password: authForm.password }) });
      const data = await res.json();
      if (!res.ok) { setAuthError(data.error || 'Đăng nhập thất bại'); return; }
      setAuthUser(data); setScreen('chat');
      await fetchInitialData(data.username);
      connectWs(data.username);
    } catch { setAuthError('Lỗi kết nối server'); } finally { setAuthLoading(false); }
  };

  const handleRegister = async () => {
    setAuthError(''); setAuthLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: authForm.username.trim(), password: authForm.password, displayName: authForm.displayName.trim() }) });
      const data = await res.json();
      if (!res.ok) { setAuthError(data.error || 'Đăng ký thất bại'); return; }
      setAuthForm(f => ({ ...f, password: '', displayName: '' }));
      setAuthError('✅ Đăng ký thành công! Hãy đăng nhập.');
      setScreen('login');
    } catch { setAuthError('Lỗi kết nối server'); } finally { setAuthLoading(false); }
  };

  const handleLogout = async () => {
    if (authUser) await fetch(`${API_URL}/api/auth/logout`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: authUser.username }) });
    subscriptionRef.current?.unsubscribe(); userSubRef.current?.unsubscribe();
    clientRef.current?.deactivate(); clientRef.current = null;
    setAuthUser(null); setScreen('login'); setConnected(false);
    setSelectedRoom(null); setMessages([]); setRooms([]); setUsers([]);
  };

  const fetchInitialData = async (username: string) => {
    const [r, u] = await Promise.all([fetch(`${API_URL}/api/rooms`), fetch(`${API_URL}/api/users?exclude=${encodeURIComponent(username)}`)]);
    if (r.ok) setRooms((await r.json()).filter((x: ChatRoom) => !x.dm));
    if (u.ok) setUsers(await u.json());
  };

  const refreshUsers = async () => {
    if (!authUser) return;
    const r = await fetch(`${API_URL}/api/users?exclude=${encodeURIComponent(authUser.username)}`);
    if (r.ok) setUsers(await r.json());
  };

  const connectWs = useCallback((username: string) => {
    const client = new Client({
      webSocketFactory: () => new SockJS(`${API_URL}/ws`) as any,
      reconnectDelay: 5000,
      onConnect: () => {
        setConnected(true);
        userSubRef.current = client.subscribe('/topic/users/online', () => refreshUsers());
      },
      onDisconnect: () => setConnected(false),
      onStompError: (f) => { console.error(f.headers['message']); setConnected(false); },
    });
    client.activate(); clientRef.current = client;
  }, []);

  const subscribeRoom = (roomId: string, client: Client) => {
    subscriptionRef.current?.unsubscribe();
    subscriptionRef.current = client.subscribe(`/topic/rooms/${roomId}`, (p: IMessage) => {
      const body = JSON.parse(p.body) as ChatMessage;
      setMessages(prev => body.messageId && prev.some(m => m.messageId === body.messageId) ? prev : [...prev, body]);
      if (body.type === 'CALL' && body.sender !== authUser?.username) {
        if (body.callAction === 'INVITE') showNotification(`📞 ${body.sender} mời gọi ${body.callType?.toLowerCase()}`);
        if (body.callAction === 'END') showNotification(`Cuộc gọi kết thúc bởi ${body.sender}`);
        if (body.callAction === 'ACCEPT') showNotification(`${body.sender} đã chấp nhận`);
      }
    });
  };

  const loadHistory = async (roomId: string) => {
    try { const r = await fetch(`${API_URL}/api/rooms/${roomId}/history`); setMessages(r.ok ? await r.json() : []); }
    catch { setMessages([]); }
  };

  const openRoom = async (room: ChatRoom) => {
    if (room.roomId === selectedRoom?.roomId) return;
    setSelectedRoom(room); setMessages([]);
    await loadHistory(room.roomId);
    if (clientRef.current && connected) {
      subscribeRoom(room.roomId, clientRef.current);
      clientRef.current.publish({ destination: '/app/chat.addUser', body: JSON.stringify({ roomId: room.roomId, sender: authUser?.username, type: 'JOIN', content: `${authUser?.displayName} đã vào phòng` }) });
    }
  };

  const openDm = async (targetUser: User) => {
    if (!authUser) return;
    const res = await fetch(`${API_URL}/api/users/dm`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ from: authUser.username, to: targetUser.username }) });
    if (!res.ok) { showNotification('❌ Không thể mở cuộc trò chuyện'); return; }
    const room: ChatRoom = await res.json();
    room.name = targetUser.displayName;
    setTab('dm');
    await openRoom(room);
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault(); if (!roomName.trim() || !authUser) return;
    const res = await fetch(`${API_URL}/api/rooms`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: roomName.trim(), createdBy: authUser.username }) });
    if (res.ok) { const r = await res.json(); setRooms(p => [...p, r]); setRoomName(''); openRoom(r); }
  };

  const handleLeaveRoom = async () => {
    if (!selectedRoom || !authUser) return;
    clientRef.current?.publish({ destination: '/app/chat.sendMessage', body: JSON.stringify({ roomId: selectedRoom.roomId, sender: authUser.username, content: `${authUser.displayName} đã rời phòng`, type: 'LEAVE' }) });
    await fetch(`${API_URL}/api/rooms/${selectedRoom.roomId}/leave?username=${encodeURIComponent(authUser.username)}`, { method: 'POST' });
    subscriptionRef.current?.unsubscribe(); subscriptionRef.current = null;
    const name = selectedRoom.name; setSelectedRoom(null); setMessages([]);
    showNotification(`Bạn đã rời ${name}`);
  };

  const publish = (extra: Partial<ChatMessage>) => {
    if (!selectedRoom || !clientRef.current || !authUser) return;
    clientRef.current.publish({ destination: '/app/chat.sendMessage', body: JSON.stringify({ roomId: selectedRoom.roomId, sender: authUser.username, content: '', type: 'CHAT', ...extra }) });
  };

  const handleSend = () => { if (!message.trim()) return; publish({ content: message.trim(), type: 'CHAT' }); setMessage(''); setShowEmoji(false); };
  const handleStartCall = (t: 'AUDIO' | 'VIDEO') => clientRef.current?.publish({ destination: '/app/chat.call', body: JSON.stringify({ roomId: selectedRoom?.roomId, sender: authUser?.username, content: `${authUser?.displayName} mời gọi ${t.toLowerCase()}`, type: 'CALL', callType: t, callAction: 'INVITE' }) });
  const handleCallAction = (a: 'ACCEPT' | 'END') => clientRef.current?.publish({ destination: '/app/chat.call', body: JSON.stringify({ roomId: selectedRoom?.roomId, sender: authUser?.username, content: `${authUser?.displayName} ${a === 'END' ? 'kết thúc' : 'chấp nhận'} cuộc gọi`, type: 'CALL', callType: 'NONE', callAction: a }) });

  const uploadAndSend = async (file: File) => {
    if (!selectedRoom || !clientRef.current) return;
    setUploading(true);
    try {
      const form = new FormData(); form.append('file', file);
      const res = await fetch(`${API_URL}/api/upload`, { method: 'POST', body: form });
      if (!res.ok) { showNotification('❌ Upload thất bại'); return; }
      const d = await res.json();
      publish({ type: d.fileType === 'image' ? 'IMAGE' : 'FILE', content: d.fileName, fileUrl: d.url, fileName: d.fileName, fileType: d.fileType, fileSize: d.fileSize });
    } catch { showNotification('❌ Lỗi upload'); } finally { setUploading(false); }
  };

  const handleShareLocation = () => {
    if (!selectedRoom || !clientRef.current) return;
    if (!navigator.geolocation) { showNotification('❌ Trình duyệt không hỗ trợ định vị'); return; }
    showNotification('📍 Đang lấy vị trí...');
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => publish({ type: 'LOCATION', content: 'Đã chia sẻ vị trí', latitude: coords.latitude, longitude: coords.longitude }),
      () => showNotification('❌ Không thể lấy vị trí')
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
    if (msg.type === 'IMAGE' && msg.fileUrl) return (<div><img src={msg.fileUrl} alt={msg.fileName} style={{ maxWidth: '100%', maxHeight: 240, borderRadius: 8, display: 'block', cursor: 'pointer' }} onClick={() => window.open(msg.fileUrl, '_blank')} /><div style={{ fontSize: 11, marginTop: 3, opacity: .65 }}>{msg.fileName}</div></div>);
    if (msg.type === 'FILE' && msg.fileUrl) return (<a href={msg.fileUrl} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', color: 'inherit' }}><span style={{ fontSize: 28 }}>📎</span><div><div style={{ fontWeight: 600, fontSize: 13 }}>{msg.fileName}</div><div style={{ fontSize: 11, opacity: .65 }}>{fmtSize(msg.fileSize)} · Tải xuống</div></div></a>);
    if (msg.type === 'LOCATION' && msg.latitude && msg.longitude) {
      const mapUrl = `https://www.google.com/maps?q=${msg.latitude},${msg.longitude}`;
      const imgUrl = `https://static-maps.yandex.ru/1.x/?lang=vi_VN&ll=${msg.longitude},${msg.latitude}&z=15&l=map&size=280,150&pt=${msg.longitude},${msg.latitude},pm2rdm`;
      return (<a href={mapUrl} target="_blank" rel="noreferrer" style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}><img src={imgUrl} alt="map" style={{ width: '100%', maxWidth: 250, borderRadius: 8, display: 'block' }} /><div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 5, fontSize: 13 }}><span>📍</span><span style={{ fontWeight: 500 }}>Xem trên Google Maps</span></div><div style={{ fontSize: 10, opacity: .55, marginTop: 2 }}>{msg.latitude.toFixed(5)}, {msg.longitude.toFixed(5)}</div></a>);
    }
    return <div>{msg.content}</div>;
  };

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@500&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Plus Jakarta Sans',sans-serif;background:#0d1117;min-height:100vh;overflow:hidden}
    body::before{content:'';position:fixed;inset:0;background-image:linear-gradient(rgba(99,102,241,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,.05) 1px,transparent 1px);background-size:48px 48px;pointer-events:none}
    ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:rgba(255,255,255,.1);border-radius:99px}
    .auth-wrap{position:relative;z-index:1;display:flex;align-items:center;justify-content:center;height:100vh}
    .auth-card{background:rgba(22,27,34,.95);border:1px solid rgba(255,255,255,.09);border-radius:20px;padding:36px 32px;width:360px;backdrop-filter:blur(20px)}
    .auth-logo{text-align:center;font-size:32px;margin-bottom:6px}
    .auth-title{text-align:center;font-size:22px;font-weight:700;color:#e6edf3;margin-bottom:4px}
    .auth-sub{text-align:center;font-size:13px;color:#475569;margin-bottom:24px}
    .auth-label{font-size:12px;font-weight:600;color:#64748b;margin-bottom:5px;display:block}
    .auth-input{width:100%;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:11px 13px;color:#e6edf3;font-size:14px;font-family:'Plus Jakarta Sans',sans-serif;outline:none;transition:border-color .2s;margin-bottom:14px}
    .auth-input::placeholder{color:#334155}.auth-input:focus{border-color:#6366f1;background:rgba(99,102,241,.08)}
    .auth-btn{width:100%;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border:none;border-radius:10px;padding:12px;font-weight:700;font-size:14px;cursor:pointer;transition:all .2s;font-family:'Plus Jakarta Sans',sans-serif;margin-top:4px}
    .auth-btn:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 6px 20px rgba(99,102,241,.4)}.auth-btn:disabled{opacity:.5;cursor:not-allowed}
    .auth-error{font-size:13px;color:#f87171;text-align:center;margin-bottom:12px;padding:8px;background:rgba(239,68,68,.08);border-radius:8px;border:1px solid rgba(239,68,68,.2)}
    .auth-error.ok{color:#4ade80;background:rgba(34,197,94,.08);border-color:rgba(34,197,94,.2)}
    .auth-switch{text-align:center;margin-top:16px;font-size:13px;color:#475569}
    .auth-switch button{background:transparent;border:none;color:#818cf8;cursor:pointer;font-weight:600;font-family:'Plus Jakarta Sans',sans-serif;font-size:13px}
    .app{position:relative;z-index:1;display:flex;height:100vh;max-width:1300px;margin:0 auto;padding:14px;gap:10px}
    .sidebar{width:270px;flex-shrink:0;background:rgba(22,27,34,.92);border:1px solid rgba(255,255,255,.07);border-radius:18px;backdrop-filter:blur(20px);display:flex;flex-direction:column;overflow:hidden}
    .sb-profile{display:flex;align-items:center;gap:10px;padding:16px 14px 12px;border-bottom:1px solid rgba(255,255,255,.05)}
    .av-lg{width:40px;height:40px;border-radius:50%;display:grid;place-items:center;font-size:15px;font-weight:700;color:#fff;flex-shrink:0}
    .profile-name{font-size:13px;font-weight:700;color:#e6edf3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .badge{display:inline-flex;align-items:center;gap:4px;font-size:10px;font-weight:600;padding:2px 6px;border-radius:20px;margin-top:2px}
    .badge.on{background:rgba(34,197,94,.12);color:#4ade80}.badge.off{background:rgba(100,116,139,.1);color:#64748b}
    .bdot{width:5px;height:5px;border-radius:50%}.badge.on .bdot{background:#4ade80;box-shadow:0 0 5px #4ade80}.badge.off .bdot{background:#4b5563}
    .logout-btn{margin-left:auto;background:transparent;border:none;color:#475569;cursor:pointer;font-size:18px;padding:4px;border-radius:6px;transition:color .15s}.logout-btn:hover{color:#f87171}
    .sb-tabs{display:flex;gap:4px;padding:10px 10px 0}
    .tab-btn{flex:1;background:transparent;border:none;border-radius:8px;padding:8px;font-size:12px;font-weight:600;cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;color:#475569;transition:all .15s}
    .tab-btn.active{background:rgba(99,102,241,.15);color:#a5b4fc}.tab-btn:hover:not(.active){background:rgba(255,255,255,.04);color:#94a3b8}
    .create-form{padding:10px 10px 0;display:flex;gap:6px}
    .sb-input{flex:1;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:9px;padding:8px 10px;color:#e6edf3;font-size:13px;font-family:'Plus Jakarta Sans',sans-serif;outline:none;transition:border-color .2s}
    .sb-input::placeholder{color:#3d4451}.sb-input:focus{border-color:#6366f1;background:rgba(99,102,241,.07)}
    .btn-create{background:#6366f1;color:#fff;border:none;border-radius:9px;padding:8px 11px;font-weight:700;font-size:12px;cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;transition:all .18s;white-space:nowrap}
    .btn-create:hover:not(:disabled){background:#4f46e5}.btn-create:disabled{opacity:.35;cursor:not-allowed}
    .scroll-list{flex:1;overflow-y:auto;padding:8px}
    .sec-label{font-size:10px;font-weight:700;letter-spacing:.1em;color:#3d4451;text-transform:uppercase;padding:4px 6px;margin-bottom:4px}
    .room-btn{width:100%;background:transparent;border:1px solid transparent;border-radius:10px;padding:9px 10px;display:flex;align-items:center;gap:9px;cursor:pointer;text-align:left;color:#7d8590;font-size:13px;font-weight:500;transition:all .15s;font-family:'Plus Jakarta Sans',sans-serif;margin-bottom:2px}
    .room-btn:hover{background:rgba(255,255,255,.04);color:#c9d1d9}.room-btn.active{background:rgba(99,102,241,.12);color:#a5b4fc;border-color:rgba(99,102,241,.22)}
    .r-icon{width:30px;height:30px;border-radius:8px;background:rgba(99,102,241,.15);color:#818cf8;display:grid;place-items:center;font-size:13px;font-weight:700;flex-shrink:0}.room-btn.active .r-icon{background:rgba(99,102,241,.3)}
    .user-btn{width:100%;background:transparent;border:1px solid transparent;border-radius:10px;padding:9px 10px;display:flex;align-items:center;gap:9px;cursor:pointer;text-align:left;transition:all .15s;font-family:'Plus Jakarta Sans',sans-serif;margin-bottom:2px}
    .user-btn:hover{background:rgba(255,255,255,.04)}.user-btn.active{background:rgba(99,102,241,.12);border-color:rgba(99,102,241,.22)}
    .u-av{width:32px;height:32px;border-radius:50%;display:grid;place-items:center;font-size:12px;font-weight:700;color:#fff;flex-shrink:0;position:relative}
    .u-dot{position:absolute;bottom:0;right:0;width:9px;height:9px;border-radius:50%;border:2px solid #161b22}.u-dot.on{background:#4ade80}.u-dot.off{background:#4b5563}
    .u-name{font-size:13px;font-weight:600;color:#c9d1d9;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.u-status{font-size:11px;color:#3d4451}.user-btn.active .u-name{color:#a5b4fc}
    .empty-hint{font-size:12px;color:#2d333b;text-align:center;padding:16px 0;font-style:italic}
    .chat-pane{flex:1;display:flex;flex-direction:column;background:rgba(22,27,34,.87);border:1px solid rgba(255,255,255,.06);border-radius:18px;overflow:hidden;backdrop-filter:blur(20px);min-width:0}
    .chat-header{display:flex;align-items:center;gap:12px;padding:13px 18px;border-bottom:1px solid rgba(255,255,255,.05);background:rgba(255,255,255,.02);flex-shrink:0}
    .ch-info{flex:1;min-width:0}.ch-title{font-size:15px;font-weight:700;color:#e6edf3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ch-sub{font-size:11px;color:#3d4451;margin-top:1px}
    .hdr-actions{display:flex;gap:6px}
    .hbtn{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.07);border-radius:9px;padding:6px 10px;color:#7d8590;font-size:13px;font-weight:500;cursor:pointer;transition:all .16s;font-family:'Plus Jakarta Sans',sans-serif;white-space:nowrap}
    .hbtn:hover:not(:disabled){background:rgba(255,255,255,.09);color:#c9d1d9}.hbtn:disabled{opacity:.25;cursor:not-allowed}
    .hbtn.green:hover:not(:disabled){background:rgba(34,197,94,.1);color:#4ade80;border-color:rgba(34,197,94,.25)}
    .hbtn.red:hover:not(:disabled){background:rgba(239,68,68,.1);color:#f87171;border-color:rgba(239,68,68,.25)}
    .hbtn.leave:hover:not(:disabled){background:rgba(239,68,68,.08);color:#f87171;border-color:rgba(239,68,68,.2)}
    .msg-list{flex:1;overflow-y:auto;padding:18px 20px;display:flex;flex-direction:column;gap:2px}
    .event-msg{text-align:center;font-size:12px;color:#3d4451;padding:5px 0;font-style:italic}
    .welcome,.empty-chat{display:flex;flex-direction:column;align-items:center;justify-content:center;flex:1;color:#3d4451;font-size:14px;gap:8px;padding:40px;text-align:center}
    .welcome h3{font-size:18px;font-weight:700;color:#4b5563}
    .msg-row{display:flex;align-items:flex-end;gap:7px;margin-top:2px}.msg-row.me{flex-direction:row-reverse}
    .av-sm{width:27px;height:27px;border-radius:50%;display:grid;place-items:center;font-size:10px;font-weight:700;color:#fff;flex-shrink:0}
    .bwrap{display:flex;flex-direction:column;max-width:62%}.msg-row.me .bwrap{align-items:flex-end}
    .b-name{font-size:11px;font-weight:600;color:#3d4451;margin-bottom:3px;padding:0 3px}
    .bubble{padding:9px 13px;border-radius:16px;font-size:14px;line-height:1.55;word-break:break-word}
    .msg-row.other .bubble{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.07);color:#c9d1d9;border-bottom-left-radius:3px}
    .msg-row.me .bubble{background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border-bottom-right-radius:3px;box-shadow:0 3px 14px rgba(99,102,241,.3)}
    .b-time{font-size:10px;font-family:'JetBrains Mono',monospace;color:#3d4451;margin-top:3px;padding:0 3px}.msg-row.me .b-time{text-align:right}
    .toast{margin:0 14px 6px;padding:9px 14px;background:rgba(99,102,241,.12);border:1px solid rgba(99,102,241,.25);border-radius:10px;color:#a5b4fc;font-size:13px;font-weight:500;animation:fadeUp .25s ease}
    @keyframes fadeUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
    .compose{padding:10px 14px 12px;border-top:1px solid rgba(255,255,255,.05);flex-shrink:0}
    .compose-box{display:flex;align-items:center;gap:6px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.09);border-radius:14px;padding:6px 6px 6px 12px;transition:border-color .2s}
    .compose-box:focus-within{border-color:rgba(99,102,241,.45)}
    .msg-input{flex:1;background:transparent;border:none;outline:none;color:#e6edf3;font-size:14px;font-family:'Plus Jakarta Sans',sans-serif;min-width:0}
    .msg-input::placeholder{color:#3d4451}.msg-input:disabled{cursor:not-allowed}
    .compose-actions{display:flex;align-items:center;gap:2px}
    .cta-btn{background:transparent;border:none;cursor:pointer;padding:5px 6px;border-radius:8px;font-size:18px;line-height:1;transition:all .15s;color:#4b5563}
    .cta-btn:hover:not(:disabled){background:rgba(255,255,255,.07);transform:scale(1.15);color:#94a3b8}.cta-btn:disabled{opacity:.25;cursor:not-allowed}
    .emoji-zone{position:relative;display:flex}
    .emoji-picker{position:absolute;bottom:calc(100% + 10px);right:-4px;background:#161b22;border:1px solid rgba(255,255,255,.1);border-radius:14px;padding:12px;box-shadow:0 20px 60px rgba(0,0,0,.7);width:298px;z-index:200;animation:popUp .18s ease}
    @keyframes popUp{from{opacity:0;transform:scale(.9) translateY(4px)}to{opacity:1;transform:scale(1) translateY(0)}}
    .emoji-grid{display:grid;grid-template-columns:repeat(10,1fr);gap:1px}
    .ec{background:transparent;border:none;font-size:19px;cursor:pointer;padding:5px;border-radius:7px;transition:all .12s;line-height:1}.ec:hover{background:rgba(255,255,255,.09);transform:scale(1.28)}
    .send-btn{width:38px;height:38px;flex-shrink:0;background:linear-gradient(135deg,#6366f1,#8b5cf6);border:none;border-radius:11px;cursor:pointer;display:grid;place-items:center;color:#fff;font-size:17px;transition:all .18s;box-shadow:0 3px 10px rgba(99,102,241,.3)}
    .send-btn:hover:not(:disabled){transform:scale(1.08);box-shadow:0 5px 18px rgba(99,102,241,.5)}.send-btn:disabled{opacity:.25;cursor:not-allowed;box-shadow:none}
    .uploading-bar{height:2px;background:linear-gradient(90deg,#6366f1,#8b5cf6,#6366f1);background-size:200%;animation:shimmer 1.2s infinite;margin:0 14px 4px;border-radius:99px}
    @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
  `;

  if (screen === 'login' || screen === 'register') {
    const isLogin = screen === 'login';
    const isOk = authError.startsWith('✅');
    return (<><style>{css}</style><div className="auth-wrap"><div className="auth-card">
      <div className="auth-logo">💬</div>
      <div className="auth-title">{isLogin ? 'Đăng nhập' : 'Tạo tài khoản'}</div>
      <div className="auth-sub">{isLogin ? 'Chào mừng trở lại!' : 'Tham gia cộng đồng chat'}</div>
      {authError && <div className={`auth-error ${isOk ? 'ok' : ''}`}>{authError}</div>}
      <label className="auth-label">Username</label>
      <input className="auth-input" value={authForm.username} onChange={e => setAuthForm(f => ({ ...f, username: e.target.value }))} placeholder="Nhập username..." onKeyDown={e => e.key === 'Enter' && (isLogin ? handleLogin() : handleRegister())} />
      {!isLogin && (<><label className="auth-label">Tên hiển thị</label><input className="auth-input" value={authForm.displayName} onChange={e => setAuthForm(f => ({ ...f, displayName: e.target.value }))} placeholder="Tên hiển thị..." /></>)}
      <label className="auth-label">Mật khẩu</label>
      <input className="auth-input" type="password" value={authForm.password} onChange={e => setAuthForm(f => ({ ...f, password: e.target.value }))} placeholder="Nhập mật khẩu..." onKeyDown={e => e.key === 'Enter' && (isLogin ? handleLogin() : handleRegister())} />
      <button className="auth-btn" onClick={isLogin ? handleLogin : handleRegister} disabled={authLoading}>{authLoading ? '⏳ Đang xử lý...' : isLogin ? 'Đăng nhập' : 'Đăng ký'}</button>
      <div className="auth-switch">{isLogin ? 'Chưa có tài khoản?' : 'Đã có tài khoản?'}{' '}<button onClick={() => { setAuthError(''); setScreen(isLogin ? 'register' : 'login'); }}>{isLogin ? 'Đăng ký ngay' : 'Đăng nhập'}</button></div>
    </div></div></>);
  }

  const groupRooms = rooms.filter(r => !r.dm);
  return (<><style>{css}</style><div className="app">
    <aside className="sidebar">
      <div className="sb-profile">
        <div className="av-lg" style={{ background: avatarColor(authUser?.username || '') }}>{initials(authUser?.displayName || '')}</div>
        <div style={{ minWidth: 0 }}><div className="profile-name">{authUser?.displayName}</div><span className={`badge ${connected ? 'on' : 'off'}`}><span className="bdot" />{connected ? 'Online' : 'Offline'}</span></div>
        <button className="logout-btn" onClick={handleLogout} title="Đăng xuất">⎋</button>
      </div>
      <div className="sb-tabs">
        <button className={`tab-btn ${tab === 'groups' ? 'active' : ''}`} onClick={() => setTab('groups')}>🏠 Nhóm</button>
        <button className={`tab-btn ${tab === 'dm' ? 'active' : ''}`} onClick={() => setTab('dm')}>💬 Trực tiếp</button>
      </div>
      {tab === 'groups' && (<>
        <form className="create-form" onSubmit={handleCreateRoom}>
          <input className="sb-input" value={roomName} onChange={e => setRoomName(e.target.value)} placeholder="Tên nhóm mới..." />
          <button className="btn-create" type="submit" disabled={!roomName.trim()}>Tạo</button>
        </form>
        <div className="scroll-list">
          <div className="sec-label">Nhóm trò chuyện</div>
          {groupRooms.length === 0 && <p className="empty-hint">Chưa có nhóm nào</p>}
          {groupRooms.map(room => (
            <button key={room.roomId} className={`room-btn ${selectedRoom?.roomId === room.roomId ? 'active' : ''}`} onClick={() => openRoom(room)}>
              <span className="r-icon">#</span>{room.name}
            </button>
          ))}
        </div>
      </>)}
      {tab === 'dm' && (
        <div className="scroll-list">
          <div className="sec-label">Mọi người ({users.filter(u => u.status === 'ONLINE').length} online)</div>
          {users.length === 0 && <p className="empty-hint">Chưa có người dùng nào</p>}
          {users.map(user => {
            const dmId = 'dm_' + [authUser?.username || '', user.username].sort().join('_');
            return (
              <button key={user.username} className={`user-btn ${selectedRoom?.roomId === dmId ? 'active' : ''}`} onClick={() => openDm(user)}>
                <div className="u-av" style={{ background: avatarColor(user.username) }}>{initials(user.displayName)}<span className={`u-dot ${user.status === 'ONLINE' ? 'on' : 'off'}`} /></div>
                <div style={{ minWidth: 0 }}><div className="u-name">{user.displayName}</div><div className="u-status">{user.status === 'ONLINE' ? '🟢 Online' : `⚫ ${fmtLast(user.lastSeen)}`}</div></div>
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
          <button className="hbtn" disabled={!canChat} onClick={() => handleStartCall('AUDIO')}>📞 Audio</button>
          <button className="hbtn" disabled={!canChat} onClick={() => handleStartCall('VIDEO')}>📹 Video</button>
          <button className="hbtn green" disabled={!canChat} onClick={() => handleCallAction('ACCEPT')}>✅ Nhận</button>
          <button className="hbtn red" disabled={!canChat} onClick={() => handleCallAction('END')}>📵 Cúp</button>
          {!selectedRoom?.dm && <button className="hbtn leave" disabled={!selectedRoom || !authUser} onClick={handleLeaveRoom}>🚪 Rời</button>}
        </div>
      </div>

      <div className="msg-list">
        {!selectedRoom ? (
          <div className="welcome"><div style={{ fontSize: 52 }}>👋</div><h3>Chào {authUser?.displayName}!</h3><p>Chọn nhóm hoặc nhắn tin trực tiếp để bắt đầu.</p></div>
        ) : messages.length === 0 ? (
          <div className="empty-chat"><span style={{ fontSize: 40 }}>{selectedRoom.dm ? '💬' : '🏠'}</span>{selectedRoom.dm ? `Bắt đầu trò chuyện với ${selectedRoom.name}` : 'Chưa có tin nhắn. Hãy bắt đầu!'}</div>
        ) : messages.map((msg, i) => {
          const isMe = msg.sender === authUser?.username;
          if (['JOIN', 'LEAVE'].includes(msg.type)) return <div key={msg.messageId ?? i} className="event-msg">{msg.type === 'JOIN' ? `👋 ${msg.sender} đã vào` : `🚪 ${msg.sender} đã rời`}</div>;
          if (msg.type === 'CALL') return <div key={msg.messageId ?? i} className="event-msg">📞 {msg.content}</div>;
          return (
            <div key={msg.messageId ?? i} className={`msg-row ${isMe ? 'me' : 'other'}`}>
              {!isMe && <div className="av-sm" style={{ background: avatarColor(msg.sender) }}>{initials(msg.sender)}</div>}
              <div className="bwrap">
                {!isMe && <div className="b-name">{msg.sender}</div>}
                <div className="bubble">{renderBubble(msg)}</div>
                <div className="b-time">{fmtTime(msg.createdAt)}</div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {notification && <div className="toast">{notification}</div>}
      {uploading && <div className="uploading-bar" />}

      <div className="compose">
        <form onSubmit={e => { e.preventDefault(); handleSend(); }}>
          <div className="compose-box">
            <input ref={inputRef} className="msg-input" value={message} onChange={e => setMessage(e.target.value)} placeholder={canChat ? 'Viết tin nhắn...' : 'Chọn cuộc trò chuyện để bắt đầu'} disabled={!canChat} />
            <div className="compose-actions">
              <button type="button" className="cta-btn" disabled={!canChat || uploading} title="Gửi file" onClick={() => fileInputRef.current?.click()}>📎</button>
              <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) uploadAndSend(f); e.target.value = ''; }} accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.rar" />
              <button type="button" className="cta-btn" disabled={!canChat || uploading} title="Gửi ảnh" onClick={() => imageInputRef.current?.click()}>🖼️</button>
              <input ref={imageInputRef} type="file" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) uploadAndSend(f); e.target.value = ''; }} accept="image/*" />
              <button type="button" className="cta-btn" disabled={!canChat} title="Chia sẻ vị trí" onClick={handleShareLocation}>📍</button>
              <div className="emoji-zone">
                <button type="button" className="cta-btn" disabled={!canChat} title="Emoji" onClick={() => setShowEmoji(v => !v)}>😊</button>
                {showEmoji && (<div className="emoji-picker"><div className="emoji-grid">{EMOJI_LIST.map(e => <button key={e} type="button" className="ec" onClick={() => insertEmoji(e)}>{e}</button>)}</div></div>)}
              </div>
            </div>
            <button className="send-btn" type="submit" disabled={!message.trim() || !canChat}>➤</button>
          </div>
        </form>
      </div>
    </main>
  </div></>);
}