const fs = require('fs');
let code = fs.readFileSync('src/API/listingDataApi.ts', 'utf8');

// Replace fetchProfile
code = code.replace(/const fetchProfile = async \([\s\S]*?;\s*\n\};/, const fetchProfile = async (companyId: string): Promise<ProfileResponse | null> => {
  return safeApiGet<ProfileResponse>(\/profiles/\\);
};);

// Replace getBoardMembers to NOT fallback to owner snapshot
code = code.replace(/getBoardMembers:\s*async\s*\(\s*companyId:\s*string\s*\):\s*Promise<ListingTabResponse<CompanyBoardMember\[\]>>\s*=>\s*\{[\s\S]*?const profile = await fetchProfile\(companyId\);/, getBoardMembers: async (companyId: string): Promise<ListingTabResponse<CompanyBoardMember[]>> => {
    const profile = await fetchProfile(companyId););

fs.writeFileSync('src/API/listingDataApi.ts', code);
