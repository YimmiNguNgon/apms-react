/* eslint-disable @typescript-eslint/no-explicit-any */
// Operational Project Management for Manager & Staff roles
import React, { useEffect, useState, useCallback } from 'react';
import { projectApi } from '../API/projectApi';
import type {
  ProjectResponse,
  ProjectTaskResponse,
  CreateProjectRequest,
  ProjectType,
} from '../types/domain';

export interface ProjectManagementProps {
  setActivePage?: (page: string) => void;
}

export const ProjectManagement: React.FC<ProjectManagementProps> = ({ setActivePage }) => {
  const [projects, setProjects] = useState<ProjectResponse[]>([]);
  const [selectedProject, setSelectedProject] = useState<ProjectResponse | null>(null);
  const [tasks, setTasks] = useState<ProjectTaskResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [form, setForm] = useState<CreateProjectRequest>({
    projectName: '',
    projectType: 'RESEARCH_NEW_COMPANY' as ProjectType,
    targetCompanyProfileId: '',
    targetCompanyName: '',
    targetRelationshipType: 'PARTNER_WITH',
    description: '',
  });
  const [message, setMessage] = useState<string | null>(null);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    try {
      const res = await projectApi.getAllProjects();
      if (res?.data?.content && Array.isArray(res.data.content)) {
        setProjects(res.data.content);
        if (res.data.content.length > 0 && !selectedProject) {
          setSelectedProject(res.data.content[0]);
        }
      }
    } catch {
      // API fallback
    } finally {
      setLoading(false);
    }
  }, [selectedProject]);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.projectName.trim()) return;
    try {
      await projectApi.createProject(form);
      setMessage('Tạo dự án thành công!');
      setShowCreateModal(false);
      setForm({
        projectName: '',
        projectType: 'RESEARCH_NEW_COMPANY' as ProjectType,
        targetCompanyProfileId: '',
        targetCompanyName: '',
        targetRelationshipType: 'PARTNER_WITH',
        description: '',
      });
      await loadProjects();
    } catch (err: any) {
      setMessage(`Lỗi tạo dự án: ${err.message || 'Lỗi hệ thống'}`);
    }
  };

  return (
    <div style={{ padding: '24px', background: '#F8FAFC', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#0F172A' }}>Operational Project Workspace</h1>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748B' }}>Quản lý tiến độ dự án, phân công công việc và phê duyệt hồ sơ cho Manager & Staff.</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          style={{ padding: '8px 16px', background: '#2563EB', color: '#FFF', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
        >
          + Tạo Dự Án Mới
        </button>
      </div>

      {message && (
        <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', color: '#1E40AF', padding: '10px 14px', borderRadius: '6px', marginBottom: '16px', fontSize: '13px' }}>
          {message}
        </div>
      )}

      {/* Modal tạo dự án */}
      {showCreateModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#FFF', width: '480px', borderRadius: '8px', padding: '20px', boxShadow: '0 10px 25px rgba(0,0,0,0.15)' }}>
            <h2 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 700, color: '#0F172A' }}>Tạo Dự Án Mới</h2>
            <form onSubmit={handleCreateProject} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Tên dự án *</label>
                <input
                  type="text"
                  required
                  value={form.projectName}
                  onChange={(e) => setForm({ ...form, projectName: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Tên công ty mục tiêu</label>
                <input
                  type="text"
                  value={form.targetCompanyName}
                  onChange={(e) => setForm({ ...form, targetCompanyName: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Mô tả dự án</label>
                <textarea
                  rows={3}
                  value={form.description ?? ''}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                <button type="button" onClick={() => setShowCreateModal(false)} style={{ padding: '8px 14px', background: '#F1F5F9', border: 'none', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>
                  Hủy
                </button>
                <button type="submit" style={{ padding: '8px 16px', background: '#2563EB', color: '#FFF', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                  Lưu Dự Án
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Main Table */}
      <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#F1F5F9', borderBottom: '1px solid #E2E8F0', color: '#475569', fontWeight: 600 }}>
              <th style={{ padding: '12px 16px' }}>Tên Dự Án</th>
              <th style={{ padding: '12px 16px' }}>Công Ty Mục Tiêu</th>
              <th style={{ padding: '12px 16px' }}>Trạng Thái</th>
              <th style={{ padding: '12px 16px' }}>Thành Viên</th>
              <th style={{ padding: '12px 16px', textAlign: 'right' }}>Hành Động</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: '#64748B' }}>Đang tải danh sách dự án...</td>
              </tr>
            ) : projects.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: '#64748B' }}>Chưa có dự án nào. Bấm nút + Tạo Dự Án Mới để bắt đầu.</td>
              </tr>
            ) : (
              projects.map((p) => (
                <tr key={p.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0F172A' }}>{p.projectName}</td>
                  <td style={{ padding: '12px 16px', color: '#475569' }}>{(p as any).targetCompanyName || 'N/A'}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ padding: '2px 8px', borderRadius: '4px', background: '#DBEAFE', color: '#1E40AF', fontSize: '11px', fontWeight: 600 }}>
                      {p.status || 'ACTIVE'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', color: '#64748B' }}>{p.members?.length || 1} nhân sự</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <button
                      onClick={() => {
                        if (setActivePage) {
                          localStorage.setItem('apms-selected-project', String(p.id));
                          setActivePage('project-detail');
                        }
                      }}
                      style={{ padding: '4px 10px', background: '#F1F5F9', border: '1px solid #CBD5E1', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}
                    >
                      Chi tiết →
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
