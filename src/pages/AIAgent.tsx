import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  AlertTriangle,
  Briefcase,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  ExternalLink,
  FileText,
  FolderKanban,
  Loader2,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Send,
  Sparkles,
  Target,
  Trash2,
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

export interface AiChatSession {
  sessionId: string;
  firstQuestion: string;
  lastQuestion?: string;
  lastAnswerPreview?: string;
  messageCount: number;
  startedAt: string;
  lastMessageAt?: string;
  projectId?: number;
  companyProfileId?: string;
}

interface Message {
  role: 'user' | 'ai';
  content: string;
  sources?: AiSourceReference[];
  suggestedActions?: string[];
  navigationActions?: AiNavigationAction[];
  isLoading?: boolean;
  timestamp?: string;
}

interface SuggestionCard {
  title: string;
  description: string;
  prompt: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

interface AIAgentProps {
  setActivePage?: (page: string) => void;
}

export interface QuestionItem {
  label: string;
  template?: string;
}

export interface QuestionCategory {
  title: string;
  questions: (string | QuestionItem)[];
}

export const getQuestionLabel = (q: string | QuestionItem): string => {
  return typeof q === 'string' ? q : q.label;
};

export const getQuestionTemplate = (q: string | QuestionItem): string | undefined => {
  return typeof q === 'string' ? undefined : q.template;
};

export const STAFF_PRIMARY_QUESTIONS: string[] = [
  'What tasks am I assigned to?',
  'What should I work on next?',
  'Which task has the closest deadline?',
  'What projects am I participating in?',
];

export const STAFF_QUESTION_CATALOG: QuestionCategory[] = [
  {
    title: 'General',
    questions: [
      'What can you do?',
    ],
  },
  {
    title: 'Projects',
    questions: [
      'What projects am I participating in?',
    ],
  },
  {
    title: 'Tasks',
    questions: [
      'What tasks am I assigned to?',
      'Show all my assigned tasks',
      'Show me the details of my tasks',
    ],
  },
  {
    title: 'Task Status',
    questions: [
      'What tasks are in progress?',
      'What tasks are in review?',
      'What tasks are completed?',
      'What incomplete tasks do I have?',
    ],
  },
  {
    title: 'Priority & Deadlines',
    questions: [
      'What should I work on next?',
      'Which task has the closest deadline?',
      'Which tasks should I prioritize?',
    ],
  },
  {
    title: 'Submissions & Revision',
    questions: [
      'What is the status of my submissions?',
      'Which tasks were returned for revision?',
      'What tasks do I need to redo?',
    ],
  },
];

export const MANAGER_PRIMARY_QUESTIONS: string[] = [
  'What needs my review?',
  'Which tasks are overdue?',
  'How are my projects progressing?',
  'What should I focus on next?',
];

export const MANAGER_QUESTION_CATALOG: QuestionCategory[] = [
  {
    title: 'General',
    questions: [
      'What can you do?',
    ],
  },
  {
    title: 'Project Management',
    questions: [
      'What projects am I managing?',
      'How are my projects progressing?',
      'What tasks are currently active?',
      "How is my team's workload?",
      'Which tasks are overdue?',
      'What should I focus on next?',
    ],
  },
  {
    title: 'Reviews',
    questions: [
      'What needs my review?',
      'Which submissions are waiting for review?',
      'Which candidates need my review?',
      'Which tasks were returned for revision?',
    ],
  },
  {
    title: 'Company Intelligence',
    questions: [
      { label: 'Find a company', template: 'Find [company name]' },
      { label: 'Company information', template: 'What do we know about [company name]?' },
      { label: 'Compare companies', template: 'Compare [company A] and [company B]' },
      { label: 'Company relationship', template: 'What relationship do we have with [company name]?' },
      { label: 'Public company news', template: 'Show public news about [company name]' },
    ],
  },
];

export const buildManagerQuestionCatalog = (_companyName: string = 'FPT'): QuestionCategory[] => {
  return MANAGER_QUESTION_CATALOG;
};

const formatClockTime = () =>
  new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit' }).format(new Date());

const formatMsgTime = (dateStr?: string) => {
  if (!dateStr) return formatClockTime();
  try {
    return new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit' }).format(new Date(dateStr));
  } catch {
    return formatClockTime();
  }
};

const formatSessionTime = (dateStr?: string) => {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const dateTime = date.getTime();
    if (dateTime >= todayStart) {
      return new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit' }).format(date);
    }
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date);
  } catch {
    return '';
  }
};

const formatSessionTitle = (firstQuestion?: string) => {
  if (!firstQuestion || !firstQuestion.trim()) return 'New conversation';
  const clean = firstQuestion.trim();
  return clean.length > 44 ? clean.substring(0, 44) + '...' : clean;
};

export const AIAgent: React.FC<AIAgentProps> = ({ setActivePage }) => {
  const { currentUser } = useUser();
  const [sessions, setSessions] = useState<AiChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState<string | null>(null);
  const [activeCompanyProfileId, setActiveCompanyProfileId] = useState<string | null>(null);
  const [projectsList, setProjectsList] = useState<ProjectResponse[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isCatalogExpanded, setIsCatalogExpanded] = useState(false);
  const [showFollowupCatalog, setShowFollowupCatalog] = useState(false);

  // Deletion state
  const [sessionToDelete, setSessionToDelete] = useState<AiChatSession | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isOwnerMode = currentUser?.role === ROLES.ADMIN || currentUser?.role === ROLES.OWNER;
  const isManagerMode = currentUser?.role === ROLES.MANAGER;
  const isStaffMode = currentUser?.role === ROLES.STAFF;

  const activePrimaryQuestions = useMemo(() => {
    if (isStaffMode) return STAFF_PRIMARY_QUESTIONS;
    if (isManagerMode) return MANAGER_PRIMARY_QUESTIONS;
    return [];
  }, [isStaffMode, isManagerMode]);

  const activeQuestionCatalog = useMemo(() => {
    if (isStaffMode) return STAFF_QUESTION_CATALOG;
    if (isManagerMode) return MANAGER_QUESTION_CATALOG;
    return [];
  }, [isStaffMode, isManagerMode]);

  const hasStarterCatalog = isStaffMode || isManagerMode;

  // Auto-scroll on messages change
  useEffect(() => {
    requestAnimationFrame(() => {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    });
  }, [messages]);

  // Resolve projects for Staff and Manager
  useEffect(() => {
    if (isOwnerMode) return;

    const controller = new AbortController();
    void api
      .get<PageResult<ProjectResponse>>('/projects', {
        params: { page: 0, size: 100 },
        signal: controller.signal,
      })
      .then((res) => {
        const rows = res?.data?.content ?? [];
        setProjectsList(rows);
      })
      .catch(() => {
        setProjectsList([]);
      });

    return () => controller.abort();
  }, [isOwnerMode]);

  // Load messages for a given session ID
  const loadSessionMessages = useCallback(
    async (
      sessionId: string,
      sessionContext?: { projectId?: number; companyProfileId?: string }
    ) => {
      setActiveSessionId(sessionId);
      setIsLoadingMessages(true);

      try {
        const messagesEndpoint = isOwnerMode
          ? `/owner/ai-assistant/sessions/${sessionId}/messages`
          : `/ai-assistant/sessions/${sessionId}/messages`;
        const res = await api.get<any[]>(messagesEndpoint);
        const msgs = res?.data || [];

        const loadedMessages: Message[] = [];
        msgs.forEach((m: any) => {
          loadedMessages.push({
            role: 'user',
            content: m.question,
            timestamp: formatMsgTime(m.createdAt),
          });
          loadedMessages.push({
            role: 'ai',
            content: m.answer,
            sources: m.sources,
            suggestedActions: m.suggestedActions,
            navigationActions: m.navigationActions ?? [],
            timestamp: formatMsgTime(m.createdAt),
          });
        });
        setMessages(loadedMessages);
        setIsCatalogExpanded(false);
        setShowFollowupCatalog(false);

        // Restore project context if applicable
        if (sessionContext?.projectId) {
          setProjectId(String(sessionContext.projectId));
          const found = projectsList.find((p) => p.id === sessionContext.projectId);
          if (found) {
            setProjectName(found.projectName);
          } else {
            setProjectName(null);
          }
        } else {
          setProjectId(null);
          setProjectName(null);
        }

        // Restore company profile context if applicable
        if (sessionContext?.companyProfileId) {
          setActiveCompanyProfileId(sessionContext.companyProfileId);
        } else {
          setActiveCompanyProfileId(null);
        }
      } catch (err) {
        console.error('Failed to load session messages', err);
        setMessages([]);
      } finally {
        setIsLoadingMessages(false);
      }
    },
    [isOwnerMode, projectsList]
  );

  // Fetch all user sessions on mount or role change
  const fetchSessions = useCallback(
    async (targetSessionIdToSelect?: string) => {
      try {
        const sessionEndpoint = isOwnerMode
          ? '/owner/ai-assistant/sessions'
          : '/ai-assistant/sessions';
        const sessionsRes = await api.get<any[]>(sessionEndpoint);
        const loadedSessions: AiChatSession[] = sessionsRes?.data || [];

        loadedSessions.sort(
          (a, b) =>
            new Date(b.lastMessageAt || b.startedAt).getTime() -
            new Date(a.lastMessageAt || a.startedAt).getTime()
        );

        setSessions(loadedSessions);

        if (targetSessionIdToSelect) {
          const match = loadedSessions.find((s) => s.sessionId === targetSessionIdToSelect);
          if (match) {
            void loadSessionMessages(match.sessionId, match);
          }
        } else if (loadedSessions.length > 0) {
          // Select latest conversation
          const latest = loadedSessions[0];
          void loadSessionMessages(latest.sessionId, latest);
        } else {
          setActiveSessionId(null);
          setMessages([]);
        }
      } catch (error) {
        console.error('Failed to load AI sessions', error);
        setSessions([]);
      } finally {
        setIsLoadingSessions(false);
      }
    },
    [isOwnerMode, loadSessionMessages]
  );

  useEffect(() => {
    setIsLoadingSessions(true);
    void fetchSessions();
  }, [fetchSessions]);

  // Group sessions by date
  const groupedSessions = useMemo(() => {
    const today: AiChatSession[] = [];
    const yesterday: AiChatSession[] = [];
    const previous7Days: AiChatSession[] = [];
    const earlier: AiChatSession[] = [];

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayStart = todayStart - 86400000;
    const sevenDaysAgo = todayStart - 6 * 86400000;

    sessions.forEach((s) => {
      const dateStr = s.lastMessageAt || s.startedAt;
      const time = dateStr ? new Date(dateStr).getTime() : 0;
      if (time >= todayStart) {
        today.push(s);
      } else if (time >= yesterdayStart) {
        yesterday.push(s);
      } else if (time >= sevenDaysAgo) {
        previous7Days.push(s);
      } else {
        earlier.push(s);
      }
    });

    return [
      { label: 'Today', items: today },
      { label: 'Yesterday', items: yesterday },
      { label: 'Previous 7 Days', items: previous7Days },
      { label: 'Earlier', items: earlier },
    ].filter((g) => g.items.length > 0);
  }, [sessions]);

  // Role-specific suggested starter questions
  const defaultSuggestions: SuggestionCard[] = useMemo(() => {
    if (isStaffMode) {
      return [
        {
          title: 'My Assigned Tasks',
          description: 'View tasks currently assigned to you and their status',
          prompt: 'What tasks am I assigned to in my current projects?',
          icon: CheckCircle2,
        },
        {
          title: 'Upcoming Deadlines',
          description: 'Check deliverables and milestones due soon',
          prompt: 'Which tasks or milestones are due soon or overdue?',
          icon: Clock,
        },
        {
          title: 'Project Deliverables',
          description: 'Review key deliverables and required documentation',
          prompt: 'What are the key deliverables and documents needed for my active projects?',
          icon: FolderKanban,
        },
        {
          title: 'Recent Progress Summary',
          description: 'Summarize work completed and next recommended steps',
          prompt: 'Summarize recent progress on my assigned projects and next actions',
          icon: FileText,
        },
      ];
    }

    if (isManagerMode) {
      return [
        {
          title: 'Project Pipeline Status',
          description: 'Overview of all active projects, phases, and team velocity',
          prompt: 'What is the status of ongoing projects and team progress?',
          icon: FolderKanban,
        },
        {
          title: 'Risk & Delay Alerts',
          description: 'Identify blocked tasks, overdue milestones, or partner risks',
          prompt: 'Are there any high-risk companies, overdue deliverables, or bottlenecks?',
          icon: AlertTriangle,
        },
        {
          title: 'Pending Reviews',
          description: 'Summarize evaluations and approval requests waiting for action',
          prompt: 'Summarize pending company evaluations, reviews, and approvals',
          icon: FileText,
        },
        {
          title: 'Monitoring Overview',
          description: 'Get an update on monitored companies and governance status',
          prompt: 'Show an overview of company monitoring activities and critical changes',
          icon: Target,
        },
      ];
    }

    // Owner / Admin
    return [
      {
        title: 'Partner Ecosystem Health',
        description: 'Comprehensive health and performance of strategic partnerships',
        prompt: 'Summarize the health and status of our partner ecosystem',
        icon: Briefcase,
      },
      {
        title: 'Risk Intelligence Signals',
        description: 'Review strategic risk indicators and watchlist updates',
        prompt: 'What are the latest risk signals across our monitored companies?',
        icon: AlertTriangle,
      },
      {
        title: 'Executive Briefing',
        description: 'High-level synthesis of enterprise initiatives and key metrics',
        prompt: 'Give me an executive briefing on ongoing business initiatives and partnerships',
        icon: FileText,
      },
      {
        title: 'Priority Actions',
        description: 'Identify partnerships and decisions that need immediate attention',
        prompt: 'Which strategic partnerships and governance items require immediate attention?',
        icon: Target,
      },
    ];
  }, [isStaffMode, isManagerMode]);

  // Prepare a fresh, unsaved conversation
  const startNewChat = () => {
    setActiveSessionId(null);
    setMessages([]);
    setInput('');
    setIsCatalogExpanded(false);
    setShowFollowupCatalog(false);
    setProjectId(null);
    setProjectName(null);
    setActiveCompanyProfileId(null);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.focus();
    }
  };

  const handleSelectTemplate = (template: string) => {
    setInput(template);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.focus();
    }
  };

  const handleQuestionClick = (question: string | QuestionItem) => {
    const template = getQuestionTemplate(question);
    if (template) {
      handleSelectTemplate(template);
    } else {
      void sendMessage(getQuestionLabel(question));
    }
  };

  const sendMessage = async (override?: string) => {
    const msg = (override ?? input).trim();
    if (!msg || isSending) return;

    const currentTime = formatClockTime();
    setMessages((prev) => [
      ...prev,
      { role: 'user', content: msg, timestamp: currentTime },
      { role: 'ai', content: '', isLoading: true, timestamp: currentTime },
    ]);
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    setIsSending(true);

    try {
      const endpoint = isOwnerMode ? '/owner/ai-assistant/chat' : '/ai-assistant/chat';

      const effectiveProjectId = projectId
        ? Number(projectId)
        : (projectsList[0] ? projectsList[0].id : undefined);

      if (!isOwnerMode && !effectiveProjectId) {
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = {
            role: 'ai',
            content: 'No active project is currently selected or available. Please ensure a project is selected to continue.',
            timestamp: formatClockTime(),
          };
          return next;
        });
        return;
      }

      const payload: {
        question: string;
        sessionId?: string;
        projectId?: number;
        companyProfileId?: string;
      } = { question: msg };

      // Pass sessionId only if we are continuing an active session
      if (activeSessionId) {
        payload.sessionId = activeSessionId;
      }
      if (!isOwnerMode && effectiveProjectId) {
        payload.projectId = effectiveProjectId;
      }

      if (isOwnerMode) {
        const isCompanyDetailPage = window.location.hash.startsWith('#company-detail');
        const storedCompanyId = isCompanyDetailPage ? localStorage.getItem('apms-selected-company') : undefined;
        if (storedCompanyId) {
          payload.companyProfileId = storedCompanyId;
        }
      } else if (activeCompanyProfileId) {
        payload.companyProfileId = activeCompanyProfileId;
      }

      const res = await api.post<AiChatResponse>(endpoint, payload, { timeoutMs: 60000 });
      const returnedSessionId = res?.data?.sessionId || null;

      if (returnedSessionId) {
        setActiveSessionId(returnedSessionId);
      }

      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = {
          role: 'ai',
          content: res?.data?.answer || 'The assistant did not return an answer.',
          sources: res?.data?.sources || [],
          suggestedActions: res?.data?.suggestedActions || [],
          navigationActions: res?.data?.navigationActions || [],
          timestamp: formatClockTime(),
        };
        return next;
      });

      // Refresh session list so the new/updated conversation appears in history
      if (returnedSessionId) {
        const sessionEndpoint = isOwnerMode
          ? '/owner/ai-assistant/sessions'
          : '/ai-assistant/sessions';
        api.get<any[]>(sessionEndpoint).then((sessionsRes) => {
          const updated: AiChatSession[] = sessionsRes?.data || [];
          updated.sort(
            (a, b) =>
              new Date(b.lastMessageAt || b.startedAt).getTime() -
              new Date(a.lastMessageAt || a.startedAt).getTime()
          );
          setSessions(updated);
        }).catch(() => undefined);
      }
    } catch (error: any) {
      setMessages((prev) => {
        const next = [...prev];
        let errorMsg = error instanceof Error ? error.message : 'Cannot connect to the AI service.';
        if (error?.status === 408) {
          errorMsg = 'The AI service timed out. Please try again.';
        }
        next[next.length - 1] = {
          role: 'ai',
          content: `⚠️ **Unable to complete request**: ${errorMsg}`,
          timestamp: formatClockTime(),
        };
        return next;
      });
    } finally {
      setIsSending(false);
      textareaRef.current?.focus();
    }
  };

  const handleNavigationAction = (action: AiNavigationAction) => {
    if (action.type === 'COMPANY_PROFILE' && action.companyProfileId) {
      localStorage.setItem('apms-selected-company', action.companyProfileId);
      window.dispatchEvent(
        new CustomEvent('apms-company-selection-changed', {
          detail: {
            companyProfileId: action.companyProfileId,
          },
        })
      );
      if (setActivePage) {
        setActivePage('company-detail');
      } else {
        window.location.hash = '#company-detail';
      }
    }
  };

  // Permanent Delete Conversation Confirmation
  const executeDeleteSession = async () => {
    if (!sessionToDelete) return;
    setIsDeleting(true);
    setDeleteError(null);

    const targetId = sessionToDelete.sessionId;
    const deleteEndpoint = isOwnerMode
      ? `/owner/ai-assistant/sessions/${targetId}`
      : `/ai-assistant/sessions/${targetId}`;

    try {
      await api.delete(deleteEndpoint);

      // Remove from local session list
      setSessions((prev) => prev.filter((s) => s.sessionId !== targetId));

      // If the deleted session was the currently active one, clear active conversation
      if (activeSessionId === targetId) {
        setActiveSessionId(null);
        setMessages([]);
        setInput('');
      }

      setSessionToDelete(null);
    } catch (err: any) {
      console.error('Failed to delete chat session', err);
      const msg = err?.response?.data?.message || err?.message || 'Failed to delete conversation.';
      setDeleteError(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className={styles.page} id="page-ai-assistant">
      {/* Top Workspace Page Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <button
            type="button"
            className={styles.sidebarToggleBtn}
            onClick={() => setIsSidebarOpen((prev) => !prev)}
            title={isSidebarOpen ? 'Collapse history panel' : 'Expand history panel'}
            aria-label="Toggle history panel"
          >
            {isSidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
          </button>
          <div className={styles.headerIcon}>
            <Sparkles size={20} />
          </div>
          <div>
            <h1 className={styles.pageTitle}>AI Assistant</h1>
            <p className={styles.pageSubtitle}>
              Ask questions about your projects, tasks, companies, and business information.
            </p>
          </div>
        </div>
      </header>

      {/* Main Workspace Body: Internal History Panel + Chat Workspace */}
      <div className={styles.workspaceBody}>
        {/* Internal Left Conversation History Panel */}
        <aside
          className={`${styles.historyPanel} ${isSidebarOpen ? '' : styles.historyPanelCollapsed}`}
          aria-label="Conversation History"
        >
          <div className={styles.historyHeader}>
            <button
              type="button"
              className={styles.newChatActionBtn}
              onClick={startNewChat}
              title="Start a new conversation"
            >
              <Plus size={16} />
              <span>New Chat</span>
            </button>
          </div>

          <div className={styles.historyList}>
            {isLoadingSessions ? (
              <div className={styles.historyLoading}>
                <Loader2 size={18} className={styles.spin} />
                <span>Loading conversations...</span>
              </div>
            ) : sessions.length === 0 ? (
              <div className={styles.historyEmpty}>
                <MessageSquare size={24} className={styles.emptyIconMuted} />
                <p>No saved conversations yet.</p>
              </div>
            ) : (
              groupedSessions.map((group) => (
                <div key={group.label} className={styles.sessionGroup}>
                  <div className={styles.groupLabel}>{group.label}</div>
                  <div className={styles.groupItems}>
                    {group.items.map((session) => {
                      const isActive = session.sessionId === activeSessionId;
                      return (
                        <div
                          key={session.sessionId}
                          className={`${styles.sessionItem} ${isActive ? styles.sessionItemActive : ''}`}
                          onClick={() => {
                            if (!isActive) {
                              void loadSessionMessages(session.sessionId, session);
                            }
                          }}
                        >
                          <div className={styles.sessionItemBody}>
                            <strong className={styles.sessionItemTitle}>
                              {formatSessionTitle(session.firstQuestion)}
                            </strong>
                            <span className={styles.sessionItemTime}>
                              {formatSessionTime(session.lastMessageAt || session.startedAt)}
                            </span>
                          </div>

                          <button
                            type="button"
                            className={styles.deleteSessionBtn}
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteError(null);
                              setSessionToDelete(session);
                            }}
                            title="Delete conversation"
                            aria-label={`Delete conversation ${session.firstQuestion}`}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>

        {/* Right Chat Workspace Card */}
        <main className={styles.chatWorkspace}>
          {/* Scrollable Conversation Thread */}
          <section className={styles.thread} aria-live="polite">
            <div className={styles.threadInner}>
              {isLoadingMessages ? (
                <div className={styles.loadingThread}>
                  <Loader2 size={24} className={styles.spin} />
                  <span>Loading messages...</span>
                </div>
              ) : messages.length === 0 ? (
                <div className={styles.emptyState}>
                  <div className={styles.emptyIcon}>
                    <Sparkles size={34} />
                  </div>
                  <h2 className={styles.emptyTitle}>Start a new conversation</h2>
                  <p className={styles.emptyDescription}>
                    {isStaffMode
                      ? 'Ask about your assigned tasks, projects, deadlines, submissions, or choose a starter question below:'
                      : isManagerMode
                      ? 'Ask about your managed projects, team progress, reviews, company profiles, or choose a starter question below:'
                      : 'Ask about your projects, tasks, companies, deadlines, or next actions, or choose a starter question below:'}
                  </p>

                  {hasStarterCatalog ? (
                    <div className={styles.starterCatalogContainer}>
                      <div className={styles.starterCatalogHeader}>
                        <span className={styles.starterCatalogTitle}>Suggested Questions</span>
                        <button
                          type="button"
                          className={styles.viewAllToggleBtn}
                          onClick={() => setIsCatalogExpanded((prev) => !prev)}
                          aria-expanded={isCatalogExpanded}
                        >
                          {isCatalogExpanded ? (
                            <>
                              <span>Show less</span>
                              <ChevronUp size={13} />
                            </>
                          ) : (
                            <>
                              <span>View all questions</span>
                              <ChevronDown size={13} />
                            </>
                          )}
                        </button>
                      </div>

                      {!isCatalogExpanded ? (
                        <div className={styles.starterChipsRow}>
                          {activePrimaryQuestions.map((question, idx) => (
                            <button
                              key={idx}
                              type="button"
                              className={styles.followupChip}
                              onClick={() => void sendMessage(question)}
                              disabled={isSending}
                            >
                              {question}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className={styles.catalogPanel}>
                          {activeQuestionCatalog.map((category, catIdx) => (
                            <div key={catIdx} className={styles.catalogCategory}>
                              <span className={styles.catalogCategoryTitle}>{category.title}</span>
                              <div className={styles.catalogChips}>
                                {category.questions.map((question, qIdx) => (
                                  <button
                                    key={qIdx}
                                    type="button"
                                    className={styles.followupChip}
                                    onClick={() => handleQuestionClick(question)}
                                    disabled={isSending}
                                  >
                                    {getQuestionLabel(question)}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}
                          <div className={styles.collapseCatalogRow}>
                            <button
                              type="button"
                              className={styles.viewAllToggleBtn}
                              onClick={() => setIsCatalogExpanded(false)}
                            >
                              <span>Show less</span>
                              <ChevronUp size={13} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className={styles.suggestionsGrid}>
                      {defaultSuggestions.map((card, idx) => {
                        const CardIcon = card.icon;
                        return (
                          <button
                            key={idx}
                            type="button"
                            className={styles.suggestionCard}
                            onClick={() => void sendMessage(card.prompt)}
                            disabled={isSending}
                          >
                            <div className={styles.cardHeader}>
                              <div className={styles.cardIconBox}>
                                <CardIcon size={18} />
                              </div>
                              <strong className={styles.cardTitle}>{card.title}</strong>
                            </div>
                            <p className={styles.cardDesc}>{card.description}</p>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                messages.map((message, index) => (
                  <article
                    key={index}
                    className={`${styles.messageRow} ${
                      message.role === 'user' ? styles.userRow : styles.aiRow
                    }`}
                  >
                    <div className={styles.avatar}>
                      {message.role === 'ai' ? <Sparkles size={16} /> : <User size={16} />}
                    </div>

                    <div className={styles.messageBlock}>
                      <div className={styles.messageMeta}>
                        <strong>{message.role === 'ai' ? 'APMS AI' : currentUser?.name || 'You'}</strong>
                        {message.timestamp && <span>{message.timestamp}</span>}
                      </div>

                      <div
                        className={`${styles.bubble} ${
                          message.role === 'user' ? styles.userBubble : styles.aiBubble
                        }`}
                      >
                        {message.isLoading ? (
                          <div className={styles.loadingDots}>
                            <i />
                            <i />
                            <i />
                            <span>Thinking...</span>
                          </div>
                        ) : message.role === 'ai' ? (
                          <div className={styles.markdownContent}>
                            <ReactMarkdown>{message.content}</ReactMarkdown>
                          </div>
                        ) : (
                          <p className={styles.userText}>{message.content}</p>
                        )}
                      </div>

                      {/* Navigation Actions */}
                      {message.navigationActions && message.navigationActions.length > 0 && (
                        <div className={styles.actionGroup}>
                          {message.navigationActions.map((action, actionIndex) => (
                            <button
                              key={`nav-${actionIndex}`}
                              type="button"
                              className={styles.navActionButton}
                              onClick={() => handleNavigationAction(action)}
                            >
                              <span>{action.label}</span>
                              <ExternalLink size={13} />
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Source References */}
                      {message.sources && message.sources.length > 0 && (
                        <div className={styles.sourcesBox}>
                          <div className={styles.sourcesHeader}>
                            <FileText size={14} />
                            <span>Sources & References ({message.sources.length})</span>
                          </div>
                          <div className={styles.sourcesList}>
                            {message.sources.map((src, srcIndex) => (
                              <div key={srcIndex} className={styles.sourceItem}>
                                <div className={styles.sourceTitleRow}>
                                  <strong className={styles.sourceTitle}>
                                    {src.documentTitle || src.title || `Source #${srcIndex + 1}`}
                                  </strong>
                                  {src.relevanceScore !== undefined && (
                                    <span className={styles.relevanceBadge}>
                                      {Math.round(src.relevanceScore * 100)}% match
                                    </span>
                                  )}
                                </div>
                                {src.snippet && <p className={styles.sourceSnippet}>{src.snippet}</p>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Suggested Follow-up Actions */}
                      {message.suggestedActions && message.suggestedActions.length > 0 && (
                        <div className={styles.followupsGroup}>
                          <div className={styles.followupsHeaderRow}>
                            <span className={styles.followupsLabel}>Suggested follow-ups:</span>
                            {hasStarterCatalog && index === messages.length - 1 && (
                              <button
                                type="button"
                                className={styles.viewAllToggleBtnInline}
                                onClick={() => setShowFollowupCatalog((prev) => !prev)}
                                aria-expanded={showFollowupCatalog}
                              >
                                {showFollowupCatalog ? (
                                  <>
                                    <span>Show less</span>
                                    <ChevronUp size={12} />
                                  </>
                                ) : (
                                  <>
                                    <span>View all questions</span>
                                    <ChevronDown size={12} />
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                          <div className={styles.followupChips}>
                            {message.suggestedActions.map((action, actionIndex) => (
                              <button
                                key={`sug-${actionIndex}`}
                                type="button"
                                className={styles.followupChip}
                                onClick={() => void sendMessage(action)}
                                disabled={isSending}
                              >
                                {action}
                              </button>
                            ))}
                          </div>
                          {hasStarterCatalog && index === messages.length - 1 && showFollowupCatalog && (
                            <div className={styles.catalogPanelInline}>
                              {activeQuestionCatalog.map((category, catIdx) => (
                                <div key={catIdx} className={styles.catalogCategory}>
                                  <span className={styles.catalogCategoryTitle}>{category.title}</span>
                                  <div className={styles.catalogChips}>
                                    {category.questions.map((question, qIdx) => (
                                      <button
                                        key={qIdx}
                                        type="button"
                                        className={styles.followupChip}
                                        onClick={() => handleQuestionClick(question)}
                                        disabled={isSending}
                                      >
                                        {getQuestionLabel(question)}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              ))}
                              <div className={styles.collapseCatalogRowInline}>
                                <button
                                  type="button"
                                  className={styles.viewAllToggleBtnInline}
                                  onClick={() => setShowFollowupCatalog(false)}
                                >
                                  <span>Show less</span>
                                  <ChevronUp size={12} />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </article>
                ))
              )}
              <div ref={chatEndRef} />
            </div>
          </section>

          {/* Sticky Composer */}
          <footer className={styles.composerWrapper}>
            <div className={styles.composerInner}>
              <form
                className={styles.composerForm}
                onSubmit={(event) => {
                  event.preventDefault();
                  void sendMessage();
                }}
              >
                <textarea
                  ref={textareaRef}
                  rows={1}
                  value={input}
                  disabled={isSending}
                  placeholder={
                    isStaffMode
                      ? 'Ask about your projects, tasks, deadlines, or next actions...'
                      : isManagerMode
                      ? 'Ask about your team progress, pending reviews, or company profiles...'
                      : 'Ask about your business ecosystem, relationships, risks, or opportunities...'
                  }
                  onChange={(event) => {
                    setInput(event.target.value);
                    event.target.style.height = 'auto';
                    event.target.style.height = `${Math.min(event.target.scrollHeight, 140)}px`;
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      void sendMessage();
                    }
                  }}
                />
                <button
                  type="submit"
                  className={styles.sendButton}
                  disabled={isSending || !input.trim()}
                  title="Send question (Enter)"
                >
                  {isSending ? <Loader2 size={16} className={styles.spin} /> : <Send size={16} />}
                  <span>Send</span>
                </button>
              </form>
              <div className={styles.composerHint}>
                <span>Press <strong>Enter</strong> to send &middot; <strong>Shift + Enter</strong> for a new line</span>
              </div>
            </div>
          </footer>
        </main>
      </div>

      {/* Delete Confirmation Modal */}
      {sessionToDelete && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true">
          <div className={styles.modalDialog}>
            <div className={styles.modalHeader}>
              <div className={styles.modalAlertIcon}>
                <AlertTriangle size={22} />
              </div>
              <div>
                <h3 className={styles.modalTitle}>Delete conversation?</h3>
                <p className={styles.modalSubtitle}>
                  This will permanently delete this conversation and its messages. This action cannot be undone.
                </p>
              </div>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => {
                  if (!isDeleting) setSessionToDelete(null);
                }}
                disabled={isDeleting}
              >
                <X size={18} />
              </button>
            </div>

            <div className={styles.modalSessionPreview}>
              <strong className={styles.previewTitle}>
                &ldquo;{sessionToDelete.firstQuestion}&rdquo;
              </strong>
              <span className={styles.previewMeta}>
                {sessionToDelete.messageCount} {sessionToDelete.messageCount === 1 ? 'turn' : 'turns'} &middot;{' '}
                {formatSessionTime(sessionToDelete.lastMessageAt || sessionToDelete.startedAt)}
              </span>
            </div>

            {deleteError && (
              <div className={styles.modalErrorBanner}>
                <span>{deleteError}</span>
              </div>
            )}

            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.modalCancelBtn}
                onClick={() => setSessionToDelete(null)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.modalDeleteBtn}
                onClick={executeDeleteSession}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <Loader2 size={15} className={styles.spin} />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Delete</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
