import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { adminAiKeyApi, type AiApiKeyDto, type AiApiKeyStatus } from '../API/adminAiKeyApi';
import { ConfirmModal } from '../components/Shared/ConfirmModal';
import { Eye, EyeOff, Key, Plus, RefreshCw, Trash2, Power, PlayCircle, AlertCircle, CheckCircle2, Copy, Search, X, RotateCcw } from 'lucide-react';

interface ToastNotice {
  type: 'success' | 'error' | 'info';
  message: string;
}

export const AiApiKeyManagement: React.FC = () => {
  const { t } = useTranslation('common');
  const [keys, setKeys] = useState<AiApiKeyDto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [reloading, setReloading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [notice, setNotice] = useState<ToastNotice | null>(null);

  // Add Key Modal State
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newLabel, setNewLabel] = useState<string>('');
  const [newApiKey, setNewApiKey] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [addLoading, setAddLoading] = useState<boolean>(false);
  const [addError, setAddError] = useState<string>('');

  // Delete Confirm Modal State
  const [keyToDelete, setKeyToDelete] = useState<AiApiKeyDto | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<boolean>(false);

  // Row-level action state
  const [testingKeyId, setTestingKeyId] = useState<string | null>(null);
  const [togglingKeyId, setTogglingKeyId] = useState<string | null>(null);
  const [revealingKeyId, setRevealingKeyId] = useState<string | null>(null);
  const [revealedKeys, setRevealedKeys] = useState<Record<string, string>>({});
  const revealTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const fetchKeys = async (isBackground = false) => {
    if (!isBackground) {
      setLoading(true);
      setError('');
    }
    // Reset revealed keys in-memory on list fetch / refresh
    Object.values(revealTimers.current).forEach(clearTimeout);
    revealTimers.current = {};
    setRevealedKeys({});
    try {
      const response = await adminAiKeyApi.getAiApiKeys();
      if (response && response.data) {
        setKeys(response.data);
      } else {
        setKeys([]);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unable to load API keys.';
      setError(message);
    } finally {
      if (!isBackground) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchKeys();
    return () => {
      Object.values(revealTimers.current).forEach(clearTimeout);
    };
  }, []);

  const totalCount = keys.length;
  const activeCount = useMemo(() => keys.filter((k) => k.status === 'ACTIVE').length, [keys]);
  const exhaustedCount = useMemo(() => keys.filter((k) => k.status === 'EXHAUSTED').length, [keys]);
  const invalidCount = useMemo(() => keys.filter((k) => k.status === 'INVALID').length, [keys]);

  // Filters & Search state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [providerFilter, setProviderFilter] = useState<string>('ALL');
  const [lastErrorFilter, setLastErrorFilter] = useState<string>('ALL');

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Debounce search query by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (val: string) => {
    setStatusFilter(val);
    setCurrentPage(1);
  };

  const handleProviderFilterChange = (val: string) => {
    setProviderFilter(val);
    setCurrentPage(1);
  };

  const handleLastErrorFilterChange = (val: string) => {
    setLastErrorFilter(val);
    setCurrentPage(1);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  const isFilterActive = Boolean(
    searchQuery.trim() ||
    statusFilter !== 'ALL' ||
    providerFilter !== 'ALL' ||
    lastErrorFilter !== 'ALL'
  );

  const handleClearFilters = () => {
    setSearchQuery('');
    setDebouncedSearch('');
    setStatusFilter('ALL');
    setProviderFilter('ALL');
    setLastErrorFilter('ALL');
    setCurrentPage(1);
  };

  const availableProviders = useMemo(() => {
    const set = new Set<string>();
    keys.forEach((k) => {
      if (k.provider) set.add(k.provider.trim().toUpperCase());
    });
    if (set.size === 0) set.add('GEMINI');
    return Array.from(set).sort();
  }, [keys]);

  const getErrorCategory = (k: AiApiKeyDto): '401' | '403' | '429' | '503' | 'NONE' | 'OTHER' => {
    const code = k.lastErrorCode;
    const text = (k.lastError || '').toLowerCase();
    const hasError = Boolean(text.trim() || code);

    if (!hasError) {
      if (k.status === 'EXHAUSTED') return '429';
      return 'NONE';
    }

    if (code === 401 || text.includes('401') || text.includes('unauthorized')) {
      return '401';
    }
    if (code === 403 || text.includes('403') || text.includes('forbidden')) {
      return '403';
    }
    if (
      code === 429 ||
      text.includes('429') ||
      text.includes('exhausted') ||
      text.includes('too many requests') ||
      text.includes('quota') ||
      k.status === 'EXHAUSTED'
    ) {
      return '429';
    }
    if (
      code === 503 ||
      text.includes('503') ||
      text.includes('service_unavailable') ||
      text.includes('unavailable')
    ) {
      return '503';
    }

    return 'OTHER';
  };

  const filteredKeys = useMemo(() => {
    const filtered = keys.filter((k) => {
      // 1. Search filter
      const query = debouncedSearch.trim().toLowerCase();
      if (query) {
        const label = (k.label || '').toLowerCase();
        const maskedKey = (k.maskedKey || '').toLowerCase();
        const provider = (k.provider || 'GEMINI').toLowerCase();
        const lastError = (k.lastError || '').toLowerCase();
        const lastErrorCode = k.lastErrorCode ? String(k.lastErrorCode) : '';
        const status = (k.status || '').toLowerCase();
        const errorCombined = `${lastErrorCode} ${lastError} ${status === 'exhausted' ? '429' : ''}`;

        const matches =
          label.includes(query) ||
          maskedKey.includes(query) ||
          provider.includes(query) ||
          status.includes(query) ||
          errorCombined.includes(query);

        if (!matches) return false;
      }

      // 2. Status filter
      if (statusFilter !== 'ALL' && k.status !== statusFilter) {
        return false;
      }

      // 3. Provider filter
      if (providerFilter !== 'ALL') {
        const p = (k.provider || 'GEMINI').trim().toUpperCase();
        if (p !== providerFilter) return false;
      }

      // 4. Last Error filter
      if (lastErrorFilter !== 'ALL') {
        const category = getErrorCategory(k);
        if (category !== lastErrorFilter) return false;
      }

      return true;
    });

    // 5. Newest-first sorting: createdAt DESC, with deterministic fallback to id DESC
    return filtered.slice().sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      const validTimeA = Number.isNaN(timeA) ? 0 : timeA;
      const validTimeB = Number.isNaN(timeB) ? 0 : timeB;

      if (validTimeB !== validTimeA) {
        return validTimeB - validTimeA;
      }
      return String(b.id || '').localeCompare(String(a.id || ''));
    });
  }, [keys, debouncedSearch, statusFilter, providerFilter, lastErrorFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredKeys.length / pageSize));
  const validPage = Math.min(Math.max(1, currentPage), totalPages);

  // Normalize currentPage whenever totalPages decreases
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedKeys = useMemo(() => {
    const start = (validPage - 1) * pageSize;
    return filteredKeys.slice(start, start + pageSize);
  }, [filteredKeys, validPage, pageSize]);

  const startItemIndex = filteredKeys.length === 0 ? 0 : (validPage - 1) * pageSize + 1;
  const endItemIndex = Math.min(validPage * pageSize, filteredKeys.length);
  const totalFiltered = filteredKeys.length;

  const paginationItems = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const items: (number | string)[] = [];
    if (validPage <= 4) {
      items.push(1, 2, 3, 4, 5, '...', totalPages);
    } else if (validPage >= totalPages - 3) {
      items.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    } else {
      items.push(1, '...', validPage - 1, validPage, validPage + 1, '...', totalPages);
    }
    return items;
  }, [validPage, totalPages]);

  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    setNotice({ type, message });
    setTimeout(() => {
      setNotice((prev) => (prev?.message === message ? null : prev));
    }, 5000);
  };

  const handleReload = async () => {
    setReloading(true);
    // Reset revealed keys on explicit reload
    Object.values(revealTimers.current).forEach(clearTimeout);
    revealTimers.current = {};
    setRevealedKeys({});
    try {
      const res = await adminAiKeyApi.reloadAiApiKeys();
      const count = res?.data?.activeCount ?? 0;
      showToast('success', `API keys reloaded successfully (${count} active key${count === 1 ? '' : 's'}).`);
      await fetchKeys(true);
    } catch (err: unknown) {
      showToast('error', 'Unable to reload API keys.');
    } finally {
      setReloading(false);
    }
  };

  const handleAddKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newApiKey.trim()) {
      setAddError('API key is required.');
      return;
    }

    setAddLoading(true);
    setAddError('');
    try {
      await adminAiKeyApi.addAiApiKey({
        apiKey: newApiKey.trim(),
        label: newLabel.trim() || undefined,
      });

      setShowAddModal(false);
      setNewApiKey('');
      setNewLabel('');
      setShowPassword(false);
      showToast('success', 'API key added successfully. The key is available for AI requests immediately.');
      setCurrentPage(1);
      await fetchKeys(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unable to add API key.';
      setAddError(message);
    } finally {
      setAddLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!keyToDelete) return;
    setDeleteLoading(true);
    try {
      await adminAiKeyApi.deleteAiApiKey(keyToDelete.id);
      showToast('success', `Key ${keyToDelete.maskedKey} was removed successfully.`);
      setKeyToDelete(null);
      await fetchKeys(true);
    } catch (err: unknown) {
      showToast('error', 'Unable to delete API key.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleToggleStatus = async (key: AiApiKeyDto) => {
    setTogglingKeyId(key.id);
    const willEnable = key.status === 'DISABLED';
    try {
      const res = await adminAiKeyApi.setAiApiKeyEnabled(key.id, willEnable);
      const updated = res.data;
      if (willEnable) {
        if (updated.status === 'ACTIVE') {
          showToast('success', 'API key enabled and verified successfully.');
        } else if (updated.status === 'EXHAUSTED') {
          showToast('error', 'API key was enabled but its Gemini quota is currently exhausted.');
        } else if (updated.status === 'INVALID') {
          showToast('error', 'API key could not be activated because the credential is invalid or unauthorized.');
        } else {
          showToast('info', 'API key could not be activated due to temporary service unavailability. Preserved safe status.');
        }
      } else {
        showToast('success', `API key ${key.maskedKey} is now DISABLED.`);
      }
      await fetchKeys(true);
    } catch (err: unknown) {
      showToast('error', `Unable to ${willEnable ? 'enable' : 'disable'} API key.`);
    } finally {
      setTogglingKeyId(null);
    }
  };

  const handleTestKey = async (key: AiApiKeyDto) => {
    setTestingKeyId(key.id);
    try {
      const res = await adminAiKeyApi.testAiApiKey(key.id);
      const testResult = res.data;
      if (testResult.status === 'ACTIVE') {
        showToast('success', testResult.message || 'API key is valid and available.');
      } else if (testResult.status === 'EXHAUSTED') {
        showToast('error', testResult.message || 'API key quota is currently exhausted.');
      } else if (testResult.status === 'INVALID') {
        showToast('error', testResult.message || 'API key is invalid or unauthorized.');
      } else {
        showToast('info', testResult.message || `Test completed with status: ${testResult.status}`);
      }
      await fetchKeys(true);
    } catch (err: unknown) {
      showToast('error', 'Unable to test API key.');
      await fetchKeys(true);
    } finally {
      setTestingKeyId(null);
    }
  };

  const handleToggleReveal = async (key: AiApiKeyDto) => {
    // If already revealed, toggle back to masked
    if (revealedKeys[key.id]) {
      if (revealTimers.current[key.id]) {
        clearTimeout(revealTimers.current[key.id]);
        delete revealTimers.current[key.id];
      }
      setRevealedKeys((prev) => {
        const next = { ...prev };
        delete next[key.id];
        return next;
      });
      return;
    }

    // Fetch decrypted key from secure admin-only reveal endpoint
    setRevealingKeyId(key.id);
    try {
      const res = await adminAiKeyApi.revealAiApiKey(key.id);
      const fullKey = res?.data?.fullApiKey;
      if (fullKey) {
        setRevealedKeys((prev) => ({
          ...prev,
          [key.id]: fullKey,
        }));

        // Auto-hide after 30 seconds for security
        if (revealTimers.current[key.id]) {
          clearTimeout(revealTimers.current[key.id]);
        }
        revealTimers.current[key.id] = setTimeout(() => {
          setRevealedKeys((prev) => {
            const next = { ...prev };
            delete next[key.id];
            return next;
          });
          delete revealTimers.current[key.id];
        }, 30000);
      } else {
        showToast('error', 'Failed to retrieve full API key.');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unable to reveal API key.';
      showToast('error', message);
    } finally {
      setRevealingKeyId(null);
    }
  };

  const handleCopyKey = async (fullKey: string) => {
    try {
      await navigator.clipboard.writeText(fullKey);
      showToast('success', 'API key copied to clipboard.');
    } catch {
      showToast('error', 'Failed to copy API key to clipboard.');
    }
  };

  const formatDateTime = (val?: string | null) => {
    if (!val) return '—';
    try {
      const d = new Date(val);
      if (isNaN(d.getTime())) return val;
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${day}/${month}/${year} ${hours}:${minutes}`;
    } catch {
      return val;
    }
  };

  const getStatusBadge = (status: AiApiKeyStatus) => {
    switch (status) {
      case 'ACTIVE':
        return <span className="badge badge-green">ACTIVE</span>;
      case 'EXHAUSTED':
        return <span className="badge badge-yellow">EXHAUSTED</span>;
      case 'INVALID':
        return <span className="badge badge-red">INVALID</span>;
      case 'DISABLED':
      default:
        return <span className="badge badge-gray">DISABLED</span>;
    }
  };

  return (
    <section className="workspace-page role-dashboard role-dashboard-manager manager-page project-page admin-page" id="page-ai-api-keys">
      <div className="workspace-main-full">
        {/* Page Header Band */}
        <div className="workspace-page-head">
          <div style={{ minWidth: 0 }}>
            <h1>AI API Key Management</h1>
            <p style={{ marginTop: '2px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Manage Gemini API keys used by APMS AI services without restarting the server.
            </p>
          </div>
          <div className="workspace-head-actions">
            <button
              className="btn btn-outline"
              type="button"
              onClick={handleReload}
              disabled={reloading || loading}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <RefreshCw size={14} className={reloading ? 'spin' : ''} />
              <span>{reloading ? 'Reloading...' : 'Reload Keys'}</span>
            </button>
            <button
              className="btn btn-primary"
              type="button"
              onClick={() => {
                setAddError('');
                setNewLabel('');
                setNewApiKey('');
                setShowPassword(false);
                setShowAddModal(true);
              }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Plus size={16} />
              <span>Add API Key</span>
            </button>
          </div>
        </div>

        {/* Error Banner */}
        {Boolean(error) && (
          <div
            className="workspace-inline-error"
            style={{
              background: 'rgba(239,68,68,0.12)',
              color: '#DC2626',
              border: '1px solid rgba(239,68,68,0.25)',
              padding: '12px 16px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* 4 KPI Summary Cards */}
        <div className="workspace-focus-card">
          <div className="workspace-focus-metrics">
            <article>
              <span>Total Keys</span>
              <strong>{loading ? '…' : totalCount}</strong>
              <small style={{ marginTop: '2px', fontSize: '11px', color: 'var(--text-muted)' }}>
                Configured keys
              </small>
            </article>
            <article>
              <span>Active</span>
              <strong style={{ color: '#059669' }}>{loading ? '…' : activeCount}</strong>
              <small style={{ marginTop: '2px', fontSize: '11px', color: 'var(--text-muted)' }}>
                Ready for AI requests
              </small>
            </article>
            <article>
              <span>Exhausted</span>
              <strong style={{ color: '#D97706' }}>{loading ? '…' : exhaustedCount}</strong>
              <small style={{ marginTop: '2px', fontSize: '11px', color: 'var(--text-muted)' }}>
                Quota limit hit (429)
              </small>
            </article>
            <article>
              <span>Invalid</span>
              <strong style={{ color: '#DC2626' }}>{loading ? '…' : invalidCount}</strong>
              <small style={{ marginTop: '2px', fontSize: '11px', color: 'var(--text-muted)' }}>
                Auth failed (401/403)
              </small>
            </article>
          </div>
        </div>

        {/* Key Table Container */}
        <div className="manager-project-container" style={{ marginBottom: '32px' }}>
          {/* Top Filter Toolbar */}
          <div
            className="company-profiles-filters"
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '10px',
              alignItems: 'center',
              padding: '10px 14px',
            }}
          >
            {/* Search API keys... (takes largest width) */}
            <div style={{ position: 'relative', flex: '1 1 280px', minWidth: '200px' }}>
              <Search
                size={15}
                style={{
                  position: 'absolute',
                  left: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted, #94a3b8)',
                  pointerEvents: 'none',
                }}
              />
              <input
                type="text"
                className="search-input"
                placeholder="Search API keys..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                style={{
                  width: '100%',
                  paddingLeft: '32px',
                  paddingRight: searchQuery ? '30px' : '10px',
                  height: '36px',
                  boxSizing: 'border-box',
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => handleSearchChange('')}
                  style={{
                    position: 'absolute',
                    right: '6px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px',
                    color: 'var(--text-muted, #94a3b8)',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  title="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Status Filter Dropdown */}
            <select
              className="search-input"
              value={statusFilter}
              onChange={(e) => handleStatusFilterChange(e.target.value)}
              style={{
                width: 'auto',
                minWidth: '130px',
                height: '36px',
                cursor: 'pointer',
              }}
            >
              <option value="ALL">Status: All</option>
              <option value="ACTIVE">Active</option>
              <option value="DISABLED">Disabled</option>
              <option value="EXHAUSTED">Exhausted</option>
              <option value="INVALID">Invalid</option>
            </select>

            {/* Provider Filter Dropdown */}
            <select
              className="search-input"
              value={providerFilter}
              onChange={(e) => handleProviderFilterChange(e.target.value)}
              style={{
                width: 'auto',
                minWidth: '130px',
                height: '36px',
                cursor: 'pointer',
              }}
            >
              <option value="ALL">Provider: All</option>
              {availableProviders.map((p) => (
                <option key={p} value={p}>
                  {p === 'GEMINI' ? 'Gemini' : p}
                </option>
              ))}
            </select>

            {/* Last Error Filter Dropdown */}
            <select
              className="search-input"
              value={lastErrorFilter}
              onChange={(e) => handleLastErrorFilterChange(e.target.value)}
              style={{
                width: 'auto',
                minWidth: '160px',
                height: '36px',
                cursor: 'pointer',
              }}
            >
              <option value="ALL">Last Error: All</option>
              <option value="401">401 Unauthorized</option>
              <option value="403">403 Forbidden</option>
              <option value="429">429 Resource Exhausted</option>
              <option value="503">503 Service Unavailable</option>
              <option value="NONE">No Error</option>
            </select>

            {/* Clear filters Button */}
            {isFilterActive && (
              <button
                type="button"
                className="btn btn-sm btn-outline"
                onClick={handleClearFilters}
                style={{
                  height: '36px',
                  padding: '0 12px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  borderRadius: '6px',
                  color: '#ef4444',
                  borderColor: 'rgba(239, 68, 68, 0.3)',
                  background: 'rgba(239, 68, 68, 0.05)',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                <RotateCcw size={13} />
                <span>Clear filters</span>
              </button>
            )}
          </div>

          <div className="manager-project-table-scroll">
            <div className="manager-project-table-inner" style={{ minWidth: '820px' }}>
              {loading ? (
                <div className="project-table-empty" style={{ padding: '40px', textAlign: 'center' }}>
                  <p className="project-table-empty-title">Loading Gemini API keys...</p>
                </div>
              ) : keys.length === 0 ? (
                <div
                  className="project-table-empty"
                  style={{
                    padding: '50px 20px',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '12px',
                  }}
                >
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      background: 'rgba(59, 130, 246, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#2563EB',
                    }}
                  >
                    <Key size={24} />
                  </div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    No API keys configured.
                  </h3>
                  <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)', maxWidth: '400px' }}>
                    Add an API key to enable AI-powered features.
                  </p>
                  <button
                    className="btn btn-primary"
                    type="button"
                    style={{ marginTop: '8px' }}
                    onClick={() => {
                      setAddError('');
                      setNewLabel('');
                      setNewApiKey('');
                      setShowPassword(false);
                      setShowAddModal(true);
                    }}
                  >
                    Add API Key
                  </button>
                </div>
              ) : filteredKeys.length === 0 ? (
                <div
                  className="project-table-empty"
                  style={{
                    padding: '48px 20px',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '12px',
                  }}
                >
                  <div
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '50%',
                      background: 'rgba(100, 116, 139, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#64748b',
                    }}
                  >
                    <Search size={22} />
                  </div>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    No API keys match the current filters.
                  </h3>
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)', maxWidth: '420px' }}>
                    Try adjusting your search terms or clearing status and error filters.
                  </p>
                  <button
                    className="btn btn-outline"
                    type="button"
                    onClick={handleClearFilters}
                    style={{ marginTop: '6px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <RotateCcw size={13} />
                    <span>Clear filters</span>
                  </button>
                </div>
              ) : (
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th style={{ width: '50px', textAlign: 'center' }}>#</th>
                      <th style={{ width: '100px' }}>Provider</th>
                      <th style={{ width: '280px' }}>API Key</th>
                      <th style={{ width: '120px' }}>Status</th>
                      <th style={{ width: '140px' }}>Last Used</th>
                      <th>Last Error</th>
                      <th style={{ width: '140px' }}>Created At</th>
                      <th style={{ width: '220px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedKeys.map((k, index) => {
                      const isTesting = testingKeyId === k.id;
                      const isToggling = togglingKeyId === k.id;
                      const isRevealing = revealingKeyId === k.id;
                      const isRevealed = Boolean(revealedKeys[k.id]);
                      const isDisabled = k.status === 'DISABLED';
                      const rowNumber = (validPage - 1) * pageSize + index + 1;

                      let errorSnippet = '—';
                      if (k.status !== 'ACTIVE' && (k.lastError || k.lastErrorCode)) {
                        const parts = [];
                        if (k.lastErrorCode) parts.push(String(k.lastErrorCode));
                        if (k.lastError) parts.push(k.lastError);
                        errorSnippet = parts.join(' ');
                      }

                      return (
                        <tr key={k.id}>
                          <td
                            style={{
                              textAlign: 'center',
                              color: 'var(--text-muted)',
                              fontSize: '13px',
                              fontWeight: 500,
                            }}
                            className="admin-mono"
                          >
                            {rowNumber}
                          </td>
                          <td>
                            <strong>{k.provider || 'GEMINI'}</strong>
                          </td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                <span
                                  className="admin-mono"
                                  style={{
                                    fontWeight: 600,
                                    fontSize: '13px',
                                    letterSpacing: '0.04em',
                                    color: 'var(--text-primary)',
                                    wordBreak: 'break-all',
                                  }}
                                >
                                  {isRevealed ? revealedKeys[k.id] : k.maskedKey}
                                </span>
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-outline"
                                    title={isRevealed ? 'Hide full API key' : 'Show full API key'}
                                    disabled={isRevealing}
                                    onClick={() => handleToggleReveal(k)}
                                    style={{
                                      padding: '2px 6px',
                                      fontSize: '11px',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '3px',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    {isRevealing ? (
                                      <RefreshCw size={12} className="spin" />
                                    ) : isRevealed ? (
                                      <>
                                        <EyeOff size={12} />
                                        <span>Hide</span>
                                      </>
                                    ) : (
                                      <>
                                        <Eye size={12} />
                                        <span>Show</span>
                                      </>
                                    )}
                                  </button>
                                  {isRevealed && (
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-outline"
                                      title="Copy full API key"
                                      onClick={() => handleCopyKey(revealedKeys[k.id])}
                                      style={{
                                        padding: '2px 6px',
                                        fontSize: '11px',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '3px',
                                        cursor: 'pointer',
                                      }}
                                    >
                                      <Copy size={12} />
                                      <span>Copy</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                              {k.label && (
                                <small style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                                  {k.label}
                                </small>
                              )}
                            </div>
                          </td>
                          <td>{getStatusBadge(k.status)}</td>
                          <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                            {formatDateTime(k.lastUsedAt)}
                          </td>
                          <td>
                            {errorSnippet !== '—' ? (
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span
                                  style={{
                                    fontSize: '12px',
                                    color: k.status === 'EXHAUSTED' ? '#D97706' : '#DC2626',
                                    fontWeight: 500,
                                  }}
                                >
                                  {errorSnippet}
                                </span>
                                {k.lastFailureAt && (
                                  <small style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                    {formatDateTime(k.lastFailureAt)}
                                  </small>
                                )}
                              </div>
                            ) : (
                              <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>—</span>
                            )}
                          </td>
                          <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                            {formatDateTime(k.createdAt)}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div
                              className="admin-row-actions"
                              style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}
                            >
                              <button
                                className="btn btn-sm btn-outline"
                                type="button"
                                title="Test this API key against Gemini"
                                disabled={isTesting || isToggling}
                                onClick={() => handleTestKey(k)}
                                style={{
                                  fontSize: '12px',
                                  padding: '4px 8px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                              >
                                <PlayCircle size={13} />
                                <span>{isTesting ? 'Testing...' : 'Test'}</span>
                              </button>

                              <button
                                className="btn btn-sm btn-outline"
                                type="button"
                                title={isDisabled ? 'Enable key for runtime rotation' : 'Disable key'}
                                disabled={isTesting || isToggling}
                                onClick={() => handleToggleStatus(k)}
                                style={{
                                  fontSize: '12px',
                                  padding: '4px 8px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  color: isDisabled ? '#059669' : '#D97706',
                                }}
                              >
                                <Power size={13} />
                                <span>{isToggling ? (isDisabled ? 'Enabling...' : 'Disabling...') : (isDisabled ? 'Enable' : 'Disable')}</span>
                              </button>

                              <button
                                className="btn btn-sm btn-outline"
                                type="button"
                                title="Delete key from rotation"
                                disabled={isTesting || isToggling}
                                onClick={() => setKeyToDelete(k)}
                                style={{
                                  fontSize: '12px',
                                  padding: '4px 8px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  color: '#DC2626',
                                }}
                              >
                                <Trash2 size={13} />
                                <span>Delete</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Pagination Footer */}
          {!loading && filteredKeys.length > 0 && (
            <div className="project-table-pagination">
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                <span>
                  Showing {startItemIndex}–{endItemIndex} of {totalFiltered} keys
                  {totalFiltered !== totalCount && ` (filtered from ${totalCount} total)`}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <label htmlFor="ai-key-page-size" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Per page:
                  </label>
                  <select
                    id="ai-key-page-size"
                    className="search-input"
                    value={pageSize}
                    onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                    style={{
                      height: '28px',
                      padding: '2px 8px',
                      fontSize: '12px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color, #e2e8f0)',
                      background: 'var(--workspace-panel-bg, #fff)',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      width: 'auto',
                    }}
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <button
                  type="button"
                  className="workspace-page-btn"
                  disabled={validPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  title="Previous page"
                >
                  Previous
                </button>
                {paginationItems.map((item, idx) =>
                  typeof item === 'number' ? (
                    <button
                      key={`page-${item}`}
                      type="button"
                      className={`workspace-page-btn ${validPage === item ? 'active' : ''}`}
                      onClick={() => setCurrentPage(item)}
                    >
                      {item}
                    </button>
                  ) : (
                    <span key={`dots-${idx}`} style={{ padding: '0 4px', color: 'var(--text-muted)', fontSize: '12px' }}>
                      ...
                    </span>
                  )
                )}
                <button
                  type="button"
                  className="workspace-page-btn"
                  disabled={validPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  title="Next page"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ADD API KEY MODAL */}
      {showAddModal && (
        <div className="admin-modal-backdrop" onClick={() => !addLoading && setShowAddModal(false)}>
          <div
            className="admin-modal"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '460px',
              padding: 0,
              overflow: 'hidden',
              background: 'var(--cds-layer-01)',
              borderRadius: '12px',
              border: '1px solid var(--cds-border-subtle-00)',
              boxShadow: '0 12px 32px rgba(0,0,0,0.1)',
            }}
          >
            <div style={{ padding: '24px 24px 16px', borderBottom: '1px solid var(--cds-border-subtle-00)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: 'var(--cds-text-primary)' }}>
                    Add Gemini API Key
                  </h3>
                  <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--cds-text-secondary)' }}>
                    Register a new Google Gemini API key into runtime rotation without restarting the server.
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleAddKey}>
              <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
                {addError && (
                  <div
                    style={{
                      background: 'rgba(239,68,68,0.12)',
                      color: '#DC2626',
                      border: '1px solid rgba(239,68,68,0.25)',
                      padding: '10px 14px',
                      borderRadius: '6px',
                      fontSize: '13px',
                    }}
                  >
                    {addError}
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label
                    style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      color: 'var(--cds-text-secondary)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    Label (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Gemini Production Key 4"
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    disabled={addLoading}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      background: 'var(--cds-field)',
                      border: '1px solid var(--cds-border-strong-01)',
                      borderRadius: '6px',
                      fontSize: '14px',
                      color: 'var(--cds-text-primary)',
                      outline: 'none',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label
                    style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      color: 'var(--cds-text-secondary)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    API Key *
                  </label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="AIzaSy................................."
                      value={newApiKey}
                      onChange={(e) => setNewApiKey(e.target.value)}
                      disabled={addLoading}
                      required
                      autoComplete="off"
                      spellCheck={false}
                      style={{
                        width: '100%',
                        padding: '10px 42px 10px 12px',
                        background: 'var(--cds-field)',
                        border: '1px solid var(--cds-border-strong-01)',
                        borderRadius: '6px',
                        fontSize: '14px',
                        fontFamily: 'monospace',
                        color: 'var(--cds-text-primary)',
                        outline: 'none',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                      style={{
                        position: 'absolute',
                        right: '10px',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--cds-icon-secondary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '4px',
                      }}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <small style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Encrypted upon saving. Once persisted, the full key is never visible or retrievable.
                  </small>
                </div>
              </div>

              <div
                style={{
                  padding: '16px 24px',
                  background: 'var(--cds-layer-02)',
                  borderTop: '1px solid var(--cds-border-subtle-00)',
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '12px',
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  disabled={addLoading}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--cds-border-strong-01)',
                    color: 'var(--cds-text-primary)',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addLoading}
                  style={{
                    background: 'var(--cds-interactive)',
                    border: '1px solid var(--cds-interactive)',
                    color: '#ffffff',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: addLoading ? 'not-allowed' : 'pointer',
                    opacity: addLoading ? 0.7 : 1,
                  }}
                >
                  {addLoading ? 'Adding...' : 'Add Key'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM MODAL */}
      <ConfirmModal
        isOpen={Boolean(keyToDelete)}
        title="Delete API Key?"
        message={
          <div>
            <p style={{ margin: 0, marginBottom: '8px' }}>
              This key (<strong>{keyToDelete?.maskedKey}</strong>) will be removed from Gemini runtime rotation immediately.
            </p>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '13px' }}>
              This action cannot be undone.
            </p>
          </div>
        }
        confirmText={deleteLoading ? 'Deleting...' : 'Delete'}
        cancelText="Cancel"
        confirmDisabled={deleteLoading}
        isDestructive={true}
        onConfirm={handleDelete}
        onCancel={() => !deleteLoading && setKeyToDelete(null)}
      />

      {/* Global Toast / Inline Notification */}
      {notice && (
        <div
          className={`apms-toast ${notice.type}`}
          style={{
            position: 'fixed',
            top: '24px',
            right: '24px',
            zIndex: 10050,
            padding: '12px 18px',
            borderRadius: '8px',
            background:
              notice.type === 'success'
                ? '#059669'
                : notice.type === 'error'
                ? '#DC2626'
                : '#2563EB',
            color: '#FFFFFF',
            boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontWeight: 500,
          }}
        >
          {notice.type === 'success' && <CheckCircle2 size={18} />}
          {notice.type === 'error' && <AlertCircle size={18} />}
          <span>{notice.message}</span>
        </div>
      )}
    </section>
  );
};
