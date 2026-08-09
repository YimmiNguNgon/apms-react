import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { chatApi, type ChatMessageResponse } from '../API/chatApi';
import { api, type PageResponse } from '../services/api';
import type { ProjectResponse } from '../types/domain';
import { useUser } from './UserContext';

interface ConversationMeta {
  unreadCount: number;
  lastMessage?: ChatMessageResponse | null;
  lastMessageAt?: string | null;
}

interface ChatToast {
  id: string;
  projectId: number;
  projectName: string;
  senderName: string;
  preview: string;
}

interface ChatNotificationContextValue {
  conversationMeta: Record<number, ConversationMeta>;
  totalUnread: number;
  toasts: ChatToast[];
  refreshChatNotifications: () => Promise<void>;
  markProjectRead: (projectId: number, latestMessage?: ChatMessageResponse | null) => void;
  dismissToast: (id: string) => void;
}

const ChatNotificationContext = createContext<ChatNotificationContextValue | null>(null);

const LAST_READ_KEY = 'apms-chat-last-read-at';

const readLastReadMap = (): Record<string, string> => {
  try {
    const value = localStorage.getItem(LAST_READ_KEY);
    return value ? JSON.parse(value) as Record<string, string> : {};
  } catch {
    return {};
  }
};

const writeLastReadMap = (value: Record<string, string>) => {
  localStorage.setItem(LAST_READ_KEY, JSON.stringify(value));
};

const messageTime = (message?: ChatMessageResponse | null) =>
  message?.createdAt ? new Date(message.createdAt).getTime() : 0;

const isMine = (message: ChatMessageResponse, userId?: number | null, userEmail?: string | null) =>
  Boolean((userId && message.senderId === userId) || (userEmail && message.senderName?.toLowerCase() === userEmail.toLowerCase()));

export const ChatNotificationProvider: React.FC<{
  activePage: string;
  navigateToPage: (page: string) => void;
  children: React.ReactNode;
}> = ({ activePage, navigateToPage, children }) => {
  const { currentUser } = useUser();
  const [conversationMeta, setConversationMeta] = useState<Record<number, ConversationMeta>>({});
  const [lastReadMap, setLastReadMap] = useState<Record<string, string>>(() => readLastReadMap());
  const [toasts, setToasts] = useState<ChatToast[]>([]);
  const knownLatestMessageRef = useRef<Record<number, string>>({});
  const pollingRef = useRef(false);

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const pushToast = useCallback((project: ProjectResponse, message: ChatMessageResponse) => {
    if (activePage === 'system-chat') return;
    if (isMine(message, currentUser?.id, currentUser?.email)) return;

    const id = `${project.id}-${message.id}`;
    setToasts((current) => {
      if (current.some((toast) => toast.id === id)) return current;
      return [
        {
          id,
          projectId: project.id,
          projectName: project.projectName,
          senderName: message.senderName || `User #${message.senderId}`,
          preview: message.isDeleted ? 'Deleted message' : message.content,
        },
        ...current,
      ].slice(0, 4);
    });

    window.setTimeout(() => dismissToast(id), 5000);
  }, [activePage, currentUser?.email, currentUser?.id, dismissToast]);

  const refreshChatNotifications = useCallback(async () => {
    if (!currentUser || pollingRef.current) return;
    if ((currentUser.role as string) === 'BUSINESS_OWNER' || currentUser.role === 'ROLE_BUSINESS_OWNER') return;

    pollingRef.current = true;

    try {
      const projectsPayload = await api.get<PageResponse<ProjectResponse>>('/projects', { params: { page: 0, size: 80 } });
      const projects = projectsPayload.data?.content ?? [];
      const results = await Promise.allSettled(projects.map(async (project) => {
        const messagesPayload = await chatApi.getHistory(project.id, 0, 100);
        const rows = [...(messagesPayload.data?.content ?? [])].sort((a, b) => messageTime(a) - messageTime(b));
        return { project, rows };
      }));

      const nextMeta: Record<number, ConversationMeta> = {};
      results.forEach((result) => {
        if (result.status !== 'fulfilled') return;
        const { project, rows } = result.value;
        const latest = rows[rows.length - 1] ?? null;
        const readAt = lastReadMap[String(project.id)] || '';
        const readTime = readAt ? new Date(readAt).getTime() : 0;
        const unreadCount = rows.filter((message) => {
          if (message.isDeleted || isMine(message, currentUser.id, currentUser.email)) return false;
          return messageTime(message) > readTime;
        }).length;

        nextMeta[project.id] = {
          unreadCount: Math.max(0, unreadCount),
          lastMessage: latest,
          lastMessageAt: latest?.createdAt ?? project.updatedAt ?? project.createdAt,
        };

        if (latest?.id && knownLatestMessageRef.current[project.id] !== latest.id) {
          const hadPrevious = Boolean(knownLatestMessageRef.current[project.id]);
          knownLatestMessageRef.current[project.id] = latest.id;
          if (hadPrevious) pushToast(project, latest);
        }
      });

      setConversationMeta(nextMeta);
    } finally {
      pollingRef.current = false;
    }
  }, [currentUser, lastReadMap, pushToast]);

  const markProjectRead = useCallback((projectId: number, latestMessage?: ChatMessageResponse | null) => {
    const latestAt = latestMessage?.createdAt || conversationMeta[projectId]?.lastMessageAt;
    if (!latestAt) return;

    setLastReadMap((current) => {
      const next = { ...current, [String(projectId)]: latestAt };
      writeLastReadMap(next);
      return next;
    });
    setConversationMeta((current) => ({
      ...current,
      [projectId]: {
        ...(current[projectId] ?? {}),
        unreadCount: 0,
      },
    }));
  }, [conversationMeta]);

  useEffect(() => {
    if (!currentUser) {
      setConversationMeta({});
      setToasts([]);
      return;
    }

    void refreshChatNotifications();
    // Disabled 5s auto-refresh interval based on user request
    // const interval = window.setInterval(() => void refreshChatNotifications(), 5000);
    // return () => window.clearInterval(interval);
  }, [currentUser?.id, refreshChatNotifications]);

  const totalUnread = useMemo(
    () => Object.values(conversationMeta).reduce((sum, item) => sum + Math.max(0, item.unreadCount || 0), 0),
    [conversationMeta]
  );

  const value = useMemo(() => ({
    conversationMeta,
    totalUnread,
    toasts,
    refreshChatNotifications,
    markProjectRead,
    dismissToast,
  }), [conversationMeta, dismissToast, markProjectRead, refreshChatNotifications, toasts, totalUnread]);

  const viewToastProject = (projectId: number) => {
    localStorage.setItem('apms-chat-project-id', String(projectId));
    setToasts((current) => current.filter((toast) => toast.projectId !== projectId));
    navigateToPage('system-chat');
  };

  return (
    <ChatNotificationContext.Provider value={value}>
      {children}
      {toasts.length > 0 && (
        <div className="global-chat-toast-stack" aria-live="polite">
          {toasts.map((toast) => (
            <div className="global-chat-toast" key={toast.id}>
              <div className="global-chat-toast-avatar">{toast.projectName.slice(0, 2).toUpperCase()}</div>
              <div className="global-chat-toast-body">
                <strong>{toast.projectName}</strong>
                <p><span>{toast.senderName}</span>: {toast.preview}</p>
                <button type="button" onClick={() => viewToastProject(toast.projectId)}>View message</button>
              </div>
              <button className="global-chat-toast-close" type="button" onClick={() => dismissToast(toast.id)} aria-label="Dismiss chat notification">×</button>
            </div>
          ))}
        </div>
      )}
    </ChatNotificationContext.Provider>
  );
};

export const useChatNotifications = () => {
  const context = useContext(ChatNotificationContext);
  if (!context) {
    return {
      conversationMeta: {},
      totalUnread: 0,
      toasts: [],
      refreshChatNotifications: async () => undefined,
      markProjectRead: () => undefined,
      dismissToast: () => undefined,
    } satisfies ChatNotificationContextValue;
  }
  return context;
};
