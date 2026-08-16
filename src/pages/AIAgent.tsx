import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
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
  documentId?: string;
  documentTitle?: string;
  snippet?: string;
  relevanceScore?: number;
  id?: string;
  title?: string;
  type?: string;
}

export interface AiNavigationAction {
  type: string;
  label: string;
  companyProfileId: string;
  companyId: string;
  companyName: string;
}

export interface AiChatResponse {
  sessionId: string;
  answer: string;
  sources: AiSourceReference[];
  suggestedActions: string[];
  navigationActions?: AiNavigationAction[];
}

interface Message {
  role: 'user' | 'ai';
  content: string;
  sources?: AiSourceReference[];
  suggestedActions?: string[];
  navigationActions?: AiNavigationAction[];
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
  const isManagerMode = currentUser?.role === ROLES.MANAGER;
  const isStaffMode = currentUser?.role === ROLES.STAFF;

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const sessionEndpoint = isOwnerMode ? '/owner/ai-assistant/sessions' : '/ai-assistant/sessions';
        const sessionsRes = await api.get<any[]>(sessionEndpoint);
        const sessions = sessionsRes?.data || [];
        
        if (sessions.length > 0) {
          sessions.sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
          const latestSessionId = sessions[0].sessionId;
          
          setSessionId(latestSessionId);
          const messagesEndpoint = isOwnerMode ? `/owner/ai-assistant/sessions/${latestSessionId}/messages` : `/ai-assistant/sessions/${latestSessionId}/messages`;
          const messagesRes = await api.get<any[]>(messagesEndpoint);
          const msgs = messagesRes?.data || [];
          
          const loadedMessages: Message[] = [];
          msgs.forEach((m: any) => {
            loadedMessages.push({ role: 'user', content: m.question });
            loadedMessages.push({
              role: 'ai',
              content: m.answer,
              sources: m.sources,
              suggestedActions: m.suggestedActions,
              navigationActions: m.navigationActions ?? []
            });
          });
          setMessages(loadedMessages);
        }
      } catch (error) {
        console.error('Failed to load AI history', error);
      }
    };
    
    void fetchHistory();
  }, [isOwnerMode]);

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

      const payload: { question: string; sessionId?: string; projectId?: number; companyProfileId?: string } = { question: msg };
      if (sessionId) payload.sessionId = sessionId;
      if (!isOwnerMode && projectId) payload.projectId = Number(projectId);
      
      if (isOwnerMode) {
        const isCompanyDetailPage = window.location.hash.startsWith('#company-detail');
        const storedCompanyId = isCompanyDetailPage ? localStorage.getItem('apms-selected-company') : undefined;
        if (storedCompanyId) {
          payload.companyProfileId = storedCompanyId;
        }
      }

      const res = await api.post<AiChatResponse>(endpoint, payload, { timeoutMs: 60000 });
      setSessionId(res?.data?.sessionId || null);
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = {
          role: 'ai',
          content: res?.data?.answer || 'The assistant did not return an answer.',
          sources: res?.data?.sources || [],
          suggestedActions: res?.data?.suggestedActions || [],
          navigationActions: res?.data?.navigationActions || [],
        };
        return next;
      });
    } catch (error: any) {
      setMessages((prev) => {
        const next = [...prev];
        let errorMsg = error instanceof Error ? error.message : 'Cannot connect to the AI service.';
        if (error?.status === 408) {
          errorMsg = 'The AI service is taking too long to respond. Please try again.';
        }
        next[next.length - 1] = {
          role: 'ai',
          content: `Error: ${errorMsg}`,
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

  const handleNavigationAction = (action: AiNavigationAction) => {
    if (action.type === 'COMPANY_PROFILE') {
      localStorage.setItem('apms-selected-company', action.companyProfileId);
      window.dispatchEvent(
        new CustomEvent('apms-company-selection-changed', {
          detail: {
            companyProfileId: action.companyProfileId
          }
        })
      );
      window.location.hash = '#company-detail';
    }
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
                <p>{isSending ? 'Replying...' : 'Ready to assist'}</p>
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
              <h2>Hello</h2>
              <p>You can ask about projects, candidates, company profiles, or tasks.</p>
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
                  ) : message.role === 'ai' ? (
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                  ) : (
                    <p>{message.content}</p>
                  )}
                </div>

                {message.navigationActions && message.navigationActions.length > 0 && (
                  <div className={styles.actions}>
                    {message.navigationActions.map((action, actionIndex) => (
                      <button key={`nav-${actionIndex}`} type="button" onClick={() => handleNavigationAction(action)}>
                        {action.label}
                      </button>
                    ))}
                  </div>
                )}

                {message.suggestedActions && message.suggestedActions.length > 0 && (
                  <div className={styles.actions}>
                    {message.suggestedActions.map((action, actionIndex) => (
                      <button key={`sug-${actionIndex}`} type="button" onClick={() => setInput(action)}>
                        {action}
                      </button>
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
            placeholder={
              isStaffMode ? "Ask about your projects, tasks, deadlines, or next actions..." :
              isManagerMode ? "Ask about your team progress, pending reviews, or company profiles..." :
              "Ask about your business ecosystem, relationships, risks, opportunities, or company intelligence..."
            }
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                void sendMessage();
              }
            }}
          />
          <button type="submit" disabled={isSending || !input.trim()}>
            Send
          </button>
        </form>
        </div>
      )}

      <button className={styles.launcher} type="button" onClick={() => setIsOpen((value) => !value)}>
        <span>AI</span>
      </button>
    </section>
  );
};