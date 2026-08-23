const fs = require('fs');
let content = fs.readFileSync('src/pages/companyDetail/CompanyProfileTabs.tsx', 'utf8');

// Remove from renderOverview
content = content.replace('  const [editingField, setEditingField] = useState<string | null>(null);', '');

// Insert at the top of CompanyProfileTabs component
const hookTarget = '  const [editingMember, setEditingMember] = useState<number | null>(null);';
content = content.replace(hookTarget, hookTarget + '\n  const [editingField, setEditingField] = useState<string | null>(null);');

fs.writeFileSync('src/pages/companyDetail/CompanyProfileTabs.tsx', content, 'utf8');
