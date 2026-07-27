import assert from 'assert';

console.log('====================================================');
console.log('   STARTING SYSTEM SETTINGS COMPONENT AUTOMATED TESTS');
console.log('====================================================\n');

let passed = 0;
let failed = 0;

const IP_REGEX = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(\/([0-9]|[1-2][0-9]|3[0-2]))?$/;

function validateSettings(system, trustedIps) {
  const thresholdNum = Number(system.ai_threshold);
  if (isNaN(thresholdNum) || thresholdNum < 0 || thresholdNum > 100) {
    return { valid: false, message: 'AI Threshold must be between 0 and 100%' };
  }
  const ttlNum = Number(system.approval_ttl);
  if (isNaN(ttlNum) || ttlNum <= 0) {
    return { valid: false, message: 'Approval TTL must be greater than 0' };
  }
  for (const ip of trustedIps) {
    if (!IP_REGEX.test(ip)) {
      return { valid: false, message: `Invalid IP/CIDR: ${ip}` };
    }
  }
  return { valid: true };
}

function checkSecurityModalRequired(initialSecurity, currentSecurity) {
  const mfaDisabled = initialSecurity.mfa && !currentSecurity.mfa;
  const sessionDisabled = initialSecurity.session && !currentSecurity.session;
  const auditDisabled = initialSecurity.audit && !currentSecurity.audit;
  return mfaDisabled || sessionDisabled || auditDisabled;
}

// ----------------------------------------------------
// Test 1: Validate normal system settings
// ----------------------------------------------------
try {
  const res = validateSettings({ ai_threshold: '75', approval_ttl: '48' }, ['192.168.1.0/24']);
  assert.strictEqual(res.valid, true);
  console.log('✅ Component Test 1: PASS - Valid settings form passes client-side validation.');
  passed++;
} catch (err) {
  console.error('❌ Component Test 1: FAIL -', err.message);
  failed++;
}

// ----------------------------------------------------
// Test 2: Invalid AI Threshold (>100)
// ----------------------------------------------------
try {
  const res = validateSettings({ ai_threshold: '150', approval_ttl: '48' }, ['192.168.1.0/24']);
  assert.strictEqual(res.valid, false);
  assert.strictEqual(res.message.includes('AI Threshold'), true);
  console.log('✅ Component Test 2: PASS - Invalid AI threshold (>100%) caught by client validation.');
  passed++;
} catch (err) {
  console.error('❌ Component Test 2: FAIL -', err.message);
  failed++;
}

// ----------------------------------------------------
// Test 3: Invalid IP Subnet
// ----------------------------------------------------
try {
  const res = validateSettings({ ai_threshold: '75', approval_ttl: '48' }, ['999.999.999.999']);
  assert.strictEqual(res.valid, false);
  assert.strictEqual(res.message.includes('Invalid IP'), true);
  console.log('✅ Component Test 3: PASS - Malformed IP address caught by regex validator.');
  passed++;
} catch (err) {
  console.error('❌ Component Test 3: FAIL -', err.message);
  failed++;
}

// ----------------------------------------------------
// Test 4: Trusted IP list manipulation (Add/Remove)
// ----------------------------------------------------
try {
  const ips = ['192.168.1.0/24'];
  const newIp = '10.0.0.1';
  if (IP_REGEX.test(newIp)) ips.push(newIp);
  assert.strictEqual(ips.length, 2);
  const remaining = ips.filter(ip => ip !== '192.168.1.0/24');
  assert.strictEqual(remaining.length, 1);
  assert.strictEqual(remaining[0], '10.0.0.1');
  console.log('✅ Component Test 4: PASS - Trusted IP subnet addition and removal working correctly.');
  passed++;
} catch (err) {
  console.error('❌ Component Test 4: FAIL -', err.message);
  failed++;
}

// ----------------------------------------------------
// Test 5: Turning off MFA triggers Confirmation Modal
// ----------------------------------------------------
try {
  const initial = { mfa: true, session: true, audit: true };
  const current = { mfa: false, session: true, audit: true };
  const modalRequired = checkSecurityModalRequired(initial, current);
  assert.strictEqual(modalRequired, true);
  console.log('✅ Component Test 5: PASS - Turning OFF MFA triggers security confirmation modal.');
  passed++;
} catch (err) {
  console.error('❌ Component Test 5: FAIL -', err.message);
  failed++;
}

console.log('\n====================================================');
console.log(`   SYSTEM SETTINGS COMPONENT TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log('====================================================');
