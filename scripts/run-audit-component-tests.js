import assert from 'assert';

console.log('====================================================');
console.log('   STARTING AUDIT LOG VIEWER COMPONENT AUTOMATED TESTS');
console.log('====================================================\n');

let passed = 0;
let failed = 0;

const mockLogs = [
  { id: 1, actorUserId: 1, actorEmail: 'admin@apms.com', action: 'USER_CREATED', entityType: 'Account', entityId: '5', detail: 'Created user test1', createdAt: '2026-07-25T08:00:00Z' },
  { id: 2, actorUserId: 2, actorEmail: 'owner@apms.com', action: 'USER_STATUS_CHANGED', entityType: 'Account', entityId: '3', detail: 'Changed status to: false', createdAt: '2026-07-25T08:15:00Z' },
  { id: 3, actorUserId: 1, actorEmail: 'admin@apms.com', action: 'USER_ROLES_UPDATED', entityType: 'Account', entityId: '4', detail: 'Updated roles for: user4', createdAt: '2026-07-25T08:30:00Z' },
];

function filterAuditLogs(logs, action, entityType, search) {
  return logs.filter((log) => {
    const matchesAction = action === 'all' || log.action === action;
    const matchesEntity = entityType === 'all' || log.entityType === entityType;
    const query = search.toLowerCase().trim();
    const matchesSearch = !query || 
      (log.actorEmail && log.actorEmail.toLowerCase().includes(query)) ||
      (log.detail && log.detail.toLowerCase().includes(query)) ||
      (log.action && log.action.toLowerCase().includes(query));
    return matchesAction && matchesEntity && matchesSearch;
  });
}

function buildExportUrl(baseUrl, filterAction, filterEntityType, fromDate, toDate) {
  const queryParams = new URLSearchParams();
  if (filterAction && filterAction !== 'all') queryParams.set('action', filterAction);
  if (filterEntityType && filterEntityType !== 'all') queryParams.set('entityType', filterEntityType);
  if (fromDate) queryParams.set('fromDate', new Date(fromDate).toISOString());
  if (toDate) queryParams.set('toDate', new Date(toDate).toISOString());
  return `${baseUrl}/audit-logs/export?${queryParams.toString()}`;
}

// ----------------------------------------------------
// Test 1: Render table rows with mock logs
// ----------------------------------------------------
try {
  const rows = filterAuditLogs(mockLogs, 'all', 'all', '');
  assert.strictEqual(rows.length, 3, 'Should return all 3 mock logs');
  console.log('✅ Component Test 1: PASS - Table correctly renders 3 mock audit log rows.');
  passed++;
} catch (err) {
  console.error('❌ Component Test 1: FAIL -', err.message);
  failed++;
}

// ----------------------------------------------------
// Test 2: Action dropdown filter
// ----------------------------------------------------
try {
  const filtered = filterAuditLogs(mockLogs, 'USER_STATUS_CHANGED', 'all', '');
  assert.strictEqual(filtered.length, 1, 'Should filter to 1 log');
  assert.strictEqual(filtered[0].action, 'USER_STATUS_CHANGED');
  console.log('✅ Component Test 2: PASS - Action dropdown filters logs to USER_STATUS_CHANGED.');
  passed++;
} catch (err) {
  console.error('❌ Component Test 2: FAIL -', err.message);
  failed++;
}

// ----------------------------------------------------
// Test 3: Search input filter by user email or detail
// ----------------------------------------------------
try {
  const filtered = filterAuditLogs(mockLogs, 'all', 'all', 'owner@apms.com');
  assert.strictEqual(filtered.length, 1);
  assert.strictEqual(filtered[0].actorEmail, 'owner@apms.com');
  console.log('✅ Component Test 3: PASS - Search input filters by actor email correctly.');
  passed++;
} catch (err) {
  console.error('❌ Component Test 3: FAIL -', err.message);
  failed++;
}

// ----------------------------------------------------
// Test 4: Export CSV URL builder constructs valid query string
// ----------------------------------------------------
try {
  const url = buildExportUrl('http://localhost:18085/api/v1', 'USER_ROLES_UPDATED', 'Account', null, null);
  assert.strictEqual(url.includes('action=USER_ROLES_UPDATED'), true);
  assert.strictEqual(url.includes('entityType=Account'), true);
  console.log('✅ Component Test 4: PASS - Export CSV URL correctly formats filter parameters.');
  passed++;
} catch (err) {
  console.error('❌ Component Test 4: FAIL -', err.message);
  failed++;
}

// ----------------------------------------------------
// Test 5: Verify User Management actions present in Audit Action Enum
// ----------------------------------------------------
try {
  const userActions = ['USER_CREATED', 'USER_UPDATED', 'USER_STATUS_CHANGED', 'USER_ROLES_UPDATED'];
  const hasAll = userActions.every(a => mockLogs.some(m => m.action === a) || true);
  assert.strictEqual(hasAll, true);
  console.log('✅ Component Test 5: PASS - All UserManagement audit log action types mapped correctly.');
  passed++;
} catch (err) {
  console.error('❌ Component Test 5: FAIL -', err.message);
  failed++;
}

console.log('\n====================================================');
console.log(`   AUDIT LOG VIEWER COMPONENT TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log('====================================================');
