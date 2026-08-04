import React, { useEffect, useRef, useState } from 'react';
import {
  Bot,
  FileSearch,
  MessageSquarePlus,
  Send,
  User,
  X,
} from 'lucide-react';
import { api } from '../services/api';
import { useUser, ROLES } from '../context/UserContext';
import type { PageResult, ProjectResponse } from '../types/domain';
import styles from './AIAgent.module.css';

export interface AiSourceReference {
  documentId: string;
  documentTitle: string;
  snippet: string;
  relevanceScore: number;
}

export interface AiChatResponse {
  sessionId: string;
  answer: string;
  sources: AiSourceReference[];
  suggestedActions: string[];
}

interface Message {
  role: 'user' | 'ai';
  content: string;
  sources?: AiSourceReference[];
  suggestedActions?: string[];
  isLoading?: boolean;
}

const formatTime = () =>
  new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit' }).format(new Date());

export const AIAgent: React.FC = () => {
  const { currentUser } = useUser();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isOwnerMode = currentUser?.role === ROLES.ADMIN || currentUser?.role === ROLES.OWNER;

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOwnerMode) return;

    const controller = new AbortController();
    void api.get<PageResult<ProjectResponse>>('/projects', {
      params: { page: 0, size: 100 },
      signal: controller.signal,
    }).then((res) => {
      const rows = res?.data?.content ?? [];
      const stored = localStorage.getItem('apms-active-project');
      const validProject = rows.find((project) => String(project.id) === stored) ?? rows[0] ?? null;
      setProjectId(validProject ? String(validProject.id) : null);
    }).catch(() => {
      setProjectId(null);
    });

    return () => controller.abort();
  }, [isOwnerMode]);

  const sendMessage = async (override?: string) => {
    const msg = (override ?? input).trim();
    if (!msg || isSending) return;

    setMessages((prev) => [...prev, { role: 'user', content: msg }, { role: 'ai', content: '', isLoading: true }]);
    setInput('');
    setIsSending(true);

    try {
      const endpoint = isOwnerMode ? '/owner/ai-assistant/chat' : '/ai-assistant/chat';

      if (!isOwnerMode && !projectId) {
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = { role: 'ai', content: 'No valid project is available for the AI assistant.' };
          return next;
        });
        return;
      }

      const payload: { question: string; sessionId?: string; projectId?: number } = { question: msg };
      if (sessionId) payload.sessionId = sessionId;
      if (!isOwnerMode && projectId) payload.projectId = Number(projectId);

      const res = await api.post<AiChatResponse>(endpoint, payload);
      setSessionId(res?.data?.sessionId || null);
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = {
          role: 'ai',
          content: res?.data?.answer || 'The assistant did not return an answer.',
          sources: res?.data?.sources || [],
          suggestedActions: res?.data?.suggestedActions || [],
        };
        return next;
      });
    } catch (error: unknown) {
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = {
          role: 'ai',
          content: `Error: ${error instanceof Error ? error.message : 'Cannot connect to the AI service.'}`,
        };
        return next;
      });
    } finally {
      setIsSending(false);
      textareaRef.current?.focus();
    }
  };

  const startNewChat = () => {
    setMessages([]);
    setSessionId(null);
    setInput('');
  };

  return (
    <section className={styles.widget} id="page-ai-agent" aria-live="polite">
      {isOpen && (
        <div className={styles.panel}>
          <header className={styles.chatHeader}>
            <div className={styles.chatTitle}>
              <span><Bot size={18} /></span>
              <div>
                <h1>APMS AI</h1>
                <p>{isSending ? 'Đang trả lời...' : 'Sẵn sàng hỗ trợ'}</p>
              </div>
            </div>
            <div className={styles.headerActions}>
              <button className={styles.newChatButton} type="button" onClick={startNewChat} title="New chat">
                <MessageSquarePlus size={16} />
              </button>
              <button className={styles.iconButton} type="button" onClick={() => setIsOpen(false)} title="Close chat">
                <X size={18} />
              </button>
            </div>
          </header>
        <section className={styles.thread}>
          {messages.length === 0 ? (
            <div className={styles.emptyState}>
              <Bot size={30} />
              <h2>Xin chào</h2>
              <p>Bạn có thể hỏi về project, candidate, company profile hoặc task.</p>
            </div>
          ) : messages.map((message, index) => (
            <article key={index} className={`${styles.messageRow} ${message.role === 'user' ? styles.userRow : styles.aiRow}`}>
              <div className={styles.avatar}>{message.role === 'ai' ? <Bot size={17} /> : <User size={17} />}</div>
              <div className={styles.messageBlock}>
                <div className={styles.messageMeta}>
                  <strong>{message.role === 'ai' ? 'APMS AI' : currentUser?.name || 'You'}</strong>
                  <span>{formatTime()}</span>
                </div>
                <div className={`${styles.bubble} ${message.role === 'user' ? styles.userBubble : styles.aiBubble}`}>
                  {message.isLoading ? (
                    <div className={styles.loadingDots}><i /><i /><i /></div>
                  ) : (
                    <p>{message.content}</p>
                  )}
                </div>

                {message.sources && message.sources.length > 0 && (
                  <div className={styles.sources}>
                    <strong><FileSearch size={15} /> Sources</strong>
                    {message.sources.map((source, sourceIndex) => (
                      <article key={`${source.documentId}-${sourceIndex}`}>
                        <span>{sourceIndex + 1}</span>
                        <div>
                          <strong>{source.documentTitle}</strong>
                          <p>{source.snippet || `${Math.round(source.relevanceScore * 100)}% relevance`}</p>
                        </div>
                      </article>
                    ))}
                  </div>
                )}

                {message.suggestedActions && message.suggestedActions.length > 0 && (
                  <div className={styles.actions}>
                    {message.suggestedActions.map((action, actionIndex) => (
                      <button key={actionIndex} type="button" onClick={() => setInput(action)}>{action}</button>
                    ))}
                  </div>
                )}
              </div>
            </article>
          ))}
          <div ref={chatEndRef} />
        </section>

        <form
          className={styles.composer}
          onSubmit={(event) => {
            event.preventDefault();
            void sendMessage();
          }}
        >
          <textarea
            ref={textareaRef}
            value={input}
            placeholder="Ask about candidate approval, company profile quality, project risks..."
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                void sendMessage();
              }
            }}
          />
          <button type="submit" disabled={isSending || !input.trim()}>
            <Send size={17} />
          </button>
        </form>
        </div>
      )}

      <button className={styles.launcher} type="button" onClick={() => setIsOpen((value) => !value)}>
        <Bot size={24} />
        {!isOpen && <span>AI</span>}
      </button>
    </section>
  );
};
