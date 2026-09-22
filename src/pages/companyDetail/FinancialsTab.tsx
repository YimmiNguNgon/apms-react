import React, { useMemo, useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Calendar,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  FileSearch,
  FileText,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  CheckCircle2,
} from 'lucide-react';
import { financialResearchApi } from '../../API/financialResearchApi';
import { API_BASE_URL } from '../../services/api';
import type { CompanyProfileFinancialRow } from '../../types/domain';
import { formatFinancialUnit, CANONICAL_FINANCIAL_UNITS } from '../../components/FinancialResearch/canonicalFinancialTaxonomy';
import styles from './FinancialsTab.module.css';

export interface FinancialsTabHandle {
  isDirty: () => boolean;
  save: () => Promise<void>;
  cancel: () => void;
}

interface FinancialsTabProps {
  companyId: string;
  projectId?: number | null;
  editable?: boolean;
  onDirtyChange?: (isDirty: boolean) => void;
}

interface ReportGroup {
  reportId: string;
  reportTitle: string;
  documentId?: string | null;
  publicationDate?: string | null;
  isManual: boolean;
  rows: CompanyProfileFinancialRow[];
}

const formatDate = (dateStr?: string | null) => {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

const getPeriodRank = (periodLabel: string): number => {
  const upper = periodLabel.toUpperCase();
  if (upper.startsWith('FY') || upper.startsWith('FULL')) return 7;
  if (upper.startsWith('Q4')) return 6;
  if (upper.startsWith('H2')) return 5;
  if (upper.startsWith('Q3')) return 4;
  if (upper.startsWith('Q2')) return 3;
  if (upper.startsWith('H1')) return 2;
  if (upper.startsWith('Q1')) return 1;
  return 0;
};

const formatMetricNumber = (value?: number | string | null) => {
  if (value === undefined || value === null || value === '') return '—';
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isNaN(numeric) && Number.isFinite(numeric)) {
    if (numeric < 0) {
      return `(${new Intl.NumberFormat('vi-VN').format(Math.abs(numeric))})`;
    }
    return new Intl.NumberFormat('vi-VN').format(numeric);
  }
  return String(value);
};

const isImportantMetric = (label: string) => {
  const upper = label.toUpperCase();
  return (
    upper === label ||
    upper.includes('TỔNG') ||
    upper.includes('VỐN CHỦ') ||
    upper.includes('LỢI NHUẬN') ||
    upper.includes('DOANH THU') ||
    upper.includes('NỢ PHẢI TRẢ')
  );
};

const FinancialsTab = forwardRef<FinancialsTabHandle, FinancialsTabProps>(({
  companyId,
  projectId,
  editable = false,
  onDirtyChange,
}, ref) => {
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedQuarter, setSelectedQuarter] = useState<string>('ALL');
  const [expandedReportIds, setExpandedReportIds] = useState<Set<string>>(new Set());
  const [openingDocId, setOpeningDocId] = useState<string | null>(null);

  // Local draft state for Edit mode
  const [draftRows, setDraftRows] = useState<CompanyProfileFinancialRow[]>([]);
  const [deletedRowIds, setDeletedRowIds] = useState<string[]>([]);
  const [hasAttemptedBackfill, setHasAttemptedBackfill] = useState(false);

  // Read-only query for canonical company profile financials
  const {
    data: canonicalRows,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['company-profile-canonical-financials', companyId, projectId],
    queryFn: () => financialResearchApi.getCanonicalFinancials(companyId, projectId).then(res => res.data || []),
    staleTime: 30_000,
  });

  // Explicit backfill for legacy approved research if canonical rows are empty
  useEffect(() => {
    if (!isLoading && !isError && canonicalRows && canonicalRows.length === 0 && !hasAttemptedBackfill && editable) {
      setHasAttemptedBackfill(true);
      financialResearchApi.backfillCanonicalFinancials(companyId)
        .then(res => {
          if (res.data && res.data > 0) {
            refetch();
          }
        })
        .catch(err => {
          console.warn('Backfill legacy approved research skipped or errored:', err);
        });
    }
  }, [isLoading, isError, canonicalRows, hasAttemptedBackfill, companyId, refetch, editable]);

  const prevEditableRef = React.useRef(editable);

  // Sync draftRows when entering or exiting edit mode
  useEffect(() => {
    if (!prevEditableRef.current && editable) {
      // Just entered edit mode: clone canonical rows into draft rows
      setDraftRows(canonicalRows || []);
      setDeletedRowIds([]);
    } else if (prevEditableRef.current && !editable) {
      // Just exited edit mode: reset draft rows
      setDraftRows(canonicalRows || []);
      setDeletedRowIds([]);
    }
    prevEditableRef.current = editable;
  }, [editable, canonicalRows]);

  // Initial load when canonicalRows first arrive
  useEffect(() => {
    if (canonicalRows && canonicalRows.length > 0 && draftRows.length === 0) {
      setDraftRows(canonicalRows);
    }
  }, [canonicalRows, draftRows.length]);

  // Determine active rows based on mode
  const activeRows = useMemo(() => {
    return editable ? draftRows : (canonicalRows || []);
  }, [editable, draftRows, canonicalRows]);

  // Helper for numeric conversion
  const parseNumeric = (val: any): number => {
    if (typeof val === 'number') return Number.isNaN(val) ? 0 : val;
    if (!val) return 0;
    const str = String(val).trim();
    let negative = false;
    if ((str.startsWith('(') && str.endsWith(')')) || str.startsWith('-')) {
      negative = true;
    }
    const clean = str.replace(/[^0-9.]/g, '');
    const num = Number(clean) || 0;
    return negative ? -num : num;
  };

  // Semantic Dirty Comparison
  const isDirty = useMemo(() => {
    if (!editable) return false;
    if (deletedRowIds.length > 0) return true;

    const baselineMap = new Map((canonicalRows || []).map(r => [r.id, r]));

    for (const draft of draftRows) {
      if (draft.id.startsWith('temp-')) {
        if (draft.metricName.trim() !== '' || parseNumeric(draft.value) !== 0 || draft.sourcePage != null) return true;
        continue;
      }

      const base = baselineMap.get(draft.id);
      if (!base) return true;

      if (draft.metricName.trim() !== (base.metricName || '').trim()) return true;
      if (parseNumeric(draft.value) !== parseNumeric(base.value)) return true;
      if (formatFinancialUnit(draft.unit) !== formatFinancialUnit(base.unit)) return true;
      if (Number(draft.year) !== Number(base.year)) return true;
      if ((draft.quarter || '').trim().toUpperCase() !== (base.quarter || '').trim().toUpperCase()) return true;
      if (draft.sourcePage !== base.sourcePage) return true;
    }

    return false;
  }, [editable, deletedRowIds, draftRows, canonicalRows]);

  // Propagate dirty changes to parent
  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  // Imperative handle for parent (CompanyDetail)
  useImperativeHandle(ref, () => ({
    isDirty: () => isDirty,
    save: async () => {
      if (!isDirty) return;

      // Validation: newly added metrics must specify a valid evidence page >= 1
      for (const r of draftRows) {
        if (r.metricName.trim() === '') continue;
        if (r.id.startsWith('temp-')) {
          const page = r.sourcePage != null ? Number(r.sourcePage) : NaN;
          if (Number.isNaN(page) || page < 1 || !Number.isInteger(page)) {
            throw new Error(`Please specify a valid evidence page (>= 1) for newly added metric "${r.metricName}".`);
          }
        }
      }

      const rowsToSave = draftRows
        .filter(r => r.metricName.trim() !== '')
        .map(r => {
          const numVal = parseNumeric(r.value);
          const pageVal = r.sourcePage != null ? Number(r.sourcePage) : null;
          if (r.id.startsWith('temp-')) {
            return {
              ...r,
              id: '', // Blank ID signals backend to create a new manual row
              value: numVal,
              metricName: r.metricName.trim(),
              unit: r.unit.trim(),
              quarter: r.quarter.trim().toUpperCase(),
              sourcePage: pageVal,
            };
          }
          return {
            ...r,
            value: numVal,
            metricName: r.metricName.trim(),
            unit: r.unit.trim(),
            quarter: r.quarter.trim().toUpperCase(),
            sourcePage: pageVal,
          };
        });

      await financialResearchApi.updateCanonicalFinancials(companyId, {
        rows: rowsToSave,
        deletedIds: deletedRowIds,
      });

      const updated = await refetch();
      setDraftRows(updated.data || []);
      setDeletedRowIds([]);
    },
    cancel: () => {
      setDraftRows(canonicalRows || []);
      setDeletedRowIds([]);
      onDirtyChange?.(false);
    },
  }), [isDirty, draftRows, deletedRowIds, companyId, canonicalRows, refetch, onDirtyChange]);

  // Combine rows to derive years so availableYears NEVER drops during mode transitions
  const allAvailableRows = useMemo(() => {
    const list = [...(canonicalRows || [])];
    draftRows.forEach(r => {
      if (!list.some(existing => existing.id === r.id)) {
        list.push(r);
      }
    });
    return list;
  }, [canonicalRows, draftRows]);

  // Derive unique years
  const availableYears = useMemo<number[]>(() => {
    const years = new Set<number>();
    allAvailableRows.forEach(r => {
      if (r.year && !Number.isNaN(r.year)) {
        years.add(r.year);
      }
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [allAvailableRows]);

  // Sync selectedYear without wiping it to null if availableYears is temporarily recomputing
  useEffect(() => {
    if (availableYears.length > 0) {
      if (selectedYear === null || !availableYears.includes(selectedYear)) {
        setSelectedYear(availableYears[0]);
      }
    }
  }, [availableYears, selectedYear]);

  // Available quarter tabs
  const availableQuarters = useMemo<string[]>(() => {
    const base = ['ALL', 'Q1', 'Q2', 'Q3', 'Q4'];
    if (!selectedYear) return base;

    const rowsInYear = allAvailableRows.filter(r => r.year === selectedYear);
    const hasH1 = rowsInYear.some(r => r.quarter === 'H1');
    const hasH2 = rowsInYear.some(r => r.quarter === 'H2');
    const hasFY = rowsInYear.some(r => r.quarter === 'FY');

    const tabs = ['ALL', 'Q1', 'Q2'];
    if (hasH1) tabs.push('H1');
    tabs.push('Q3', 'Q4');
    if (hasH2) tabs.push('H2');
    if (hasFY) tabs.push('FY');
    return tabs;
  }, [allAvailableRows, selectedYear]);

  // Filter active rows by Year & Quarter
  const filteredRows = useMemo(() => {
    if (!selectedYear) return [];

    return activeRows.filter(r => {
      if (r.year !== selectedYear) return false;
      if (selectedQuarter === 'ALL') return true;
      return (r.quarter || '').toUpperCase() === selectedQuarter.toUpperCase();
    });
  }, [activeRows, selectedYear, selectedQuarter]);

  // Period Groups for View Mode
  const periodGroups = useMemo(() => {
    // Map of periodLabel -> array of ReportGroup
    const periodMap = new Map<string, Map<string, ReportGroup>>();

    filteredRows.forEach(row => {
      const periodLabel = `${row.quarter || 'FY'} ${row.year || ''}`.trim();
      if (!periodMap.has(periodLabel)) {
        periodMap.set(periodLabel, new Map());
      }
      const reportsInPeriod = periodMap.get(periodLabel)!;

      const reportKey = row.sourceReportId || (row.sourceReportTitle ? `${row.sourceReportTitle}_${row.year}_${row.quarter}` : undefined);
      const hasReport = Boolean(reportKey);
      const groupKey = hasReport ? reportKey! : '__DEFAULT_REPORT__';

      if (!reportsInPeriod.has(groupKey)) {
        reportsInPeriod.set(groupKey, {
          reportId: groupKey,
          reportTitle: row.sourceReportTitle || 'Financial Report',
          documentId: row.sourceDocumentId,
          publicationDate: row.publicationDate,
          isManual: false,
          rows: [],
        });
      }

      reportsInPeriod.get(groupKey)!.rows.push(row);
    });

    // Sort periods descending
    const sortedPeriods = Array.from(periodMap.entries()).sort(([labelA], [labelB]) => {
      return getPeriodRank(labelB) - getPeriodRank(labelA);
    });

    return sortedPeriods.map(([periodLabel, reportMap]) => {
      const reportList = Array.from(reportMap.values());
      // Sort reports by publication date descending
      reportList.sort((a, b) => {
        if (a.isManual) return 1;
        if (b.isManual) return -1;
        const dateA = a.publicationDate ? new Date(a.publicationDate).getTime() : 0;
        const dateB = b.publicationDate ? new Date(b.publicationDate).getTime() : 0;
        return dateB - dateA;
      });
      // Preserve exact metric order (displayOrder)
      reportList.forEach(report => {
        report.rows.sort((a, b) => {
          const ordA = a.displayOrder ?? Number.MAX_SAFE_INTEGER;
          const ordB = b.displayOrder ?? Number.MAX_SAFE_INTEGER;
          return ordA - ordB;
        });
      });
      return {
        periodLabel,
        reports: reportList,
      };
    });
  }, [filteredRows]);

  // Synchronize expansion state when filter changes or reports load
  const lastFilterKeyRef = React.useRef<string>('');

  useEffect(() => {
    if (periodGroups.length === 0) return;

    const filterKey = `${companyId}_${selectedYear}_${selectedQuarter}`;
    const validReportIds = new Set<string>();
    periodGroups.forEach(pg => pg.reports.forEach(r => validReportIds.add(r.reportId)));

    if (lastFilterKeyRef.current !== filterKey) {
      lastFilterKeyRef.current = filterKey;
      setExpandedReportIds(prev => {
        const remaining = new Set<string>();
        prev.forEach(id => {
          if (validReportIds.has(id)) remaining.add(id);
        });
        // If none of the previously expanded reports are in this period, expand the first report by default
        if (remaining.size === 0) {
          const firstReport = periodGroups[0]?.reports[0];
          if (firstReport) {
            remaining.add(firstReport.reportId);
          }
        }
        return remaining;
      });
    } else {
      // Filter key hasn't changed, but reports may have changed (e.g. deleted reports)
      // Prune any IDs that are no longer valid, without auto-expanding if user collapsed them
      setExpandedReportIds(prev => {
        let hasInvalid = false;
        prev.forEach(id => {
          if (!validReportIds.has(id)) hasInvalid = true;
        });
        if (!hasInvalid) return prev;
        const next = new Set<string>();
        prev.forEach(id => {
          if (validReportIds.has(id)) next.add(id);
        });
        return next;
      });
    }
  }, [companyId, selectedYear, selectedQuarter, periodGroups]);

  const toggleExpand = (reportId: string) => {
    setExpandedReportIds(prev => {
      const next = new Set(prev);
      if (next.has(reportId)) {
        next.delete(reportId);
      } else {
        next.add(reportId);
      }
      return next;
    });
  };

  const handleViewPdf = async (documentId?: string | null) => {
    if (!documentId) return;
    try {
      setOpeningDocId(documentId);
      const token =
        localStorage.getItem('accessToken') ||
        localStorage.getItem('apms-token') ||
        localStorage.getItem('token');

      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(
        `${API_BASE_URL}/documents/${encodeURIComponent(documentId)}/download?download=false`,
        { headers },
      );

      if (!res.ok) {
        const fallbackRes = await fetch(
          `${API_BASE_URL}/company-profiles/${companyId}/documents/${encodeURIComponent(documentId)}/download?download=false`,
          { headers },
        );
        if (!fallbackRes.ok) {
          throw new Error('Failed to load document');
        }
        const blob = await fallbackRes.blob();
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (err) {
      console.error('Error opening document:', err);
      window.open(
        `${API_BASE_URL}/documents/${encodeURIComponent(documentId)}/download?download=false`,
        '_blank',
      );
    } finally {
      setOpeningDocId(null);
    }
  };

  // Row update handlers for Edit mode
  const handleUpdateRowField = (id: string, field: keyof CompanyProfileFinancialRow, value: any) => {
    setDraftRows(prev => prev.map(r => {
      if (r.id === id) {
        return { ...r, [field]: value };
      }
      return r;
    }));
  };

  const handleDeleteRow = (id: string) => {
    if (id.startsWith('temp-')) {
      setDraftRows(prev => prev.filter(r => r.id !== id));
    } else {
      setDeletedRowIds(prev => [...prev, id]);
      setDraftRows(prev => prev.filter(r => r.id !== id));
    }
  };

  const handleAddRow = (targetReport: ReportGroup) => {
    // Inherit year and quarter directly from the targetReport rows (or selectedYear)
    const reportYear = targetReport.rows[0]?.year || selectedYear || (availableYears.length > 0 ? availableYears[0] : new Date().getFullYear());
    const reportQuarter = targetReport.rows[0]?.quarter || (selectedQuarter !== 'ALL' ? selectedQuarter : 'Q1');

    // Append deterministically: max displayOrder + 1 (Part F)
    const maxOrder = draftRows.reduce((max, r) => Math.max(max, r.displayOrder ?? 0), -1);

    const newRow: CompanyProfileFinancialRow = {
      id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      companyProfileId: companyId,
      metricName: '',
      value: '' as any,
      unit: targetReport.rows[0]?.unit ? formatFinancialUnit(targetReport.rows[0].unit) : 'Triệu VNĐ',
      year: reportYear,
      quarter: reportQuarter,
      displayOrder: maxOrder + 1,
      sourceType: 'MANUAL',
      sourceResearchId: targetReport.rows[0]?.sourceResearchId || null,
      sourceReportId: targetReport.reportId,
      sourceReportTitle: targetReport.reportTitle,
      sourceDocumentId: targetReport.documentId || null,
      sourcePage: null,
      sourceMetricId: null,
      publicationDate: targetReport.publicationDate || null,
    };

    setDraftRows(prev => [...prev, newRow]);
    setExpandedReportIds(prev => new Set(prev).add(targetReport.reportId));
  };

  // Loading State
  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.stateContainer}>
          <div className={styles.stateIcon}>
            <Loader2 size={26} className={styles.spin} />
          </div>
          <h3 className={styles.stateTitle}>Loading financial reports...</h3>
          <p className={styles.stateSubtitle}>Retrieving official canonical financial data.</p>
        </div>
      </div>
    );
  }

  // Error State
  if (isError) {
    return (
      <div className={styles.container}>
        <div className={styles.stateContainer}>
          <div className={styles.stateIcon}>
            <FileText size={26} />
          </div>
          <h3 className={styles.stateTitle}>Unable to load financial data</h3>
          <p className={styles.stateSubtitle}>
            There was an error communicating with the server. Please try again.
          </p>
          <button className={styles.primaryButton} type="button" onClick={() => void refetch()}>
            <RefreshCw size={14} />
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Global Empty State
  if (activeRows.length === 0 && !editable) {
    return (
      <div className={styles.container}>
        <div className={styles.stateContainer}>
          <p className={styles.stateSubtitle}>
            No official canonical financial rows exist for this company profile yet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      {/*<div className={styles.headerSection}>*/}
      {/*  <div className={styles.titleRow}>*/}
      {/*    <h2 className={styles.title}>*/}
      {/*      {editable ? 'Company Profile Financials' : 'Financial Reports'}*/}
      {/*    </h2>*/}
      {/*    {editable && (*/}
      {/*      <span className={styles.countBadge}>*/}
      {/*        Edit Mode Active*/}
      {/*      </span>*/}
      {/*    )}*/}
      {/*  </div>*/}
      {/*  <p className={styles.subtitle}>*/}
      {/*    {editable*/}
      {/*      ? 'Add, edit, or delete canonical financial metrics. Changes are saved when clicking Save Changes.'*/}
      {/*      : 'Approved financial reports and canonical financial information for this company.'}*/}
      {/*  </p>*/}
      {/*</div>*/}

      {/*/!* Edit Mode Banner *!/*/}
      {/*{editable && (*/}
      {/*  <div className={styles.editModeBanner}>*/}
      {/*    <div className={styles.editModeBannerLeft}>*/}
      {/*      <CheckCircle2 size={16} />*/}
      {/*      <span>*/}
      {/*        You are editing company financial information. Changes will be saved when you click Save Changes.*/}
      {/*      </span>*/}
      {/*    </div>*/}
      {/*  </div>*/}
      {/*)}*/}

      {/* Filters Bar: Year & Quarter */}
      <div className={styles.filtersBar}>
        <div className={styles.filtersLeft}>
          <div className={styles.filterGroup}>
            <span className={styles.filterLabel}>Year</span>
            <div className={styles.yearSelectWrapper}>
              <select
                className={styles.yearSelect}
                value={selectedYear ?? ''}
                onChange={e => setSelectedYear(Number(e.target.value))}
                aria-label="Select Year"
              >
                {availableYears.map(yr => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.divider} />

          <div className={styles.filterGroup}>
            <span className={styles.filterLabel}>Quarter</span>
            <div className={styles.quarterTabs}>
              {availableQuarters.map(q => (
                <button
                  key={q}
                  type="button"
                  className={`${styles.quarterTab} ${selectedQuarter === q ? styles.quarterTabActive : ''}`}
                  onClick={() => setSelectedQuarter(q)}
                >
                  {q === 'ALL' ? 'All' : q}
                </button>
              ))}
            </div>
          </div>
        </div>

        {isFetching && (
          <Loader2 size={16} className={styles.spin} style={{ color: '#94a3b8' }} />
        )}
      </div>

      {/* Filter Empty State */}
      {filteredRows.length === 0 ? (
        <div className={styles.stateContainer}>
          <div className={styles.stateIcon}>
            <Search size={26} />
          </div>
          <h3 className={styles.stateTitle}>
            No financial metrics found for {selectedQuarter !== 'ALL' ? `${selectedQuarter} ` : ''}
            {selectedYear}
          </h3>
          <p className={styles.stateSubtitle}>
            There are no canonical financial rows matching the selected filter.
          </p>
          {selectedQuarter !== 'ALL' && (
            <button
              className={styles.primaryButton}
              type="button"
              onClick={() => setSelectedQuarter('ALL')}
            >
              Show All Quarters
            </button>
          )}
        </div>
      ) : (
        /* REPORT LIST: UNIFIED STRUCTURE FOR BOTH VIEW AND EDIT MODES (PART G & PART H) */
        <div className={styles.reportList}>
          {periodGroups.map(({ periodLabel, reports }) => (
            <div key={periodLabel} className={styles.periodGroup}>
              <div className={styles.periodHeader}>
                <span className={styles.periodBadge}>{periodLabel}</span>
                <div className={styles.periodLine} />
              </div>

              {reports.map((reportGroup) => {
                const isExpanded = expandedReportIds.has(reportGroup.reportId);
                const hasDoc = Boolean(reportGroup.documentId);

                return (
                  <div
                    key={reportGroup.reportId}
                    className={`${styles.reportCard} ${isExpanded ? styles.reportCardExpanded : ''}`}
                  >
                    {/* Collapsed / Main Header Row */}
                    <div
                      className={styles.reportRow}
                      onClick={() => toggleExpand(reportGroup.reportId)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={e => {
                        if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
                          e.preventDefault();
                          toggleExpand(reportGroup.reportId);
                        }
                      }}
                    >
                      <div className={styles.reportRowLeft}>
                        <button
                          type="button"
                          className={styles.expandButton}
                          aria-label={isExpanded ? 'Collapse report' : 'Expand report'}
                          onClick={e => {
                            e.stopPropagation();
                            toggleExpand(reportGroup.reportId);
                          }}
                        >
                          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </button>

                        <div className={styles.reportIcon}>
                          <FileText size={18} />
                        </div>

                        <div className={styles.reportMetaGroup}>
                          <span className={styles.metaDate}>
                            <Calendar size={13} />
                            {formatDate(reportGroup.publicationDate)}
                          </span>
                          <span className={styles.metaYearBadge}>{selectedYear}</span>
                          <span className={styles.metaPeriodBadge}>{reportGroup.rows[0]?.quarter || '—'}</span>
                        </div>

                        <span className={styles.metaDot}>•</span>

                        <div className={styles.reportTitleGroup}>
                          <h5 className={styles.reportTitle}>{reportGroup.reportTitle}</h5>
                        </div>
                      </div>

                      <div className={styles.reportRowRight}>
                        {hasDoc && (
                          <button
                            type="button"
                            className={styles.viewReportBtn}
                            disabled={openingDocId === reportGroup.documentId}
                            onClick={e => {
                              e.stopPropagation();
                              handleViewPdf(reportGroup.documentId);
                            }}
                          >
                            {openingDocId === reportGroup.documentId ? (
                              <Loader2 size={13} className={styles.spin} />
                            ) : (
                              <FileText size={13} />
                            )}
                            <span>{openingDocId === reportGroup.documentId ? 'Opening...' : 'View Report'}</span>
                            <ExternalLink size={11} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Expanded Section with Metrics Table */}
                    {isExpanded && (
                      <div className={styles.expandedSection}>
                        <div className={styles.expandedHead}>
                          <div className={styles.expandedHeadLeft}>
                            <h6 className={styles.expandedTitle}>
                              {reportGroup.isManual ? 'Manual Financial Entries' : 'Extracted Financial Information'}
                            </h6>
                            <span className={styles.metricsCountBadge}>
                              {reportGroup.rows.length} metric{reportGroup.rows.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>

                        {reportGroup.rows.length === 0 ? (
                          <div className={styles.noMetricsText}>
                            No financial metrics recorded for this report.
                          </div>
                        ) : (
                          <div className={styles.tableWrapper}>
                            <table className={styles.metricsTable}>
                              <thead>
                                <tr>
                                  {editable ? (
                                    <>
                                      <th style={{ width: '34%' }}>Metric Name</th>
                                      <th style={{ width: '22%', textAlign: 'right' }}>Value</th>
                                      <th style={{ width: '12%' }}>Unit</th>
                                      <th style={{ width: '12%' }}>Period</th>
                                      <th style={{ width: '14%' }}>Source</th>
                                      <th style={{ width: '6%', textAlign: 'center' }}>Action</th>
                                    </>
                                  ) : (
                                    <>
                                      <th style={{ width: '42%' }}>Metric</th>
                                      <th style={{ width: '28%', textAlign: 'right' }}>Value</th>
                                      <th style={{ width: '18%' }}>Period</th>
                                      <th style={{ width: '12%' }}>Source</th>
                                    </>
                                  )}
                                </tr>
                              </thead>
                              <tbody>
                                {reportGroup.rows.map((row) => {
                                  const isImportant = isImportantMetric(row.metricName);
                                  const hasPage = Boolean(row.sourcePage);

                                  if (editable) {
                                    return (
                                      <tr key={row.id}>
                                        <td>
                                          <input
                                            type="text"
                                            className={styles.editInput}
                                            value={row.metricName || ''}
                                            placeholder="e.g. Doanh thu thuần"
                                            onChange={e => handleUpdateRowField(row.id, 'metricName', e.target.value)}
                                          />
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                          <input
                                            type="number"
                                            step="any"
                                            className={`${styles.editInput} ${styles.editInputNumber}`}
                                            value={row.value !== undefined && row.value !== null ? row.value : ''}
                                            placeholder="0"
                                            onChange={e => handleUpdateRowField(row.id, 'value', e.target.value === '' ? '' : Number(e.target.value))}
                                          />
                                        </td>
                                        <td>
                                          <select
                                            className={styles.editSelect}
                                            value={formatFinancialUnit(row.unit) || 'Triệu VNĐ'}
                                            onChange={e => handleUpdateRowField(row.id, 'unit', e.target.value)}
                                          >
                                            {CANONICAL_FINANCIAL_UNITS.map(u => (
                                              <option key={u} value={u}>
                                                {u}
                                              </option>
                                            ))}
                                          </select>
                                        </td>
                                        <td className={styles.periodCell}>
                                          <span className={styles.periodPill}>
                                            {row.quarter} {row.year}
                                          </span>
                                        </td>
                                        <td>
                                          {row.id.startsWith('temp-') ? (
                                            <div className={styles.pageInputWrapper} title="Enter evidence page number (>= 1)">
                                              <span className={styles.pageInputPrefix}>Page</span>
                                              <input
                                                type="number"
                                                min={1}
                                                step={1}
                                                className={styles.pageInput}
                                                placeholder="12"
                                                value={row.sourcePage !== undefined && row.sourcePage !== null ? row.sourcePage : ''}
                                                onChange={e => {
                                                  const val = e.target.value;
                                                  handleUpdateRowField(row.id, 'sourcePage', val === '' ? null : Math.max(1, parseInt(val, 10) || 1));
                                                }}
                                              />
                                            </div>
                                          ) : hasPage ? (
                                            <button
                                              type="button"
                                              className={styles.sourceLink}
                                              onClick={e => {
                                                e.stopPropagation();
                                                handleViewPdf(row.sourceDocumentId);
                                              }}
                                              title="Open source document"
                                            >
                                              <FileText size={11} />
                                              <span>Page {row.sourcePage}</span>
                                            </button>
                                          ) : (
                                            <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                                              —
                                            </span>
                                          )}
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                          <button
                                            type="button"
                                            className={styles.deleteRowBtn}
                                            title="Delete financial row"
                                            onClick={() => handleDeleteRow(row.id)}
                                          >
                                            <Trash2 size={13} />
                                          </button>
                                        </td>
                                      </tr>
                                    );
                                  }

                                  return (
                                    <tr key={row.id}>
                                      <td className={`${styles.metricName} ${isImportant ? styles.metricNameImportant : ''}`}>
                                        {row.metricName}
                                      </td>
                                      <td className={styles.metricValueCell}>
                                        <span>{formatMetricNumber(row.value)}</span>
                                        {row.unit && (
                                          <span className={styles.metricUnit}>{formatFinancialUnit(row.unit)}</span>
                                        )}
                                      </td>
                                      <td className={styles.periodCell}>
                                        <span className={styles.periodPill}>
                                          {row.quarter} {row.year}
                                        </span>
                                      </td>
                                      <td>
                                        {hasPage ? (
                                          <button
                                            type="button"
                                            className={styles.sourceLink}
                                            onClick={e => {
                                              e.stopPropagation();
                                              handleViewPdf(row.sourceDocumentId);
                                            }}
                                            title="Open source document"
                                          >
                                            <FileText size={11} />
                                            <span>Page {row.sourcePage}</span>
                                          </button>
                                        ) : (
                                          <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                                            —
                                          </span>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                            {editable && (
                              <div className={styles.reportTableFooter}>
                                <button
                                  type="button"
                                  className={styles.addMetricBtn}
                                  onClick={() => handleAddRow(reportGroup)}
                                >
                                  <Plus size={13} />
                                  Add Metric to {reportGroup.reportTitle}
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

FinancialsTab.displayName = 'FinancialsTab';

export default FinancialsTab;
