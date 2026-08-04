/**
 * C9 regression test: Verifies that KeyMemberPages.tsx reads localStorage
 * INSIDE the component function (dynamic), NOT at module top-level (stale).
 *
 * Run: node apms-react/src/__tests__/c9-project-id-lifecycle.test.mjs
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const filePath = resolve(__dirname, '../pages/KeyMemberPages.tsx');

const source = readFileSync(filePath, 'utf-8');
const lines = source.split('\n');

let passed = 0;
let failed = 0;

function assert(condition, description) {
  if (condition) {
    console.log(`  ✅ ${description}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${description}`);
    failed++;
  }
}

console.log('C9: Import-time PROJECT_ID lifecycle test\n');

// ── Test 1: Module-level const PROJECT_ID must NOT exist ──

const moduleLevelPattern = /^const PROJECT_ID\s*=/m;
const hasModuleLevelConst = moduleLevelPattern.test(source);

// Find the line number for reporting
const moduleLevelLine = lines.findIndex((line) => /^const PROJECT_ID\s*=/.test(line));

assert(
  !hasModuleLevelConst,
  `Module-level "const PROJECT_ID = localStorage..." must NOT exist` +
    (moduleLevelLine >= 0 ? ` (found at line ${moduleLevelLine + 1})` : '')
);

// ── Test 2: Component-level read must exist inside CompanyValidation ──

const componentLevelPattern = /export const CompanyValidation[\s\S]*?const projectId\s*=\s*localStorage\.getItem\('apms-active-project'\)/;
const hasComponentLevelRead = componentLevelPattern.test(source);

assert(
  hasComponentLevelRead,
  'Component-level "const projectId = localStorage.getItem(...)" must exist inside CompanyValidation'
);

// ── Test 3: The JSX reference must use lowercase `projectId`, not `PROJECT_ID` ──

const staleRefPattern = /\{PROJECT_ID/;
const hasStaleRef = staleRefPattern.test(source);

assert(
  !hasStaleRef,
  'No stale "{PROJECT_ID" reference in JSX (should use lowercase {projectId})'
);

// ── Test 4: The dynamic read must be INSIDE CompanyValidation (not just anywhere) ──

const componentDeclLine = lines.findIndex((line) => /export const CompanyValidation/.test(line));
assert(componentDeclLine >= 0, `CompanyValidation component declaration found at line ${componentDeclLine + 1}`);

// Search only within the CompanyValidation body (up to 150 lines after declaration)
const companyValidationBody = lines.slice(componentDeclLine, componentDeclLine + 150).join('\n');
const dynamicReadInBody = /const projectId\s*=\s*localStorage\.getItem\('apms-active-project'\)/.test(companyValidationBody);

const dynamicReadLine = lines.findIndex((line, idx) =>
  idx >= componentDeclLine && /const projectId\s*=\s*localStorage\.getItem/.test(line)
);

assert(
  dynamicReadInBody && dynamicReadLine > componentDeclLine,
  `Dynamic localStorage read (line ${dynamicReadLine + 1}) must be INSIDE CompanyValidation body (declared at line ${componentDeclLine + 1})`
);

// ── Test 5: The read must be near the top of the function (before any useState) ──

const firstUseStateLine = lines.findIndex((line, idx) =>
  idx >= componentDeclLine && idx <= componentDeclLine + 10 && /useState/.test(line)
);

assert(
  dynamicReadLine > componentDeclLine && dynamicReadLine < firstUseStateLine + 10,
  `localStorage read (line ${dynamicReadLine + 1}) is within the function setup area`
);

// ── Summary ──

console.log(`\nResults: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
