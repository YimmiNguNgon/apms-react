const fs = require('fs');
let code = fs.readFileSync('src/pages/CompanyDetail.tsx', 'utf8');

code = code.replace(/const signals = \[\] \|\| \[\];/g, "const signals: any[] = [];");
code = code.replace(/const timeline = \[\] \|\| \[\];/g, "const timeline: any[] = [];");

fs.writeFileSync('src/pages/CompanyDetail.tsx', code);
