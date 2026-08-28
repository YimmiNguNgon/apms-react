import re
with open(r'src\pages\CompanyMonitoringPage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove unused states
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

with open(r'src\pages\CompanyMonitoringPage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
