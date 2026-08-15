const fs = require('fs');
let code = fs.readFileSync('src/pages/CompanyDetail.tsx', 'utf8');

// Replace {intelligence && ( ... )} blocks manually.
code = code.replace(/\{\s*intelligence\s*&&\s*\([\s\S]*?B?ng tóm t?t t?m quan tr?ng[\s\S]*?<\/div>\s*\)\s*\}/, '');
code = code.replace(/\{\s*intelligence\s*&&\s*\([\s\S]*?Tóm lu?c c?a AI:[\s\S]*?<\/div>\s*\)\s*\}/, '');

// Completely replace state initialization
code = code.replace(/const \[intelligence,\s*setIntelligence\]\s*=\s*useState<OwnerCompanyIntelligenceResponse \| null>\(null\);/g, '');

fs.writeFileSync('src/pages/CompanyDetail.tsx', code);
