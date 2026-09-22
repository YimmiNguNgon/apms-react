import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Execute the actual page handlers with mocked APIs/state, without duplicating their logic.
const source = readFileSync(new URL('../pages/ProjectDetailPage.tsx', import.meta.url), 'utf8');
const ast = ts.createSourceFile('page.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const names = ['selectStaffCandidate', 'handleCreateManualCandidate', 'handleOpenStaffCandidate',
  'handleExtractionComplete', 'loadTaskWorkbench'];
const declarations = new Map();
function visit(node) {
  if (ts.isVariableDeclaration(node) && names.includes(node.name.getText(ast))) {
    declarations.set(node.name.getText(ast), `const ${node.getText(ast)};`);
  }
  ts.forEachChild(node, visit);
}
visit(ast);
assert.equal(declarations.size, names.length);
const script = ts.transpileModule([...declarations.values()].join('\n') +
  `\nglobalThis.handlers = {${names.join(',')}};`, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React },
}).outputText;

function harness(initial = []) {
  const drafts = new Map(initial.map(id => [id, { id, status: 'DRAFT', name: id, source: 'AI' }]));
  const context = {
    console, Error, currentProjectId: 1, canUseStaffWorkbench: true,
    selectedStaffTask: { id: 2, projectId: 1, taskType: 'COMPANY_DATA_PREPARATION', status: 'IN_PROGRESS' },
    staffCandidateRequest: { current: 0 }, completedExtractionJob: { current: null },
    emptyStaffCandidateEdit: {}, candidateToEditForm: candidate => ({ ...candidate }),
    React: { createElement: () => null, Fragment: 'fragment' },
    window: { setTimeout: () => 0 }, queryClient: { invalidateQueries() {} },
    staffCandidate: null, workbench: { candidateDrafts: initial.map(candidateId => ({ candidateId, status: 'DRAFT' })) },
    candidateApi: {
      async getCandidateById(id) { return { data: drafts.get(id) }; },
      async createManualCandidate() {
        const draft = { id: `manual-${drafts.size}`, source: 'MANUAL', status: 'DRAFT', name: null, fields: {} };
        drafts.set(draft.id, draft);
        return { data: draft };
      },
    },
    taskApi: { async getTaskWorkbench() {
      return { data: { candidateDrafts: [...drafts.keys()].map(candidateId => ({ candidateId, status: 'DRAFT' })) } };
    } },
    projectApi: { async getLatestExtractionJob() { return { data: null }; } },
  };
  for (const name of ['StaffCandidateLoading', 'StaffCandidate', 'StaffCandidateEdit', 'PendingExtractionReviews',
    'LastExtractionReviews', 'FieldAiAssist', 'FieldAiError', 'WorkbenchError', 'WorkbenchMessage',
    'WorkbenchLoading', 'Workbench', 'SubmittedCandidateData', 'ExtractingSelectedDocuments',
    'ExtractingImportJobId', 'ExtractionJob', 'ExtractionJobId', 'Toast']) {
    const key = name[0].toLowerCase() + name.slice(1);
    context[`set${name}`] = value => { context[key] = typeof value === 'function' ? value(context[key]) : value; };
  }
  vm.createContext(context);
  vm.runInContext(script, context);
  const complete = async id => {
    drafts.set(id, { id, name: id, status: 'DRAFT', source: 'AI' });
    context.extractionJob = { jobId: `job-${id}`, status: 'COMPLETED', candidateId: id };
    await context.handlers.handleExtractionComplete();
    assert.equal(context.staffCandidate?.id, id);
  };
  return { context, drafts, complete, ...context.handlers };
}

test('manual creation with DHG history opens a fresh empty manual draft every time', async () => {
  const h = harness(['DHG']);
  await h.handleOpenStaffCandidate('DHG');
  await h.handleCreateManualCandidate();
  const first = h.context.staffCandidate;
  assert.equal(first.source, 'MANUAL');
  assert.equal(first.name, null);
  assert.equal(Object.keys(first.fields).length, 0);
  await h.handleCreateManualCandidate();
  assert.notEqual(h.context.staffCandidate.id, first.id);
  assert.ok(h.drafts.has('DHG'));
});

test('first, second and third extractions open the exact returned candidate', async () => {
  const h = harness();
  for (const id of ['DHG', 'Vingroup', 'Masan']) await h.complete(id);
  assert.equal(h.drafts.size, 3);
});

test('Continue selects exactly the requested draft and refetch preserves selection', async () => {
  const h = harness(['DHG', 'Vingroup']);
  for (const id of ['DHG', 'Vingroup']) {
    await h.handleOpenStaffCandidate(id);
    await h.loadTaskWorkbench(h.context.selectedStaffTask);
    assert.equal(h.context.staffCandidate.id, id);
  }
});

test('extraction after manual opens FPT without changing the manual draft', async () => {
  const h = harness(['DHG']);
  await h.handleCreateManualCandidate();
  const manual = h.context.staffCandidate;
  await h.complete('FPT');
  assert.equal(h.drafts.get(manual.id), manual);
});

test('late old candidate response cannot replace a newer selection', async () => {
  const h = harness(['DHG', 'Vingroup']);
  let resolveOld;
  h.context.candidateApi.getCandidateById = id => id === 'DHG'
    ? new Promise(resolve => { resolveOld = resolve; }) : Promise.resolve({ data: h.drafts.get(id) });
  const old = h.handleOpenStaffCandidate('DHG');
  await h.handleOpenStaffCandidate('Vingroup');
  resolveOld({ data: h.drafts.get('DHG') });
  await old;
  assert.equal(h.context.staffCandidate.id, 'Vingroup');
});

test('missing extraction ID reports an error instead of choosing a draft', async () => {
  const h = harness(['DHG']);
  h.context.extractionJob = { jobId: 'missing', status: 'COMPLETED', candidateId: null };
  await h.handleExtractionComplete();
  assert.equal(h.context.staffCandidate, null);
  assert.match(h.context.workbenchError, /no candidate ID/);
});

test('selection clears candidate-specific transient state and keyed detail remounts', async () => {
  const h = harness(['DHG', 'Vingroup']);
  h.context.fieldAiAssist = { text: 'DHG' };
  h.context.pendingExtractionReviews = ['DHG'];
  await h.handleOpenStaffCandidate('Vingroup');
  assert.equal(h.context.fieldAiAssist, null);
  assert.equal(h.context.pendingExtractionReviews.length, 0);
  assert.match(source, /<CandidateReviewWorkspace\s+key=\{staffCandidate.id\}/);
});

test('late response after leaving candidate selection is ignored', async () => {
  const h = harness(['DHG']);
  let resolve;
  h.context.candidateApi.getCandidateById = () => new Promise(done => { resolve = done; });
  const pending = h.handleOpenStaffCandidate('DHG');
  h.context.staffCandidateRequest.current++;
  resolve({ data: h.drafts.get('DHG') });
  await pending;
  assert.equal(h.context.staffCandidate, null);
});
