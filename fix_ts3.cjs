const fs = require('fs');
let code = fs.readFileSync('src/pages/CompanyDetail.tsx', 'utf8');

code = code.replace(/const impact = undefined \|\| 'Ch\u01b0a c\u1eadp nh\u1eadt';/g, "const impact = 'Chua c?p nh?t' as string;");
code = code.replace(/const relevance = undefined \|\| 'Ch\u01b0a c\u1eadp nh\u1eadt';/g, "const relevance = 'Chua c?p nh?t' as string;");
code = code.replace(/const trend = undefined \|\| 'STABLE';/g, "const trend = 'STABLE' as string;");
code = code.replace(/const signals = \[\];/g, "const signals: any[] = [];");

fs.writeFileSync('src/pages/CompanyDetail.tsx', code);
