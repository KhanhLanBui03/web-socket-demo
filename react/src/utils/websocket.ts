import SockJS from 'sockjs-client';
import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import { API_URL } from '../constants';
import type { ChatMessage } from '../types/chat';

export const createWebSocketClient = (
  onConnect: () => void,
  onDisconnect: () => void,
  onError: (message: string) => void
): Client => {
  const client = new Client({
    webSocketFactory: () => new SockJS(`${API_URL}/ws`) as any,
    reconnectDelay: 5000,
    onConnect,
    onDisconnect,
    onStompError: (frame) => {
      onError(frame.headers['message'] || 'WebSocket error');
    },
  });

  client.activate();
  return client;
};

export const subscribeToRoom = (
  client: Client,
  roomId: string,
  onMessage: (message: ChatMessage) => void
): StompSubscription => {
  return client.subscribe(`/topic/rooms/${roomId}`, (message: IMessage) => {
    const body = JSON.parse(message.body) as ChatMessage;
    onMessage(body);
  });
};

export const subscribeToUserStatus = (
  client: Client,
  onUpdate: () => void
): StompSubscription => {
  return client.subscribe(`/topic/users/online`, onUpdate);
};

export const publishMessage = (
  client: Client,
  destination: string,
  payload: Record<string, any>
): void => {
  client.publish({
    destination,
    body: JSON.stringify(payload),
  });
};
