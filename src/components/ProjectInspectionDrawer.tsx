import React, { useEffect, useState } from 'react';
import { ArrowLeft, FolderKanban, Users, Building2, Tag, Hash, FileText } from 'lucide-react';
import type { CandidateResponse, CompanyProfileIdentity, ProjectMemberResponse, ProjectResponse } from '../types/domain';

interface ProjectInspectionDrawerProps {
  projectId: number | null;
  projectDetail: ProjectResponse | null;
  members: ProjectMemberResponse[];
  candidates: CandidateResponse[];
  loading: boolean;
  onClose: () => void;
}

const formatCompanyName = (name?: string | null): string => {
  if (name && name.trim() && !/^[0-9a-fA-F]{24}$/.test(name.trim())) {
    return name.trim();
  }
  return 'Chưa xác định';
};

const formatProjectType = (type?: string): string => {
  if (type === 'RESEARCH_MULTIPLE_COMPANIES') return 'Nghiên cứu đa công ty';
  if (type === 'RESEARCH_NEW_COMPANY') return 'Nghiên cứu công ty mới';
  if (type === 'UPDATE_EXISTING_COMPANY') return 'Cập nhật thông tin công ty';
  return type || 'Nghiên cứu chung';
};

export const ProjectInspectionDrawer: React.FC<ProjectInspectionDrawerProps> = ({
  projectId,
  projectDetail,
  members,
  candidates,
  loading,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'candidates'>('overview');

  // ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!projectId) return null;

  const projectName = projectDetail?.projectName || `Dự án #${projectId}`;
  const projectType = projectDetail?.projectType;
  const projectStatus = projectDetail?.status || 'ACTIVE';

  return (
    <div
      style={{
        background: '#F8FAFC',
        minHeight: '100vh',
        width: '100%',
        padding: '24px 36px 48px',
        color: '#0F172A',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
      id="page-project-inspection-full"
    >
      {/* Top Navigation & Breadcrumbs */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ fontSize: '12px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>APMS</span>
            <span>/</span>
            <span>Projects Overview</span>
            <span>/</span>
            <strong style={{ color: '#1E293B' }}>{projectName}</strong>
          </div>
          <button
            onClick={onClose}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'transparent',
              border: 'none',
              color: '#2563EB',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              padding: 0,
              marginTop: '4px',
            }}
            id="btn-back-to-projects"
          >
            <ArrowLeft size={16} /> ← Quay lại Danh sách Dự án
          </button>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <span
            style={{
              background: '#EFF6FF',
              border: '1px solid #BFDBFE',
              color: '#1D4ED8',
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: '600',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            👑 READ-ONLY OWNER INSPECTION
          </span>
        </div>
      </div>

      {/* Main Header Hero Card */}
      <div
        style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '16px',
          padding: '28px 32px',
          marginBottom: '28px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
          display: 'flex',
          alignItems: 'center',
          gap: '24px',
          flexWrap: 'wrap',
        }}
      >
        <div
          style={{
            width: '68px',
            height: '68px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            boxShadow: '0 4px 14px rgba(37, 99, 235, 0.25)',
            flexShrink: 0,
          }}
        >
          <FolderKanban size={32} />
        </div>

        <div style={{ flex: 1, minWidth: '280px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '8px' }}>
            <h1 style={{ margin: 0, fontSize: '26px', fontWeight: '800', color: '#0F172A', letterSpacing: '-0.5px' }}>
              {projectName}
            </h1>
            <span
              style={{
                background: projectStatus === 'ACTIVE' ? '#DCFCE7' : '#FEF3C7',
                border: `1px solid ${projectStatus === 'ACTIVE' ? '#86EFAC' : '#FDE68A'}`,
                color: projectStatus === 'ACTIVE' ? '#15803D' : '#92400E',
                fontSize: '12px',
                fontWeight: '700',
                padding: '4px 12px',
                borderRadius: '20px',
                textTransform: 'uppercase',
              }}
            >
              {projectStatus}
            </span>
            <span
              style={{
                background: '#EFF6FF',
                border: '1px solid #BFDBFE',
                color: '#1D4ED8',
                fontSize: '12px',
                fontWeight: '600',
                padding: '4px 12px',
                borderRadius: '20px',
              }}
            >
              {formatProjectType(projectType)}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '13px', color: '#64748B' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Hash size={14} style={{ color: '#94A3B8' }} /> Project ID:{' '}
              <strong style={{ color: '#334155', fontFamily: 'monospace' }}>#{projectId}</strong>
            </span>
            <span>•</span>
            <span>
              Công ty mục tiêu:{' '}
              <strong style={{ color: '#0F172A' }}>
                {formatCompanyName(projectDetail?.targetCompanyName)}
              </strong>
            </span>
          </div>
        </div>
      </div>

      {/* Modern Navigation Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '10px',
          marginBottom: '24px',
          borderBottom: '1px solid #E2E8F0',
          paddingBottom: '12px',
        }}
      >
        <button
          onClick={() => setActiveTab('overview')}
          style={{
            padding: '8px 20px',
            borderRadius: '10px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            border: activeTab === 'overview' ? 'none' : '1px solid #CBD5E1',
            background: activeTab === 'overview' ? '#2563EB' : '#FFFFFF',
            color: activeTab === 'overview' ? '#FFFFFF' : '#475569',
            boxShadow: activeTab === 'overview' ? '0 2px 6px rgba(37, 99, 235, 0.25)' : 'none',
            transition: 'all 0.15s ease',
          }}
          id="tab-full-overview"
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('members')}
          style={{
            padding: '8px 20px',
            borderRadius: '10px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            border: activeTab === 'members' ? 'none' : '1px solid #CBD5E1',
            background: activeTab === 'members' ? '#2563EB' : '#FFFFFF',
            color: activeTab === 'members' ? '#FFFFFF' : '#475569',
            boxShadow: activeTab === 'members' ? '0 2px 6px rgba(37, 99, 235, 0.25)' : 'none',
            transition: 'all 0.15s ease',
          }}
          id="tab-full-members"
        >
          Project Members ({members.length})
        </button>
        <button
          onClick={() => setActiveTab('candidates')}
          style={{
            padding: '8px 20px',
            borderRadius: '10px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            border: activeTab === 'candidates' ? 'none' : '1px solid #CBD5E1',
            background: activeTab === 'candidates' ? '#2563EB' : '#FFFFFF',
            color: activeTab === 'candidates' ? '#FFFFFF' : '#475569',
            boxShadow: activeTab === 'candidates' ? '0 2px 6px rgba(37, 99, 235, 0.25)' : 'none',
            transition: 'all 0.15s ease',
          }}
          id="tab-full-candidates"
        >
          Candidates ({candidates.length})
        </button>
      </div>

      {/* Main Tab Content Body */}
      {loading ? (
        <div style={{ padding: '60px 0', textAlign: 'center', color: '#64748B' }}>
          <div className="spinner" style={{ margin: '0 auto 16px' }} />
          Đang tải thông tin chi tiết dự án và danh sách thành viên...
        </div>
      ) : (
        <>
          {/* Tab 1: Overview (2-Column CRM Layout) */}
          {activeTab === 'overview' && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr',
                gap: '28px',
                alignItems: 'start',
              }}
            >
              {/* Left Column */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                {/* Description Card */}
                <section
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: '16px',
                    padding: '24px 28px',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', borderBottom: '1px solid #F1F5F9', paddingBottom: '12px' }}>
                    <FileText size={20} style={{ color: '#2563EB' }} />
                    <h2 style={{ margin: 0, fontSize: '17px', fontWeight: '700', color: '#0F172A' }}>
                      Mô Tả & Mục Tiêu Dự Án
                    </h2>
                  </div>
                  <p style={{ margin: 0, fontSize: '15px', color: '#334155', lineHeight: '1.6' }}>
                    {projectDetail?.description || 'Không có mô tả bổ sung cho dự án nghiên cứu đối tác này.'}
                  </p>
                </section>

                {/* Metadata Grid */}
                <section
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: '16px',
                    padding: '24px 28px',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', borderBottom: '1px solid #F1F5F9', paddingBottom: '12px' }}>
                    <Tag size={20} style={{ color: '#16A34A' }} />
                    <h2 style={{ margin: 0, fontSize: '17px', fontWeight: '700', color: '#0F172A' }}>
                      Thông Số Vận Hành & Phạm Vi Dự Án
                    </h2>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: '10px', border: '1px solid #F1F5F9' }}>
                      <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#64748B', fontWeight: '700', display: 'block', marginBottom: '6px' }}>
                        LOẠI HÌNH DỰ ÁN
                      </span>
                      <strong style={{ fontSize: '15px', color: '#0F172A', fontWeight: '700' }}>
                        {formatProjectType(projectDetail?.projectType)}
                      </strong>
                    </div>

                    <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: '10px', border: '1px solid #F1F5F9' }}>
                      <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#64748B', fontWeight: '700', display: 'block', marginBottom: '6px' }}>
                        TRẠNG THÁI VẬN HÀNH
                      </span>
                      <span
                        style={{
                          background: projectStatus === 'ACTIVE' ? '#DCFCE7' : '#FEF3C7',
                          color: projectStatus === 'ACTIVE' ? '#15803D' : '#92400E',
                          fontSize: '13px',
                          fontWeight: '700',
                          padding: '3px 10px',
                          borderRadius: '6px',
                        }}
                      >
                        {projectStatus}
                      </span>
                    </div>

                    <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: '10px', border: '1px solid #F1F5F9' }}>
                      <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#64748B', fontWeight: '700', display: 'block', marginBottom: '6px' }}>
                        CÔNG TY MỤC TIÊU
                      </span>
                      <strong style={{ fontSize: '15px', color: '#0F172A', fontWeight: '700' }}>
                        {formatCompanyName(projectDetail?.targetCompanyName)}
                      </strong>
                    </div>

                    <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: '10px', border: '1px solid #F1F5F9' }}>
                      <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#64748B', fontWeight: '700', display: 'block', marginBottom: '6px' }}>
                        NGÀY KHỞI TẠO
                      </span>
                      <strong style={{ fontSize: '15px', color: '#0F172A', fontWeight: '700' }}>
                        {projectDetail?.createdAt ? new Date(projectDetail.createdAt).toLocaleDateString() : 'Chưa cập nhật'}
                      </strong>
                    </div>
                  </div>
                </section>
              </div>

              {/* Right Column (Sidebar Summary Cards) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                <section
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: '16px',
                    padding: '24px',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', borderBottom: '1px solid #F1F5F9', paddingBottom: '12px' }}>
                    <Users size={18} style={{ color: '#2563EB' }} />
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#0F172A' }}>Thành Viên Nhân Sự</h3>
                  </div>
                  <div style={{ fontSize: '28px', fontWeight: '800', color: '#2563EB', marginBottom: '4px' }}>
                    {members.length} <span style={{ fontSize: '14px', color: '#64748B', fontWeight: '500' }}>thành viên</span>
                  </div>
                  <p style={{ margin: 0, fontSize: '13px', color: '#64748B' }}>
                    Nhân sự thuộc các nhóm Manager và Staff tham gia nghiên cứu.
                  </p>
                </section>

                <section
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: '16px',
                    padding: '24px',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', borderBottom: '1px solid #F1F5F9', paddingBottom: '12px' }}>
                    <Building2 size={18} style={{ color: '#16A34A' }} />
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#0F172A' }}>Ứng Viên Candidate</h3>
                  </div>
                  <div style={{ fontSize: '28px', fontWeight: '800', color: '#16A34A', marginBottom: '4px' }}>
                    {candidates.length} <span style={{ fontSize: '14px', color: '#64748B', fontWeight: '500' }}>candidates</span>
                  </div>
                  <p style={{ margin: 0, fontSize: '13px', color: '#64748B' }}>
                    Danh sách các thực thể doanh nghiệp được đề xuất trong dự án.
                  </p>
                </section>
              </div>
            </div>
          )}

          {/* Tab 2: Project Members (Read-Only) */}
          {activeTab === 'members' && (
            <section
              style={{
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '16px',
                padding: '28px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '700', color: '#0F172A' }}>
                  Danh Sách Thành Viên Phân Công (Read-Only)
                </h3>
                <span style={{ fontSize: '13px', color: '#64748B' }}>Business Owner Inspection View</span>
              </div>

              {members.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', background: '#F8FAFC', borderRadius: '12px', border: '1px dashed #CBD5E1' }}>
                  <Users size={36} style={{ color: '#94A3B8', marginBottom: '10px' }} />
                  <h4 style={{ margin: '0 0 4px', fontSize: '15px', color: '#334155' }}>Chưa có thành viên</h4>
                  <p style={{ margin: 0, fontSize: '13px', color: '#64748B' }}>Dự án này chưa được gán thành viên chịu trách nhiệm.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                  {members.map((m) => (
                    <div
                      key={m.id}
                      style={{
                        background: '#F8FAFC',
                        borderRadius: '12px',
                        padding: '16px 20px',
                        border: '1px solid #E2E8F0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div
                          style={{
                            width: '42px',
                            height: '42px',
                            borderRadius: '12px',
                            background: '#EFF6FF',
                            border: '1px solid #BFDBFE',
                            color: '#1D4ED8',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: '700',
                            fontSize: '15px',
                          }}
                        >
                          {(m.fullName || m.email || 'U').substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <strong style={{ fontSize: '14px', color: '#0F172A', display: 'block' }}>
                            {m.fullName || m.email || `Member #${m.accountId}`}
                          </strong>
                          <span style={{ fontSize: '12px', color: '#64748B' }}>Account ID: #{m.accountId}</span>
                        </div>
                      </div>

                      <span
                        style={{
                          background: m.memberRole === 'MANAGER' ? '#FEF3C7' : '#EFF6FF',
                          border: `1px solid ${m.memberRole === 'MANAGER' ? '#FDE68A' : '#BFDBFE'}`,
                          color: m.memberRole === 'MANAGER' ? '#92400E' : '#1D4ED8',
                          fontSize: '11px',
                          fontWeight: '700',
                          padding: '4px 12px',
                          borderRadius: '20px',
                        }}
                      >
                        {m.memberRole}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Tab 3: Candidates (Read-Only) */}
          {activeTab === 'candidates' && (
            <section
              style={{
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '16px',
                padding: '28px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '700', color: '#0F172A' }}>
                  Danh Sách Ứng Viên Candidates Trong Dự Án
                </h3>
                <span style={{ fontSize: '13px', color: '#64748B' }}>Business Owner Inspection View</span>
              </div>

              {candidates.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', background: '#F8FAFC', borderRadius: '12px', border: '1px dashed #CBD5E1' }}>
                  <Building2 size={36} style={{ color: '#94A3B8', marginBottom: '10px' }} />
                  <h4 style={{ margin: '0 0 4px', fontSize: '15px', color: '#334155' }}>Chưa có ứng viên</h4>
                  <p style={{ margin: 0, fontSize: '13px', color: '#64748B' }}>Không tìm thấy doanh nghiệp candidate nào trong dự án này.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                  {candidates.map((c) => {
                    const candidateName =
                      (c.identity as CompanyProfileIdentity)?.tradeName || (c.identity as CompanyProfileIdentity)?.legalName || c.id;
                    return (
                      <div
                        key={c.id}
                        style={{
                          background: '#F8FAFC',
                          borderRadius: '12px',
                          padding: '16px 20px',
                          border: '1px solid #E2E8F0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div
                            style={{
                              width: '42px',
                              height: '42px',
                              borderRadius: '12px',
                              background: '#F1F5F9',
                              border: '1px solid #CBD5E1',
                              color: '#475569',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Building2 size={20} />
                          </div>
                          <div>
                            <strong style={{ fontSize: '14px', color: '#0F172A', display: 'block' }}>
                              {candidateName}
                            </strong>
                            <span style={{ fontSize: '12px', color: '#64748B', fontFamily: 'monospace' }}>
                              ID: {c.id}
                            </span>
                          </div>
                        </div>

                        <span
                          style={{
                            background: c.status === 'APPROVED' ? '#DCFCE7' : '#FEF3C7',
                            border: `1px solid ${c.status === 'APPROVED' ? '#86EFAC' : '#FDE68A'}`,
                            color: c.status === 'APPROVED' ? '#15803D' : '#92400E',
                            fontSize: '11px',
                            fontWeight: '700',
                            padding: '4px 12px',
                            borderRadius: '20px',
                          }}
                        >
                          {c.status}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
};
