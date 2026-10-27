/* eslint-disable @typescript-eslint/no-require-imports -- Standalone data migration. */
require('dotenv').config({ quiet: true });
const { createHash } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const postgres = require('postgres');

const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../lib/follow-up-templates.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const templatesModule = { exports: {} };
new Function('module', 'exports', code)(templatesModule, templatesModule.exports);
const { DEFAULT_FOLLOW_UP_TEMPLATES } = templatesModule.exports;
const legacyVariants = ['unknown', 'seen', 'not_seen'];
function slotId(userId, stage, variant) {
  const hash = createHash('sha256').update(JSON.stringify(['follow-up-template-v1', userId, stage, variant])).digest('hex');
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-5${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

// Match exact generated IDs, never a user-authored title or tag. Generic messages
// retain their IDs and custom text, so the two pages keep editing the same rows.
async function simplify(tx, userIds) {
  let removed = 0;
  let added = 0;
  for (const userId of userIds) {
    const ids = DEFAULT_FOLLOW_UP_TEMPLATES.flatMap(t => legacyVariants.map(v => slotId(userId, t.stage, v)));
    const rows = await tx`SELECT * FROM message_templates WHERE user_id = ${userId} AND id IN ${tx(ids)} ORDER BY updated_at DESC`;
    for (const template of DEFAULT_FOLLOW_UP_TEMPLATES) {
      const id = slotId(userId, template.stage, 'unknown');
      const stageIds = legacyVariants.map(v => slotId(userId, template.stage, v));
      const existing = rows.find(row => row.id === id);
      const source = existing || rows.find(row => stageIds.includes(row.id));
      const oldDefaultBody = template.stage === 1
        ? template.body.replace('about {{role}} at', 'about opportunities at')
        : template.body.replace('about {{role}} at', 'about');
      const body = !source || source.body === oldDefaultBody ? template.body : source.body;
      if (existing) {
        const title = existing.title === `Follow-up ${template.stage} - Unknown` ? `Follow-up ${template.stage}` : existing.title;
        const tags = existing.tags.filter(tag => !legacyVariants.includes(tag));
        if (title !== existing.title || body !== existing.body || tags.length !== existing.tags.length) {
          await tx`UPDATE message_templates SET title = ${title}, body = ${body}, tags = ${tx.json(tags)}, updated_at = now()
            WHERE id = ${id} AND user_id = ${userId}`;
        }
      } else {
        const inserted = await tx`INSERT INTO message_templates (id, user_id, title, subject, body, category, tags, character_limit, favorite, pinned)
          VALUES (${id}, ${userId}, ${`Follow-up ${template.stage}`}, ${source?.subject ?? template.subject}, ${body}, ${source?.category || 'Follow-ups'},
            ${tx.json(['follow-up', `stage-${template.stage}`])}, ${source?.character_limit ?? null}, ${source?.favorite ?? false}, ${source?.pinned ?? false})
          ON CONFLICT (id) DO NOTHING RETURNING id`;
        added += inserted.length;
      }
      const obsoleteIds = ['seen', 'not_seen'].map(variant => slotId(userId, template.stage, variant));
      const deleted = await tx`DELETE FROM message_templates WHERE user_id = ${userId} AND id IN ${tx(obsoleteIds)} RETURNING id`;
      removed += deleted.length;
    }
  }
  return { accounts: userIds.length, added, removed };
}

module.exports = { simplify, slotId };
if (require.main === module) {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
  const apply = process.argv.includes('--apply');
  const rollback = new Error('dry-run');
  const db = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });
  db.begin(async tx => {
    // Accounts without templates get their two defaults lazily in the app.
    const owners = await tx`SELECT DISTINCT user_id AS id FROM public.message_templates`;
    const result = await simplify(tx, owners.map(owner => owner.id));
    console.log(`${apply ? 'Applied' : 'Dry run'}: ${result.accounts} accounts, ${result.added} templates added, ${result.removed} obsolete case templates removed. Existing generic custom wording preserved.`);
    if (!apply) throw rollback;
  }).catch(error => {
    if (error !== rollback) { console.error(error.message); process.exitCode = 1; }
  }).finally(() => db.end());
}
