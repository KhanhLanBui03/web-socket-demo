/**
 * Custom hook for WebSocket connection and messaging
 */
import { useCallback, useRef } from 'react';
import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { API_URL, ChatMessage } from '../types';

export const useWebSocket = (onConnect?: () => void, onDisconnect?: () => void) => {
  const clientRef = useRef<Client | null>(null);

  const connect = useCallback(
    (username: string) => {
      try {
        const client = new Client({
          webSocketFactory: () => new SockJS(`${API_URL}/ws`) as any,
          reconnectDelay: 5000,
          onConnect: () => {
            onConnect?.();
          },
          onDisconnect: () => {
            onDisconnect?.();
          },
          onStompError: (frame) => {
            console.error('WebSocket error:', frame.headers['message']);
            onDisconnect?.();
          },
        });
        client.activate();
        clientRef.current = client;
      } catch (err) {
        console.error('WebSocket connection error:', err);
        onDisconnect?.();
      }
    },
    [onConnect, onDisconnect]
  );

  const disconnect = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.deactivate();
      clientRef.current = null;
    }
  }, []);

  const subscribe = useCallback(
    (topic: string, callback: (message: ChatMessage) => void): StompSubscription | null => {
      if (!clientRef.current) return null;
      return clientRef.current.subscribe(topic, (frame: IMessage) => {
        try {
          const message = JSON.parse(frame.body) as ChatMessage;
          callback(message);
        } catch (err) {
          console.error('Failed to parse message:', err);
        }
      });
    },
    []
  );

  const publish = useCallback(
    (destination: string, message: ChatMessage | Record<string, any>) => {
      if (!clientRef.current) return;
      clientRef.current.publish({
        destination,
        body: JSON.stringify(message),
      });
    },
    []
  );

  const getClient = useCallback(() => clientRef.current, []);

  return {
    connect,
    disconnect,
    subscribe,
    publish,
    getClient,
    isConnected: () => clientRef.current?.active === true,
  };
};
