import { useEffect, useRef, useState } from 'react';
import SockJS from 'sockjs-client';
import { Client, IMessage, StompSubscription } from '@stomp/stompjs';

interface ChatMessage {
  sender: string;
  content: string;
  type: 'CHAT' | 'JOIN' | 'LEAVE';
}

function App() {
  const [connected, setConnected] = useState(false);
  const [username, setUsername] = useState('');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const clientRef = useRef<Client | null>(null);
  const subscriptionRef = useRef<StompSubscription | null>(null);

  useEffect(() => {
    return () => {
      if (subscriptionRef.current) subscriptionRef.current.unsubscribe();
      if (clientRef.current) clientRef.current.deactivate();
    };
  }, []);

  const connect = () => {
    const socket = new SockJS('http://localhost:8080/ws');
    const client = new Client({
      webSocketFactory: () => socket as any,
      debug: (str) => console.log(str),
      reconnectDelay: 5000,
      onConnect: () => {
        setConnected(true);
        const sub = client.subscribe('/topic/public', (payload: IMessage) => {
          const body = JSON.parse(payload.body) as ChatMessage;
          setMessages((prev) => [...prev, body]);
        });
        subscriptionRef.current = sub;

        client.publish({
          destination: '/app/chat.addUser',
          body: JSON.stringify({ sender: username, type: 'JOIN' }),
        });
      },
      onStompError: (frame) => {
        console.error('Broker reported error:', frame.headers['message']);
      },
    });

    client.activate();
    clientRef.current = client;
  };

  const sendMessage = () => {
    if (!clientRef.current || !connected || !message.trim()) return;

    const chatMessage: ChatMessage = {
      sender: username,
      content: message.trim(),
      type: 'CHAT',
    };

    clientRef.current.publish({
      destination: '/app/chat.sendMessage',
      body: JSON.stringify(chatMessage),
    });

    setMessage('');
  };

  const handleJoin = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!username.trim()) return;
    connect();
  };

  const handleSend = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    sendMessage();
  };

  return (
    <div className="app-container">
      <h1>WebSocket Chat</h1>
      {!connected ? (
        <form onSubmit={handleJoin} className="form">
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter username"
            required
          />
          <button type="submit">Join</button>
        </form>
      ) : (
        <div className="chat">
            <ul className="message-list">
              {messages.map((msg, index) => {
                if (msg.type !== 'CHAT') {
                  return (
                    <li key={index} className="event-message">
                      {msg.sender} {msg.type === 'JOIN' ? 'joined' : 'left'}
                    </li>
                  );
                }

                const isMe = msg.sender === username;

                return (
                  <li key={index} className={`message-row ${isMe ? 'me' : 'other'}`}>
                    {!isMe && (
                      <div className="avatar">
                        {msg.sender.charAt(0).toUpperCase()}
                      </div>
                    )}

                    <div className="bubble">
                      {!isMe && <div className="sender">{msg.sender}</div>}
                      <div className="text">{msg.content}</div>
                    </div>
                  </li>
                );
              })}
            </ul>
          <form onSubmit={handleSend} className="form">
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type a message"
              required
            />
            <button type="submit">Send</button>
          </form>
        </div>
      )}
    </div>
  );
}

export default App;
