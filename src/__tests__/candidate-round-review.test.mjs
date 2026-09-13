import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const cardPath = resolve(__dirname, '../components/CandidateReview/ManagerReviewFieldCard.tsx');
const workspacePath = resolve(__dirname, '../components/CandidateReview/ManagerCandidateReviewWorkspace.tsx');

const cardSource = readFileSync(cardPath, 'utf-8');
const workspaceSource = readFileSync(workspacePath, 'utf-8');

let passed = 0;
let failed = 0;

function assert(condition, description) {
  if (condition) {
    console.log(`  [PASS] ${description}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${description}`);
    failed++;
  }
}

console.log('--- Multi-Round Review Invariant & Legacy-Safety Tests ---\n');

function evaluateIsCurrentRoundDecision(hasDecision, currentRevisionNumber, reviewedRevision) {
  return (
    hasDecision &&
    currentRevisionNumber != null &&
    reviewedRevision != null &&
    reviewedRevision === currentRevisionNumber
  );
}

// Case 1: Legacy decision without reviewedRevision (null/undefined) in Round 2
assert(
  evaluateIsCurrentRoundDecision(true, 2, null) === false,
  'Legacy decision (reviewedRevision = null, currentRevisionNumber = 2) must NOT show Undo (evaluates to false)'
);

assert(
  evaluateIsCurrentRoundDecision(true, 2, undefined) === false,
  'Legacy decision (reviewedRevision = undefined, currentRevisionNumber = 2) must NOT show Undo (evaluates to false)'
);

// Case 2: Round 1 decision viewed in Round 2
assert(
  evaluateIsCurrentRoundDecision(true, 2, 1) === false,
  'Prior round decision (reviewedRevision = 1, currentRevisionNumber = 2) must NOT show Undo (evaluates to false)'
);

// Case 3: Round 2 decision viewed in Round 2
assert(
  evaluateIsCurrentRoundDecision(true, 2, 2) === true,
  'Active round decision (reviewedRevision = 2, currentRevisionNumber = 2) MUST show Undo (evaluates to true)'
);

// Case 4: Pending field (no decision made yet)
assert(
  evaluateIsCurrentRoundDecision(false, 2, null) === false,
  'Pending field (hasDecision = false) must evaluate to false'
);

// Source Code Invariants
assert(
  cardSource.includes('currentRevisionNumber?: number;'),
  'ManagerReviewFieldCardProps includes currentRevisionNumber?: number;'
);

assert(
  cardSource.includes('fieldResult?.reviewedRevision != null') &&
    cardSource.includes('fieldResult.reviewedRevision === currentRevisionNumber'),
  'ManagerReviewFieldCard uses strict null-safe comparison (fieldResult.reviewedRevision === currentRevisionNumber)'
);

assert(
  cardSource.includes('!disabled && hasDecision && isCurrentRoundDecision'),
  'Undo action button is strictly gated by isCurrentRoundDecision'
);

assert(
  cardSource.includes('Giá trị gửi lại chưa thay đổi so với vòng trước.'),
  'Amber warning for identical resubmitted value is present in history block'
);

assert(
  workspaceSource.includes('currentRevisionNumber={serverCandidate?.revisionNumber ?? 1}'),
  'ManagerCandidateReviewWorkspace passes currentRevisionNumber to ManagerReviewFieldCard'
);

assert(
  !workspaceSource.includes('previousReviewedRevision: approval.reviewedRevision ??'),
  'ManagerCandidateReviewWorkspace does NOT fallback previousReviewedRevision to approval.reviewedRevision'
);

console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
if (failed > 0) {
  process.exit(1);
}
