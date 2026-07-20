import React, { useCallback, useEffect, useRef, useState } from 'react';
import { API_BASE_URL, api } from '../services/api';
import type { ImportJobResponse, PageResult, ProjectResponse } from '../types/domain';

interface UploadFile {
  id?: number;
  name: string;
  size: string;
  type: string;
  status: 'uploading' | 'done' | 'error' | 'extracting' | 'extracted';
  progress: number;
  importJobId?: number;
  originalFile?: File;
}

const mapImportJobToFile = (job: ImportJobResponse): UploadFile => ({
  id: job.id,
  name: job.fileName || 'Uploaded document',
  size: 'N/A',
  type: (job.fileName || '').split('.').pop()?.toUpperCase() || 'FILE',
  status: job.status === 'COMPLETED' ? 'extracted' : job.status === 'FAILED' ? 'error' : 'done',
  progress: 100,
  importJobId: job.id,
});

interface AiExtractionResultPayload {
  importJobId?: number | null;
  rawDocumentId?: string | null;
  extractedData?: Record<string, unknown> | null;
  rawAiOutput?: string | null;
}

export const MyTasksWorkspace: React.FC<{ setActivePage?: (page: string) => void }> = ({ setActivePage }) => {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [projectLoading, setProjectLoading] = useState(true);
  const [projectError, setProjectError] = useState<string | null>(null);

  const fetchDocumentHistory = useCallback(async (projectId: string, signal?: AbortSignal) => {
    const res = await api.get<PageResult<ImportJobResponse>>(`/projects/${projectId}/documents`, {
      params: { page: 0, size: 10 },
      signal,
    });

    if (!res?.success || !res.data?.content) return;

    const history = res.data.content.map(mapImportJobToFile);
    setFiles((prev) => {
      const currentIds = new Set(prev.map((item) => item.importJobId));
      const newHistory = history.filter((item) => !currentIds.has(item.importJobId));
      return [...prev, ...newHistory];
    });
  }, []);

  const loadActiveProject = useCallback(async (signal?: AbortSignal) => {
    setProjectLoading(true);
    setProjectError(null);

    try {
      const res = await api.get<PageResult<ProjectResponse>>('/projects', {
        params: { page: 0, size: 100 },
        signal,
      });

      const projects = res?.data?.content ?? [];
      const stored = localStorage.getItem('apms-active-project');
      const validProject = projects.find((project) => String(project.id) === stored) ?? projects[0] ?? null;

      if (!validProject) {
        setActiveProjectId(null);
        setFiles([]);
        setProjectError('No valid project is available for the task queue.');
        return;
      }

      const nextProjectId = String(validProject.id);
      localStorage.setItem('apms-active-project', nextProjectId);
      setActiveProjectId(nextProjectId);
      await fetchDocumentHistory(nextProjectId, signal);
    } catch (err) {
      if (signal?.aborted) return;
      setActiveProjectId(null);
      setFiles([]);
      setProjectError(err instanceof Error ? err.message : 'Cannot load the active project.');
    } finally {
      if (!signal?.aborted) {
        setProjectLoading(false);
      }
    }
  }, [fetchDocumentHistory]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void loadActiveProject(controller.signal);
    }, 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [loadActiveProject]);

  const uploadFileToBackend = async (file: File, existingId?: number) => {
    const projectId = activeProjectId;
    if (!projectId) {
      setProjectError('No valid project is available for file upload.');
      return;
    }

    const fileId = existingId || (Date.now() + Math.random());

    if (existingId) {
      setFiles((prev) => prev.map((item) => item.id === existingId ? { ...item, status: 'uploading', progress: 0 } : item));
    } else {
      setFiles((prev) => [{
        id: fileId,
        name: file.name,
        size: file.size < 1024 * 1024
          ? `${(file.size / 1024).toFixed(1)} KB`
          : `${(file.size / 1024 / 1024).toFixed(1)} MB`,
        type: file.name.split('.').pop()?.toUpperCase() || 'FILE',
        status: 'uploading',
        progress: 0,
        originalFile: file,
      }, ...prev]);
    }

    const formData = new FormData();
    formData.append('file', file);

    const token = localStorage.getItem('apms-token') || localStorage.getItem('accessToken');
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE_URL}/projects/${projectId}/documents/upload`, true);
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percentComplete = Math.round((event.loaded / event.total) * 100);
        setFiles((prev) => prev.map((item) => item.id === fileId ? { ...item, progress: percentComplete } : item));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const res = JSON.parse(xhr.responseText);
          const importJobId = res?.data?.id;
          setFiles((prev) => prev.map((item) => item.id === fileId ? { ...item, status: 'done', progress: 100, importJobId } : item));
        } catch (err) {
          console.error('JSON parse error:', err);
          setFiles((prev) => prev.map((item) => item.id === fileId ? { ...item, status: 'error', progress: 0 } : item));
        }
      } else {
        setFiles((prev) => prev.map((item) => item.id === fileId ? { ...item, status: 'error', progress: 0 } : item));
      }
    };

    xhr.onerror = () => {
      setFiles((prev) => prev.map((item) => item.id === fileId ? { ...item, status: 'error', progress: 0 } : item));
    };

    xhr.send(formData);
  };

  const handleExtractAI = async (fileId: number, importJobId?: number) => {
    if (!importJobId) return;
    setFiles((prev) => prev.map((item) => item.id === fileId ? { ...item, status: 'extracting', progress: 50 } : item));
    try {
      const res = await api.post<AiExtractionResultPayload>(`/import-jobs/${importJobId}/ai-extractions`);
      localStorage.setItem('apms-active-import-job', String(importJobId));

      if (res?.data) {
        localStorage.setItem(`apms-ai-data-${importJobId}`, JSON.stringify(res.data));
      }

      setFiles((prev) => prev.map((item) => item.id === fileId ? { ...item, status: 'extracted', progress: 100 } : item));
    } catch {
      setFiles((prev) => prev.map((item) => item.id === fileId ? { ...item, status: 'done', progress: 100 } : item));
    }
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDragging(false);
    if (!activeProjectId || projectLoading) return;
    Array.from(event.dataTransfer.files).forEach((file) => uploadFileToBackend(file));
  };

  const handleSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!activeProjectId || projectLoading) return;
    Array.from(event.target.files || []).forEach((file) => uploadFileToBackend(file));
  };

  const readyCount = files.filter((file) => file.status === 'done').length;
  const extractedCount = files.filter((file) => file.status === 'extracted').length;
  const errorCount = files.filter((file) => file.status === 'error').length;
  const processingCount = files.filter((file) => file.status === 'uploading' || file.status === 'extracting').length;

  return (
    <section className="workspace-page" id="page-my-tasks">
      <div className="workspace-shell">
        <div className="workspace-main">
          <div className="workspace-breadcrumbs">Work Queue <span>/</span> My Tasks</div>
          <div className="workspace-page-head">
            <div>
              <h1>My tasks</h1>
              <p>Upload research documents, monitor extraction readiness, and hand off files to the AI processing queue.</p>
            </div>
          </div>

          {projectLoading && <div className="workspace-inline-note">Loading available project...</div>}
          {projectError && <div className="workspace-inline-error">{projectError}</div>}

          <div className="workspace-focus-card">
            <div>
              <span className="workspace-side-eyebrow">Active intake board</span>
              <h3>{activeProjectId ? `Project #${activeProjectId} is receiving new source files` : 'No active project selected'}</h3>
              <p>The upload queue, AI extraction run, and next-step review handoff all follow the active project selected in the project board.</p>
            </div>
            <div className="workspace-focus-metrics">
              <article>
                <strong>{files.length}</strong>
                <span>Files in queue</span>
              </article>
              <article>
                <strong>{processingCount}</strong>
                <span>Processing now</span>
              </article>
              <article>
                <strong>{extractedCount}</strong>
                <span>Ready for review</span>
              </article>
            </div>
          </div>

          <div className="workspace-stats workspace-stats-compact">
            {[
              { label: 'Uploaded files', value: files.length, note: 'Current task queue volume' },
              { label: 'Ready for AI', value: readyCount, note: 'Prepared for extraction' },
              { label: 'Extracted', value: extractedCount, note: 'Ready for next review step' },
              { label: 'Needs retry', value: errorCount, note: 'Upload or extraction errors' },
            ].map((item) => (
              <article key={item.label} className="workspace-stat-card">
                <span className="workspace-stat-label">{item.label}</span>
                <strong>{item.value}</strong>
                <p>{item.note}</p>
              </article>
            ))}
          </div>

          <div className="workspace-stepper">
            <div className="workspace-step active"><strong>1</strong><span>Upload file</span></div>
            <div className="workspace-step"><strong>2</strong><span>AI processing</span></div>
            <div className="workspace-step"><strong>3</strong><span>Review output</span></div>
          </div>

          <div
            className={`workspace-upload-dropzone ${dragging ? 'dragging' : ''}`}
            onClick={() => {
              if (!activeProjectId || projectLoading) return;
              inputRef.current?.click();
            }}
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
          >
            <div className="workspace-upload-icon">+</div>
            <h3>Drop research files here</h3>
            <p>Supported formats: PDF, DOCX, PPTX, XLSX, TXT up to 50MB per file.</p>
            <button
              className="btn btn-primary"
              onClick={(event) => {
                event.stopPropagation();
                if (!activeProjectId || projectLoading) return;
                inputRef.current?.click();
              }}
              disabled={!activeProjectId || projectLoading}
            >
              Choose file
            </button>
            <input ref={inputRef} type="file" multiple style={{ display: 'none' }} onChange={handleSelect} accept=".pdf,.docx,.pptx,.xlsx,.txt" />
          </div>

          <div className="workspace-panel">
            <div className="workspace-section-head">
              <div>
                <h3>Uploaded files</h3>
                <p>{files.length} files currently attached to the active task queue.</p>
              </div>
            </div>

            <div className="workspace-table">
              <div className="workspace-table-row workspace-table-head">
                <span>File</span>
                <span>Size</span>
                <span>Status</span>
                <span>Progress</span>
                <span>Action</span>
              </div>
              {files.length === 0 ? (
                <div className="workspace-empty">No files uploaded yet.</div>
              ) : files.map((file, index) => (
                <div key={file.id ?? index} className="workspace-table-row">
                  <div>
                    <strong>{file.name}</strong>
                    <small>{file.type}</small>
                  </div>
                  <span>{file.size}</span>
                  <span className={`workspace-badge ${file.status === 'error' ? 'danger' : file.status === 'extracted' ? 'success' : file.status === 'done' ? 'info' : 'neutral'}`}>
                    {file.status === 'done' ? 'Ready' : file.status === 'extracted' ? 'Extracted' : file.status === 'error' ? 'Error' : file.status === 'extracting' ? 'Extracting' : 'Uploading'}
                  </span>
                  <div className="workspace-progress">
                    <div className="workspace-progress-bar compact">
                      <div style={{ width: `${file.progress}%` }} />
                    </div>
                    <span>{file.progress}%</span>
                  </div>
                  <div className="workspace-table-actions">
                    {file.status === 'error' && file.originalFile && (
                      <button
                        className="btn btn-outline"
                        onClick={() => {
                          if (file.originalFile) {
                            void uploadFileToBackend(file.originalFile, file.id as number);
                          }
                        }}
                      >
                        Retry
                      </button>
                    )}
                    {file.status === 'done' && file.importJobId && (
                      <button className="btn btn-primary" onClick={() => handleExtractAI(file.id as number, file.importJobId)}>Extract AI</button>
                    )}
                    {file.status === 'extracted' && (
                      <button className="btn btn-outline" onClick={() => setActivePage?.('ai-extracted-data')}>View result</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <aside className="workspace-sidebar">
          <div className="workspace-side-card">
            <span className="workspace-side-eyebrow">Task guidance</span>
            <ul className="workspace-bullet-list">
              <li>Search for an existing company record before uploading new documents.</li>
              <li>Upload the clearest source file first to improve extraction quality.</li>
              <li>Move extracted files into the AI extraction queue before opening company review.</li>
            </ul>
          </div>

          <div className="workspace-side-card">
            <span className="workspace-side-eyebrow">Queue status</span>
            <div className="workspace-detail-list">
              <div><strong>Active project</strong><span>{activeProjectId ? `Project #${activeProjectId}` : 'No project selected'}</span></div>
              <div><strong>Ready for AI</strong><span>{readyCount} files</span></div>
              <div><strong>Completed extraction</strong><span>{extractedCount} files</span></div>
            </div>
          </div>

          <div className="workspace-side-card">
            <span className="workspace-side-eyebrow">Next step</span>
            <div className="workspace-ai-note">
              <strong>After extraction</strong>
              <p>Open the AI Extraction Queue to inspect parsed output and continue the staff review workflow.</p>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
};
