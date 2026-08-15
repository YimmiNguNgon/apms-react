const fs = require('fs');
let code = fs.readFileSync('src/pages/CompanyDetail.tsx', 'utf8');

// Remove import
code = code.replace(/,\s*OwnerCompanyIntelligenceResponse/, '');

// Remove intelligence state
code = code.replace(/\s*const \[intelligence,\s*setIntelligence\]\s*=\s*useState[^;]+;/g, '');
code = code.replace(/\s*const \[intelLoading,\s*setIntelLoading\]\s*=\s*useState[^;]+;/g, '');

// Remove references to intelligence in fetch
code = code.replace(/setIntelligence\([^)]+\);/g, '');
code = code.replace(/intelligence\?\.company\?\.employeeCount/g, 'profile?.companySize?.employeeCount');
code = code.replace(/\|\|\s*intelligence\?\.company\?\.website/g, '');
code = code.replace(/\|\|\s*intelligence\?\.company\?\.headquarters/g, '');
code = code.replace(/\|\|\s*intelligence\?\.company\?\.businessModel/g, '');
code = code.replace(/\|\|\s*intelligence\?\.products/g, '');
code = code.replace(/\|\|\s*intelligence\?\.company\?\.industries/g, '');
code = code.replace(/\|\|\s*intelligence\?\.company\?\.markets/g, '');

// Fix Panel 4: AI Extracted Facts
code = code.replace(/\{\s*intelligence\s*&&\s*\((?:[^}]*?\}[^}]*?)*?\)\s*\}/s, '');

// Fix relationship tab
code = code.replace(/intelligence\?\.relationship\?\.type/g, 'profile?.relationshipType');
code = code.replace(/intelligence\?\.relationship\?\.businessImpact/g, 'undefined');
code = code.replace(/intelligence\?\.relationship\?\.strategicRelevance/g, 'undefined');
code = code.replace(/intelligence\?\.relationship\?\.impactTrend/g, 'undefined');
code = code.replace(/intelligence\?\.timeline/g, '[]');

// Fix executiveBrief in relationship tab
code = code.replace(/\{\s*intelligence\?\.executiveBrief\s*&&\s*\((?:[^}]*?\}[^}]*?)*?\)\s*\}/s, '');

fs.writeFileSync('src/pages/CompanyDetail.tsx', code);
