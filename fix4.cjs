const fs = require('fs');
let content = fs.readFileSync('src/pages/companyDetail/CompanyProfileTabs.tsx', 'utf8');
content = content.replace(/const sizeStr = empCount \? .+;/g, 'const sizeStr = empCount ? `${empCount} nhân sự ${empTier ? `(${empTier})` : ""}` : (empTier || "Chưa cập nhật");');
fs.writeFileSync('src/pages/companyDetail/CompanyProfileTabs.tsx', content, 'utf8');
