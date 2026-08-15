const fs = require('fs');
let code = fs.readFileSync('src/pages/CompanyDetail.tsx', 'utf8');

// 1. Remove intelRes fetching block
code = code.replace(/let intelRes = null;[\s\S]*?console\.error\('Failed to load company intelligence data:', err\);\s*\}\s*\}/, '');

// 2. Remove setIntelligence
code = code.replace(/setIntelligence\(intelRes\?\.data \?\? null\);/, '');
code = code.replace(/setIntelligence\(null\);/, '');

// 3. Replace intelligence variable accesses
code = code.replace(/intelligence\?\.company\?\.employeeCount/g, 'profile?.companySize?.employeeCount');
code = code.replace(/\|\|\s*intelligence\?\.company\?\.website\s*/g, '');
code = code.replace(/\|\|\s*intelligence\?\.company\?\.headquarters\s*/g, '');
code = code.replace(/\|\|\s*intelligence\?\.company\?\.businessModel\s*/g, '');
code = code.replace(/\|\|\s*intelligence\?\.products\s*/g, '');
code = code.replace(/\|\|\s*intelligence\?\.company\?\.industries\s*/g, '');
code = code.replace(/\|\|\s*intelligence\?\.company\?\.markets\s*/g, '');

// 4. Fix relationship tab
code = code.replace(/intelligence\?\.relationship\?\.type/g, 'profile?.relationshipType');
code = code.replace(/intelligence\?\.relationship\?\.businessImpact/g, 'undefined');
code = code.replace(/intelligence\?\.relationship\?\.strategicRelevance/g, 'undefined');
code = code.replace(/intelligence\?\.relationship\?\.impactTrend/g, 'undefined');
code = code.replace(/intelligence\?\.timeline/g, '[]');

fs.writeFileSync('src/pages/CompanyDetail.tsx', code);
