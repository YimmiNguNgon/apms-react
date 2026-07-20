import React, { useEffect, useRef, useState } from 'react';
import { api } from '../services/api';
import { useUser, ROLES } from '../context/UserContext';
import type { PageResult, ProjectResponse } from '../types/domain';

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

export const AIAgent: React.FC = () => {
  const { currentUser } = useUser();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [summary, setSummary] = useState<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    api.get<any>('/dashboard/summary').then((res) => {
      if (res?.success) setSummary(res.data);
    }).catch(() => setSummary(null));
  }, []);

  useEffect(() => {
    if (currentUser?.role === ROLES.ADMIN || currentUser?.role === ROLES.DIRECTOR) return;

    const controller = new AbortController();
    void api.get<PageResult<ProjectResponse>>('/projects', {
      params: { page: 0, size: 100 },
      signal: controller.signal,
    }).then((res) => {
      const projects = res?.data?.content ?? [];
      const stored = localStorage.getItem('apms-active-project');
      const validProject = projects.find((project) => String(project.id) === stored) ?? projects[0] ?? null;
      setProjectId(validProject ? String(validProject.id) : null);
    }).catch(() => setProjectId(null));

    return () => controller.abort();
  }, [currentUser?.role]);

  const sendMessage = async () => {
    const msg = input.trim();
    if (!msg) return;

    setMessages((prev) => [...prev, { role: 'user', content: msg }, { role: 'ai', content: '', isLoading: true }]);
    setInput('');

    try {
      const isOwner = currentUser?.role === ROLES.ADMIN || currentUser?.role === ROLES.DIRECTOR;
      const endpoint = isOwner ? '/owner/ai-assistant/chat' : '/ai-assistant/chat';

      if (!isOwner && !projectId) {
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = { role: 'ai', content: 'No valid project is available for the staff AI assistant.' };
          return next;
        });
        return;
      }

      const payload: { question: string; sessionId?: string; projectId?: number } = { question: msg };
      if (sessionId) payload.sessionId = sessionId;
      if (!isOwner && projectId) payload.projectId = Number(projectId);

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
    }
  };

  return (
    <section className="workspace-page" id="page-ai-agent">
      <div className="workspace-shell">
        <div className="workspace-main">
          <div className="workspace-breadcrumbs">Intelligence <span>/</span> Research AI Assistant</div>
          <div className="workspace-page-head">
            <div>
              <h1>Research AI assistant</h1>
              <p>This assistant now starts without seeded prompts or sample answers and only renders live backend responses.</p>
            </div>
          </div>

          <div className="workspace-panel ai-workspace-panel">
            <div className="ai-workspace-header">
              <div className="ai-workspace-mark">AI</div>
              <div>
                <h3>APMS research assistant</h3>
                <p>Ask about partners, competitors, and company context using the active workspace data.</p>
              </div>
            </div>

            <div className="ai-thread">
              {messages.length === 0 ? (
                <div className="workspace-empty">No conversation yet. Send a question to start a backend-driven AI session.</div>
              ) : messages.map((message, index) => (
                <div key={index} className={`ai-thread-item ${message.role}`}>
                  <div className="ai-thread-avatar">{message.role === 'ai' ? 'AI' : 'You'}</div>
                  <div className={`ai-thread-bubble ${message.role}`}>
                    {message.isLoading ? (
                      <div className="ai-loading-dots"><span /><span /><span /></div>
                    ) : (
                      <p>{message.content}</p>
                    )}

                    {message.sources && message.sources.length > 0 && (
                      <div className="ai-source-list">
                        <strong>Sources</strong>
                        {message.sources.map((source, sourceIndex) => (
                          <div key={sourceIndex} className="ai-source-item">
                            <span>[{sourceIndex + 1}]</span>
                            <div>
                              <strong>{source.documentTitle}</strong>
                              <p>{Math.round(source.relevanceScore * 100)}% relevance</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {message.suggestedActions && message.suggestedActions.length > 0 && (
                      <div className="ai-action-row">
                        {message.suggestedActions.map((action, actionIndex) => (
                          <button key={actionIndex} className="btn btn-outline" onClick={() => setInput(action)}>{action}</button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            <div className="ai-input-row">
              <input
                type="text"
                className="search-input"
                placeholder="Ask about partners, competitors, or relationship context..."
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && sendMessage()}
              />
              <button className="btn btn-primary" onClick={sendMessage}>Send</button>
            </div>
          </div>
        </div>

        <aside className="workspace-sidebar">
          <div className="workspace-side-card">
            <span className="workspace-side-eyebrow">Workspace context</span>
            <div className="workspace-detail-list">
              <div><strong>Company profiles</strong><span>{summary?.totalCompanyProfiles ?? 'Not available'}</span></div>
              <div><strong>Projects</strong><span>{summary?.totalProjects ?? 'Not available'}</span></div>
              <div><strong>Pending candidates</strong><span>{summary?.pendingReviewCandidates ?? 'Not available'}</span></div>
              <div><strong>Partners</strong><span>{summary?.partnerCount ?? 'Not available'}</span></div>
            </div>
          </div>

          <div className="workspace-side-card">
            <span className="workspace-side-eyebrow">Assistant status</span>
            <div className="workspace-ai-note">
              <strong>{projectId ? 'Project context loaded' : 'Waiting for project context'}</strong>
              <p>{projectId ? `Using project #${projectId} for staff-scoped answers.` : 'The assistant needs a valid project assignment for staff mode.'}</p>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
};
