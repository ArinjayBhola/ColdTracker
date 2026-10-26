/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS shared with the isolated Node test runner. */
// Pure collector rules, shared by the route and mocked tests. No request logging.
const {createHash}=require('node:crypto');
function tokenHash(token){return typeof token==='string'&&/^[A-Za-z0-9_-]{43}$/.test(token)?createHash('sha256').update(token).digest('hex'):null;}
function eligible(row,now){
  if(!row||!row.tracking_enabled||!['prepared','accepted'].includes(row.delivery_state)||row.open_count>=10000)return false;
  const created=+new Date(row.created_at),stamp=+new Date(now);
  return Number.isFinite(created)&&Number.isFinite(stamp)&&stamp>=created&&stamp-created<=90*86400000;
}
async function recordOpen(repo,token,now,eventId){
  const hash=tokenHash(token);if(!hash)return false;
  const row=await repo.lockToken(hash);if(!eligible(row,now))return false;
  const stamp=+new Date(now),start=+new Date(row.window_start);
  const reset=!row.window_start||stamp-start>=60000;
  const used=reset?0:row.window_count;
  if(used>=60)return false;
  if(!await repo.insertEvent(eventId,row.id,now))return false;
  await repo.update(row.id,{open_count:row.open_count+1,
    first_open_at:row.first_open_at?new Date(Math.min(+new Date(row.first_open_at),stamp)).toISOString():now,
    last_open_at:row.last_open_at?new Date(Math.max(+new Date(row.last_open_at),stamp)).toISOString():now,
    window_start:reset?now:row.window_start,window_count:used+1});
  return true;
}
async function ownedActivity(repo,user,id){
  if(!user||!await repo.owned(user,id))return null;
  return repo.list(user,id);
}
module.exports={tokenHash,eligible,recordOpen,ownedActivity};
