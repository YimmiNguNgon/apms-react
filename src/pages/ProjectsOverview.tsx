/* eslint-disable @typescript-eslint/no-explicit-any */
// Enterprise Portfolio Management â€” IBM Carbon C-Suite Redesign
// Multi-view portfolio management: Cards, Timeline, Kanban, and Enterprise Table with 8-tab Drawer.

import React, { useEffect, useState, useMemo } from 'react';
import { projectApi } from '../API/projectApi';
import { externalDataApi } from '../API/externalDataApi';
import type { ProjectResponse, ProjectStatus, ProjectType } from '../types/domain';
import {
  PageHeader,
  MetricCard,
  FilterBar,
  DataTable,
  EmptyState,
  StatusBadge,
  RiskBadge,
  PrimaryButton,
  SecondaryButton,
  Drawer,
  Tabs,
} from '../components/ui';
import type { ColumnDef } from '../components/ui/DataTable';
import type { FilterConfig } from '../components/ui/FilterBar';

// â”€â”€â”€ Enriched Portfolio Project Model â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export type PortfolioProjectStatus =
  | 'PLANNING' | 'IN_PROGRESS' | 'IN_REVIEW' | 'COMPLETED' | 'ON_HOLD'
  | ProjectStatus;

const kanbanColumn = (status: PortfolioProjectStatus): 'PLANNING' | 'IN_PROGRESS' | 'IN_REVIEW' | 'COMPLETED' | 'ON_HOLD' => {
  switch (status) {
    case 'DRAFT': return 'PLANNING';
    case 'ACTIVE': return 'IN_PROGRESS';
    case 'ARCHIVED': return 'COMPLETED';
    case 'CANCELLED': return 'ON_HOLD';
    default: return status;
  }
};

export interface PortfolioProject {
  id: string;
  name: string;
  code: string;
  company: string;
  manager: string;
  status: PortfolioProjectStatus;
  progress: number;
  budget: string;
  budgetValue: number;
  riskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  endDate: string;
  startDate: string;
  overview: string;
  milestones: Array<{ name: string; date: string; status: 'COMPLETED' | 'IN_PROGRESS' | 'PENDING' }>;
  members: Array<{ name: string; role: string; email: string }>;
  documents: Array<{ name: string; size: string; date: string; url?: string }>;
  competitors: Array<{ name: string; threatLevel: string; notes: string }>;
  partners: Array<{ name: string; role: string; healthScore: number }>;
  risks: Array<{ factor: string; impact: string; mitigation: string }>;
  aiRecommendation: string;
}

// â”€â”€â”€ Seed Data (Fallback & Enterprise Demonstration) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const DRAWER_TABS = [
  { id: 'overview',     label: 'Overview' },
  { id: 'timeline',     label: 'Timeline' },
  { id: 'members',      label: 'Members' },
  { id: 'documents',    label: 'Documents' },
  { id: 'competitors',  label: 'Competitors' },
  { id: 'partners',     label: 'Partners' },
  { id: 'risks',        label: 'Risks' },
  { id: 'ai-recommend', label: 'AI Recommendation' },
];

const VIEW_TABS = [
  { id: 'table',    label: 'Table View' },
  { id: 'cards',    label: 'Project Cards' },
  { id: 'timeline', label: 'Gantt Timeline' },
  { id: 'kanban',   label: 'Kanban Board' },
];

export const ProjectsOverview: React.FC = () => {
  // â”€â”€ State â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [projects, setProjects] = useState<PortfolioProject[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeView, setActiveView] = useState('table');
  const [reloadKey, setReloadKey] = useState(0);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [riskFilter, setRiskFilter] = useState('All');

  // Drawer
  const [selectedProject, setSelectedProject] = useState<PortfolioProject | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState('overview');

  // AI Risk Scan operation state
  const [runningRiskScan, setRunningRiskScan] = useState(false);
  const [riskScanMessage, setRiskScanMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  // Create project modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState<{
    projectName: string;
    projectType: ProjectType;
    targetCompanyName: string;
    description: string;
  }>({ projectName: '', projectType: 'RESEARCH_NEW_COMPANY', targetCompanyName: '', description: '' });

  // Load real API projects on mount
  useEffect(() => {
    const fetchApiProjects = async () => {
      setLoading(true);
      try {
        const res = await projectApi.getAllProjects();
        if (res?.data?.content && Array.isArray(res.data.content)) {
          const mapped: PortfolioProject[] = res.data.content.map((p: ProjectResponse, idx: number) => ({
            id: String(p.id || `api-${idx}`),
            name: p.projectName || 'Not available',
            code: `PRJ-${p.id}`,
            company: p.targetCompanyName || 'Not available',
            manager: p.createdBy ? `User #${p.createdBy}` : 'Not available',
            status: p.status || 'DRAFT',
            progress: p.status === 'COMPLETED' ? 100 : p.status === 'ACTIVE' ? 50 : 10,
            budget: 'Not available',
            budgetValue: 0,
            riskLevel: p.status === 'CANCELLED' ? 'CRITICAL' : 'LOW',
            endDate: p.updatedAt ? new Date(p.updatedAt).toLocaleDateString() : 'Not available',
            startDate: p.createdAt ? new Date(p.createdAt).toLocaleDateString() : 'Not available',
            overview: p.description || 'Not available â€” No project description returned from backend.',
            milestones: [],
            members: Array.isArray(p.members)
              ? p.members.map((m) => ({
                  name: m.fullName || m.email || `Member #${m.accountId}`,
                  role: m.memberRole || 'STAFF',
                  email: m.email || 'Not available',
                }))
              : [],
            documents: [],
            competitors: [],
            partners: [],
            risks: [],
            aiRecommendation: 'Not available â€” No AI risk recommendation returned from backend API.',
          }));
          setProjects(mapped);
        } else {
          setProjects([]);
        }
      } catch {
        setProjects([]);
      } finally {
        setLoading(false);
      }
    };
    void fetchApiProjects();
  }, [reloadKey]);

  // Filtered Projects
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      const matchSearch =
        !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.company.toLowerCase().includes(search.toLowerCase()) ||
        p.manager.toLowerCase().includes(search.toLowerCase());

      const matchStatus = statusFilter === 'All' || p.status === statusFilter;
      const matchRisk = riskFilter === 'All' || p.riskLevel === riskFilter;

      return matchSearch && matchStatus && matchRisk;
    });
  }, [projects, search, statusFilter, riskFilter]);

  // Key Metrics
  const totalProjectsCount = projects.length;
  const totalBudgetValue = projects.reduce((acc, p) => acc + p.budgetValue, 0);
  const formattedTotalBudget = `$${(totalBudgetValue / 1000000).toFixed(1)}M`;
  const avgCompletionRate = Math.round(projects.reduce((acc, p) => acc + p.progress, 0) / (projects.length || 1));
  const highRiskCount = projects.filter((p) => p.riskLevel === 'CRITICAL' || p.riskLevel === 'HIGH').length;
  const upcomingMilestonesCount = projects.reduce((acc, p) => acc + p.milestones.length, 0);

  // Open Drawer
  const openDrawer = (proj: PortfolioProject) => {
    setSelectedProject(proj);
    setDrawerTab('overview');
    setDrawerOpen(true);
  };

  // â”€â”€ Export / AI Scan handlers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const exportSelectedProjectCsv = () => {
    if (!selectedProject) return;
    const header = ['Field', 'Value'];
    const rows = [
      ['Project', selectedProject.name],
      ['Code', selectedProject.code],
      ['Company', selectedProject.company],
      ['Manager', selectedProject.manager],
      ['Status', selectedProject.status],
      ['Progress', `${selectedProject.progress}%`],
      ['Budget', selectedProject.budget],
      ['Risk Level', selectedProject.riskLevel],
      ['Start Date', selectedProject.startDate],
      ['End Date', selectedProject.endDate],
      ['Overview', selectedProject.overview],
      ['AI Recommendation', selectedProject.aiRecommendation],
    ];
    const csv = [header, ...rows].map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `project-${(selectedProject.name || 'portfolio').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleRunAiRiskScan = async () => {
    if (runningRiskScan) return;
    setRunningRiskScan(true);
    setRiskScanMessage(null);
    try {
      const message = await externalDataApi.runAnalyze();
      setRiskScanMessage({ tone: 'success', text: message });
    } catch (err) {
      setRiskScanMessage({
        tone: 'error',
        text: err instanceof Error ? err.message : 'AI risk scan failed. Check backend connectivity.',
      });
    } finally {
      setRunningRiskScan(false);
    }
  };

  const exportPortfolioCsv = () => {
    const header = ['Project', 'Code', 'Company', 'Manager', 'Status', 'Progress', 'Budget', 'Risk Level', 'Start', 'End'];
    const rows = filteredProjects.map((p) => [
      p.name,
      p.code,
      p.company,
      p.manager,
      p.status,
      `${p.progress}%`,
      p.budget,
      p.riskLevel,
      p.startDate,
      p.endDate,
    ]);
    const csv = [header, ...rows].map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'portfolio-management-report.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCreateProject = async () => {
    if (creating) return;
    if (!createForm.projectName.trim() || !createForm.targetCompanyName.trim()) {
      setCreateError('Project name and target company are required.');
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      await projectApi.createProject({
        projectName: createForm.projectName.trim(),
        projectType: createForm.projectType,
        targetCompanyName: createForm.targetCompanyName.trim(),
        description: createForm.description.trim() || null,
      });
      setShowCreateModal(false);
      setCreateForm({ projectName: '', projectType: 'RESEARCH_NEW_COMPANY', targetCompanyName: '', description: '' });
      setReloadKey((k) => k + 1);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create project.');
    } finally {
      setCreating(false);
    }
  };

  // â”€â”€ Table Column Definitions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const columns: ColumnDef<PortfolioProject>[] = [
    {
      key: 'name',
      header: 'Project',
      width: '220px',
      render: (_, row) => (
        <div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--cds-text-primary)' }}>{row.name}</div>
          <div style={{ fontSize: '11px', color: 'var(--cds-text-helper)' }}>{row.code}</div>
        </div>
      ),
    },
    {
      key: 'company',
      header: 'Company',
      width: '160px',
      sortable: true,
      render: (_, row) => (
        <span style={{ fontSize: '12px', color: 'var(--cds-text-secondary)', fontWeight: 500 }}>
          {row.company}
        </span>
      ),
    },
    {
      key: 'manager',
      header: 'Manager',
      width: '130px',
      render: (_, row) => <span style={{ fontSize: '12px', color: 'var(--cds-text-primary)' }}>{row.manager}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      width: '120px',
      sortable: true,
      render: (_, row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'progress',
      header: 'Progress',
      width: '130px',
      sortable: true,
      render: (_, row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ flex: 1, height: '4px', background: 'var(--cds-border-subtle-00)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ width: `${row.progress}%`, height: '100%', background: row.progress >= 80 ? 'var(--cds-support-success)' : 'var(--cds-interactive)', borderRadius: '2px' }} />
          </div>
          <span style={{ fontSize: '11px', fontWeight: 700, minWidth: '28px', textAlign: 'right' }}>{row.progress}%</span>
        </div>
      ),
    },
    {
      key: 'budget',
      header: 'Budget',
      width: '110px',
      sortable: true,
      align: 'right',
      render: (_, row) => <strong style={{ fontSize: '13px', color: 'var(--cds-text-primary)' }}>{row.budget}</strong>,
    },
    {
      key: 'riskLevel',
      header: 'Risk',
      width: '100px',
      sortable: true,
      render: (_, row) => <RiskBadge level={row.riskLevel} />,
    },
    {
      key: 'endDate',
      header: 'End Date',
      width: '110px',
      render: (_, row) => <span style={{ fontSize: '12px', color: 'var(--cds-text-helper)' }}>{row.endDate}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      width: '100px',
      align: 'right',
      render: (_, row) => (
        <SecondaryButton size="sm" onClick={() => openDrawer(row)}>
          Details
        </SecondaryButton>
      ),
    },
  ];

  // â”€â”€ Filter Bar Configuration â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const filters: FilterConfig[] = [
    {
      id: 'status',
      type: 'select',
      label: 'Status',
      value: statusFilter,
      onChange: (v) => setStatusFilter(v as string),
      options: [
        { value: 'All', label: 'All Statuses' },
        { value: 'PLANNING', label: 'Planning' },
        { value: 'IN_PROGRESS', label: 'In Progress' },
        { value: 'IN_REVIEW', label: 'In Review' },
        { value: 'COMPLETED', label: 'Completed' },
        { value: 'ON_HOLD', label: 'On Hold' },
        { value: 'DRAFT', label: 'Draft' },
        { value: 'ACTIVE', label: 'Active' },
        { value: 'CANCELLED', label: 'Cancelled' },
        { value: 'ARCHIVED', label: 'Archived' },
      ],
    },
    {
      id: 'risk',
      type: 'select',
      label: 'Risk Level',
      value: riskFilter,
      onChange: (v) => setRiskFilter(v as string),
      options: [
        { value: 'All', label: 'All Risks' },
        { value: 'CRITICAL', label: 'Critical' },
        { value: 'HIGH', label: 'High' },
        { value: 'MEDIUM', label: 'Medium' },
        { value: 'LOW', label: 'Low' },
      ],
    },
  ];

  // â”€â”€ Render Drawer Tabs Content â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const renderDrawerTab = () => {
    if (!selectedProject) return null;

    switch (drawerTab) {
      case 'overview':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ background: 'var(--cds-layer-01)', borderLeft: '3px solid var(--cds-interactive)', padding: '14px', borderRadius: '0 6px 6px 0', fontSize: '13px', lineHeight: '22px', color: 'var(--cds-text-primary)' }}>
              <strong>Project Overview:</strong> {selectedProject.overview}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              <MetricCard label="Budget Allocation" value={selectedProject.budget} />
              <MetricCard label="Progress" value={`${selectedProject.progress}%`} />
              <MetricCard label="Risk Profile" value={selectedProject.riskLevel} valueColor={selectedProject.riskLevel === 'CRITICAL' || selectedProject.riskLevel === 'HIGH' ? 'var(--cds-support-error)' : undefined} />
            </div>

            <div style={{ background: 'var(--cds-layer-01)', padding: '12px', borderRadius: 'var(--cds-border-radius)', border: '1px solid var(--cds-border-subtle-00)' }}>
              <h4 style={{ margin: '0 0 8px', fontSize: '13px', color: 'var(--cds-text-primary)' }}>Project Details</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
                <div><span style={{ color: 'var(--cds-text-secondary)' }}>Associated Entity:</span> <strong>{selectedProject.company}</strong></div>
                <div><span style={{ color: 'var(--cds-text-secondary)' }}>Project Manager:</span> <strong>{selectedProject.manager}</strong></div>
                <div><span style={{ color: 'var(--cds-text-secondary)' }}>Start Date:</span> <strong>{selectedProject.startDate}</strong></div>
                <div><span style={{ color: 'var(--cds-text-secondary)' }}>Target Completion:</span> <strong>{selectedProject.endDate}</strong></div>
              </div>
            </div>
          </div>
        );

      case 'timeline':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {selectedProject.milestones.map((m, i) => (
              <div key={i} style={{ padding: '12px', background: 'var(--cds-layer-01)', borderRadius: 'var(--cds-border-radius)', border: '1px solid var(--cds-border-subtle-00)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ fontSize: '13px', color: 'var(--cds-text-primary)' }}>{m.name}</strong>
                  <div style={{ fontSize: '11px', color: 'var(--cds-text-helper)', marginTop: '2px' }}>Target Date: {m.date}</div>
                </div>
                <StatusBadge status={m.status} />
              </div>
            ))}
          </div>
        );

      case 'members':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {selectedProject.members.map((mem, i) => (
              <div key={i} style={{ padding: '12px', background: 'var(--cds-layer-01)', borderRadius: 'var(--cds-border-radius)', border: '1px solid var(--cds-border-subtle-00)' }}>
                <strong style={{ fontSize: '13px', color: 'var(--cds-text-primary)' }}>{mem.name}</strong>
                <div style={{ fontSize: '12px', color: 'var(--cds-text-secondary)', marginTop: '2px' }}>{mem.role} â€¢ <a href={`mailto:${mem.email}`} style={{ color: 'var(--cds-link-primary)' }}>{mem.email}</a></div>
              </div>
            ))}
          </div>
        );

      case 'documents':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {selectedProject.documents.map((doc, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: 'var(--cds-layer-01)', border: '1px solid var(--cds-border-subtle-00)', borderRadius: 'var(--cds-border-radius)' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--cds-text-primary)' }}>{doc.name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--cds-text-helper)' }}>{doc.size} â€¢ {doc.date}</div>
                </div>
                {doc.url ? (
                  <SecondaryButton size="sm" ghost onClick={() => window.open(doc.url, '_blank', 'noopener,noreferrer')}>Download</SecondaryButton>
                ) : (
                  <SecondaryButton size="sm" ghost disabled>Download</SecondaryButton>
                )}
              </div>
            ))}
          </div>
        );

      case 'competitors':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {selectedProject.competitors.length > 0 ? (
              selectedProject.competitors.map((comp, i) => (
                <div key={i} style={{ padding: '12px', background: 'var(--cds-layer-01)', borderRadius: 'var(--cds-border-radius)', border: '1px solid var(--cds-border-subtle-00)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <strong style={{ fontSize: '13px', color: 'var(--cds-text-primary)' }}>{comp.name}</strong>
                    <RiskBadge level={comp.threatLevel as any} />
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--cds-text-secondary)' }}>{comp.notes}</div>
                </div>
              ))
            ) : (
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--cds-text-helper)' }}>No competitor threat signals identified for this project domain.</p>
            )}
          </div>
        );

      case 'partners':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {selectedProject.partners.length > 0 ? (
              selectedProject.partners.map((p, i) => (
                <div key={i} style={{ padding: '12px', background: 'var(--cds-layer-01)', borderRadius: 'var(--cds-border-radius)', border: '1px solid var(--cds-border-subtle-00)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong style={{ fontSize: '13px', color: 'var(--cds-text-primary)' }}>{p.name}</strong>
                    <div style={{ fontSize: '11px', color: 'var(--cds-text-secondary)', marginTop: '2px' }}>Role: {p.role}</div>
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--cds-support-success)' }}>{p.healthScore}/100 Health</span>
                </div>
              ))
            ) : (
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--cds-text-helper)' }}>No partner sub-contractors attached to this project.</p>
            )}
          </div>
        );

      case 'risks':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {selectedProject.risks.length > 0 ? (
              selectedProject.risks.map((r, i) => (
                <div key={i} style={{ padding: '12px', background: 'var(--cds-layer-01)', borderRadius: 'var(--cds-border-radius)', border: '1px solid var(--cds-border-subtle-00)' }}>
                  <strong style={{ fontSize: '13px', color: 'var(--cds-support-error)', display: 'block', marginBottom: '4px' }}>{r.factor}</strong>
                  <div style={{ fontSize: '12px', color: 'var(--cds-text-primary)', marginBottom: '4px' }}><strong>Impact:</strong> {r.impact}</div>
                  <div style={{ fontSize: '11px', color: 'var(--cds-interactive)' }}><strong>Mitigation:</strong> {r.mitigation}</div>
                </div>
              ))
            ) : (
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--cds-text-helper)' }}>No high risk factors identified.</p>
            )}
          </div>
        );

      case 'ai-recommend':
        return (
          <div style={{ background: 'var(--cds-layer-01)', borderLeft: '3px solid var(--cds-interactive)', padding: '14px', borderRadius: '0 6px 6px 0' }}>
            <h4 style={{ margin: '0 0 6px', fontSize: '13px', color: 'var(--cds-text-primary)' }}>AI Prescriptive Action Recommendation</h4>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--cds-text-secondary)', lineHeight: '22px' }}>
              {selectedProject.aiRecommendation}
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  // â”€â”€ Main Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  return (
    <div className="cds-page-shell" id="page-projects-overview">
      {/* 1. Page Header */}
      <PageHeader
        title="Enterprise Portfolio Management"
        eyebrow="Business Ecosystem Intelligence â€¢ C-Suite Suite"
        description="Monitor multi-project investments, track milestone deliverables, and evaluate portfolio risk exposure."
        breadcrumb={[{ label: 'Dashboard' }, { label: 'Portfolio Management' }]}
        actions={
          <>
            <SecondaryButton size="md" onClick={exportPortfolioCsv}>
              Export Report
            </SecondaryButton>
            <PrimaryButton size="md" onClick={() => { setCreateError(null); setShowCreateModal(true); }}>
              + New Project
            </PrimaryButton>
          </>
        }
      />

      {/* 2. Top KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '8px', marginBottom: '16px' }}>
        <MetricCard label="Projects" value={totalProjectsCount} description="Active initiatives" />
        <MetricCard label="Budget" value={formattedTotalBudget} description="Total portfolio capital" />
        <MetricCard label="Completion" value={`${avgCompletionRate}%`} description="Average progress" valueColor="var(--cds-support-success)" />
        <MetricCard label="High Risk" value={highRiskCount} description="Require C-Suite review" valueColor={highRiskCount > 0 ? 'var(--cds-support-error)' : undefined} />
        <MetricCard label="Upcoming Milestones" value={upcomingMilestonesCount} description="Due next 30 days" />
      </div>

      {/* 3. View Switcher & Filter Bar */}
      <div style={{ background: 'var(--cds-background)', border: '1px solid var(--cds-border-color)', borderRadius: 'var(--cds-border-radius)', padding: '12px 16px 0 16px', marginBottom: '12px' }}>
        <Tabs items={VIEW_TABS} activeId={activeView} onChange={setActiveView} />
      </div>

      <FilterBar
        searchValue={search}
        searchPlaceholder="Search project name, company, or manager..."
        onSearchChange={setSearch}
        filters={filters}
      />

      {/* 4. Active View Rendering */}
      
      {/* TABLE VIEW */}
      {activeView === 'table' && (
        <div style={{ background: 'var(--cds-background)', border: '1px solid var(--cds-border-color)', borderRadius: 'var(--cds-border-radius)', padding: '12px 16px' }}>
          <DataTable<PortfolioProject>
            columns={columns}
            data={filteredProjects}
            rowKey={(row) => row.id}
            onRowClick={openDrawer}
            pageSize={10}
            exportFilename="portfolio-management"
            loading={loading}
            emptyState={
              <EmptyState
                title="No projects match your filter criteria"
                body="Try adjusting your status or risk level filters."
                action={
                  <PrimaryButton size="sm" onClick={() => { setSearch(''); setStatusFilter('All'); setRiskFilter('All'); }}>
                    Reset Filters
                  </PrimaryButton>
                }
              />
            }
          />
        </div>
      )}

      {/* CARDS VIEW */}
      {activeView === 'cards' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px', marginBottom: '16px' }}>
          {filteredProjects.map((proj) => (
            <div
              key={proj.id}
              onClick={() => openDrawer(proj)}
              style={{
                background: 'var(--cds-background)',
                border: '1px solid var(--cds-border-color)',
                borderRadius: 'var(--cds-border-radius)',
                padding: '16px',
                cursor: 'pointer',
                transition: 'box-shadow 0.2s',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--cds-text-primary)' }}>{proj.name}</h3>
                  <span style={{ fontSize: '11px', color: 'var(--cds-text-helper)' }}>{proj.company}</span>
                </div>
                <RiskBadge level={proj.riskLevel} />
              </div>

              <div style={{ margin: '12px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                  <span style={{ color: 'var(--cds-text-secondary)' }}>Completion Progress</span>
                  <strong style={{ color: 'var(--cds-text-primary)' }}>{proj.progress}%</strong>
                </div>
                <div style={{ height: '6px', background: 'var(--cds-border-subtle-00)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${proj.progress}%`, height: '100%', background: proj.progress >= 80 ? 'var(--cds-support-success)' : 'var(--cds-interactive)', borderRadius: '3px' }} />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', borderTop: '1px solid var(--cds-border-subtle-00)', paddingTop: '10px' }}>
                <span>Manager: <strong>{proj.manager}</strong></span>
                <strong style={{ color: 'var(--cds-text-primary)' }}>{proj.budget}</strong>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* GANTT TIMELINE VIEW */}
      {activeView === 'timeline' && (
        <div style={{ background: 'var(--cds-background)', border: '1px solid var(--cds-border-color)', borderRadius: 'var(--cds-border-radius)', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--cds-text-primary)' }}>Portfolio Deliverables Roadmap</h3>
          {filteredProjects.map((proj) => (
            <div key={proj.id} onClick={() => openDrawer(proj)} style={{ padding: '12px', background: 'var(--cds-layer-01)', borderRadius: 'var(--cds-border-radius)', border: '1px solid var(--cds-border-subtle-00)', cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
                <strong style={{ color: 'var(--cds-text-primary)' }}>{proj.name} ({proj.company})</strong>
                <span style={{ fontSize: '11px', color: 'var(--cds-text-helper)' }}>{proj.startDate} â” {proj.endDate}</span>
              </div>
              <div style={{ height: '8px', background: 'var(--cds-border-subtle-00)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${proj.progress}%`, height: '100%', background: 'var(--cds-interactive)', borderRadius: '4px' }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* KANBAN BOARD VIEW */}
      {activeView === 'kanban' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', marginBottom: '16px' }}>
          {(['PLANNING', 'IN_PROGRESS', 'IN_REVIEW', 'COMPLETED', 'ON_HOLD'] as const).map((st) => {
            const colProjects = filteredProjects.filter((p) => kanbanColumn(p.status) === st);
            return (
              <div key={st} style={{ background: 'var(--cds-layer-01)', border: '1px solid var(--cds-border-subtle-00)', borderRadius: 'var(--cds-border-radius)', padding: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--cds-text-primary)' }}>{st}</span>
                  <span style={{ fontSize: '11px', fontWeight: 600, background: 'var(--cds-background)', padding: '1px 6px', borderRadius: '4px' }}>{colProjects.length}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {colProjects.map((proj) => (
                    <div key={proj.id} onClick={() => openDrawer(proj)} style={{ background: 'var(--cds-background)', border: '1px solid var(--cds-border-color)', borderRadius: 'var(--cds-border-radius)', padding: '10px', cursor: 'pointer' }}>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--cds-text-primary)', marginBottom: '4px' }}>{proj.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--cds-text-helper)' }}>{proj.company}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '11px' }}>
                        <span>Progress: {proj.progress}%</span>
                        <strong>{proj.budget}</strong>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. Right-side Drawer (8 Tabs, Zero Popups) */}
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={selectedProject?.name ?? ''}
        subtitle={selectedProject ? `${selectedProject.code} â€¢ ${selectedProject.company}` : ''}
        width={740}
        footerActions={
          <>
            <SecondaryButton size="sm" onClick={exportSelectedProjectCsv}>
              Export CSV
            </SecondaryButton>
            <PrimaryButton size="sm" loading={runningRiskScan} disabled={runningRiskScan} onClick={() => void handleRunAiRiskScan()}>
              {runningRiskScan ? 'Scanning...' : 'Run AI Risk Scan'}
            </PrimaryButton>
          </>
        }
      >
        {selectedProject && (
          <>
            {riskScanMessage && (
              <div
                style={{
                  background: riskScanMessage.tone === 'success' ? 'var(--cds-support-success-bg)' : 'var(--cds-support-error-bg)',
                  border: `1px solid ${riskScanMessage.tone === 'success' ? 'var(--cds-support-success)' : 'var(--cds-support-error)'}`,
                  color: riskScanMessage.tone === 'success' ? 'var(--cds-support-success)' : 'var(--cds-support-error)',
                  padding: '8px 12px',
                  borderRadius: 'var(--cds-border-radius)',
                  marginBottom: '12px',
                  fontSize: '12px',
                  fontWeight: 600,
                }}
              >
                {riskScanMessage.text}
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', paddingBottom: '12px', borderBottom: '1px solid var(--cds-border-subtle-00)' }}>
              <StatusBadge status={selectedProject.status} />
              <RiskBadge level={selectedProject.riskLevel} showDot />
              <span style={{ fontSize: '12px', color: 'var(--cds-text-secondary)' }}>Budget:</span>
              <strong style={{ fontSize: '13px', color: 'var(--cds-text-primary)' }}>{selectedProject.budget}</strong>
              <span style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--cds-text-helper)' }}>Due: {selectedProject.endDate}</span>
            </div>

            <Tabs items={DRAWER_TABS} activeId={drawerTab} onChange={setDrawerTab} />

            <div style={{ marginTop: '16px' }}>
              {renderDrawerTab()}
            </div>
          </>
        )}
      </Drawer>

      {/* Create Project Modal */}
      {showCreateModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px',
          }}
          onClick={() => { if (!creating) setShowCreateModal(false); }}
        >
          <div
            style={{
              background: 'var(--cds-background)',
              border: '1px solid var(--cds-border-color)',
              borderRadius: 'var(--cds-border-radius)',
              width: '100%',
              maxWidth: '480px',
              padding: '20px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: 700, color: 'var(--cds-text-primary)' }}>
              Create New Enterprise Project
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: '12px', color: 'var(--cds-text-helper)' }}>
              A new initiative will be registered against the backend portfolio API.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--cds-text-secondary)', marginBottom: '4px' }}>Project Name *</label>
                <input
                  type="text"
                  value={createForm.projectName}
                  onChange={(e) => setCreateForm({ ...createForm, projectName: e.target.value })}
                  placeholder="e.g. Cloud Integration Module v2"
                  style={{ width: '100%', padding: '8px 10px', fontSize: '13px', borderRadius: 'var(--cds-border-radius)', border: '1px solid var(--cds-border-color)', background: 'var(--cds-layer-01)', color: 'var(--cds-text-primary)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--cds-text-secondary)', marginBottom: '4px' }}>Project Type *</label>
                <select
                  value={createForm.projectType}
                  onChange={(e) => setCreateForm({ ...createForm, projectType: e.target.value as ProjectType })}
                  style={{ width: '100%', padding: '8px 10px', fontSize: '13px', borderRadius: 'var(--cds-border-radius)', border: '1px solid var(--cds-border-color)', background: 'var(--cds-layer-01)', color: 'var(--cds-text-primary)' }}
                >
                  <option value="RESEARCH_NEW_COMPANY">Research New Company</option>
                  <option value="UPDATE_EXISTING_COMPANY">Update Existing Company</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--cds-text-secondary)', marginBottom: '4px' }}>Target Company Name *</label>
                <input
                  type="text"
                  value={createForm.targetCompanyName}
                  onChange={(e) => setCreateForm({ ...createForm, targetCompanyName: e.target.value })}
                  placeholder="e.g. Alpha Tech Corp"
                  style={{ width: '100%', padding: '8px 10px', fontSize: '13px', borderRadius: 'var(--cds-border-radius)', border: '1px solid var(--cds-border-color)', background: 'var(--cds-layer-01)', color: 'var(--cds-text-primary)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--cds-text-secondary)', marginBottom: '4px' }}>Description</label>
                <textarea
                  rows={3}
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', fontSize: '13px', borderRadius: 'var(--cds-border-radius)', border: '1px solid var(--cds-border-color)', background: 'var(--cds-layer-01)', color: 'var(--cds-text-primary)' }}
                />
              </div>

              {createError && (
                <div style={{ background: 'var(--cds-support-error-bg)', border: '1px solid var(--cds-support-error)', color: 'var(--cds-support-error)', padding: '8px 12px', borderRadius: 'var(--cds-border-radius)', fontSize: '12px', fontWeight: 600 }}>
                  {createError}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
                <SecondaryButton size="sm" disabled={creating} onClick={() => setShowCreateModal(false)}>Cancel</SecondaryButton>
                <PrimaryButton size="sm" loading={creating} disabled={creating} onClick={() => void handleCreateProject()}>
                  {creating ? 'Creating...' : 'Create Project'}
                </PrimaryButton>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
