import re

file_path = r'd:\APMS\apms-react\src\pages\CompanyMonitoringPage.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Remove staffFilter state
content = re.sub(r"  const \[staffFilter, setStaffFilter\] = useState\('ALL'\);\n", '', content)

# 2. Remove proposalStaffFilter state
content = re.sub(r"  const \[proposalStaffFilter, setProposalStaffFilter\] = useState\('ALL'\);\n", '', content)

# 3. Update useEffect dependencies
content = content.replace(
    '}, [search, statusFilter, frequencyFilter, staffFilter]);',
    '}, [search, statusFilter, frequencyFilter]);'
)
content = content.replace(
    '}, [proposalSearch, proposalStaffFilter]);',
    '}, [proposalSearch]);'
)

# 4. Remove visibleStaffFilters block
visible_staff_block = r"""  const visibleStaffFilters = useMemo\(\(\) => \{
    const seen = new Map<number, \{ id: number; name: string \}>\(\);
    assignments\.forEach\(\(assignment\) => \{
      seen\.set\(assignment\.assignedStaffId, \{
        id: assignment\.assignedStaffId,
        name: assignment\.assignedStaffName \|\| assignment\.assignedStaffEmail
      \}\);
    \}\);
    return Array\.from\(seen\.values\(\)\);
  \}, \[assignments\]\);\n\n"""
content = re.sub(visible_staff_block, '', content)

# 5. Remove staffFilter from filteredAssignments
content = content.replace(
    "      const matchesStaff = staffFilter === 'ALL' || String(assignment.assignedStaffId) === staffFilter;\n      return matchesSearch && matchesStatus && matchesFrequency && matchesStaff;",
    "      return matchesSearch && matchesStatus && matchesFrequency;"
)
content = content.replace(
    "}, [assignments, frequencyFilter, search, staffFilter, statusFilter]);",
    "}, [assignments, frequencyFilter, search, statusFilter]);"
)

# 6. Remove proposalStaffFilter from filteredPendingRows
content = content.replace(
    "      const matchesStaff = proposalStaffFilter === 'ALL' || String(assignment.assignedStaffId) === proposalStaffFilter;\n      return matchesSearch && matchesStaff;",
    "      return matchesSearch;"
)
content = content.replace(
    "}, [pendingReviewRows, proposalSearch, proposalStaffFilter]);",
    "}, [pendingReviewRows, proposalSearch]);"
)

# 7. Remove select block for staffFilter
staff_select_block = r"""              <select className="admin-select" value=\{staffFilter\} onChange=\{\(event\) => setStaffFilter\(event\.target\.value\)\}>
                <option value="ALL">All staff</option>
                \{visibleStaffFilters\.map\(\(staff\) => \(
                  <option key=\{staff\.id\} value=\{staff\.id\}>
                    \{staff\.name\}
                  </option>
                \)\)\}
              </select>\n"""
content = re.sub(staff_select_block, '', content)

# 8. Remove select block for proposalStaffFilter
proposal_staff_select_block = r"""              <select
                className="admin-select"
                value=\{proposalStaffFilter\}
                onChange=\{\(event\) => setProposalStaffFilter\(event\.target\.value\)\}
              >
                <option value="ALL">All staff</option>
                \{visibleStaffFilters\.map\(\(staff\) => \(
                  <option key=\{staff\.id\} value=\{staff\.id\}>
                    \{staff\.name\}
                  </option>
                \)\)\}
              </select>\n"""
content = re.sub(proposal_staff_select_block, '', content)

# 9. Replace monitoring-management-header
old_header = """              <div className="monitoring-management-header">
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

new_header = """              <div className="monitoring-management-header">
                <span>#</span>
                <span>Company</span>
                <span>Assigned Staff</span>
                <span>Review Cycle</span>
                <span>Next Review</span>
                <span>Status</span>
                <span>Proposal</span>
                <span>Action</span>
              </div>"""
content = content.replace(old_header, new_header)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Cleanup done")
