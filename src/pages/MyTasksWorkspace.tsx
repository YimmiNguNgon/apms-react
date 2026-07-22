import React, { useCallback, useEffect, useState, useRef } from 'react';
import { api } from '../services/api';
import type { PageResult, ProjectResponse, ProjectTaskResponse, TaskStatus, TaskPriority, TaskType } from '../types/domain';

interface CompanyProfileItem {
  id: string;
  companyId: string;
  identity?: {
    legalName?: string;
    tradeName?: string;
  };
  business?: {
    industries?: string[];
  };
}

export const MyTasksWorkspace: React.FC<{ setActivePage?: (page: string) => void }> = ({ setActivePage }) => {
  const [tasks, setTasks] = useState<ProjectTaskResponse[]>([]);
  const [projectsMap, setProjectsMap] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Task Detail Modal State
  const [selectedTask, setSelectedTask] = useState<ProjectTaskResponse | null>(null);
  const [draftLoading, setDraftLoading] = useState(false);
  const [attachedCompanyProfileId, setAttachedCompanyProfileId] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [taskStatus, setTaskStatus] = useState<TaskStatus>('TODO');
  const [isDraft, setIsDraft] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [draftMessage, setDraftMessage] = useState<string>('');

  // Company Search State
  const [companySearch, setCompanySearch] = useState('');
  const [companies, setCompanies] = useState<CompanyProfileItem[]>([]);
  const [searchingCompanies, setSearchingCompanies] = useState(false);
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);

  // Submission State
  const [submitting, setSubmitting] = useState(false);

  // Debounce ref for auto-saving drafts
  const autoSaveTimerRef = useRef<any>(null);

  // Initial Data Load
  const fetchMyTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<PageResult<ProjectTaskResponse>>('/tasks/my', {
        params: { page: 0, size: 100 }
      });
      if (res?.success && res.data?.content) {
        setTasks(res.data.content);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load assigned tasks.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadProjectsMap = useCallback(async () => {
    try {
      const res = await api.get<PageResult<ProjectResponse>>('/projects', {
        params: { page: 0, size: 100 }
      });
      if (res?.success && res.data?.content) {
        const pMap: Record<number, string> = {};
        res.data.content.forEach((p) => {
          pMap[p.id] = p.projectName;
        });
        setProjectsMap(pMap);
      }
    } catch (err) {
      console.warn('Failed to construct projects map:', err);
    }
  }, []);

  useEffect(() => {
    void loadProjectsMap();
    void fetchMyTasks();
  }, [fetchMyTasks, loadProjectsMap]);

  // Handle task status update via Drag and Drop or select dropdown
  const handleUpdateTaskStatus = async (taskId: number, projectId: number, newStatus: TaskStatus) => {
    const originalTasks = [...tasks];
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)));
    try {
      await api.patch(`/projects/${projectId}/tasks/${taskId}`, { status: newStatus });
    } catch (err: any) {
      setTasks(originalTasks);
      alert(err?.message || 'Failed to update task status.');
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, taskId: number, projectId: number) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ taskId, projectId }));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetStatus: TaskStatus) => {
    e.preventDefault();
    try {
      const dataStr = e.dataTransfer.getData('text/plain');
      if (!dataStr) return;
      const { taskId, projectId } = JSON.parse(dataStr) as { taskId: number; projectId: number };
      if (taskId && projectId) {
        void handleUpdateTaskStatus(taskId, projectId, targetStatus);
      }
    } catch (err) {
      console.error('Drop error:', err);
    }
  };

  // Open Task Detail and Fetch Draft
  const handleSelectTask = async (task: ProjectTaskResponse) => {
    setSelectedTask(task);
    setAttachedCompanyProfileId('');
    setNote('');
    setTaskStatus(task.status);
    setIsDraft(false);
    setDraftMessage('');
    setDraftLoading(true);

    try {
      const res = await api.get<any>(`/projects/${task.projectId}/tasks/${task.id}/draft`);
      if (res?.success && res.data) {
        setAttachedCompanyProfileId(res.data.attachedCompanyProfileId || '');
        setNote(res.data.note || '');
        if (res.data.status) {
          setTaskStatus(res.data.status);
        }
        setIsDraft(true);
        setDraftMessage('Draft loaded');
      }
    } catch (err) {
      console.warn('No active draft found or error fetching draft:', err);
    } finally {
      setDraftLoading(false);
    }
  };

  // Search existing company profiles
  const searchCompanyProfiles = useCallback(async (query: string) => {
    setSearchingCompanies(true);
    try {
      const res = await api.get<PageResult<CompanyProfileItem>>('/profiles', {
        params: { keyword: query, page: 0, size: 20 }
      });
      if (res?.success && res.data?.content) {
        setCompanies(res.data.content);
      }
    } catch (err) {
      console.error('Error searching company profiles:', err);
    } finally {
      setSearchingCompanies(false);
    }
  }, []);

  useEffect(() => {
    if (showCompanyDropdown) {
      const timer = setTimeout(() => {
        void searchCompanyProfiles(companySearch);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [companySearch, showCompanyDropdown, searchCompanyProfiles]);

  // Auto-Save Draft Trigger (Debounced)
  const triggerAutoSave = useCallback((attachedId: string, noteVal: string, statusVal: TaskStatus) => {
    if (!selectedTask) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);

    setSavingDraft(true);
    setDraftMessage('Changes detected. Saving draft...');

    autoSaveTimerRef.current = setTimeout(async () => {
      try {
        await api.put(`/projects/${selectedTask.projectId}/tasks/${selectedTask.id}/draft`, {
          attachedCompanyProfileId: attachedId || null,
          note: noteVal || null,
          status: statusVal
        });
        setIsDraft(true);
        setDraftMessage('Draft autosaved.');
      } catch (err) {
        setDraftMessage('Draft save failed.');
        console.error('Auto-save draft failed:', err);
      } finally {
        setSavingDraft(false);
      }
    }, 2000);
  }, [selectedTask]);

  // Auto-save cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, []);

  // Form Field Change Handlers (Triggers Auto-Save)
  const handleNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setNote(val);
    triggerAutoSave(attachedCompanyProfileId, val, taskStatus);
  };

  const handleStatusChange = (statusVal: TaskStatus) => {
    setTaskStatus(statusVal);
    triggerAutoSave(attachedCompanyProfileId, note, statusVal);
  };

  const handleSelectCompany = (companyId: string) => {
    setAttachedCompanyProfileId(companyId);
    setShowCompanyDropdown(false);
    triggerAutoSave(companyId, note, taskStatus);
  };

  // Submit officially
  const handleSubmitTask = async () => {
    if (!selectedTask) return;
    setSubmitting(true);
    try {
      await api.post(`/projects/${selectedTask.projectId}/tasks/${selectedTask.id}/submissions`, {
        submissionType: selectedTask.taskType === 'COMPANY_DATA_PREPARATION' ? 'COMPANY_CANDIDATE' : 'OTHER',
        targetEntityType: 'CompanyProfile',
        targetEntityId: attachedCompanyProfileId || null,
        note: note || ''
      });

      // Update local task status to IN_REVIEW representing submission
      setTasks(prev => prev.map(t => t.id === selectedTask.id ? { ...t, status: 'IN_REVIEW' } : t));
      alert('Task submitted successfully for manager review!');
      setSelectedTask(null);
      void fetchMyTasks();
    } catch (err: any) {
      alert(err?.message || 'Failed to submit task.');
    } finally {
      setSubmitting(false);
    }
  };

  // UI Helpers
  const getPriorityClass = (priority: TaskPriority) => {
    switch (priority) {
      case 'URGENT': return 'danger';
      case 'HIGH': return 'warning';
      case 'MEDIUM': return 'info';
      default: return 'neutral';
    }
  };

  const columns: Array<{ status: TaskStatus; label: string }> = [
    { status: 'TODO', label: 'Todo' },
    { status: 'IN_PROGRESS', label: 'In Progress' },
    { status: 'IN_REVIEW', label: 'Under Review' },
    { status: 'DONE', label: 'Done' }
  ];

  return (
    <section className="workspace-page" id="page-my-tasks">
      <div className="workspace-shell">
        <div className="workspace-main">
          <div className="workspace-breadcrumbs">Work Queue <span>/</span> My Tasks</div>
          <div className="workspace-page-head">
            <div>
              <h1>My Tasks</h1>
              <p>Manage your assigned research tasks, update progress, and link profile outputs using the Kanban board.</p>
            </div>
            <div className="workspace-head-actions">
              <button className="btn btn-outline" onClick={() => void fetchMyTasks()} disabled={loading}>Refresh</button>
            </div>
          </div>

          {error && <div className="workspace-inline-error">{error}</div>}

          {loading ? (
            <div className="workspace-inline-note">Loading your tasks...</div>
          ) : (
            <div className="project-candidate-board" style={{ marginTop: 24 }}>
              <div className="project-candidate-columns" style={{ gridTemplateColumns: 'repeat(4, minmax(210px, 1fr))' }}>
                {columns.map((col) => {
                  const columnTasks = tasks.filter((t) => t.status === col.status);
                  return (
                    <section
                      key={col.status}
                      className={`project-candidate-column ${col.status.toLowerCase()}`}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, col.status)}
                    >
                      <header>
                        <span>{col.label}</span>
                        <strong>{columnTasks.length}</strong>
                      </header>
                      <div className="project-candidate-list" style={{ minHeight: '60vh' }}>
                        {columnTasks.map((task) => (
                          <article
                            key={task.id}
                            className="project-candidate-card"
                            draggable
                            onDragStart={(e) => handleDragStart(e, task.id, task.projectId)}
                            onClick={() => void handleSelectTask(task)}
                            style={{ cursor: 'pointer' }}
                          >
                            <div className="task-card-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                              <span className="workspace-badge neutral">#{task.id}</span>
                              <span className={`workspace-badge ${getPriorityClass(task.priority)}`}>
                                {task.priority}
                              </span>
                            </div>
                            <strong style={{ display: 'block', marginBottom: 6 }}>{task.title}</strong>
                            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: 8 }}>
                              {projectsMap[task.projectId] || `Project #${task.projectId}`}
                            </p>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: 'var(--text-muted)' }}>
                              <span className="task-type-indicator">{task.taskType.replace(/_/g, ' ')}</span>
                              {task.dueDate && (
                                <span>Due: {new Date(task.dueDate).toLocaleDateString('vi-VN')}</span>
                              )}
                            </div>
                          </article>
                        ))}
                        {columnTasks.length === 0 && (
                          <div className="project-candidate-empty">Drag / click tasks here</div>
                        )}
                      </div>
                    </section>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Task Detail Sidebar / Modal */}
        {selectedTask && (
          <aside className="workspace-sidebar" style={{ width: '450px', borderLeft: '1px solid var(--border-color)', paddingLeft: '24px', background: 'var(--bg-panel)' }}>
            <div className="workspace-side-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <span className="workspace-side-eyebrow">Task Details</span>
                <button className="workspace-icon-btn" onClick={() => setSelectedTask(null)} style={{ fontSize: '16px' }}>&times;</button>
              </div>

              {draftLoading ? (
                <div className="workspace-inline-note">Loading task draft...</div>
              ) : (
                <div className="workspace-form-stack" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  
                  {isDraft && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'rgba(59,130,246,0.1)', color: '#3B82F6', borderRadius: 'var(--radius-md)', fontSize: '13px' }}>
                      <span className="workspace-badge info">Draft</span>
                      <span>{draftMessage || 'Draft profile attached.'}</span>
                    </div>
                  )}

                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Project</label>
                    <strong style={{ fontSize: '14px' }}>{projectsMap[selectedTask.projectId] || `Project #${selectedTask.projectId}`}</strong>
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Task Title</label>
                    <h3 style={{ margin: 0, fontSize: '18px' }}>{selectedTask.title}</h3>
                  </div>

                  {selectedTask.description && (
                    <div>
                      <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Description</label>
                      <p style={{ margin: 0, fontSize: '13px', background: 'rgba(255,255,255,0.02)', padding: '8px', borderRadius: 'var(--radius-sm)' }}>
                        {selectedTask.description}
                      </p>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '16px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Priority</label>
                      <span className={`workspace-badge ${getPriorityClass(selectedTask.priority)}`}>
                        {selectedTask.priority}
                      </span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Task Type</label>
                      <span className="workspace-badge neutral">{selectedTask.taskType.replace(/_/g, ' ')}</span>
                    </div>
                  </div>

                  {selectedTask.dueDate && (
                    <div>
                      <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Due Date</label>
                      <span style={{ fontSize: '13px' }}>{new Date(selectedTask.dueDate).toLocaleString('vi-VN')}</span>
                    </div>
                  )}

                  <hr style={{ border: 0, borderTop: '1px solid var(--border-color)', margin: '8px 0' }} />

                  {/* Editable State */}
                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Task Progress</label>
                    <select
                      className="search-input"
                      value={taskStatus}
                      onChange={(e) => handleStatusChange(e.target.value as TaskStatus)}
                      style={{ width: '100%' }}
                    >
                      <option value="TODO">To Do</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="IN_REVIEW">Under Review</option>
                      <option value="DONE">Done</option>
                      <option value="BLOCKED">Blocked</option>
                      <option value="CANCELLED">Cancelled</option>
                    </select>
                  </div>

                  {/* Attach Company Profile search-select */}
                  <div style={{ position: 'relative' }}>
                    <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                      Linked Company Profile <span style={{ color: 'var(--text-muted)', fontWeight: 'normal' }}>(Attach existing company)</span>
                    </label>
                    
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        className="search-input"
                        placeholder="Search existing companies by name..."
                        value={companySearch}
                        onChange={(e) => {
                          setCompanySearch(e.target.value);
                          setShowCompanyDropdown(true);
                        }}
                        onFocus={() => setShowCompanyDropdown(true)}
                        style={{ flex: 1 }}
                      />
                      {attachedCompanyProfileId && (
                        <button
                          className="btn btn-outline"
                          onClick={() => {
                            setAttachedCompanyProfileId('');
                            triggerAutoSave('', note, taskStatus);
                          }}
                          style={{ padding: '0 12px' }}
                          title="Clear attached company"
                        >
                          Clear
                        </button>
                      )}
                    </div>

                    {attachedCompanyProfileId && (
                      <div style={{ marginTop: '8px', fontSize: '13px', color: '#10B981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>✓ Connected Profile ID:</span>
                        <strong>{attachedCompanyProfileId}</strong>
                      </div>
                    )}

                    {showCompanyDropdown && (
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        zIndex: 10,
                        background: 'var(--bg-panel)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-md)',
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
                        maxHeight: '200px',
                        overflowY: 'auto',
                        marginTop: '4px'
                      }}>
                        {searchingCompanies && <div style={{ padding: '8px 12px', fontSize: '12px', color: 'var(--text-muted)' }}>Searching...</div>}
                        {!searchingCompanies && companies.length === 0 && (
                          <div style={{ padding: '8px 12px', fontSize: '12px', color: 'var(--text-muted)' }}>No profiles found.</div>
                        )}
                        {companies.map((company) => {
                          const name = company.identity?.tradeName || company.identity?.legalName || 'Unresolved name';
                          return (
                            <div
                              key={company.id}
                              onClick={() => handleSelectCompany(company.companyId || company.id)}
                              style={{
                                padding: '8px 12px',
                                cursor: 'pointer',
                                borderBottom: '1px solid rgba(255,255,255,0.02)',
                                transition: 'background 0.2s',
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                              <strong>{name}</strong>
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                {company.business?.industries?.join(', ') || 'No industry'}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Task Notes</label>
                    <textarea
                      className="search-input"
                      rows={4}
                      placeholder="Add draft findings, source comments, or links here..."
                      value={note}
                      onChange={handleNoteChange}
                      style={{ width: '100%', resize: 'vertical' }}
                    />
                  </div>

                  {savingDraft && (
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                      Saving draft changes...
                    </span>
                  )}

                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                    <button
                      className="btn btn-primary"
                      onClick={() => void handleSubmitTask()}
                      disabled={submitting || selectedTask.status === 'DONE' || selectedTask.status === 'IN_REVIEW'}
                      style={{ flex: 1 }}
                    >
                      {submitting ? 'Submitting...' : 'Submit to Manager'}
                    </button>
                    <button
                      className="btn btn-outline"
                      onClick={() => setSelectedTask(null)}
                    >
                      Close
                    </button>
                  </div>

                  {(selectedTask.status === 'DONE' || selectedTask.status === 'IN_REVIEW') && (
                    <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', fontStyle: 'italic' }}>
                      This task is already completed or submitted for review.
                    </p>
                  )}
                </div>
              )}
            </div>
          </aside>
        )}
      </div>
    </section>
  );
};
