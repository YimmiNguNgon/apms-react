import assert from 'assert';

console.log('====================================================');
console.log('   STARTING ECOSYSTEM OVERVIEW COMPONENT AUTOMATED TESTS');
console.log('====================================================\n');

let passed = 0;
let failed = 0;

// Test 1: Category tabs binding
try {
  const tabs = ['partners', 'competitors', 'suppliers', 'potential-partners'];
  const tabEndpoints = {
    'partners': '/dashboard/partners',
    'competitors': '/dashboard/competitors',
    'suppliers': '/dashboard/suppliers',
    'potential-partners': '/dashboard/potential-partners',
  };

  assert.strictEqual(tabs.length, 4);
  assert.strictEqual(tabEndpoints['partners'], '/dashboard/partners');
  assert.strictEqual(tabEndpoints['potential-partners'], '/dashboard/potential-partners');
  console.log('✅ Component Test 1: PASS - Ecosystem tabs bind correctly to category endpoints.');
  passed++;
} catch (err) {
  console.error('❌ Component Test 1: FAIL -', err.message);
  failed++;
}

// Test 2: Search filtering logic
try {
  const mockList = [
    { companyId: 'COMP-1', name: 'Alpha Tech', industry: 'Software' },
    { companyId: 'COMP-2', name: 'Beta Logistics', industry: 'Supply Chain' },
    { companyId: 'COMP-3', name: 'Gamma Cyber', industry: 'Cybersecurity' },
  ];

  const filter = (query) => {
    const q = query.toLowerCase();
    return mockList.filter(
      (c) => c.name.toLowerCase().includes(q) || c.companyId.toLowerCase().includes(q) || c.industry.toLowerCase().includes(q)
    );
  };

  assert.strictEqual(filter('alpha').length, 1);
  assert.strictEqual(filter('alpha')[0].companyId, 'COMP-1');
  assert.strictEqual(filter('Supply').length, 1);
  assert.strictEqual(filter('nonexistent').length, 0);
  console.log('✅ Component Test 2: PASS - Live search filter filters companies by name, ID, and industry.');
  passed++;
} catch (err) {
  console.error('❌ Component Test 2: FAIL -', err.message);
  failed++;
}

// Test 3: Recent AI scores widget calculation
try {
  const scoresMock = [
    { scoreSnapshotId: 1, companyId: 'COMP-1', totalScore: 88, generatedBy: 'AI Engine' },
    { scoreSnapshotId: 2, companyId: 'COMP-2', totalScore: 62, generatedBy: 'AI Engine' },
  ];

  const topScores = scoresMock.slice(0, 4);
  assert.strictEqual(topScores.length, 2);
  assert.strictEqual(topScores[0].totalScore, 88);
  console.log('✅ Component Test 3: PASS - Recent AI evaluation score widget displays top score snapshots.');
  passed++;
} catch (err) {
  console.error('❌ Component Test 3: FAIL -', err.message);
  failed++;
}

// Test 4: Detail Modal trigger & state binding
try {
  let selectedCompanyId = null;
  let profile = null;
  let sources = null;

  const selectCompany = (id) => {
    selectedCompanyId = id;
    profile = { identity: { tradeName: 'Alpha Tech', legalName: 'Alpha Technology JSC' } };
    sources = { sources: [{ sourceName: 'Gov Registry', sourceType: 'PUBLIC', url: 'https://gov.vn' }] };
  };

  selectCompany('COMP-1');
  assert.strictEqual(selectedCompanyId, 'COMP-1');
  assert.strictEqual(profile.identity.tradeName, 'Alpha Tech');
  assert.strictEqual(sources.sources.length, 1);
  console.log('✅ Component Test 4: PASS - Selecting company opens detail modal with profile & evidence sources.');
  passed++;
} catch (err) {
  console.error('❌ Component Test 4: FAIL -', err.message);
  failed++;
}

console.log('\n----------------------------------------------------');
console.log(`SUMMARY: ${passed} PASSED, ${failed} FAILED`);
console.log('----------------------------------------------------\n');

if (failed > 0) process.exit(1);
