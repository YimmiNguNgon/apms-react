import re
with open(r'src\pages\CompanyMonitoringPage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()
content = re.sub(r'  const profileSecondaryText =.*?\n', '', content)
content = re.sub(r'  const staffName =.*?\n', '', content)
content = re.sub(r'  const formatValue =.*?\n', '', content, flags=re.DOTALL) # wait formatValue is a function
content = content.replace("import { AlertTriangle, CheckCircle, Plus, X, XCircle }", "import { AlertTriangle, CheckCircle, Plus, XCircle }")
with open(r'src\pages\CompanyMonitoringPage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
