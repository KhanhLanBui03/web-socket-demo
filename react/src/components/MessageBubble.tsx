/**
 * Message Bubble Component - Renders different types of messages
 */
import { ChatMessage } from '../types';
import { formatFileSize, formatTime } from '../lib/utils';

interface MessageBubbleProps {
  message: ChatMessage;
  isOwn: boolean;
  sender?: string;
}

export const MessageBubble = ({ message, isOwn, sender }: MessageBubbleProps) => {
  const renderContent = () => {
    switch (message.type) {
      case 'IMAGE':
        if (!message.fileUrl) return <div>{message.content}</div>;
        return (
          <div>
            <img
              src={message.fileUrl}
              alt={message.fileName}
              style={{
                maxWidth: '100%',
                maxHeight: 240,
                borderRadius: 8,
                display: 'block',
                cursor: 'pointer',
              }}
              onClick={() => window.open(message.fileUrl, '_blank')}
            />
            <div style={{ fontSize: 11, marginTop: 3, opacity: 0.65 }}>
              {message.fileName}
            </div>
          </div>
        );

      case 'FILE':
        if (!message.fileUrl) return <div>{message.content}</div>;
        return (
          <a
            href={message.fileUrl}
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              textDecoration: 'none',
              color: 'inherit',
            }}
          >
            <span style={{ fontSize: 28 }}>📎</span>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13 }}>
                {message.fileName}
              </div>
              <div style={{ fontSize: 11, opacity: 0.65 }}>
                {formatFileSize(message.fileSize)} · Tải xuống
              </div>
            </div>
          </a>
        );

      case 'LOCATION':
        if (!message.latitude || !message.longitude)
          return <div>{message.content}</div>;
        const mapUrl = `https://www.google.com/maps?q=${message.latitude},${message.longitude}`;
        const imgUrl = `https://static-maps.yandex.ru/1.x/?lang=vi_VN&ll=${message.longitude},${message.latitude}&z=15&l=map&size=280,150&pt=${message.longitude},${message.latitude},pm2rdm`;
        return (
          <a
            href={mapUrl}
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'block',
              textDecoration: 'none',
              color: 'inherit',
            }}
          >
            <img
              src={imgUrl}
              alt="map"
              style={{
                width: '100%',
                maxWidth: 250,
                borderRadius: 8,
                display: 'block',
              }}
            />
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                marginTop: 5,
                fontSize: 13,
              }}
            >
              <span>📍</span>
              <span style={{ fontWeight: 500 }}>Xem trên Google Maps</span>
            </div>
            <div
              style={{
                fontSize: 10,
                opacity: 0.55,
                marginTop: 2,
              }}
            >
              {message.latitude.toFixed(5)}, {message.longitude.toFixed(5)}
            </div>
          </a>
        );

      default:
        return <div>{message.content}</div>;
    }
  };

  return (
    <div className={`msg-row ${isOwn ? 'me' : 'other'}`}>
      {!isOwn && sender && (
        <div
          className="av-sm"
          style={{
            background: '#818cf8',
          }}
        >
          {sender.charAt(0).toUpperCase()}
        </div>
      )}
      <div className="bwrap">
        {!isOwn && sender && <div className="b-name">{sender}</div>}
        <div className="bubble">{renderContent()}</div>
        <div className="b-time">{formatTime(message.createdAt)}</div>
      </div>
    </div>
  );
};
