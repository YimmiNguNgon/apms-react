import React, { useMemo, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Calendar,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  FileSearch,
  FileText,
  Loader2,
  RefreshCw,
  Search,
} from 'lucide-react';
import { financialResearchApi } from '../../API/financialResearchApi';
import { API_BASE_URL } from '../../services/api';
import type {
  FinancialMetricResponse,
  FinancialReportEntry,
} from '../../types/domain';
import styles from './FinancialsTab.module.css';

interface FinancialsTabProps {
  companyId: string;
  editable?: boolean;
}

interface ReportWithContext {
  report: FinancialReportEntry;
  metrics: FinancialMetricResponse[];
  projectId: number;
  taskId: number;
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

const formatPeriod = (report: FinancialReportEntry): string => {
  const p = report.reportingPeriod;
  if (!p) return report.reportingYear ? String(report.reportingYear) : 'N/A';
  if (p.periodType === 'QUARTER') return `${p.period || ''} ${p.year || ''}`.trim();
  if (p.periodType === 'HALF_YEAR') return `${p.period || ''} ${p.year || ''}`.trim();
  if (p.periodType === 'FULL_YEAR') return `FY ${p.year || ''}`.trim();
  return `${p.period || ''} ${p.year || ''}`.trim() || 'N/A';
};

const formatGroupPeriod = (report: FinancialReportEntry): string => {
  const p = report.reportingPeriod;
  if (!p) return report.reportingYear ? String(report.reportingYear) : 'Other Period';
  if (p.periodType === 'QUARTER') return `${p.period || 'Q'} ${p.year || ''}`.trim();
  if (p.periodType === 'HALF_YEAR') return `${p.period || 'H'} ${p.year || ''}`.trim();
  if (p.periodType === 'FULL_YEAR') return `FY ${p.year || ''}`.trim();
  return `${p.period || ''} ${p.year || ''}`.trim() || 'Other Period';
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

const formatReportType = (value?: string | null) => {
  if (!value) return null;
  return value
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, char => char.toUpperCase());
};

const formatMetricNumber = (value?: number | string | null) => {
  if (value === undefined || value === null || value === '') return '—';
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isNaN(numeric) && Number.isFinite(numeric)) {
    return new Intl.NumberFormat('vi-VN').format(numeric);
  }
  return String(value);
};

const metricValueParts = (metric: FinancialMetricResponse) => {
  const value = metric.normalizedValue ?? metric.rawValue ?? metric.value;
  const unit = metric.normalizedUnit ?? metric.rawUnit ?? metric.unit ?? metric.currency;
  return {
    value: formatMetricNumber(value),
    unit: unit || '',
  };
};

const formatMetricPeriod = (metric: FinancialMetricResponse, report?: FinancialReportEntry) => {
  const metricPeriod = metric.period;
  const reportPeriod = report?.reportingPeriod;

  if (metricPeriod?.period && metricPeriod?.year) {
    return `${metricPeriod.period} ${metricPeriod.year}`;
  }
  if (reportPeriod?.period && reportPeriod?.year) {
    return `${reportPeriod.period} ${reportPeriod.year}`;
  }
  if (metricPeriod?.asOfDate) {
    return `As of ${formatDate(metricPeriod.asOfDate)}`;
  }
  if (reportPeriod?.asOfDate) {
    return `As of ${formatDate(reportPeriod.asOfDate)}`;
  }
  if (metricPeriod?.year) {
    return String(metricPeriod.year);
  }
  if (reportPeriod?.year) {
    return String(reportPeriod.year);
  }
  return '—';
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

const FinancialsTab: React.FC<FinancialsTabProps> = ({ companyId }) => {
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedQuarter, setSelectedQuarter] = useState<string>('ALL');
  const [expandedReportIds, setExpandedReportIds] = useState<Set<string>>(new Set());

  const {
    data: researchList,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['company-profile-approved-financials', companyId],
    queryFn: () => financialResearchApi.getApprovedFinancials(companyId).then(res => res.data),
    staleTime: 30_000,
  });

  // Extract only approved reports & their metrics from approved research
  const allApprovedReportsWithContext = useMemo<ReportWithContext[]>(() => {
    if (!researchList) return [];
    const items: ReportWithContext[] = [];

    researchList.forEach(research => {
      if (research.status !== 'APPROVED') return;

      const reports = research.reports || [];
      const metrics = research.metrics || [];

      reports.forEach(report => {
        if (report.reviewStatus === 'APPROVED') {
          const reportMetrics = metrics.filter(
            m =>
              m.source?.reportEntryId === report.id ||
              (!m.source?.reportEntryId && m.source?.documentId === report.documentId),
          );

          items.push({
            report,
            metrics: reportMetrics,
            projectId: research.projectId,
            taskId: research.taskId,
          });
        }
      });
    });

    return items;
  }, [researchList]);

  // Derive all unique years
  const availableYears = useMemo<number[]>(() => {
    const years = new Set<number>();
    allApprovedReportsWithContext.forEach(({ report }) => {
      const yr =
        report.reportingPeriod?.year ||
        report.reportingYear ||
        (report.publicationDate ? new Date(report.publicationDate).getFullYear() : null);
      if (yr && !Number.isNaN(yr)) years.add(yr);
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [allApprovedReportsWithContext]);

  // Sync selectedYear with latest available year
  useEffect(() => {
    if (availableYears.length > 0) {
      if (selectedYear === null || !availableYears.includes(selectedYear)) {
        setSelectedYear(availableYears[0]);
      }
    } else {
      setSelectedYear(null);
    }
  }, [availableYears, selectedYear]);

  // Available quarter tabs for currently selected year
  const availableQuarters = useMemo<string[]>(() => {
    const base = ['ALL', 'Q1', 'Q2', 'Q3', 'Q4', 'FY'];
    if (!selectedYear) return base;

    const reportsInYear = allApprovedReportsWithContext.filter(({ report }) => {
      const yr =
        report.reportingPeriod?.year ||
        report.reportingYear ||
        (report.publicationDate ? new Date(report.publicationDate).getFullYear() : null);
      return yr === selectedYear;
    });

    const hasH1 = reportsInYear.some(
      ({ report }) =>
        report.reportingPeriod?.period === 'H1' || report.reportingPeriod?.periodType === 'HALF_YEAR',
    );
    const hasH2 = reportsInYear.some(
      ({ report }) => report.reportingPeriod?.period === 'H2',
    );

    const tabs = ['ALL', 'Q1', 'Q2'];
    if (hasH1) tabs.push('H1');
    tabs.push('Q3', 'Q4');
    if (hasH2) tabs.push('H2');
    tabs.push('FY');
    return tabs;
  }, [allApprovedReportsWithContext, selectedYear]);

  // Filter reports by Year and Quarter
  const filteredReports = useMemo<ReportWithContext[]>(() => {
    if (!selectedYear) return [];

    return allApprovedReportsWithContext.filter(({ report }) => {
      const yr =
        report.reportingPeriod?.year ||
        report.reportingYear ||
        (report.publicationDate ? new Date(report.publicationDate).getFullYear() : null);
      if (yr !== selectedYear) return false;

      if (selectedQuarter === 'ALL') return true;

      const p = report.reportingPeriod?.period;
      const pType = report.reportingPeriod?.periodType;

      if (selectedQuarter === 'FY') {
        return pType === 'FULL_YEAR' || p === 'FY' || p === 'YEAR' || p === 'Full Year';
      }
      if (selectedQuarter === 'Q1') return p === 'Q1';
      if (selectedQuarter === 'Q2') return p === 'Q2';
      if (selectedQuarter === 'Q3') return p === 'Q3';
      if (selectedQuarter === 'Q4') return p === 'Q4';
      if (selectedQuarter === 'H1') return p === 'H1' || pType === 'HALF_YEAR';
      if (selectedQuarter === 'H2') return p === 'H2';

      return true;
    });
  }, [allApprovedReportsWithContext, selectedYear, selectedQuarter]);

  // Group filtered reports by period label
  const periodGroups = useMemo(() => {
    const map = new Map<string, ReportWithContext[]>();

    filteredReports.forEach(item => {
      const label = formatGroupPeriod(item.report);
      const list = map.get(label) || [];
      list.push(item);
      map.set(label, list);
    });

    // Sort groups descending by chronological period rank
    const sortedEntries = Array.from(map.entries()).sort(([labelA], [labelB]) => {
      return getPeriodRank(labelB) - getPeriodRank(labelA);
    });

    // Inside each group, sort reports by publicationDate DESC
    sortedEntries.forEach(([, list]) => {
      list.sort((a, b) => {
        const dateA = a.report.publicationDate ? new Date(a.report.publicationDate).getTime() : 0;
        const dateB = b.report.publicationDate ? new Date(b.report.publicationDate).getTime() : 0;
        return dateB - dateA;
      });
    });

    return sortedEntries;
  }, [filteredReports]);

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

  const [openingDocId, setOpeningDocId] = useState<string | null>(null);

  const handleViewPdf = async (projectId: number, documentId: string) => {
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
        `${API_BASE_URL}/projects/${projectId}/documents/${encodeURIComponent(documentId)}/download?download=false`,
        { headers },
      );

      if (!res.ok) {
        const fallbackRes = await fetch(
          `${API_BASE_URL}/documents/${encodeURIComponent(documentId)}/download?download=false`,
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
        `${API_BASE_URL}/projects/${projectId}/documents/${encodeURIComponent(documentId)}/download?download=false`,
        '_blank',
      );
    } finally {
      setOpeningDocId(null);
    }
  };

  // 1. Loading State
  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.headerSection}>
          <div className={styles.titleRow}>
            <h2 className={styles.title}>Financial Reports</h2>
          </div>
          <p className={styles.subtitle}>
            Approved financial reports and extracted financial information for this company.
          </p>
        </div>
        <div className={styles.stateContainer}>
          <div className={styles.stateIcon}>
            <Loader2 size={26} className={styles.spin} />
          </div>
          <h3 className={styles.stateTitle}>Loading financial reports...</h3>
          <p className={styles.stateSubtitle}>Retrieving official approved data for this company.</p>
        </div>
      </div>
    );
  }

  // 2. Error State
  if (isError) {
    return (
      <div className={styles.container}>
        <div className={styles.headerSection}>
          <div className={styles.titleRow}>
            <h2 className={styles.title}>Financial Reports</h2>
          </div>
          <p className={styles.subtitle}>
            Approved financial reports and extracted financial information for this company.
          </p>
        </div>
        <div className={styles.stateContainer}>
          <div className={styles.stateIcon}>
            <FileText size={26} />
          </div>
          <h3 className={styles.stateTitle}>Unable to load financial reports</h3>
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

  // 3. Global Empty State (No approved research yet)
  if (allApprovedReportsWithContext.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.headerSection}>
          <div className={styles.titleRow}>
            <h2 className={styles.title}>Financial Reports</h2>
          </div>
          <p className={styles.subtitle}>
            Approved financial reports and extracted financial information for this company.
          </p>
        </div>
        <div className={styles.stateContainer}>
          <div className={styles.stateIcon}>
            <FileSearch size={28} />
          </div>
          <h3 className={styles.stateTitle}>No Financial Data</h3>
          <p className={styles.stateSubtitle}>
            No approved financial research has been published for this company yet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.headerSection}>
        <h2 className={styles.title}>Financial Reports</h2>
        <p className={styles.subtitle}>
          Approved financial reports and extracted financial information for this company.
        </p>
      </div>

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

      {/* Filter Empty State (Data exists in other periods, but not selected) */}
      {filteredReports.length === 0 ? (
        <div className={styles.stateContainer}>
          <div className={styles.stateIcon}>
            <Search size={26} />
          </div>
          <h3 className={styles.stateTitle}>
            No reports found for {selectedQuarter !== 'ALL' ? `${selectedQuarter} ` : ''}
            {selectedYear}
          </h3>
          <p className={styles.stateSubtitle}>
            There are no approved financial reports matching the selected filter.
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
        /* Period Grouped Report List */
        <div className={styles.reportList}>
          {periodGroups.map(([groupLabel, groupItems]) => (
            <div key={groupLabel} className={styles.periodGroup}>
              <div className={styles.periodHeader}>
                <span className={styles.periodBadge}>{groupLabel}</span>
                <div className={styles.periodLine} />
              </div>

              {groupItems.map(({ report, metrics, projectId }) => {
                const isExpanded = expandedReportIds.has(report.id);
                const yearLabel =
                  report.reportingPeriod?.year ||
                  report.reportingYear ||
                  (report.publicationDate ? new Date(report.publicationDate).getFullYear() : '—');
                const periodLabel = report.reportingPeriod?.period || '—';
                const reportTypeFormatted = formatReportType(report.reportType);

                return (
                  <div
                    key={report.id}
                    className={`${styles.reportCard} ${isExpanded ? styles.reportCardExpanded : ''}`}
                  >
                    {/* Collapsed / Main Header Row */}
                    <div
                      className={styles.reportRow}
                      onClick={() => toggleExpand(report.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          toggleExpand(report.id);
                        }
                      }}
                    >
                      <div className={styles.reportRowLeft}>
                        <div className={styles.expandButton} aria-label={isExpanded ? 'Collapse' : 'Expand'}>
                          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </div>

                        <div className={styles.reportIcon}>
                          <FileText size={18} />
                        </div>

                        <div className={styles.reportMetaGroup}>
                          <span className={styles.metaDate}>
                            <Calendar size={13} />
                            {formatDate(report.publicationDate)}
                          </span>
                          <span className={styles.metaYearBadge}>{yearLabel}</span>
                          <span className={styles.metaPeriodBadge}>{periodLabel}</span>
                        </div>

                        <span className={styles.metaDot}>•</span>

                        <div className={styles.reportTitleGroup}>
                          <h5 className={styles.reportTitle}>{report.title}</h5>
                        </div>
                      </div>

                      <div className={styles.reportRowRight}>
                        <button
                          type="button"
                          className={styles.viewReportBtn}
                          disabled={openingDocId === report.documentId}
                          onClick={e => {
                            e.stopPropagation();
                            handleViewPdf(projectId, report.documentId);
                          }}
                        >
                          {openingDocId === report.documentId ? (
                            <Loader2 size={13} className={styles.spin} />
                          ) : (
                            <FileText size={13} />
                          )}
                          <span>{openingDocId === report.documentId ? 'Opening...' : 'View Report'}</span>
                          <ExternalLink size={11} />
                        </button>
                      </div>
                    </div>

                    {/* Expanded Section with Metrics Table */}
                    {isExpanded && (
                      <div className={styles.expandedSection}>
                        <div className={styles.expandedHead}>
                          <div className={styles.expandedHeadLeft}>
                            <h6 className={styles.expandedTitle}>Extracted Financial Information</h6>
                            <span className={styles.metricsCountBadge}>
                              {metrics.length} metric{metrics.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>

                        {metrics.length === 0 ? (
                          <div className={styles.noMetricsText}>
                            No financial metrics extracted for this report.
                          </div>
                        ) : (
                          <div className={styles.tableWrapper}>
                            <table className={styles.metricsTable}>
                              <thead>
                                <tr>
                                  <th style={{ width: '42%' }}>Metric</th>
                                  <th style={{ width: '28%', textAlign: 'right' }}>Value</th>
                                  <th style={{ width: '18%' }}>Period</th>
                                  <th style={{ width: '12%' }}>Source</th>
                                </tr>
                              </thead>
                              <tbody>
                                {metrics.map((metric, idx) => {
                                  const parts = metricValueParts(metric);
                                  const hasPage = Boolean(metric.source?.page);
                                  const isImportant = isImportantMetric(metric.label);

                                  return (
                                    <tr key={metric.id || idx}>
                                      <td className={`${styles.metricName} ${isImportant ? styles.metricNameImportant : ''}`}>
                                        {metric.label}
                                      </td>
                                      <td className={styles.metricValueCell}>
                                        <span>{parts.value}</span>
                                        {parts.unit && (
                                          <span className={styles.metricUnit}>{parts.unit}</span>
                                        )}
                                      </td>
                                      <td className={styles.periodCell}>
                                        <span className={styles.periodPill}>
                                          {formatMetricPeriod(metric, report)}
                                        </span>
                                      </td>
                                      <td>
                                        {hasPage ? (
                                          <button
                                            type="button"
                                            className={styles.sourceLink}
                                            onClick={e => {
                                              e.stopPropagation();
                                              handleViewPdf(
                                                projectId,
                                                metric.source?.documentId || report.documentId,
                                              );
                                            }}
                                            title="Open source document"
                                          >
                                            <FileText size={11} />
                                            <span>Page {metric.source?.page}</span>
                                          </button>
                                        ) : (
                                          <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                                            {metric.source?.documentName || 'Doc'}
                                          </span>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
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
};

export default FinancialsTab;
