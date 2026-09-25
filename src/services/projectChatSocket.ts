import { Client, type StompSubscription } from '@stomp/stompjs';
import { API_BASE_URL, getAuthToken, STORAGE_KEYS } from './api';
import type { ChatMessageResponse } from '../API/chatApi';

/**
 * Derives the native STOMP WebSocket URL (/ws) from API_BASE_URL or VITE_WS_URL.
 * Automatically chooses ws:// or wss:// based on current page security.
 */
export const getWebSocketUrl = (): string => {
  const customWsUrl = import.meta.env.VITE_WS_URL as string | undefined;
  if (customWsUrl) {
    return customWsUrl;
  }

  try {
    const url = new URL(API_BASE_URL, window.location.href);
    const isSecure = window.location.protocol === 'https:' || url.protocol === 'https:';
    const protocol = isSecure ? 'wss:' : 'ws:';
    // Spring Boot STOMP endpoint is registered at /ws
    return `${protocol}//${url.host}/ws`;
  } catch {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//localhost:8080/ws`;
  }
};

/**
 * Deduplicates and merges incoming realtime chat messages into the message list.
 * Uses canonical message ID to avoid duplicates between REST send responses and WebSocket broadcasts.
 * Handles MESSAGE_CREATED, MESSAGE_UPDATED, and MESSAGE_DELETED events.
 */
export const mergeChatMessage = (
  current: ChatMessageResponse[],
  incoming: ChatMessageResponse
): ChatMessageResponse[] => {
  const existingIndex = current.findIndex((item) => item.id === incoming.id);

  if (existingIndex >= 0) {
    // If message already exists in list, update it in-place (supports edits, deletes, and duplicate broadcasts)
    const next = [...current];
    next[existingIndex] = {
      ...next[existingIndex],
      ...incoming,
      content: Boolean(incoming.isDeleted) ? '[Deleted]' : incoming.content,
    };
    return next;
  }

  // If new message, append and ensure chronological order by createdAt
  const next = [
    ...current,
    {
      ...incoming,
      content: Boolean(incoming.isDeleted) ? '[Deleted]' : incoming.content,
    },
  ];

  return next.sort((a, b) => {
    const left = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const right = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return left - right;
  });
};

type MessageCallback = (message: ChatMessageResponse) => void;

class ProjectChatSocketService {
  private client: Client | null = null;
  private currentProjectId: number | null = null;
  private currentSubscription: StompSubscription | null = null;
  private currentCallback: MessageCallback | null = null;
  private isConnecting = false;

  private initClient(): Client {
    if (this.client) {
      return this.client;
    }

    const brokerURL = getWebSocketUrl();

    this.client = new Client({
      brokerURL,
      reconnectDelay: 4000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      beforeConnect: () => {
        const token = getAuthToken();
        if (token) {
          this.client!.connectHeaders = {
            Authorization: `Bearer ${token}`,
          };
        } else {
          this.client!.connectHeaders = {};
        }
      },
      onConnect: () => {
        this.isConnecting = false;
        // Restore project subscription upon connection / reconnection
        if (this.currentProjectId !== null && this.currentCallback) {
          this.resubscribe();
        }
      },
      onStompError: (frame) => {
        console.warn('ProjectChat STOMP error:', frame.headers['message'] || 'Broker reported error');
      },
      onWebSocketError: () => {
        console.warn('ProjectChat WebSocket connection error');
      },
      onWebSocketClose: () => {
        this.currentSubscription = null;
      },
    });

    return this.client;
  }

  public connect(): void {
    const token = getAuthToken();
    if (!token) return;

    const client = this.initClient();
    if (!client.active && !this.isConnecting) {
      this.isConnecting = true;
      client.activate();
    }
  }

  public disconnect(): void {
    if (this.currentSubscription) {
      try {
        this.currentSubscription.unsubscribe();
      } catch {
        // Safe unsubscribe
      }
      this.currentSubscription = null;
    }

    this.currentProjectId = null;
    this.currentCallback = null;
    this.isConnecting = false;

    if (this.client) {
      void this.client.deactivate();
      this.client = null;
    }
  }

  public subscribeToProject(
    projectId: number,
    onMessage: MessageCallback
  ): () => void {
    this.currentProjectId = projectId;
    this.currentCallback = onMessage;

    this.connect();

    if (this.client?.connected) {
      this.resubscribe();
    }

    return () => {
      if (this.currentProjectId === projectId) {
        if (this.currentSubscription) {
          try {
            this.currentSubscription.unsubscribe();
          } catch {
            // Safe cleanup
          }
          this.currentSubscription = null;
        }
        this.currentProjectId = null;
        this.currentCallback = null;
      }
    };
  }

  private resubscribe(): void {
    if (!this.client?.connected || this.currentProjectId === null || !this.currentCallback) {
      return;
    }

    if (this.currentSubscription) {
      try {
        this.currentSubscription.unsubscribe();
      } catch {
        // Safe reset
      }
      this.currentSubscription = null;
    }

    const destination = `/topic/projects/${this.currentProjectId}`;
    const callback = this.currentCallback;

    try {
      this.currentSubscription = this.client.subscribe(destination, (stompMessage) => {
        try {
          const data = JSON.parse(stompMessage.body) as ChatMessageResponse;
          if (data && data.id) {
            callback(data);
          }
        } catch {
          console.warn('Failed to parse incoming WebSocket chat message');
        }
      });
    } catch {
      console.warn('Failed to subscribe to destination:', destination);
    }
  }

  public isConnected(): boolean {
    return Boolean(this.client?.connected);
  }
}

export const projectChatSocket = new ProjectChatSocketService();

// Clean up socket if auth storage is cleared in another tab or context
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEYS.accessToken && !e.newValue) {
      projectChatSocket.disconnect();
    }
  });
}
