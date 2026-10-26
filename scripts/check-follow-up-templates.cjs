const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

// Load only the two pure TypeScript modules; no app server or database needed.
function load(relative) {
  const filename = path.join(__dirname, '..', relative);
  const js = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', js)(request => {
    if (request === '@/lib/user-calendar') return load('lib/user-calendar.ts');
    throw new Error(`Unexpected dependency: ${request}`);
  }, module, module.exports);
  return module.exports;
}

const { suggestedFollowUpStage, personalizeFollowUp, DEFAULT_FOLLOW_UP_TEMPLATES } = load('lib/follow-up-templates.ts');
assert.equal(suggestedFollowUpStage({}), 1, 'Show stage 1 immediately, without a due date');
assert.equal(suggestedFollowUpStage({ followUpSentAt: '2026-10-20' }), 2, 'Suggest stage 2 after stage 1 is sent');
assert.equal(suggestedFollowUpStage({ followUp2SentAt: '2026-10-26' }), 2, 'Keep templates accessible after completion');
assert.equal(personalizeFollowUp('Hi {{personName}} at {{ companyName }}: {{roleTargeted}}', { personName: 'Alice', companyName: 'A $& B', roleTargeted: 'Engineer' }), 'Hi Alice at A $& B: Engineer');
assert.equal(personalizeFollowUp('Hi {{personName}}', { companyName: 'Acme', personName: '  ' }), 'Hi there');
assert.equal(new Set(DEFAULT_FOLLOW_UP_TEMPLATES.map(t => `${t.stage}:${t.variant}`)).size, 6);
for (const template of DEFAULT_FOLLOW_UP_TEMPLATES) {
  const body = personalizeFollowUp(template.body, { companyName: 'Acme', personName: 'Alice' });
  assert.ok(body.includes('Acme') && body.includes('Alice'));
  assert.ok(!body.includes('{{'));
}
console.log('Follow-up stage and personalization checks passed.');
