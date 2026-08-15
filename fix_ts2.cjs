const fs = require('fs');
let code = fs.readFileSync('src/pages/CompanyDetail.tsx', 'utf8');

code = code.replace(/const signals = \[\];/g, 'const signals: any[] = [];');
code = code.replace(/intelligence\?\.relationship/g, 'undefined'); 
code = code.replace(/intelligence\?\.timeline/g, '[]');

fs.writeFileSync('src/pages/CompanyDetail.tsx', code);
