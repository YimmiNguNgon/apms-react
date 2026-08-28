import re

file_path = r'd:\APMS\apms-react\src\pages\CompanyMonitoringPage.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add state and function back
state_insertion = """  const [statusActionLoading, setStatusActionLoading] = useState<number | null>(null);

  const handleToggleStatus = async (assignment: CompanyMonitoringAssignmentResponse) => {
    const isPausing = assignment.assignmentStatus === 'ACTIVE';
    if (isPausing && !window.confirm(`Are you sure you want to pause monitoring for ${assignment.companyName}?`)) return;

    setStatusActionLoading(assignment.id);
    try {
      if (isPausing) {
        await companyMonitoringApi.pauseAssignment(assignment.id);
      } else {
        await companyMonitoringApi.resumeAssignment(assignment.id);
      }
      fetchAssignments();
    } catch (error) {
      console.error('Failed to toggle status', error);
      alert('Failed to update status.');
    } finally {
      setStatusActionLoading(null);
    }
  };

  const renderAssignmentRow"""

content = content.replace("  const renderAssignmentRow", state_insertion)

# 2. Update renderAssignmentRow buttons
old_actions = """        <div className="admin-row-actions" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="project-detail-btn" onClick={() => openManageModal(assignment)}>
            Manage
          </button>
        </div>"""

new_actions = """        <div className="admin-row-actions" style={{ justifyContent: 'flex-end', display: 'flex', gap: '8px', whiteSpace: 'nowrap' }}>
          <button type="button" className="project-detail-btn" style={{ padding: '6px 12px', height: '32px' }} onClick={() => openManageModal(assignment)}>
            Manage
          </button>
          <button
            type="button"
            className={assignment.assignmentStatus === 'ACTIVE' ? 'project-delete-btn' : 'project-activate-btn'}
            style={{ padding: '6px 12px', height: '32px' }}
            disabled={statusActionLoading === assignment.id}
            onClick={() => handleToggleStatus(assignment)}
          >
            {statusActionLoading === assignment.id
              ? '...'
              : assignment.assignmentStatus === 'ACTIVE'
                ? 'Pause'
                : 'Resume'}
          </button>
        </div>"""

content = content.replace(old_actions, new_actions)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Restored pause/resume actions")
