import re

file_path = r'd:\APMS\apms-react\src\pages\CompanyMonitoringPage.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

with open('update_modal.py', 'r', encoding='utf-8-sig') as f:
    update_modal_content = f.read()
modal_replacement = re.search(r"new_modal = '''(.*?)'''\n\nnew_content =", update_modal_content, re.DOTALL).group(1)

content = re.sub(r'      \{showCreateModal && \(.*?      \)\}', modal_replacement, content, flags=re.DOTALL)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Modal redesigned successfully!")
