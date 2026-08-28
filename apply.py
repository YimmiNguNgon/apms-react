import re

with open('temp.tsx', 'r', encoding='utf-16') as f:
    content = f.read()

# 1. Update Header
header_pattern = r"""            <div className="monitoring-management-header">
              <span>#</span>
              <span>Company</span>
              <span>Assigned Staff</span>
              <span>Status</span>
              <span>Schedule</span>
              <span>Frequency</span>
              <span>Reviewed</span>
              <span>Proposal</span>
              <span>Actions</span>
            </div>"""
new_header = """            <div className="monitoring-management-header">
              <span>#</span>
              <span>Company</span>
              <span>Assigned Staff</span>
              <span>Review Cycle</span>
              <span>Next Review</span>
              <span>Status</span>
              <span>Proposal</span>
              <span>Actions</span>
            </div>"""
content = content.replace(header_pattern, new_header)

# 2. Update Row
old_row = """  const renderAssignmentRow = (assignment: CompanyMonitoringAssignmentResponse, index: number) => (
    <div className="monitoring-management-row" key={assignment.id}>
      <span>{index + 1}</span>
      <button
        type="button"
        className="monitoring-company-link"
        onClick={() => setActivePage?.('company-detail', { id: assignment.companyProfileId })}
      >
        <strong>{assignment.companyName}</strong>
        <small>{assignment.companyProfileId}</small>
      </button>
      <div>
        <strong>{assignment.assignedStaffName}</strong>
        <small>{assignment.assignedStaffEmail}</small>
      </div>
      <span className={`workspace-badge ${statusTone(assignment.assignmentStatus)}`}>
        {assignment.assignmentStatus}
      </span>
      <span className={`workspace-badge ${statusTone(assignment.displayStatus)}`}>
        {assignment.displayStatus.replace(/_/g, ' ')}
      </span>
      <span>{frequencyLabel(assignment.frequency)}</span>
      <div>
        <strong>{formatDate(assignment.lastReviewedAt)}</strong>
        <small>Next {formatDate(assignment.nextReviewAt)}</small>
      </div>
      {renderProposalBadge(assignment)}
      <div className="admin-row-actions">
        <button type="button" className="project-detail-btn" onClick={() => openManageModal(assignment)}>
          Manage
        </button>
        <button
          type="button"
          className={assignment.assignmentStatus === 'ACTIVE' ? 'project-delete-btn' : 'project-activate-btn'}
          disabled={statusActionLoading === assignment.id}
          onClick={() => handleToggleStatus(assignment)}
        >
          {statusActionLoading === assignment.id
            ? '...'
            : assignment.assignmentStatus === 'ACTIVE'
              ? 'Pause'
              : 'Resume'}
        </button>
      </div>
    </div>
  );"""

with open('new_row.txt', 'r', encoding='utf-8-sig') as f:
    new_row = f.read()

content = content.replace(old_row, new_row)

# 3. Update Review Modal
with open('manual_fixes.py', 'r', encoding='utf-8-sig') as f:
    manual_fixes = f.read()

modal_review_replacement = re.search(r'new_modal = """(.*?)"""\ncontent = re.sub\(modal_pattern, new_modal', manual_fixes, re.DOTALL).group(1)
content = re.sub(r'      \{selectedProposalId && \(.*?        </div>\n      \)\}', modal_review_replacement, content, flags=re.DOTALL)

# 4. Add ValueDisplay
value_display_replacement = re.search(r'value_display_code = """(.*?)"""\n\ncontent = content.replace', manual_fixes, re.DOTALL).group(1)
content = content.replace('export const CompanyMonitoringPage', value_display_replacement)

# Update proposals table to remove proposalId and change to formatDate
prop_row_replacement = re.search(r'new_prop_row = """(.*?)"""\ncontent = re.sub', manual_fixes, re.DOTALL).group(1)
content = re.sub(r'  const renderProposalRow = \(\{ assignment, proposalId \}: ProposalReviewRow\) => \{.*?    \);\n  \};', prop_row_replacement, content, flags=re.DOTALL)

hist_row_replacement = re.search(r'new_hist_row = """(.*?)"""\ncontent = re.sub', manual_fixes, re.DOTALL).group(1)
content = re.sub(r'  const renderHistoryRow = \(\{ assignment, proposalId \}: ProposalReviewRow\) => \{.*?    \);\n  \};', hist_row_replacement, content, flags=re.DOTALL)

# Cleanup unused unused states (already done but let's do it safely here)
content = re.sub(r'  const \[companySearchLoading.*?;\n', '', content)
content = re.sub(r'  const \[staffSearchLoading.*?;\n', '', content)
content = re.sub(r'  const \[selectedCompany.*?;\n', '', content)
content = re.sub(r'  const \[selectedStaff.*?;\n', '', content)
content = re.sub(r'  const \[companySuggestions.*?;\n', '', content)
content = re.sub(r'  const \[staffSuggestions.*?;\n', '', content)
content = re.sub(r'  const \[companySuggestionsOpen.*?;\n', '', content)
content = re.sub(r'  const \[staffSuggestionsOpen.*?;\n', '', content)
content = re.sub(r'  const \[companyHighlightIndex.*?;\n', '', content)
content = re.sub(r'  const \[staffHighlightIndex.*?;\n', '', content)
content = re.sub(r'  const \[fieldErrors.*?;\n', '', content)
content = re.sub(r'  const isAssignmentFormValid.*?;\n', '', content)
content = content.replace("import { AlertTriangle, ArrowLeft, CheckCircle, Plus, X, XCircle } from 'lucide-react';", "import { AlertTriangle, CheckCircle, Plus, X, XCircle } from 'lucide-react';")

with open(r'src\pages\CompanyMonitoringPage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Done!')
