import os

file_path = r'd:\APMS\apms-react\src\pages\CompanyMonitoringPage.tsx'
temp_path = r'temp.tsx'

# Load original file from temp.tsx
with open(temp_path, 'r', encoding='utf-16') as f:
    content = f.read()

# 1. Update Create Modal
with open('update_modal.py', 'r', encoding='utf-8') as f:
    update_modal = f.read()
start_marker = '      {showCreateModal && ('
end_marker = '      )}'
start_idx = content.find(start_marker)
# Find the specific end marker corresponding to the modal closing.
# The original modal is roughly 160 lines long. We can search for end_marker after start_idx + 3000 chars.
search_offset = start_idx + 100
end_idx = content.find(end_marker, search_offset) + len(end_marker)

import re
modal_replacement = re.search(r"new_modal = '''(.*?)'''\n\nnew_content", update_modal, re.DOTALL).group(1)
content = content[:start_idx] + modal_replacement + content[end_idx:]

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
