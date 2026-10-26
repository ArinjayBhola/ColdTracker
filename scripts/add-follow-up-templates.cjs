// Run once for the account owning a given outreach; preserve existing wording.
require('dotenv').config({ quiet: true });
const { createHash } = require('node:crypto');
const fs = require('node:fs');
const ts = require('typescript');
const path = require('node:path');
const postgres = require('postgres');
function load(relative) {
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', relative), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)(request => {
    if (request === '@/lib/user-calendar') return load('lib/user-calendar.ts');
    throw new Error('Unexpected dependency');
  }, module, module.exports);
  return module.exports;
}
const { DEFAULT_FOLLOW_UP_TEMPLATES, VARIANT_LABELS } = load('lib/follow-up-templates.ts');
const outreachId = process.argv[2];
if (!/^[0-9a-f-]{36}$/i.test(outreachId || '')) throw new Error('Provide an existing outreach UUID');
const db = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });
(async () => {
  await db.begin(async tx => {
    const [owner] = await tx`select "userId" from outreach where id = ${outreachId}::uuid`;
    if (!owner) throw new Error('Outreach not found');
    let added = 0;
    for (const template of DEFAULT_FOLLOW_UP_TEMPLATES) {
      const hash = createHash('sha256').update(JSON.stringify(['follow-up-template-v1', owner.userId, template.stage, template.variant])).digest('hex');
      const id = `${hash.slice(0, 8)}-${hash.slice(8, 12)}-5${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
      const rows = await tx`insert into message_templates (id, user_id, title, subject, body, category, tags)
        values (${id}::uuid, ${owner.userId}, ${`Follow-up ${template.stage} - ${VARIANT_LABELS[template.variant]}`}, ${template.subject}, ${template.body}, 'Follow-ups', ${tx.json(['follow-up', `stage-${template.stage}`, template.variant])})
        on conflict (id) do nothing returning id`;
      added += rows.length;
    }
    console.log(`Added ${added} follow-up templates. Existing templates and custom wording preserved.`);
  });
})().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => db.end());
