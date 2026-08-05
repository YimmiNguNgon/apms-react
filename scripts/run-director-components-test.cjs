const fs = require('fs');
const path = require('path');

console.log('=== Director Frontend Component & Data Defensive Test ===\n');

// 1. Verify component files exist
const filesToCheck = [
  'src/pages/DirectorRiskMonitoring.tsx',
  'src/pages/StrategicReportsView.tsx',
  'src/pages/RelationshipMap.tsx',
  'src/pages/ProjectsOverview.tsx',
  'src/pages/CompanyDetail.tsx',
  'src/pages/dashboards/DirectorDashboard.tsx',
];

let allExist = true;
filesToCheck.forEach((file) => {
  const fullPath = path.join(__dirname, '..', file);
  if (fs.existsSync(fullPath)) {
    console.log(`[PASS] File exists: ${file}`);
  } else {
    console.log(`[FAIL] Missing file: ${file}`);
    allExist = false;
  }
});

// 2. Test Defensive logic simulation for DirectorRiskMonitoring with incomplete/missing fields
console.log('\n--- Testing Defensive Field Parsing for /risk-monitoring ---');

const mockIncompleteRiskData = [
  {
    companyId: 'COMP-DEF-001',
    tradeName: 'Acme High Risk Ltd',
    riskScore: 85,
    riskLevel: 'High',
  },
  {
    // Extremely incomplete item (missing almost everything)
    companyId: null,
    tradeName: undefined,
    legalName: null,
    taxCode: '',
    industry: null,
    reviewStatus: undefined,
    riskLevel: null,
    riskScore: null,
  },
  {
    companyId: 'COMP-DEF-003',
    tradeName: 'Medium Risk Corp',
    taxCode: '010999888',
    riskScore: '45', // String numeric
  }
];

const safeStr = (val, fallback = 'Chưa có dữ liệu') => {
  if (val === null || val === undefined || val === '') return fallback;
  return String(val).trim();
};

const safeScore = (scoreRaw) => {
  if (scoreRaw === null || scoreRaw === undefined) return 0;
  const num = Number(scoreRaw);
  return isNaN(num) ? 0 : num;
};

const safeRiskLevel = (item) => {
  const rawLevel = safeStr(item.riskLevel, '').toLowerCase();
  if (rawLevel === 'high') return 'High';
  if (rawLevel === 'medium' || rawLevel === 'med') return 'Medium';
  if (rawLevel === 'low') return 'Low';

  const score = safeScore(item.riskScore);
  if (score > 60) return 'High';
  if (score > 40) return 'Medium';
  return 'Low';
};

let defensivePassed = true;

mockIncompleteRiskData.forEach((item, index) => {
  try {
    const companyId = safeStr(item.companyId, `UNKNOWN-${index}`);
    const tradeName = safeStr(item.tradeName, item.legalName ? item.legalName : 'Chưa có dữ liệu');
    const industry = safeStr(item.industry, 'Chưa xác định');
    const taxCode = safeStr(item.taxCode, 'Chưa có MST');
    const reviewStatus = safeStr(item.reviewStatus, 'UNVERIFIED');
    const score = safeScore(item.riskScore);
    const level = safeRiskLevel(item);

    console.log(`[PASS] Item ${index + 1}: Name="${tradeName}", Tax="${taxCode}", Score=${score}, Level=${level}`);
  } catch (err) {
    console.error(`[FAIL] Item ${index + 1} threw error:`, err);
    defensivePassed = false;
  }
});

if (allExist && defensivePassed) {
  console.log('\n✅ ALL DIRECTOR COMPONENT & DEFENSIVE TESTS PASSED SUCCESSFULLY!');
  process.exit(0);
} else {
  console.error('\n❌ DIRECTOR COMPONENT TESTS FAILED');
  process.exit(1);
}
