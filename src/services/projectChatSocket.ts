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

export interface ProjectUpdateEvent {
  type: string;
  projectId: number;
  taskId?: number | null;
  actorId?: number | null;
  timestamp?: string;
  [key: string]: unknown;
}

type MessageCallback = (message: ChatMessageResponse) => void;
type UpdateCallback = (event: ProjectUpdateEvent) => void;

class ProjectChatSocketService {
  private client: Client | null = null;
  private isConnecting = false;

  // Chat subscription state
  private currentChatProjectId: number | null = null;
  private currentChatSubscription: StompSubscription | null = null;
  private currentChatCallback: MessageCallback | null = null;

  // Project workflow update subscription state
  private currentUpdateProjectId: number | null = null;
  private currentUpdateSubscription: StompSubscription | null = null;
  private currentUpdateCallback: UpdateCallback | null = null;

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
        // Restore project subscriptions upon connection / reconnection
        if (this.currentChatProjectId !== null && this.currentChatCallback) {
          this.resubscribeChat();
        }
        if (this.currentUpdateProjectId !== null && this.currentUpdateCallback) {
          this.resubscribeUpdates();
        }
      },
      onStompError: (frame) => {
        console.warn('Project STOMP error:', frame.headers['message'] || 'Broker reported error');
      },
      onWebSocketError: () => {
        console.warn('Project WebSocket connection error');
      },
      onWebSocketClose: () => {
        this.currentChatSubscription = null;
        this.currentUpdateSubscription = null;
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
    if (this.currentChatSubscription) {
      try {
        this.currentChatSubscription.unsubscribe();
      } catch {
        // Safe unsubscribe
      }
      this.currentChatSubscription = null;
    }

    if (this.currentUpdateSubscription) {
      try {
        this.currentUpdateSubscription.unsubscribe();
      } catch {
        // Safe unsubscribe
      }
      this.currentUpdateSubscription = null;
    }

    this.currentChatProjectId = null;
    this.currentChatCallback = null;
    this.currentUpdateProjectId = null;
    this.currentUpdateCallback = null;
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
    this.currentChatProjectId = projectId;
    this.currentChatCallback = onMessage;

    this.connect();

    if (this.client?.connected) {
      this.resubscribeChat();
    }

    return () => {
      if (this.currentChatProjectId === projectId) {
        if (this.currentChatSubscription) {
          try {
            this.currentChatSubscription.unsubscribe();
          } catch {
            // Safe cleanup
          }
          this.currentChatSubscription = null;
        }
        this.currentChatProjectId = null;
        this.currentChatCallback = null;
      }
    };
  }

  public subscribeToProjectUpdates(
    projectId: number,
    onUpdate: UpdateCallback
  ): () => void {
    this.currentUpdateProjectId = projectId;
    this.currentUpdateCallback = onUpdate;

    this.connect();

    if (this.client?.connected) {
      this.resubscribeUpdates();
    }

    return () => {
      if (this.currentUpdateProjectId === projectId) {
        if (this.currentUpdateSubscription) {
          try {
            this.currentUpdateSubscription.unsubscribe();
          } catch {
            // Safe cleanup
          }
          this.currentUpdateSubscription = null;
        }
        this.currentUpdateProjectId = null;
        this.currentUpdateCallback = null;
      }
    };
  }

  private resubscribeChat(): void {
    if (!this.client?.connected || this.currentChatProjectId === null || !this.currentChatCallback) {
      return;
    }

    if (this.currentChatSubscription) {
      try {
        this.currentChatSubscription.unsubscribe();
      } catch {
        // Safe reset
      }
      this.currentChatSubscription = null;
    }

    const destination = `/topic/projects/${this.currentChatProjectId}`;
    const callback = this.currentChatCallback;

    try {
      this.currentChatSubscription = this.client.subscribe(destination, (stompMessage) => {
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
      console.warn('Failed to subscribe to chat destination:', destination);
    }
  }

  private resubscribeUpdates(): void {
    if (!this.client?.connected || this.currentUpdateProjectId === null || !this.currentUpdateCallback) {
      return;
    }

    if (this.currentUpdateSubscription) {
      try {
        this.currentUpdateSubscription.unsubscribe();
      } catch {
        // Safe reset
      }
      this.currentUpdateSubscription = null;
    }

    const destination = `/topic/projects/${this.currentUpdateProjectId}/updates`;
    const callback = this.currentUpdateCallback;

    try {
      this.currentUpdateSubscription = this.client.subscribe(destination, (stompMessage) => {
        try {
          const data = JSON.parse(stompMessage.body) as ProjectUpdateEvent;
          if (data && data.projectId) {
            callback(data);
          }
        } catch {
          console.warn('Failed to parse incoming WebSocket project update');
        }
      });
    } catch {
      console.warn('Failed to subscribe to update destination:', destination);
    }
  }

  public isConnected(): boolean {
    return Boolean(this.client?.connected);
  }
}

export const projectChatSocket = new ProjectChatSocketService();
export const subscribeToProjectUpdates = (
  projectId: number,
  onUpdate: UpdateCallback
) => projectChatSocket.subscribeToProjectUpdates(projectId, onUpdate);

// Clean up socket if auth storage is cleared in another tab or context
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEYS.accessToken && !e.newValue) {
      projectChatSocket.disconnect();
    }
  });
}
