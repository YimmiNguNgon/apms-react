import re
with open(r'src\pages\CompanyMonitoringPage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()
content = re.sub(r'  const \[staffFilter, setStaffFilter\].*?\n', '', content)
content = re.sub(r'  const \[proposalStaffFilter, setProposalStaffFilter\].*?\n', '', content)
content = re.sub(r'  const visibleStaffFilters = useMemo\(\(\) => \{[\s\S]*?  \}, \[assignments, pendingReviewRows\]\);\n\n', '', content)
with open(r'src\pages\CompanyMonitoringPage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
