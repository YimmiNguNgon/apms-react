const fs = require('fs');

// Fix listingDataApi.ts
let code = fs.readFileSync('src/API/listingDataApi.ts', 'utf8');

code = code.replace(/getNews:\s*async\s*\(\s*companyId:\s*string\s*\):\s*Promise<ListingTabResponse<CompanyNews\[\]>>\s*=>\s*\{[\s\S]*?const response = await externalDataApi\.getNewsByCompanyId\(companyId, 0, 100\);/g, getNews: async (companyId: string): Promise<ListingTabResponse<CompanyNews[]>> => {
    const response = await externalDataApi.getNewsByCompanyId(companyId, 0, 100););

code = code.replace(/getDocuments:\s*async\s*\(\s*companyId:\s*string\s*\):\s*Promise<ListingTabResponse<CompanyDocument\[\]>>\s*=>\s*\{[\s\S]*?const profile = await fetchProfile\(companyId\);/g, getDocuments: async (companyId: string): Promise<ListingTabResponse<CompanyDocument[]>> => {
    const profile = await fetchProfile(companyId););

code = code.replace(/getReportYears:\s*async\s*\(\s*companyId:\s*string\s*\):\s*Promise<number\[\]>\s*=>\s*\{[\s\S]*?return Array\.from\(years\)\.sort\(\(a, b\) => \(b as number\) - \(a as number\)\);/g, getReportYears: async (companyId: string): Promise<number[]> => {
    const profile = await fetchProfile(companyId);
    if (!profile) return [];
    
    const years = new Set<number>();
    const updatedAtYear = Number(profile.metadata?.updatedAt?.slice(0, 4));
    if (updatedAtYear && !isNaN(updatedAtYear)) years.add(updatedAtYear);
    
    return Array.from(years).sort((a, b) => b - a););

fs.writeFileSync('src/API/listingDataApi.ts', code);

// Fix CompanyDetail.tsx signals
let detailCode = fs.readFileSync('src/pages/CompanyDetail.tsx', 'utf8');
detailCode = detailCode.replace(/const signals = \[\];/g, 'const signals: any[] = [];');
detailCode = detailCode.replace(/intelligence\?\.relationship/g, 'undefined'); // Fix remaining issues if any
detailCode = detailCode.replace(/intelligence\?\.timeline/g, '[]'); 
fs.writeFileSync('src/pages/CompanyDetail.tsx', detailCode);
