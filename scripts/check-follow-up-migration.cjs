/* eslint-disable @typescript-eslint/no-require-imports -- Standalone database check. */
require('dotenv').config({ quiet: true });
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const postgres = require('postgres');
const { simplify, slotId } = require('./simplify-follow-up-templates.cjs');
const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });
const rollback = new Error('rollback-follow-up-check');
sql.begin(async tx => {
  const owners = Array.from({ length: 3 }, () => `follow-up-migration-test-${randomUUID()}`);
  for (const owner of owners) await tx`INSERT INTO public."user" (id, email) VALUES (${owner}, ${owner + '@example.invalid'})`;
  for (const [index, owner] of owners.slice(0, 2).entries()) {
    for (const stage of [1, 2]) {
      for (const variant of index === 0 ? ['unknown', 'seen', 'not_seen'] : ['seen', 'not_seen']) {
        await tx`INSERT INTO message_templates (id, user_id, title, subject, body, category, tags, favorite, pinned, updated_at)
          VALUES (${slotId(owner, stage, variant)}, ${owner}, ${`Follow-up ${stage} - ${variant === 'unknown' ? 'Unknown' : variant}`},
            'Custom subject', ${`Custom ${stage} ${variant}: {{personName}} / {{companyName}} / {{role}}`}, 'Personal', ${tx.json(['follow-up', variant, 'custom'])}, true, true,
            ${variant === 'not_seen' ? '2020-01-01T00:00:00Z' : '2021-01-01T00:00:00Z'})`;
      }
    }
  }
  const unrelated = randomUUID();
  await tx`INSERT INTO message_templates (id, user_id, title, body, tags) VALUES (${unrelated}, ${owners[0]}, 'Follow-up 1 - Seen', 'Unrelated custom message', ${tx.json(['seen'])})`;
  const result = await simplify(tx, owners);
  assert.equal(result.removed, 8);
  assert.equal(result.added, 4);
  const rows = await tx`SELECT * FROM message_templates WHERE user_id IN ${tx(owners)}`;
  assert.equal(rows.length, 7, 'two linked templates per account plus the unrelated template');
  for (const stage of [1, 2]) {
    const kept = rows.find(row => row.id === slotId(owners[0], stage, 'unknown'));
    assert.equal(kept.title, `Follow-up ${stage}`);
    assert.equal(kept.body, `Custom ${stage} unknown: {{personName}} / {{companyName}} / {{role}}`);
    assert.equal(kept.subject, 'Custom subject');
    assert.equal(kept.favorite, true);
    assert.equal(kept.pinned, true);
    assert.deepEqual(kept.tags, ['follow-up', 'custom']);
    const fallback = rows.find(row => row.id === slotId(owners[1], stage, 'unknown'));
    assert.match(fallback.body, new RegExp(`Custom ${stage} seen:`), 'preserve most recently edited alternative if generic template is missing');
    const fresh = rows.find(row => row.id === slotId(owners[2], stage, 'unknown'));
    assert.match(fresh.body, /{{role}}/);
  }
  assert.ok(rows.find(row => row.id === unrelated), 'matching titles/tags alone never delete user templates');
  const second = await simplify(tx, owners);
  assert.equal(second.added, 0);
  assert.equal(second.removed, 0);
  console.log('Follow-up migration checks passed: exactly two slots, custom wording/metadata preserved, fallback recovery, unrelated templates untouched, idempotence.');
  throw rollback;
}).catch(error => {
  if (error !== rollback) { console.error(error); process.exitCode = 1; }
}).finally(async () => { await sql.end(); console.log('Synthetic migration records rolled back.'); });
