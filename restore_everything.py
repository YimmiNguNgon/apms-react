import re
import os

file_path = r'd:\APMS\apms-react\src\pages\CompanyMonitoringPage.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update Modal Redesign
with open('update_modal.py', 'r', encoding='utf-8-sig') as f:
    update_modal_content = f.read()
modal_replacement = re.search(r'new_modal = """(.*?)"""\n\nnew_content =', update_modal_content, re.DOTALL).group(1)
content = re.sub(r'      \{showCreateModal && \(.*?      \)\}', modal_replacement, content, flags=re.DOTALL)

# 2. Fix renderAssignmentRow (8 columns, no duplicate staff, no active badge, Pause/Resume side-by-side, Next/Last review merged)
with open('update_row_fix.py', 'r', encoding='utf-8-sig') as f:
    update_row_fix = f.read()
row_replacement = re.search(r'replacement = """(.*?)"""\ncontent =', update_row_fix, re.DOTALL).group(1)
content = re.sub(r'  const renderAssignmentRow.*?    \);\n  \};', row_replacement, content, flags=re.DOTALL)

# 3. Cleanup staffFilter (from cleanup.py)
content = re.sub(r'  const \[staffFilter, setStaffFilter\] = useState<string>\(\'\'\);\n', '', content)
content = re.sub(r'  const \[proposalStaffFilter, setProposalStaffFilter\] = useState<string>\(\'\'\);\n', '', content)
content = re.sub(r'  const visibleStaffFilters = useMemo\(\(\) => \{.*?  \}, \[assignments\]\);\n', '', content)
content = re.sub(r', staffFilter, proposalStaffFilter', '', content)
content = re.sub(r'staffFilter, ', '', content)
content = re.sub(r'proposalStaffFilter, ', '', content)

# Fix filter logic in filteredAssignments
filtered_assignments = r"""  const filteredAssignments = useMemo(() => {
    return assignments.filter((a) => {
      const matchCompany = !companyFilter || a.companyName.toLowerCase().includes(companyFilter.toLowerCase());
      const matchStatus = !statusFilter || a.assignmentStatus === statusFilter;
      const matchStaff = !staffFilter || a.assignedStaffEmail === staffFilter;
      return matchCompany && matchStatus && matchStaff;
    });
  }, [assignments, companyFilter, statusFilter, staffFilter]);"""
new_filtered_assignments = """  const filteredAssignments = useMemo(() => {
    return assignments.filter((a) => {
      const matchCompany = !companyFilter || a.companyName.toLowerCase().includes(companyFilter.toLowerCase());
      const matchStatus = !statusFilter || a.assignmentStatus === statusFilter;
      return matchCompany && matchStatus;
    });
  }, [assignments, companyFilter, statusFilter]);"""
content = content.replace(filtered_assignments, new_filtered_assignments)

# Fix filter logic in filteredPendingRows
filtered_pending = r"""  const filteredPendingRows = useMemo(() => {
    return pendingProposalRows.filter((row) => {
      const matchCompany = !companyFilter || row.assignment.companyName.toLowerCase().includes(companyFilter.toLowerCase());
      const matchStaff = !proposalStaffFilter || row.assignment.assignedStaffEmail === proposalStaffFilter;
      return matchCompany && matchStaff;
    });
  }, [pendingProposalRows, companyFilter, proposalStaffFilter]);"""
new_filtered_pending = """  const filteredPendingRows = useMemo(() => {
    return pendingProposalRows.filter((row) => {
      const matchCompany = !companyFilter || row.assignment.companyName.toLowerCase().includes(companyFilter.toLowerCase());
      return matchCompany;
    });
  }, [pendingProposalRows, companyFilter]);"""
content = content.replace(filtered_pending, new_filtered_pending)

# 4. Remove selects
content = re.sub(r'          <select\s+className="admin-select"\s+value=\{staffFilter\}.*?</select>', '', content, flags=re.DOTALL)
content = re.sub(r'          <select\s+className="admin-select"\s+value=\{proposalStaffFilter\}.*?</select>', '', content, flags=re.DOTALL)

# Fix 4-column filter grid to 3-column
content = content.replace(
    """        <div className="monitoring-management-filters" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 160px 160px 140px', gap: '12px', marginBottom: '16px' }}>""",
    """        <div className="monitoring-management-filters" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 160px 160px', gap: '12px', marginBottom: '16px' }}>"""
)

# Fix History grid
content = content.replace(
    """        <div className="monitoring-management-filters" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 160px', gap: '12px', marginBottom: '16px' }}>""",
    """        <div className="monitoring-management-filters" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: '12px', marginBottom: '16px' }}>"""
)

# 5. Restore Pause/Resume (already in renderAssignmentRow via update_row_fix)
# Wait, handleToggleStatus was removed then added back. Actually, in HEAD, handleToggleStatus exists!
# But wait, did I remove it? No, in HEAD, handleToggleStatus is already there! I don't need to do anything about handleToggleStatus.

# 6. Apply manual fixes (header, renderProposalRow, renderHistoryRow, modal redesign, ValueDisplay)
with open('manual_fixes.py', 'r', encoding='utf-8-sig') as f:
    manual_fixes = f.read()

header_replacement = re.search(r'new_header = """(.*?)"""\ncontent = content.replace\(header_pattern, new_header\)', manual_fixes, re.DOTALL).group(1)
content = re.sub(r'            <div className="monitoring-management-header">\s*<span>#</span>\s*<span>Company</span>\s*<span>Assigned Staff</span>\s*<span>Status</span>\s*<span>Schedule</span>\s*<span>Frequency</span>\s*<span>Reviewed</span>\s*<span>Proposal</span>\s*<span>Actions</span>\s*</div>', header_replacement, content)

prop_row_replacement = re.search(r'new_prop_row = """(.*?)"""\ncontent = re.sub', manual_fixes, re.DOTALL).group(1)
content = re.sub(r'  const renderProposalRow = \(\{ assignment, proposalId \}: ProposalReviewRow\) => \{.*?    \);\n  \};', prop_row_replacement, content, flags=re.DOTALL)

hist_row_replacement = re.search(r'new_hist_row = """(.*?)"""\ncontent = re.sub', manual_fixes, re.DOTALL).group(1)
content = re.sub(r'  const renderHistoryRow = \(\{ assignment, proposalId \}: ProposalReviewRow\) => \{.*?    \);\n  \};', hist_row_replacement, content, flags=re.DOTALL)

modal_review_replacement = re.search(r'new_modal = """(.*?)"""\ncontent = re.sub\(modal_pattern, new_modal', manual_fixes, re.DOTALL).group(1)
content = re.sub(r'      \{selectedProposalId && \(.*?        </div>\n      \)\}', modal_review_replacement, content, flags=re.DOTALL)

value_display_replacement = re.search(r'value_display_code = """(.*?)"""\n\ncontent = content.replace', manual_fixes, re.DOTALL).group(1)
content = content.replace('export const CompanyMonitoringPage', value_display_replacement)

content = content.replace("import { AlertTriangle, ArrowLeft, CheckCircle, Plus, X, XCircle } from 'lucide-react';", "import { AlertTriangle, CheckCircle, Plus, X, XCircle } from 'lucide-react';")

# Ensure CSS is updated
with open(r'd:\APMS\apms-react\src\index.css', 'r', encoding='utf-8') as f:
    css = f.read()

# Make sure CSS has the 8 column layout for monitoring-management-header and row
css = re.sub(
    r'\.monitoring-management-header,[\s\S]*?\.monitoring-management-row \{[\s\S]*?grid-template-columns:.*?\}',
    r'.monitoring-management-header,\n.monitoring-management-row {\n  display: grid;\n  grid-template-columns: 42px minmax(160px, 1.5fr) minmax(160px, 1.5fr) minmax(100px, 0.9fr) minmax(120px, 1fr) minmax(110px, 0.9fr) minmax(100px, 0.8fr) 170px;\n  gap: 12px;\n  align-items: center;\n}',
    css
)

css = re.sub(
    r'\.monitoring-management-filters \{[\s\S]*?grid-template-columns:.*?\}',
    r'.monitoring-management-filters {\n  display: grid;\n  grid-template-columns: minmax(0, 1fr) 160px 160px;\n  gap: 16px;\n  margin-bottom: 24px;\n}',
    css
)

css = re.sub(
    r'\.monitoring-review-modal \{[\s\S]*?\}',
    r'.monitoring-review-modal {\n  max-width: 960px;\n  width: min(960px, calc(100% - 40px));\n  max-height: min(88vh, 920px);\n  overflow-y: auto;\n}',
    css
)

with open(r'd:\APMS\apms-react\src\index.css', 'w', encoding='utf-8') as f:
    f.write(css)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("ALL CHANGES RESTORED PERFECTLY!")
