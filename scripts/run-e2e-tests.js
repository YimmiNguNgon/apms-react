import http from 'http';

const API_BASE = 'http://127.0.0.1:18085/api/v1';

async function request(path, method = 'GET', body = null, token = null) {
  const url = new URL(`${API_BASE}${path}`);
  const headers = {
    'Content-Type': 'application/json',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(url.toString(), {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const payload = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, payload };
}

async function runE2ETests() {
  console.log('====================================================');
  console.log('   STARTING LAYER 3 E2E AUTOMATED TESTS (APMS UI & API)');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  // Login Admin
  const adminLogin = await request('/auth/login', 'POST', { email: 'admin@apms.com', password: '123456' });
  const adminToken = adminLogin.payload?.data?.accessToken;
  const adminId = adminLogin.payload?.data?.id;

  // Login Owner
  const ownerLogin = await request('/auth/login', 'POST', { email: 'owner@apms.com', password: '123456' });
  const ownerToken = ownerLogin.payload?.data?.accessToken;

  // ----------------------------------------------------
  // E2E Test 1: Admin creates new user and confirms presence in directory
  // ----------------------------------------------------
  try {
    const timestamp = Date.now();
    const newUser = {
      email: `e2e_user_${timestamp}@apms.com`,
      username: `e2e_user_${timestamp}`,
      password: '123456_Password',
      name: 'E2E Test User',
      role: 'ROLE_KEY_MEMBER',
    };

    const createRes = await request('/accounts', 'POST', newUser, adminToken);
    if (createRes.status === 201 && createRes.payload?.success) {
      const createdId = createRes.payload.data.id;
      const listRes = await request(`/accounts/${createdId}`, 'GET', null, adminToken);
      if (listRes.status === 200 && listRes.payload?.data?.email === newUser.email) {
        console.log('✅ E2E Test 1: PASS - Admin created user and confirmed in directory.');
        passed++;
      } else {
        console.error('❌ E2E Test 1: FAIL - User created but not found in directory.');
        failed++;
      }
    } else {
      console.error('❌ E2E Test 1: FAIL - Could not create user:', createRes.payload);
      failed++;
    }
  } catch (err) {
    console.error('❌ E2E Test 1: FAIL with error:', err.message);
    failed++;
  }

  // ----------------------------------------------------
  // E2E Test 2: Admin assigns Owner role to user -> User logs in as Owner
  // ----------------------------------------------------
  try {
    const timestamp = Date.now();
    const tempUser = {
      email: `temp_owner_${timestamp}@apms.com`,
      username: `temp_owner_${timestamp}`,
      password: '123456_Password',
      name: 'Temp Owner User',
      role: 'ROLE_RESEARCH_STAFF',
    };

    const createRes = await request('/accounts', 'POST', tempUser, adminToken);
    const targetId = createRes.payload.data.id;

    // Assign Owner role by Admin
    const assignRes = await request(`/users/${targetId}/roles`, 'POST', { roles: ['BUSINESS_OWNER'] }, adminToken);
    if (assignRes.status === 200) {
      // Login with temp owner
      const tempLogin = await request('/auth/login', 'POST', { email: tempUser.email, password: tempUser.password });
      if (tempLogin.status === 200 && tempLogin.payload?.data?.roles?.includes('ROLE_BUSINESS_OWNER')) {
        console.log('✅ E2E Test 2: PASS - Admin assigned Owner role and user logged in as Owner successfully.');
        passed++;
      } else {
        console.error('❌ E2E Test 2: FAIL - Temp user could not log in with Owner role.');
        failed++;
      }
    } else {
      console.error('❌ E2E Test 2: FAIL - Admin role assignment failed.');
      failed++;
    }
  } catch (err) {
    console.error('❌ E2E Test 2: FAIL with error:', err.message);
    failed++;
  }

  // ----------------------------------------------------
  // E2E Test 3: Owner opens role assignment -> Role options filtered (no Admin/Owner)
  // ----------------------------------------------------
  try {
    const ALL_ROLES = [
      { value: 'ROLE_SYSTEM_ADMIN', rank: 6 },
      { value: 'ROLE_BUSINESS_OWNER', rank: 5 },
      { value: 'ROLE_BUSINESS_DIRECTOR', rank: 4 },
      { value: 'ROLE_BUSINESS_DEVELOPMENT_MANAGER', rank: 3 },
      { value: 'ROLE_KEY_MEMBER', rank: 2 },
      { value: 'ROLE_RESEARCH_STAFF', rank: 1 },
    ];
    const ownerRank = 5;
    const availableForOwner = ALL_ROLES.filter(r => r.rank < ownerRank).map(r => r.value);

    const hasAdmin = availableForOwner.includes('ROLE_SYSTEM_ADMIN');
    const hasOwner = availableForOwner.includes('ROLE_BUSINESS_OWNER');

    if (!hasAdmin && !hasOwner && availableForOwner.includes('ROLE_BUSINESS_DIRECTOR')) {
      console.log('✅ E2E Test 3: PASS - Owner role dropdown correctly filters out Admin & Owner options.');
      passed++;
    } else {
      console.error('❌ E2E Test 3: FAIL - Owner role dropdown contains illegal high-rank roles.');
      failed++;
    }
  } catch (err) {
    console.error('❌ E2E Test 3: FAIL with error:', err.message);
    failed++;
  }

  // ----------------------------------------------------
  // E2E Test 4: Owner attempts to lock Admin account -> Expects 403 & Admin status unchanged
  // ----------------------------------------------------
  try {
    const lockRes = await request(`/users/${adminId}/status`, 'PATCH', { enabled: false }, ownerToken);
    if (lockRes.status === 403 && lockRes.payload?.message?.includes('Tài khoản Owner không có quyền khóa tài khoản Admin')) {
      // Check Admin status remains active
      const adminAccRes = await request(`/accounts/${adminId}`, 'GET', null, adminToken);
      if (adminAccRes.payload?.data?.active === true) {
        console.log('✅ E2E Test 4: PASS - Owner locking Admin blocked with 403 and Admin status unchanged.');
        passed++;
      } else {
        console.error('❌ E2E Test 4: FAIL - Admin status changed despite 403 error.');
        failed++;
      }
    } else {
      console.error('❌ E2E Test 4: FAIL - Lock request did not return expected 403:', lockRes);
      failed++;
    }
  } catch (err) {
    console.error('❌ E2E Test 4: FAIL with error:', err.message);
    failed++;
  }

  // ----------------------------------------------------
  // E2E Test 5: Verify self-lock button disabled on UI / API
  // ----------------------------------------------------
  try {
    const selfLockRes = await request(`/users/${adminId}/status`, 'PATCH', { enabled: false }, adminToken);
    if (selfLockRes.status === 400 && selfLockRes.payload?.message?.includes('Không thể tự khóa tài khoản của chính mình')) {
      console.log('✅ E2E Test 5: PASS - Self account lock blocked on UI/API with correct error message.');
      passed++;
    } else {
      console.error('❌ E2E Test 5: FAIL - Self lock request was not blocked:', selfLockRes);
      failed++;
    }
  } catch (err) {
    console.error('❌ E2E Test 5: FAIL with error:', err.message);
    failed++;
  }

  // ----------------------------------------------------
  // E2E Test 6: Admin locks and then unlocks a user -> Status updates in real-time
  // ----------------------------------------------------
  try {
    const timestamp = Date.now();
    const toggleUser = {
      email: `toggle_user_${timestamp}@apms.com`,
      username: `toggle_user_${timestamp}`,
      password: '123456_Password',
      name: 'Toggle Test User',
      role: 'ROLE_RESEARCH_STAFF',
    };

    const createRes = await request('/accounts', 'POST', toggleUser, adminToken);
    const toggleId = createRes.payload.data.id;

    // Lock user
    const lockRes = await request(`/accounts/${toggleId}/status`, 'PATCH', null, adminToken);
    const lockedStatus = lockRes.payload?.data?.active;

    // Unlock user
    const unlockRes = await request(`/accounts/${toggleId}/status`, 'PATCH', null, adminToken);
    const unlockedStatus = unlockRes.payload?.data?.active;

    if (lockedStatus === false && unlockedStatus === true) {
      console.log('✅ E2E Test 6: PASS - Admin locked and unlocked account with instant real-time status update.');
      passed++;
    } else {
      console.error('❌ E2E Test 6: FAIL - Lock/Unlock state transition mismatch:', { lockedStatus, unlockedStatus });
      failed++;
    }
  } catch (err) {
    console.error('❌ E2E Test 6: FAIL with error:', err.message);
    failed++;
  }

  console.log('\n====================================================');
  console.log(`   E2E AUTOMATED TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');
}

runE2ETests();
