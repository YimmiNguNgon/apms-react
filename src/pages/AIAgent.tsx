import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  AlertTriangle,
  Briefcase,
  Building2,
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

export interface AiMentionItem {
  type: 'PROJECT' | 'COMPANY';
  projectId?: number;
  companyProfileId?: string;
  companyId?: string;
  label: string;
  trigger: string;
}

export interface AutocompleteOption {
  type: 'PROJECT' | 'COMPANY';
  projectId?: number;
  companyProfileId?: string;
  companyId?: string;
  primaryLabel: string;
  secondaryLabel?: string;
  badge?: string;
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

export const OWNER_PRIMARY_QUESTIONS: string[] = [
  'Show me an overview of our business ecosystem',
  'Who are our current partners?',
  'What are the major risks across our ecosystem?',
  'Which partner should we prioritize for strategic collaboration?',
];

export const OWNER_QUESTION_CATALOG: QuestionCategory[] = [
  {
    title: 'Ecosystem Overview',
    questions: [
      'Show me an overview of our business ecosystem',
      'Who are our current partners?',
      'Who are our potential partners?',
      'Who are our competitors in the market?',
      'Who are our key customers and suppliers?',
      'Summarize the health and status of our partner ecosystem',
    ],
  },
  {
    title: 'Relationship & Closeness Assessment',
    questions: [
      { label: 'What is our relationship with a company?', template: 'What is our relationship with @Company?' },
      { label: 'How close is our relationship with a company?', template: 'How close is our relationship with @Company?' },
      'Which relationships need immediate attention or review?',
      'What is our relationship closeness distribution?',
      'Show all unrated partner relationships',
    ],
  },
  {
    title: 'Risk Intelligence & Signals',
    questions: [
      'What are the major risks across our ecosystem?',
      'What are the latest risk signals across our monitored companies?',
      { label: 'What risks should I know about a company?', template: 'What risks should I know about @Company?' },
      'Are there any critical partner warnings or dependency issues?',
    ],
  },
  {
    title: 'Strategic Opportunities & Priorities',
    questions: [
      'Which partner should we prioritize for strategic collaboration?',
      { label: 'What opportunities do we have with a company?', template: 'What opportunities do we have with @Company?' },
      'What strategic insights or recommendations do you have for next quarter?',
      'Which weak relationships present high growth potential?',
    ],
  },
  {
    title: 'Company Profile & Comparison',
    questions: [
      { label: 'What do we know about a company?', template: 'What do we know about @Company?' },
      { label: 'Compare two companies', template: 'Compare @Company and @Company' },
      { label: 'Which is a better strategic partner?', template: 'Which is a better strategic partner, @Company vs @Company?' },
      { label: 'Strengths and weaknesses of a company', template: 'What are the key strengths and weaknesses of @Company?' },
    ],
  },
  {
    title: 'Relationship Strengthening',
    questions: [
      { label: 'Should we strengthen our relationship with a company?', template: 'Should we strengthen our relationship with @Company?' },
      { label: 'Action steps to upgrade closeness with a company', template: 'What action steps are needed to upgrade our closeness with @Company?' },
    ],
  },
  {
    title: 'Basic Company',
    questions: [
      { label: 'Company profile details', template: 'What do we know about @Company?' },
      { label: 'Public news about a company', template: 'What public news do we have about @Company?' },
      { label: 'Legal name and trade name', template: 'What is the legal name and trade name of @Company?' },
      { label: 'Official tax code and registration number', template: 'What is the official tax code and registration number of @Company?' },
      { label: 'Headquarters address and operational locations', template: 'Where is the headquarters address and operational locations of @Company?' },
      { label: 'Official website and contact information', template: 'What is the official website and contact information for @Company?' },
      { label: 'Industries and sectors', template: 'What industries and sectors does @Company operate in?' },
      { label: 'Core business model', template: 'What is the core business model of @Company?' },
      { label: 'Main products and services', template: 'What are the main products and services delivered by @Company?' },
      { label: 'Target customers and target markets', template: 'Who are the primary target customers and target markets of @Company?' },
      { label: 'Company leadership', template: 'Who is the leadership at @Company?' },
    ],
  },
  {
    title: 'Financial',
    questions: [
      { label: 'Latest annual revenue and revenue tier', template: 'What is the latest annual revenue and revenue tier of @Company?' },
      { label: 'Recorded revenue currency', template: 'What is the revenue currency recorded for @Company?' },
      { label: 'Monthly revenue growth rate', template: 'What is the monthly revenue growth rate of @Company?' },
      { label: 'Revenue trend across reporting periods', template: 'How has @Company\'s revenue trended across the recorded reporting periods?' },
      { label: 'Compare revenue scale and financial tier', template: 'Compare the revenue scale and financial tier between @Company and @Company' },
    ],
  },
  {
    title: 'Contract',
    questions: [
      { label: 'Active contracts or strategic agreements', template: 'What active contracts or strategic agreements do we have with @Company?' },
      { label: 'Contract number, signing date, and effective date', template: 'What is the contract number, signing date, and effective date for @Company?' },
      { label: 'Contract term and expiration date', template: 'What is the contract term and when does the agreement with @Company expire?' },
      { label: 'Current derived status of the contract', template: 'What is the current derived status of the contract with @Company?' },
      { label: 'Total contract value and currency', template: 'What is the total contract value and currency specified in the agreement with @Company?' },
    ],
  },
];

export const MANAGER_PRIMARY_QUESTIONS: string[] = [
  'What needs my review?',
  'Which tasks are overdue?',
  'How are my projects progressing?',
  'What should I focus on next as a manager?',
];

export const MANAGER_QUESTION_CATALOG: QuestionCategory[] = [
  {
    title: 'Project & Workload',
    questions: [
      'What projects am I managing?',
      'How are my projects progressing?',
      { label: 'Progress of a specific project', template: 'What is the progress of project !Project?' },
      { label: 'Active tasks in a project', template: 'What tasks are currently active in project !Project?' },
      'Who on the team has the most tasks assigned?',
    ],
  },
  {
    title: 'Deadlines & Bottlenecks',
    questions: [
      'Which tasks are overdue?',
      'Are there any bottlenecks or blocked tasks in my projects?',
      'What should I focus on next as a manager?',
    ],
  },
  {
    title: 'Submission Review Queue',
    questions: [
      'What needs my review?',
      'Which submissions are waiting for my review?',
      { label: 'Submissions waiting for review in a project', template: 'Which submissions are waiting for my review in project !Project?' },
      'Which submissions should I review first?',
    ],
  },
  {
    title: 'Returned Work & Revisions',
    questions: [
      'Which tasks were returned for revision?',
    ],
  },
  {
    title: 'General',
    questions: [
      'What can you do?',
    ],
  },
  {
    title: 'Company Intelligence',
    questions: [
      { label: 'Find a company', template: 'Find @Company' },
      { label: 'Company information', template: 'What do we know about @Company?' },
      { label: 'Compare companies', template: 'Compare @Company and @Company' },
      { label: 'Company relationship', template: 'What relationship do we have with @Company?' },
      { label: 'Public company news', template: 'Show public news about @Company' },
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

  // Mention autocomplete and attached entities state
  const [attachedMentions, setAttachedMentions] = useState<AiMentionItem[]>([]);
  const [mentionMenu, setMentionMenu] = useState<{
    open: boolean;
    trigger: '!' | '@';
    triggerIndex: number;
    query: string;
    options: AutocompleteOption[];
    highlightedIndex: number;
    isLoading: boolean;
  }>({
    open: false,
    trigger: '@',
    triggerIndex: -1,
    query: '',
    options: [],
    highlightedIndex: 0,
    isLoading: false,
  });
  const [pendingComparisonTemplate, setPendingComparisonTemplate] = useState<{
    fullTemplate: string;
    stage: number;
    firstMention?: AiMentionItem;
  } | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activePrimaryQuestions = useMemo(() => {
    if (isStaffMode) return STAFF_PRIMARY_QUESTIONS;
    if (isManagerMode) return MANAGER_PRIMARY_QUESTIONS;
    if (isOwnerMode) return OWNER_PRIMARY_QUESTIONS;
    return [];
  }, [isStaffMode, isManagerMode, isOwnerMode]);

  const activeQuestionCatalog = useMemo(() => {
    if (isStaffMode) return STAFF_QUESTION_CATALOG;
    if (isManagerMode) return MANAGER_QUESTION_CATALOG;
    if (isOwnerMode) return OWNER_QUESTION_CATALOG;
    return [];
  }, [isStaffMode, isManagerMode, isOwnerMode]);

  const hasStarterCatalog = isStaffMode || isManagerMode || isOwnerMode;

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
    setAttachedMentions([]);
    setPendingComparisonTemplate(null);
    setMentionMenu({
      open: false,
      trigger: '@',
      triggerIndex: -1,
      query: '',
      options: [],
      highlightedIndex: 0,
      isLoading: false,
    });

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.focus();
    }
  };

  const openMentionAutocomplete = (trigger: '!' | '@', triggerIndex: number, query: string) => {
    setMentionMenu(prev => ({
      ...prev,
      open: true,
      trigger,
      triggerIndex,
      query,
      isLoading: true,
      highlightedIndex: 0,
    }));

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      try {
        if (trigger === '!') {
          const res = await api.get<any[]>(`/ai-assistant/projects/autocomplete?q=${encodeURIComponent(query)}&limit=8`);
          const items: AutocompleteOption[] = (res.data || []).map((p: any) => ({
            type: 'PROJECT',
            projectId: p.projectId,
            primaryLabel: p.projectName,
            secondaryLabel: p.targetCompany ? `Target: ${p.targetCompany}` : (p.projectType || undefined),
            badge: p.status || 'PROJECT',
          }));
          setMentionMenu(prev => ({
            ...prev,
            options: items,
            isLoading: false,
            highlightedIndex: 0,
          }));
        } else {
          const res = await api.get<any[]>(`/owner/ai-assistant/companies/autocomplete?q=${encodeURIComponent(query)}&limit=8`);
          const items: AutocompleteOption[] = (res.data || []).map((c: any) => ({
            type: 'COMPANY',
            companyProfileId: c.companyProfileId,
            companyId: c.companyId,
            primaryLabel: c.legalName,
            secondaryLabel: c.tradeName ? `Trade: ${c.tradeName}` : (c.taxCode ? `Tax: ${c.taxCode}` : undefined),
            badge: c.taxCode || 'APPROVED',
          }));
          setMentionMenu(prev => ({
            ...prev,
            options: items,
            isLoading: false,
            highlightedIndex: 0,
          }));
        }
      } catch {
        setMentionMenu(prev => ({ ...prev, options: [], isLoading: false }));
      }
    }, 200);
  };

  const selectMention = (option: AutocompleteOption) => {
    const trigger = mentionMenu.trigger;
    const triggerIndex = mentionMenu.triggerIndex;
    const query = mentionMenu.query;

    const label = option.primaryLabel;
    const mentionText = `${trigger}${label}`;

    const beforeTrigger = input.slice(0, triggerIndex);
    const afterQuery = input.slice(triggerIndex + 1 + query.length);

    let nextInput = beforeTrigger + mentionText + ' ';
    let nextCursorPos = nextInput.length;

    const newMention: AiMentionItem = {
      type: option.type,
      projectId: option.projectId,
      companyProfileId: option.companyProfileId,
      companyId: option.companyId,
      label,
      trigger,
    };

    const updatedMentions = [...attachedMentions.filter(m => m.label !== label), newMention];
    setAttachedMentions(updatedMentions);

    // Check progressive comparison template
    if (pendingComparisonTemplate && pendingComparisonTemplate.stage === 1) {
      const isVs = pendingComparisonTemplate.fullTemplate.includes(' vs ');
      nextInput = `${beforeTrigger}${mentionText} ${isVs ? 'vs' : 'and'} @`;
      nextCursorPos = nextInput.length;
      setInput(nextInput);
      setPendingComparisonTemplate({
        fullTemplate: pendingComparisonTemplate.fullTemplate,
        stage: 2,
        firstMention: newMention,
      });

      const nextTriggerIndex = nextInput.lastIndexOf('@');
      openMentionAutocomplete('@', nextTriggerIndex, '');
      if (textareaRef.current) {
        textareaRef.current.focus();
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.selectionStart = nextCursorPos;
            textareaRef.current.selectionEnd = nextCursorPos;
          }
        }, 10);
      }
      return;
    }

    if (pendingComparisonTemplate && pendingComparisonTemplate.stage === 2) {
      setPendingComparisonTemplate(null);
      if (afterQuery.trim()) {
        nextInput = nextInput + afterQuery.trim();
      }
    } else if (afterQuery.trim()) {
      nextInput = nextInput + afterQuery.trim();
    }

    setInput(nextInput);
    setMentionMenu(prev => ({ ...prev, open: false, options: [] }));

    if (textareaRef.current) {
      textareaRef.current.focus();
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = nextCursorPos;
          textareaRef.current.selectionEnd = nextCursorPos;
        }
      }, 10);
    }
  };

  const removeAttachedMention = (indexToRemove: number) => {
    const toRemove = attachedMentions[indexToRemove];
    if (toRemove) {
      const mentionStr = `${toRemove.trigger}${toRemove.label}`;
      setInput(prev => prev.replace(mentionStr, '').replace(/\s+/g, ' ').trim());
    }
    setAttachedMentions(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = event.target.value;
    setInput(val);
    event.target.style.height = 'auto';
    event.target.style.height = `${Math.min(event.target.scrollHeight, 140)}px`;

    const cursorPos = event.target.selectionStart || 0;
    const textBeforeCursor = val.slice(0, cursorPos);

    // Prune detached mentions if label was removed
    setAttachedMentions(prev => prev.filter(m => val.includes(m.trigger + m.label)));

    const lastAt = textBeforeCursor.lastIndexOf('@');
    const lastBang = textBeforeCursor.lastIndexOf('!');

    let activeTriggerIndex = -1;
    let activeTrigger: '!' | '@' | null = null;

    if (lastBang > lastAt) {
      activeTriggerIndex = lastBang;
      activeTrigger = '!';
    } else if (lastAt >= 0) {
      activeTriggerIndex = lastAt;
      activeTrigger = '@';
    }

    if (activeTrigger === '!' && !isManagerMode) {
      activeTrigger = null;
    }
    if (activeTrigger === '@' && !isOwnerMode && !isManagerMode) {
      activeTrigger = null;
    }

    if (activeTrigger && activeTriggerIndex >= 0) {
      const isStart = activeTriggerIndex === 0;
      const prevChar = isStart ? '' : textBeforeCursor[activeTriggerIndex - 1];
      const isBoundary = isStart || /\s/.test(prevChar);
      const queryPart = textBeforeCursor.slice(activeTriggerIndex + 1);

      if (isBoundary && !queryPart.includes('\n')) {
        openMentionAutocomplete(activeTrigger, activeTriggerIndex, queryPart);
        return;
      }
    }

    if (mentionMenu.open) {
      setMentionMenu(prev => ({ ...prev, open: false }));
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionMenu.open && mentionMenu.options.length > 0) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setMentionMenu(prev => ({
          ...prev,
          highlightedIndex: (prev.highlightedIndex + 1) % prev.options.length,
        }));
        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setMentionMenu(prev => ({
          ...prev,
          highlightedIndex: (prev.highlightedIndex - 1 + prev.options.length) % prev.options.length,
        }));
        return;
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        const selected = mentionMenu.options[mentionMenu.highlightedIndex];
        if (selected) {
          selectMention(selected);
        }
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        setMentionMenu(prev => ({ ...prev, open: false }));
        return;
      }
    }

    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void sendMessage();
    }
  };

  const handleSelectTemplate = (template: string) => {
    if (template.includes('@Company and @Company') || template.includes('@Company vs @Company')) {
      const prefix = template.split('@Company')[0];
      setPendingComparisonTemplate({
        fullTemplate: template,
        stage: 1,
      });
      const newText = prefix + '@';
      setInput(newText);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.focus();
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.selectionStart = newText.length;
            textareaRef.current.selectionEnd = newText.length;
          }
        }, 10);
      }
      openMentionAutocomplete('@', prefix.length - 1, '');
      return;
    }

    if (template.includes('@Company')) {
      const parts = template.split('@Company');
      const prefix = parts[0] + '@';
      const suffix = parts.slice(1).join('@Company');
      const newText = prefix + (suffix.trim() ? ' ' + suffix.trim() : '');
      setInput(newText);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.focus();
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.selectionStart = prefix.length;
            textareaRef.current.selectionEnd = prefix.length;
          }
        }, 10);
      }
      openMentionAutocomplete('@', parts[0].length, '');
      return;
    }

    if (template.includes('!Project')) {
      const parts = template.split('!Project');
      const prefix = parts[0] + '!';
      const suffix = parts.slice(1).join('!Project');
      const newText = prefix + (suffix.trim() ? ' ' + suffix.trim() : '');
      setInput(newText);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.focus();
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.selectionStart = prefix.length;
            textareaRef.current.selectionEnd = prefix.length;
          }
        }, 10);
      }
      openMentionAutocomplete('!', parts[0].length, '');
      return;
    }

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

    const effectiveMentions: AiMentionItem[] = attachedMentions.filter(m =>
      msg.includes(m.trigger + m.label)
    );

    const currentTime = formatClockTime();
    setMessages((prev) => [
      ...prev,
      { role: 'user', content: msg, timestamp: currentTime },
      { role: 'ai', content: '', isLoading: true, timestamp: currentTime },
    ]);
    setInput('');
    setAttachedMentions([]);
    setPendingComparisonTemplate(null);
    setMentionMenu(prev => ({ ...prev, open: false }));
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    setIsSending(true);

    try {
      const endpoint = isOwnerMode ? '/owner/ai-assistant/chat' : '/ai-assistant/chat';

      const projectMention = effectiveMentions.find(m => m.type === 'PROJECT' && m.projectId);
      const fallbackProjectId = projectId
        ? Number(projectId)
        : (projectsList[0] ? projectsList[0].id : undefined);
      const effectiveProjectId = projectMention?.projectId ?? fallbackProjectId;

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

      const companyMention = effectiveMentions.find(m => m.type === 'COMPANY' && m.companyProfileId);
      const effectiveCompanyProfileId = companyMention?.companyProfileId ?? (
        isOwnerMode
          ? (window.location.hash.startsWith('#company-detail') ? localStorage.getItem('apms-selected-company') || undefined : undefined)
          : activeCompanyProfileId || undefined
      );

      const payload: {
        question: string;
        sessionId?: string;
        projectId?: number;
        companyProfileId?: string;
        mentions?: any[];
      } = {
        question: msg,
        mentions: effectiveMentions.map(m => ({
          type: m.type,
          projectId: m.projectId,
          id: m.projectId,
          companyProfileId: m.companyProfileId,
          companyId: m.companyId,
          label: m.label,
          trigger: m.trigger,
        })),
      };

      // Pass sessionId only if we are continuing an active session
      if (activeSessionId) {
        payload.sessionId = activeSessionId;
      }
      if (!isOwnerMode && effectiveProjectId) {
        payload.projectId = effectiveProjectId;
      }
      if (effectiveCompanyProfileId) {
        payload.companyProfileId = effectiveCompanyProfileId;
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
              {/* Attached Mention Badges */}
              {attachedMentions.length > 0 && (
                <div className={styles.attachedMentionsBar}>
                  {attachedMentions.map((m, idx) => (
                    <span
                      key={`${m.trigger}-${m.label}-${idx}`}
                      className={`${styles.attachedMentionBadge} ${
                        m.type === 'PROJECT' ? styles.attachedMentionBadgeProject : ''
                      }`}
                    >
                      {m.type === 'PROJECT' ? <FolderKanban size={13} /> : <Building2 size={13} />}
                      <span className={styles.attachedMentionLabel}>
                        {m.trigger}{m.label}
                      </span>
                      <button
                        type="button"
                        className={styles.attachedMentionRemove}
                        onClick={() => removeAttachedMention(idx)}
                        title="Remove mention"
                        aria-label={`Remove mention ${m.label}`}
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Mention Autocomplete Popover */}
              {mentionMenu.open && (
                <div className={styles.mentionPopover}>
                  <div className={styles.mentionPopoverHeader}>
                    <span>
                      {mentionMenu.trigger === '!' ? (
                        <>
                          <FolderKanban size={13} /> Mention Project (!...)
                        </>
                      ) : (
                        <>
                          <Building2 size={13} /> Mention Company (@...)
                        </>
                      )}
                    </span>
                    <button
                      type="button"
                      className={styles.attachedMentionRemove}
                      onClick={() => setMentionMenu(prev => ({ ...prev, open: false }))}
                      title="Close"
                      aria-label="Close mentions"
                    >
                      <X size={13} />
                    </button>
                  </div>
                  <div className={styles.mentionList}>
                    {mentionMenu.isLoading ? (
                      <div className={styles.mentionLoading}>
                        <Loader2 size={16} className={styles.spin} />
                        <span>Searching {mentionMenu.trigger === '!' ? 'projects' : 'companies'}...</span>
                      </div>
                    ) : mentionMenu.options.length === 0 ? (
                      <div className={styles.mentionEmpty}>
                        No matching {mentionMenu.trigger === '!' ? 'projects' : 'approved companies'} found.
                      </div>
                    ) : (
                      mentionMenu.options.map((opt, optIdx) => {
                        const isHighlighted = optIdx === mentionMenu.highlightedIndex;
                        return (
                          <button
                            key={opt.companyProfileId || opt.projectId || optIdx}
                            type="button"
                            className={`${styles.mentionOption} ${
                              isHighlighted ? styles.mentionOptionHighlighted : ''
                            }`}
                            onClick={() => selectMention(opt)}
                            onMouseEnter={() =>
                              setMentionMenu(prev => ({ ...prev, highlightedIndex: optIdx }))
                            }
                          >
                            <div className={styles.mentionOptionMain}>
                              <div className={styles.mentionPrimaryRow}>
                                {opt.type === 'PROJECT' ? (
                                  <FolderKanban size={14} color="#15803d" />
                                ) : (
                                  <Building2 size={14} color="#1d4ed8" />
                                )}
                                <span className={styles.mentionPrimaryLabel}>
                                  {opt.primaryLabel}
                                </span>
                              </div>
                              {opt.secondaryLabel && (
                                <span className={styles.mentionSecondaryLabel}>
                                  {opt.secondaryLabel}
                                </span>
                              )}
                            </div>
                            {opt.badge && (
                              <span className={styles.mentionBadge}>{opt.badge}</span>
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

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
                      ? 'Ask about your projects (!), team progress, or reviews...'
                      : 'Ask about your business ecosystem, companies (@), or risks...'
                  }
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
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
